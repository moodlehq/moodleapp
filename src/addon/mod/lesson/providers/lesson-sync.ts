// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreCourseActivitySyncBaseProvider } from '@core/course/classes/activity-sync';
import { AddonModLessonProvider } from './lesson';
import { AddonModLessonOfflineProvider } from './lesson-offline';
import { AddonModLessonPrefetchHandler } from './prefetch-handler';

/**
 * Data returned by a lesson sync.
 */
export interface AddonModLessonSyncResult {
    /**
     * List of warnings.
     * @type {string[]}
     */
    warnings: string[];

    /**
     * Whether some data was sent to the server or offline data was updated.
     * @type {boolean}
     */
    updated: boolean;
}

/**
 * Service to sync lesson.
 */
@Injectable()
export class AddonModLessonSyncProvider extends CoreCourseActivitySyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_lesson_autom_synced';

    protected componentTranslate: string;

    // Variables for database.
    static RETAKES_FINISHED_TABLE = 'addon_mod_lesson_retakes_finished_sync';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModLessonSyncProvider',
        version: 1,
        tables: [
            {
                name: AddonModLessonSyncProvider.RETAKES_FINISHED_TABLE,
                columns: [
                    {
                        name: 'lessonid',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'retake',
                        type: 'INTEGER'
                    },
                    {
                        name: 'pageid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timefinished',
                        type: 'INTEGER'
                    }
                ]
            }
        ]
    };

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider, translate: TranslateService,
            private courseProvider: CoreCourseProvider, private eventsProvider: CoreEventsProvider,
            private lessonProvider: AddonModLessonProvider, private lessonOfflineProvider: AddonModLessonOfflineProvider,
            protected prefetchHandler: AddonModLessonPrefetchHandler, timeUtils: CoreTimeUtilsProvider,
            private utils: CoreUtilsProvider, private urlUtils: CoreUrlUtilsProvider,
            private logHelper: CoreCourseLogHelperProvider, prefetchDelegate: CoreCourseModulePrefetchDelegate) {

        super('AddonModLessonSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils, prefetchDelegate, prefetchHandler);

        this.componentTranslate = courseProvider.translateModuleName('lesson');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Unmark a retake as finished in a synchronization.
     *
     * @param {number} lessonId Lesson ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    deleteRetakeFinishedInSync(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonModLessonSyncProvider.RETAKES_FINISHED_TABLE, {lessonid: lessonId});
        }).catch(() => {
            // Ignore errors, maybe there is none.
        });
    }

    /**
     * Get a retake finished in a synchronization for a certain lesson (if any).
     *
     * @param {number} lessonId Lesson ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the retake entry (undefined if no retake).
     */
    getRetakeFinishedInSync(lessonId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonModLessonSyncProvider.RETAKES_FINISHED_TABLE, {lessonid: lessonId});
        }).catch(() => {
            // Ignore errors, return undefined.
        });
    }

    /**
     * Check if a lesson has data to synchronize.
     *
     * @param {number} lessonId Lesson ID.
     * @param {number} retake  Retake number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether it has data to sync.
     */
    hasDataToSync(lessonId: number, retake: number, siteId?: string): Promise<boolean> {
        const promises = [];
        let hasDataToSync = false;

        promises.push(this.lessonOfflineProvider.hasRetakeAttempts(lessonId, retake, siteId).then((hasAttempts) => {
            hasDataToSync = hasDataToSync || hasAttempts;
        }).catch(() => {
            // Ignore errors.
        }));

        promises.push(this.lessonOfflineProvider.hasFinishedRetake(lessonId, siteId).then((hasFinished) => {
            hasDataToSync = hasDataToSync || hasFinished;
        }));

        return Promise.all(promises).then(() => {
            return hasDataToSync;
        });
    }

    /**
     * Mark a retake as finished in a synchronization.
     *
     * @param {number} lessonId Lesson ID.
     * @param {number} retake The retake number.
     * @param {number} pageId The page ID to start reviewing from.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    setRetakeFinishedInSync(lessonId: number, retake: number, pageId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().insertRecord(AddonModLessonSyncProvider.RETAKES_FINISHED_TABLE, {
                lessonid: lessonId,
                retake: Number(retake),
                pageid: Number(pageId),
                timefinished: this.timeUtils.timestamp()
            });
        });
    }

    /**
     * Try to synchronize all the lessons in a certain site or in all sites.
     *
     * @param {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllLessons(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all lessons', this.syncAllLessonsFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all lessons on a site.
     *
     * @param  {string} siteId Site ID to sync.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @param {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllLessonsFunc(siteId: string, force?: boolean): Promise<any> {
        // Get all the lessons that have something to be synchronized.
        return this.lessonOfflineProvider.getAllLessonsWithData(siteId).then((lessons) => {
            // Sync all lessons that haven't been synced for a while.
            const promises = [];

            lessons.map((lesson) => {
                const promise = force ? this.syncLesson(lesson.id, false, false, siteId) :
                    this.syncLessonIfNeeded(lesson.id, false, siteId);

                return promise.then((result) => {
                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModLessonSyncProvider.AUTO_SYNCED, {
                            lessonId: lesson.id,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(promises);
        });
    }

    /**
     * Sync a lesson only if a certain time has passed since the last time.
     *
     * @param {any} lessonId Lesson ID.
     * @param {boolean} [askPreflight] Whether we should ask for password if needed.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the lesson is synced or if it doesn't need to be synced.
     */
    syncLessonIfNeeded(lessonId: number, askPassword?: boolean, siteId?: string): Promise<any> {
        return this.isSyncNeeded(lessonId, siteId).then((needed) => {
            if (needed) {
                return this.syncLesson(lessonId, askPassword, false, siteId);
            }
        });
    }

    /**
     * Try to synchronize a lesson.
     *
     * @param {number} lessonId Lesson ID.
     * @param {boolean} askPassword True if we should ask for password if needed, false otherwise.
     * @param {boolean} ignoreBlock True to ignore the sync block setting.
     * @param {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<AddonModLessonSyncResult>} Promise resolved in success.
     */
    syncLesson(lessonId: number, askPassword?: boolean, ignoreBlock?: boolean, siteId?: string): Promise<AddonModLessonSyncResult> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const result: AddonModLessonSyncResult = {
                warnings: [],
                updated: false
            };
        let syncPromise,
            lesson,
            courseId,
            password,
            accessInfo;

        if (this.isSyncing(lessonId, siteId)) {
            // There's already a sync ongoing for this lesson, return the promise.
            return this.getOngoingSync(lessonId, siteId);
        }

        // Verify that lesson isn't blocked.
        if (!ignoreBlock && this.syncProvider.isBlocked(AddonModLessonProvider.COMPONENT, lessonId, siteId)) {
            this.logger.debug('Cannot sync lesson ' + lessonId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync lesson ' + lessonId + ' in site ' + siteId);

        // Sync offline logs.
        syncPromise = this.logHelper.syncIfNeeded(AddonModLessonProvider.COMPONENT, lessonId, siteId).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Try to synchronize the attempts first.
            return this.lessonOfflineProvider.getLessonAttempts(lessonId, siteId);
        }).then((attempts) => {
            if (!attempts.length) {
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            courseId = attempts[0].courseid;

            // Get the info, access info and the lesson password if needed.
            return this.lessonProvider.getLessonById(courseId, lessonId, false, false, siteId).then((lessonData) => {
                lesson = lessonData;

                return this.prefetchHandler.getLessonPassword(lessonId, false, true, askPassword, siteId);
            }).then((data) => {
                const attemptsLength = attempts.length,
                    promises = [];

                accessInfo = data.accessInfo;
                password = data.password;
                lesson = data.lesson || lesson;

                // Filter the attempts, get only the ones that belong to the current retake.
                attempts = attempts.filter((attempt) => {
                    if (attempt.retake != accessInfo.attemptscount) {
                        // Attempt doesn't belong to current retake, delete.
                        promises.push(this.lessonOfflineProvider.deleteAttempt(lesson.id, attempt.retake, attempt.pageid,
                                attempt.timemodified, siteId).catch(() => {
                            // Ignore errors.
                        }));

                        return false;
                    }

                    return true;
                });

                if (attempts.length != attemptsLength) {
                    // Some attempts won't be sent, add a warning.
                    result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                        component: this.componentTranslate,
                        name: lesson.name,
                        error: this.translate.instant('addon.mod_lesson.warningretakefinished')
                    }));
                }

                return Promise.all(promises);
            }).then(() => {
                if (!attempts.length) {
                    return;
                }

                // Send the attempts in the same order they were answered.
                attempts.sort((a, b) => {
                    return a.timemodified - b.timemodified;
                });

                attempts = attempts.map((attempt) => {
                    return {
                        func: this.sendAttempt.bind(this),
                        params: [lesson, password, attempt, result, siteId],
                        blocking: true
                    };
                });

                return this.utils.executeOrderedPromises(attempts);
            });
        }).then(() => {
            // Attempts sent or there was none. If there is a finished retake, send it.
            return this.lessonOfflineProvider.getRetake(lessonId, siteId).then((retake) => {
                if (!retake.finished) {
                    // The retake isn't marked as finished, nothing to send. Delete the retake.
                    return this.lessonOfflineProvider.deleteRetake(lessonId, siteId);
                } else if (!this.appProvider.isOnline()) {
                    // Cannot sync in offline.
                    return Promise.reject(null);
                }

                let promise;

                courseId = retake.courseid || courseId;

                if (lesson) {
                    // Data already retrieved when syncing attempts.
                    promise = Promise.resolve();
                } else {
                    promise = this.lessonProvider.getLessonById(courseId, lessonId, false, false, siteId).then((lessonData) => {
                        lesson = lessonData;

                        return this.prefetchHandler.getLessonPassword(lessonId, false, true, askPassword, siteId);
                    }).then((data) => {
                        accessInfo = data.accessInfo;
                        password = data.password;
                        lesson = data.lesson || lesson;
                    });
                }

                return promise.then(() => {
                    if (retake.retake != accessInfo.attemptscount) {
                        // The retake changed, add a warning if it isn't there already.
                        if (!result.warnings.length) {
                            result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.componentTranslate,
                                name: lesson.name,
                                error: this.translate.instant('addon.mod_lesson.warningretakefinished')
                            }));
                        }

                        return this.lessonOfflineProvider.deleteRetake(lessonId, siteId);
                    }

                    // All good, finish the retake.
                    return this.lessonProvider.finishRetakeOnline(lessonId, password, false, false, siteId).then((response) => {
                        result.updated = true;

                        if (!ignoreBlock) {
                            // Mark the retake as finished in a sync if it can be reviewed.
                            if (response.data && response.data.reviewlesson) {
                                const params = this.urlUtils.extractUrlParams(response.data.reviewlesson.value);
                                if (params && params.pageid) {
                                    // The retake can be reviewed, mark it as finished. Don't block the user for this.
                                    this.setRetakeFinishedInSync(lessonId, retake.retake, params.pageid, siteId);
                                }
                            }
                        }

                        return this.lessonOfflineProvider.deleteRetake(lessonId, siteId);
                    }).catch((error) => {
                        if (error && this.utils.isWebServiceError(error)) {
                            // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                            result.updated = true;

                            return this.lessonOfflineProvider.deleteRetake(lessonId, siteId).then(() => {
                                // Retake deleted, add a warning.
                                result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                    component: this.componentTranslate,
                                    name: lesson.name,
                                    error: this.textUtils.getErrorMessageFromError(error)
                                }));
                            });
                        } else {
                            // Couldn't connect to server, reject.
                            return Promise.reject(error);
                        }
                    });
                });
            }, () => {
                // No retake stored, nothing to do.
            });
        }).then(() => {
            if (result.updated && courseId) {
                // Data has been sent to server, update data.
                return this.courseProvider.getModuleBasicInfoByInstance(lessonId, 'lesson', siteId).then((module) => {
                    return this.prefetchAfterUpdate(module, courseId, undefined, siteId);
                }).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(lessonId, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the result.
            return result;
        });

        return this.addOngoingSync(lessonId, syncPromise, siteId);
    }

    /**
     * Send an attempt to the site and delete it afterwards.
     *
     * @param {any} lesson Lesson.
     * @param {string} password Password (if any).
     * @param {any} attempt Attempt to send.
     * @param {AddonModLessonSyncResult} result Result where to store the data.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sendAttempt(lesson: any, password: string, attempt: any, result: AddonModLessonSyncResult, siteId?: string)
            : Promise<any> {

        return this.lessonProvider.processPageOnline(lesson.id, attempt.pageid, attempt.data, password, false, siteId).then(() => {
            result.updated = true;

            return this.lessonOfflineProvider.deleteAttempt(lesson.id, attempt.retake, attempt.pageid, attempt.timemodified,
                    siteId);
        }).catch((error) => {
            if (error && this.utils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that the attempt cannot be submitted. Delete it.
                result.updated = true;

                return this.lessonOfflineProvider.deleteAttempt(lesson.id, attempt.retake, attempt.pageid, attempt.timemodified,
                        siteId).then(() => {

                    // Attempt deleted, add a warning.
                    result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                        component: this.componentTranslate,
                        name: lesson.name,
                        error: this.textUtils.getErrorMessageFromError(error)
                    }));
                });
            } else {
                // Couldn't connect to server, reject.
                return Promise.reject(error);
            }
        });
    }
}
