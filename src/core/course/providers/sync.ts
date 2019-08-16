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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreEventsProvider } from '@providers/events';
import { CoreSyncProvider } from '@providers/sync';
import { CoreCourseOfflineProvider } from './course-offline';
import { CoreCourseProvider } from './course';
import { CoreCourseLogHelperProvider } from './log-helper';

/**
 * Service to sync course offline data. This only syncs the offline data of the course itself, not the offline data of
 * the activities in the course.
 */
@Injectable()
export class CoreCourseSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'core_course_autom_synced';

    constructor(protected sitesProvider: CoreSitesProvider, loggerProvider: CoreLoggerProvider,
            protected appProvider: CoreAppProvider, private courseOffline: CoreCourseOfflineProvider,
            private eventsProvider: CoreEventsProvider,  private courseProvider: CoreCourseProvider,
            translate: TranslateService, private utils: CoreUtilsProvider, protected textUtils: CoreTextUtilsProvider,
            syncProvider: CoreSyncProvider, timeUtils: CoreTimeUtilsProvider, protected logHelper: CoreCourseLogHelperProvider) {

        super('CoreCourseSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate, timeUtils);
    }

    /**
     * Try to synchronize all the courses in a certain site or in all sites.
     *
     * @param {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} [force] Wether the execution is forced (manual sync).
     * @return {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllCourses(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('courses', this.syncAllCoursesFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all courses on a site.
     *
     * @param {string} siteId Site ID to sync. If not defined, sync all sites.
     * @param {boolean} force Wether the execution is forced (manual sync).
     * @return {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllCoursesFunc(siteId: string, force: boolean): Promise<any> {
        const p1 = [];

        p1.push(this.logHelper.syncSite(siteId));

        p1.push(this.courseOffline.getAllManualCompletions(siteId).then((completions) => {
            // Sync all courses.
            const p2 = completions.map((completion) => {
                const promise = force ? this.syncCourse(completion.courseid, siteId) :
                    this.syncCourseIfNeeded(completion.courseid, siteId);

                return promise.then((result) => {
                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(CoreCourseSyncProvider.AUTO_SYNCED, {
                            courseId: completion.courseid,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(p2);
        }));

        return Promise.all(p1);
    }

    /**
     * Sync a course if it's needed.
     *
     * @param {number} courseId Course ID to be synced.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the course is synced or it doesn't need to be synced.
     */
    syncCourseIfNeeded(courseId: number, siteId?: string): Promise<any> {
        // Usually we call isSyncNeeded to check if a certain time has passed.
        // However, since we barely send data for now just sync the course.
        return this.syncCourse(courseId, siteId);
    }

    /**
     * Synchronize a course.
     *
     * @param {number} courseId Course ID to be synced.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected otherwise.
     */
    syncCourse(courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(courseId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return this.getOngoingSync(courseId, siteId);
        }

        this.logger.debug(`Try to sync course '${courseId}'`);

        const result = {
            warnings: [],
            updated: false
        };

        // Get offline responses to be sent.
        const syncPromise = this.courseOffline.getCourseManualCompletions(courseId, siteId).catch(() => {
            // No offline data found, return empty list.
            return [];
        }).then((completions) => {
            if (!completions || !completions.length) {
                // Nothing to sync.
                return;
            }

            if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            // Get the current completion status to check if any completion was modified in web.
            // This can be retrieved on core_course_get_contents since 3.6 but this is an easy way to get them.
            return this.courseProvider.getActivitiesCompletionStatus(courseId, siteId, undefined, false, true, false)
                    .then((onlineCompletions) => {

                const promises = [];

                // Send all the completions.
                completions.forEach((entry) => {
                    const onlineComp = onlineCompletions[entry.cmid];

                    // Check if the completion was modified in online. If so, discard it.
                    if (onlineComp && onlineComp.timecompleted * 1000 > entry.timecompleted) {
                        promises.push(this.courseOffline.deleteManualCompletion(entry.cmid, siteId).then(() => {

                            // Completion deleted, add a warning if the completion status doesn't match.
                            if (onlineComp.state != entry.completed) {
                                result.warnings.push(this.translate.instant('core.course.warningofflinemanualcompletiondeleted', {
                                    name: entry.coursename || courseId,
                                    error: this.translate.instant('core.course.warningmanualcompletionmodified')
                                }));
                            }
                        }));

                        return;
                    }

                    promises.push(this.courseProvider.markCompletedManuallyOnline(entry.cmid, entry.completed, siteId).then(() => {
                        result.updated = true;

                        return this.courseOffline.deleteManualCompletion(entry.cmid, siteId);
                    }).catch((error) => {
                        if (this.utils.isWebServiceError(error)) {
                            // The WebService has thrown an error, this means that the completion cannot be submitted. Delete it.
                            result.updated = true;

                            return this.courseOffline.deleteManualCompletion(entry.cmid, siteId).then(() => {
                                // Completion deleted, add a warning.
                                result.warnings.push(this.translate.instant('core.course.warningofflinemanualcompletiondeleted', {
                                    name: entry.coursename || courseId,
                                    error: this.textUtils.getErrorMessageFromError(error)
                                }));
                            });
                        }

                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }));
                });

                return Promise.all(promises);
            });
        }).then(() => {
            if (result.updated) {
                // Update data.
                return this.courseProvider.invalidateSections(courseId, siteId).then(() => {
                    if (this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.6')) {
                        return this.courseProvider.getSections(courseId, false, true, undefined, siteId);
                    } else {
                        return this.courseProvider.getActivitiesCompletionStatus(courseId, siteId);
                    }
                }).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(courseId, siteId);
        }).then(() => {
            // All done, return the data.
            return result;
        });

        return this.addOngoingSync(courseId, syncPromise, siteId);
    }
}
