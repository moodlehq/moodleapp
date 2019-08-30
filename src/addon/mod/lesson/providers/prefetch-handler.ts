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

import { Injectable, Injector } from '@angular/core';
import { ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { AddonModLessonProvider } from './lesson';
import { AddonModLessonSyncProvider } from './lesson-sync';

/**
 * Handler to prefetch lessons.
 */
@Injectable()
export class AddonModLessonPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModLesson';
    modName = 'lesson';
    component = AddonModLessonProvider.COMPONENT;
    // Don't check timers to decrease positives. If a user performs some action it will be reflected in other items.
    updatesNames = /^configuration$|^.*files$|^grades$|^gradeitems$|^pages$|^answers$|^questionattempts$|^pagesviewed$/;

    protected syncProvider: AddonModLessonSyncProvider; // It will be injected later to prevent circular dependencies.

    constructor(translate: TranslateService, appProvider: CoreAppProvider, utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider, filepoolProvider: CoreFilepoolProvider, sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider, protected modalCtrl: ModalController, protected groupsProvider: CoreGroupsProvider,
            protected lessonProvider: AddonModLessonProvider, protected injector: Injector) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Ask password.
     *
     * @param {any} info Lesson access info.
     * @return {Promise<string>} Promise resolved with the password.
     */
    protected askUserPassword(info: any): Promise<string> {
        // Create and show the modal.
        const modal = this.modalCtrl.create('AddonModLessonPasswordModalPage');

        modal.present();

        // Wait for modal to be dismissed.
        return new Promise((resolve, reject): void => {
            modal.onDidDismiss((password) => {
                if (typeof password != 'undefined') {
                    resolve(password);
                } else {
                    reject(this.domUtils.createCanceledError());
                }
            });
        });
    }

    /**
     * Get the download size of a module.
     *
     * @param {any} module Module.
     * @param {Number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<{size: number, total: boolean}>} Promise resolved with the size and a boolean indicating if it was able
     *                                                   to calculate the total size.
     */
    getDownloadSize(module: any, courseId: any, single?: boolean): Promise<{ size: number, total: boolean }> {
        const siteId = this.sitesProvider.getCurrentSiteId();
        let lesson,
            password,
            result;

        return this.lessonProvider.getLesson(courseId, module.id, false, false, siteId).then((lessonData) => {
            lesson = lessonData;

            // Get the lesson password if it's needed.
            return this.getLessonPassword(lesson.id, false, true, single, siteId);
        }).then((data) => {
            password = data.password;
            lesson = data.lesson || lesson;

            // Get intro files and media files.
            let files = lesson.mediafiles || [];
            files = files.concat(this.getIntroFilesFromInstance(module, lesson));

            result = this.utils.sumFileSizes(files);

            // Get the pages to calculate the size.
            return this.lessonProvider.getPages(lesson.id, password, false, false, siteId);
        }).then((pages) => {
            pages.forEach((page) => {
                result.size += page.filessizetotal;
            });

            return result;
        });
    }

    /**
     * Get the lesson password if needed. If not stored, it can ask the user to enter it.
     *
     * @param {number} lessonId Lesson ID.
     * @param {boolean} [forceCache] Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {boolean} [askPassword] True if we should ask for password if needed, false otherwise.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{password?: string, lesson?: any, accessInfo: any}>} Promise resolved when done.
     */
    getLessonPassword(lessonId: number, forceCache?: boolean, ignoreCache?: boolean, askPassword?: boolean, siteId?: string)
            : Promise<{password?: string, lesson?: any, accessInfo: any}> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get access information to check if password is needed.
        return this.lessonProvider.getAccessInformation(lessonId, forceCache, ignoreCache, siteId).then((info): any => {
            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                const passwordNeeded = info.preventaccessreasons.length == 1 && this.lessonProvider.isPasswordProtected(info);
                if (passwordNeeded) {

                    // The lesson requires a password. Check if there is one in DB.
                    return this.lessonProvider.getStoredPassword(lessonId).catch(() => {
                        // No password found.
                    }).then((password) => {
                        if (password) {
                            return this.validatePassword(lessonId, info, password, forceCache, ignoreCache, siteId);
                        } else {
                            return Promise.reject(null);
                        }
                    }).catch(() => {
                        // No password or error validating it. Ask for it if allowed.
                        if (askPassword) {
                            return this.askUserPassword(info).then((password) => {
                                return this.validatePassword(lessonId, info, password, forceCache, ignoreCache, siteId);
                            });
                        }

                        // Cannot ask for password, reject.
                        return Promise.reject(info.preventaccessreasons[0].message);
                    });
                } else  {
                    // Lesson cannot be played, reject.
                    return Promise.reject(info.preventaccessreasons[0].message);
                }
            }

            // Password not needed.
            return { accessInfo: info };
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId The course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        // Only invalidate the data that doesn't ignore cache when prefetching.
        const promises = [];

        promises.push(this.lessonProvider.invalidateLessonData(courseId));
        promises.push(this.courseProvider.invalidateModule(moduleId));
        promises.push(this.groupsProvider.invalidateActivityAllowedGroups(moduleId));

        return Promise.all(promises);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId();

        // Invalidate data to determine if module is downloadable.
        return this.lessonProvider.getLesson(courseId, module.id, true, false, siteId).then((lesson) => {
            const promises = [];

            promises.push(this.lessonProvider.invalidateLessonData(courseId, siteId));
            promises.push(this.lessonProvider.invalidateAccessInformation(lesson.id, siteId));

            return Promise.all(promises);
        });
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {boolean|Promise<boolean>} Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable(module: any, courseId: number): boolean | Promise<boolean> {
        const siteId = this.sitesProvider.getCurrentSiteId();

        return this.lessonProvider.getLesson(courseId, module.id, false, false, siteId).then((lesson) => {
            // Check if there is any prevent access reason.
            return this.lessonProvider.getAccessInformation(lesson.id, false, false, siteId).then((info) => {
                if (!info.canviewreports && !this.lessonProvider.isLessonOffline(lesson)) {
                    return false;
                }

                // It's downloadable if there are no prevent access reasons or there is just 1 and it's password.
                return !info.preventaccessreasons || !info.preventaccessreasons.length ||
                        (info.preventaccessreasons.length == 1 && this.lessonProvider.isPasswordProtected(info));
            });
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.lessonProvider.isPluginEnabled();
    }

    /**
     * Prefetch a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [dirPath] Path of the directory where to store all the content files.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any> {
        return this.prefetchPackage(module, courseId, single, this.prefetchLesson.bind(this));
    }

    /**
     * Prefetch a lesson.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} single True if we're downloading a single module, false if we're downloading a whole section.
     * @param {String} siteId Site ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected prefetchLesson(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        let lesson,
            password,
            accessInfo;

        return this.lessonProvider.getLesson(courseId, module.id, false, true, siteId).then((lessonData) => {
            lesson = lessonData;

            // Get the lesson password if it's needed.
            return this.getLessonPassword(lesson.id, false, true, single, siteId);
        }).then((data) => {
            password = data.password;
            lesson = data.lesson || lesson;
            accessInfo = data.accessInfo;

            if (this.lessonProvider.isLessonOffline(lesson) && !this.lessonProvider.leftDuringTimed(accessInfo)) {
                // The user didn't left during a timed session. Call launch retake to make sure there is a started retake.
                return this.lessonProvider.launchRetake(lesson.id, password, undefined, false, siteId).then(() => {
                    const promises = [];

                    // New data generated, update the download time and refresh the access info.
                    promises.push(this.filepoolProvider.updatePackageDownloadTime(siteId, this.component, module.id).catch(() => {
                        // Ignore errors.
                    }));

                    promises.push(this.lessonProvider.getAccessInformation(lesson.id, false, true, siteId).then((info) => {
                        accessInfo = info;
                    }));

                    return Promise.all(promises);
                });
            }
        }).then(() => {
            const promises = [],
                retake = accessInfo.attemptscount;

            // Download intro files and media files.
            let files = lesson.mediafiles || [];
            files = files.concat(this.getIntroFilesFromInstance(module, lesson));

            promises.push(this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id));

            // Get the list of pages.
            if (this.lessonProvider.isLessonOffline(lesson)) {
                promises.push(this.lessonProvider.getPages(lesson.id, password, false, true, siteId).then((pages) => {
                    const subPromises = [];
                    let hasRandomBranch = false;

                    // Get the data for each page.
                    pages.forEach((data) => {
                        // Check if any page has a RANDOMBRANCH jump.
                        if (!hasRandomBranch) {
                            for (let i = 0; i < data.jumps.length; i++) {
                                if (data.jumps[i] == AddonModLessonProvider.LESSON_RANDOMBRANCH) {
                                    hasRandomBranch = true;
                                    break;
                                }
                            }
                        }

                        // Get the page data. We don't pass accessInfo because we don't need to calculate the offline data.
                        subPromises.push(this.lessonProvider.getPageData(lesson, data.page.id, password, false, true, false,
                                true, undefined, undefined, siteId).then((pageData) => {

                            // Download the page files.
                            let pageFiles = pageData.contentfiles || [];

                            pageData.answers.forEach((answer) => {
                                if (answer.answerfiles && answer.answerfiles.length) {
                                    pageFiles = pageFiles.concat(answer.answerfiles);
                                }
                                if (answer.responsefiles && answer.responsefiles.length) {
                                    pageFiles = pageFiles.concat(answer.responsefiles);
                                }
                            });

                            return this.filepoolProvider.addFilesToQueue(siteId, pageFiles, this.component, module.id);
                        }));
                    });

                    // Prefetch the list of possible jumps for offline navigation. Do it here because we know hasRandomBranch.
                    subPromises.push(this.lessonProvider.getPagesPossibleJumps(lesson.id, false, true, siteId).catch((error) => {
                        if (hasRandomBranch) {
                            // The WebSevice probably failed because RANDOMBRANCH aren't supported if the user hasn't seen any page.
                            return Promise.reject(this.translate.instant('addon.mod_lesson.errorprefetchrandombranch'));
                        } else {
                            return Promise.reject(error);
                        }
                    }));

                    return Promise.all(subPromises);
                }));

                // Prefetch user timers to be able to calculate timemodified in offline.
                promises.push(this.lessonProvider.getTimers(lesson.id, false, true, siteId).catch(() => {
                    // Ignore errors.
                }));

                // Prefetch viewed pages in last retake to calculate progress.
                promises.push(this.lessonProvider.getContentPagesViewedOnline(lesson.id, retake, false, true, siteId));

                // Prefetch question attempts in last retake for offline calculations.
                promises.push(this.lessonProvider.getQuestionsAttemptsOnline(lesson.id, retake, false, undefined, false, true,
                        siteId));
            }

            if (accessInfo.canviewreports) {
                // Prefetch reports data.
                promises.push(this.groupsProvider.getActivityGroupInfo(module.id, false, undefined, siteId, true).then((info) => {
                    const subPromises = [];

                    info.groups.forEach((group) => {
                        subPromises.push(this.lessonProvider.getRetakesOverview(lesson.id, group.id, false, true, siteId));
                    });

                    // Always get group 0, even if there are no groups.
                    subPromises.push(this.lessonProvider.getRetakesOverview(lesson.id, 0, false, true, siteId).then((data) => {
                        if (!data || !data.students) {
                            return;
                        }

                        // Prefetch the last retake for each user.
                        const retakePromises = [];

                        data.students.forEach((student) => {
                            if (!student.attempts || !student.attempts.length) {
                                return;
                            }

                            const lastRetake = student.attempts[student.attempts.length - 1];
                            if (!lastRetake) {
                                return;
                            }

                            retakePromises.push(this.lessonProvider.getUserRetake(lesson.id, lastRetake.try, student.id, false,
                                    true, siteId).then((attempt) => {
                                if (!attempt || !attempt.answerpages) {
                                    return;
                                }

                                // Download embedded files in essays.
                                const files = [];
                                attempt.answerpages.forEach((answerPage) => {
                                    if (answerPage.page.qtype != AddonModLessonProvider.LESSON_PAGE_ESSAY) {
                                        return;
                                    }
                                    answerPage.answerdata.answers.forEach((answer) => {
                                        files.push(...this.domUtils.extractDownloadableFilesFromHtmlAsFakeFileObjects(answer[0]));
                                    });
                                });

                                return this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id);
                            }));
                        });

                        return Promise.all(retakePromises);
                    }));

                    return Promise.all(subPromises);
                }));
            }

            return Promise.all(promises);
        });
    }

    /**
     * Validate the password.
     *
     * @param {number} lessonId Lesson ID.
     * @param {any} info Lesson access info.
     * @param {string} pwd Password to check.
     * @param {boolean} [forceCache] Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{password: string, lesson: any, accessInfo: any}>} Promise resolved when done.
     */
    protected validatePassword(lessonId: number, info: any, pwd: string, forceCache?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<{password: string, lesson: any, accessInfo: any}> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.lessonProvider.getLessonWithPassword(lessonId, pwd, true, forceCache, ignoreCache, siteId).then((lesson) => {
            // Password is ok, store it and return the data.
            return this.lessonProvider.storePassword(lesson.id, pwd, siteId).then(() => {
                return {
                    password: pwd,
                    lesson: lesson,
                    accessInfo: info
                };
            });
        });
    }

    /**
     * Sync a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    sync(module: any, courseId: number, siteId?: any): Promise<any> {
        if (!this.syncProvider) {
            this.syncProvider = this.injector.get(AddonModLessonSyncProvider);
        }

        return this.syncProvider.syncLesson(module.instance, false, false, siteId);
    }
}
