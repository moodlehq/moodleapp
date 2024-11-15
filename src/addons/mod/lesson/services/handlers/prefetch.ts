// (C) Copyright 2015 Moodle Pty Ltd.
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
import { CoreError } from '@classes/errors/error';

import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourse, CoreCourseCommonModWSOptions, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreFilepool } from '@services/filepool';
import { CoreGroups } from '@services/groups';
import { CoreFileSizeSum, CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreModals } from '@services/modals';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import {
    AddonModLesson,
    AddonModLessonGetAccessInformationWSResponse,
    AddonModLessonLessonWSData,
    AddonModLessonPasswordOptions,
} from '../lesson';
import { AddonModLessonSync, AddonModLessonSyncResult } from '../lesson-sync';
import { ADDON_MOD_LESSON_COMPONENT, AddonModLessonJumpTo, AddonModLessonPageSubtype } from '../../constants';

/**
 * Handler to prefetch lessons.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModLesson';
    modName = 'lesson';
    component = ADDON_MOD_LESSON_COMPONENT;
    // Don't check timers to decrease positives. If a user performs some action it will be reflected in other items.
    updatesNames = /^configuration$|^.*files$|^grades$|^gradeitems$|^pages$|^answers$|^questionattempts$|^pagesviewed$/;

    /**
     * Get the download size of a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @returns Promise resolved with the size.
     */
    async getDownloadSize(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<CoreFileSizeSum> {
        const siteId = CoreSites.getCurrentSiteId();

        let lesson = await AddonModLesson.getLesson(courseId, module.id, { siteId });

        // Get the lesson password if it's needed.
        const passwordData = await this.getLessonPassword(lesson.id, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            askPassword: single,
            siteId,
        });

        lesson = passwordData.lesson || lesson;

        // Get intro files and media files.
        let files: CoreWSFile[] = lesson.mediafiles || [];
        files = files.concat(this.getIntroFilesFromInstance(module, lesson));

        const result = await CorePluginFileDelegate.getFilesDownloadSize(files);

        // Get the pages to calculate the size.
        const pages = await AddonModLesson.getPages(lesson.id, {
            cmId: module.id,
            password: passwordData.password,
            siteId,
        });

        pages.forEach((page) => {
            result.size += page.filessizetotal;
        });

        return result;
    }

    /**
     * Get the lesson password if needed. If not stored, it can ask the user to enter it.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    async getLessonPassword(
        lessonId: number,
        options: AddonModLessonGetPasswordOptions = {},
    ): Promise<AddonModLessonGetPasswordResult> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Get access information to check if password is needed.
        const accessInfo = await AddonModLesson.getAccessInformation(lessonId, options);

        if (!accessInfo.preventaccessreasons.length) {
            // Password not needed.
            return { accessInfo };
        }

        const passwordNeeded = accessInfo.preventaccessreasons.length == 1 &&
            AddonModLesson.isPasswordProtected(accessInfo);

        if (!passwordNeeded) {
            // Lesson cannot be played, reject.
            throw new CoreError(accessInfo.preventaccessreasons[0].message);
        }

        // The lesson requires a password. Check if there is one in DB.
        let password = await CorePromiseUtils.ignoreErrors(AddonModLesson.getStoredPassword(lessonId));

        if (password) {
            try {
                return await this.validatePassword(lessonId, accessInfo, password, options);
            } catch {
                // Error validating it.
            }
        }

        // Ask for the password if allowed.
        if (!options.askPassword) {
            // Cannot ask for password, reject.
            throw new CoreError(accessInfo.preventaccessreasons[0].message);
        }

        // Create and show the modal.
        const response = await CoreModals.promptPassword({
            title: 'addon.mod_lesson.enterpassword',
            placeholder: 'core.login.password',
            submit: 'addon.mod_lesson.continue',
        });
        password = response.password;

        return this.validatePassword(lessonId, accessInfo, password, options);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        // Only invalidate the data that doesn't ignore cache when prefetching.
        await Promise.all([
            AddonModLesson.invalidateLessonData(courseId),
            CoreCourse.invalidateModule(moduleId),
            CoreGroups.invalidateActivityAllowedGroups(moduleId),
        ]);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when invalidated.
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        // Invalidate data to determine if module is downloadable.
        const siteId = CoreSites.getCurrentSiteId();

        const lesson = await AddonModLesson.getLesson(courseId, module.id, {
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId,
        });

        await Promise.all([
            AddonModLesson.invalidateLessonData(courseId, siteId),
            AddonModLesson.invalidateAccessInformation(lesson.id, siteId),
        ]);
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Whether the module can be downloaded. The promise should never be rejected.
     */
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        const siteId = CoreSites.getCurrentSiteId();

        const lesson = await AddonModLesson.getLesson(courseId, module.id, { siteId });
        const accessInfo = await AddonModLesson.getAccessInformation(lesson.id, { cmId: module.id, siteId });

        // If it's a student and lesson isn't offline, it isn't downloadable.
        if (!accessInfo.canviewreports && !AddonModLesson.isLessonOffline(lesson)) {
            return false;
        }

        // It's downloadable if there are no prevent access reasons or there is just 1 and it's password.
        return !accessInfo.preventaccessreasons.length ||
            (accessInfo.preventaccessreasons.length == 1 && AddonModLesson.isPasswordProtected(accessInfo));
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<void> {
        return this.prefetchPackage(module, courseId, (siteId) => this.prefetchLesson(module, courseId, !!single, siteId));
    }

    /**
     * Prefetch a lesson.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchLesson(
        module: CoreCourseAnyModuleData,
        courseId: number,
        single: boolean,
        siteId: string,
    ): Promise<void> {
        const commonOptions = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };
        const modOptions = {
            cmId: module.id,
            ...commonOptions, // Include all common options.
        };

        let lesson = await AddonModLesson.getLesson(courseId, module.id, commonOptions);

        // Get the lesson password if it's needed.
        const passwordData = await this.getLessonPassword(lesson.id, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            askPassword: single,
            siteId,
        });

        lesson = passwordData.lesson || lesson;
        let accessInfo = passwordData.accessInfo;
        const password = passwordData.password;

        if (AddonModLesson.isLessonOffline(lesson) && !AddonModLesson.leftDuringTimed(accessInfo)) {
            // The user didn't left during a timed session. Call launch retake to make sure there is a started retake.
            accessInfo = await this.launchRetake(lesson.id, password, modOptions, siteId);
        }

        const promises: Promise<void>[] = [];

        // Download intro files and media files.
        let files: CoreWSFile[] = (lesson.mediafiles || []);
        files = files.concat(this.getIntroFilesFromInstance(module, lesson));
        promises.push(CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id));

        if (AddonModLesson.isLessonOffline(lesson)) {
            promises.push(this.prefetchPlayData(lesson, password, accessInfo.attemptscount, modOptions));
        }

        if (accessInfo.canviewreports) {
            promises.push(this.prefetchGroupInfo(module.id, lesson.id, modOptions));
            promises.push(this.prefetchReportsData(module.id, lesson.id, modOptions));
        }

        await Promise.all(promises);
    }

    /**
     * Launch a retake and return the updated access information.
     *
     * @param lessonId Lesson ID.
     * @param password Password (if needed).
     * @param modOptions Options.
     * @param siteId Site ID.
     * @returns Access information.
     */
    protected async launchRetake(
        lessonId: number,
        password: string | undefined,
        modOptions: CoreCourseCommonModWSOptions,
        siteId: string,
    ): Promise<AddonModLessonGetAccessInformationWSResponse> {
        // The user didn't left during a timed session. Call launch retake to make sure there is a started retake.
        await AddonModLesson.launchRetake(lessonId, password, undefined, false, siteId);

        const results = await Promise.all([
            CorePromiseUtils.ignoreErrors(CoreFilepool.updatePackageDownloadTime(siteId, this.component, module.id)),
            AddonModLesson.getAccessInformation(lessonId, modOptions),
        ]);

        return results[1];
    }

    /**
     * Prefetch data to play the lesson in offline.
     *
     * @param lesson Lesson.
     * @param password Password (if needed).
     * @param retake Retake to prefetch.
     * @param modOptions Options.
     * @returns Promise resolved when done.
     */
    protected async prefetchPlayData(
        lesson: AddonModLessonLessonWSData,
        password: string | undefined,
        retake: number,
        modOptions: CoreCourseCommonModWSOptions,
    ): Promise<void> {
        const passwordOptions = {
            password,
            ...modOptions, // Include all mod options.
        };

        await Promise.all([
            this.prefetchPagesData(lesson, passwordOptions),
            // Prefetch user timers to be able to calculate timemodified in offline.
            CorePromiseUtils.ignoreErrors(AddonModLesson.getTimers(lesson.id, modOptions)),
            // Prefetch viewed pages in last retake to calculate progress.
            AddonModLesson.getContentPagesViewedOnline(lesson.id, retake, modOptions),
            // Prefetch question attempts in last retake for offline calculations.
            AddonModLesson.getQuestionsAttemptsOnline(lesson.id, retake, modOptions),
        ]);
    }

    /**
     * Prefetch data related to pages.
     *
     * @param lesson Lesson.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    protected async prefetchPagesData(
        lesson: AddonModLessonLessonWSData,
        options: AddonModLessonPasswordOptions,
    ): Promise<void> {
        const pages = await AddonModLesson.getPages(lesson.id, options);

        let hasRandomBranch = false;

        // Get the data for each page.
        const promises = pages.map(async (data) => {
            // Check if any page has a RANDOMBRANCH jump.
            if (!hasRandomBranch) {
                hasRandomBranch = data.jumps.some((jump) => jump === AddonModLessonJumpTo.RANDOMBRANCH);
            }

            // Get the page data. We don't pass accessInfo because we don't need to calculate the offline data.
            const pageData = await AddonModLesson.getPageData(lesson, data.page.id, {
                includeContents: true,
                includeOfflineData: false,
                ...options, // Include all options.
            });

            // Download the page files.
            let pageFiles = pageData.contentfiles || [];

            pageData.answers.forEach((answer) => {
                pageFiles = pageFiles.concat(answer.answerfiles);
                pageFiles = pageFiles.concat(answer.responsefiles);
            });

            await CoreFilepool.addFilesToQueue(options.siteId!, pageFiles, this.component, module.id);
        });

        // Prefetch the list of possible jumps for offline navigation. Do it here because we know hasRandomBranch.
        promises.push(this.prefetchPossibleJumps(lesson.id, hasRandomBranch, options));

        await Promise.all(promises);
    }

    /**
     * Prefetch possible jumps.
     *
     * @param lessonId Lesson ID.
     * @param hasRandomBranch Whether any page has a random branch jump.
     * @param modOptions Options.
     * @returns Promise resolved when done.
     */
    protected async prefetchPossibleJumps(
        lessonId: number,
        hasRandomBranch: boolean,
        modOptions: CoreCourseCommonModWSOptions,
    ): Promise<void> {
        try {
            await AddonModLesson.getPagesPossibleJumps(lessonId, modOptions);
        } catch (error) {
            if (hasRandomBranch) {
                // The WebSevice probably failed because RANDOMBRANCH aren't supported if the user hasn't seen any page.
                throw new CoreError(Translate.instant('addon.mod_lesson.errorprefetchrandombranch'));
            }

            throw error;
        }
    }

    /**
     * Prefetch group info.
     *
     * @param moduleId Module ID.
     * @param lessonId Lesson ID.
     * @param modOptions Options.
     * @returns Promise resolved when done.
     */
    protected async prefetchGroupInfo(
        moduleId: number,
        lessonId: number,
        modOptions: CoreCourseCommonModWSOptions,
    ): Promise<void> {
        const groupInfo = await CoreGroups.getActivityGroupInfo(moduleId, false, undefined, modOptions.siteId, true);

        await Promise.all(groupInfo.groups.map(async (group) => {
            await AddonModLesson.getRetakesOverview(lessonId, {
                groupId: group.id,
                ...modOptions, // Include all options.
            });
        }) || []);
    }

    /**
     * Prefetch reports data.
     *
     * @param moduleId Module ID.
     * @param lessonId Lesson ID.
     * @param modOptions Options.
     * @returns Promise resolved when done.
     */
    protected async prefetchReportsData(
        moduleId: number,
        lessonId: number,
        modOptions: CoreCourseCommonModWSOptions,
    ): Promise<void> {
        // Always get all participants, even if there are no groups.
        const data = await AddonModLesson.getRetakesOverview(lessonId, modOptions);
        if (!data || !data.students) {
            return;
        }

        // Prefetch the last retake for each user.
        await Promise.all(data.students.map(async (student) => {
            const lastRetake = student.attempts?.[student.attempts.length - 1];
            if (!lastRetake) {
                return;
            }

            const attempt = await AddonModLesson.getUserRetake(lessonId, lastRetake.try, {
                userId: student.id,
                ...modOptions, // Include all options.
            });

            if (!attempt?.answerpages) {
                return;
            }

            // Download embedded files in essays.
            const files: CoreWSFile[] = [];
            attempt.answerpages.forEach((answerPage) => {
                if (!answerPage.page || answerPage.page.qtype !== AddonModLessonPageSubtype.ESSAY) {
                    return;
                }

                answerPage.answerdata?.answers?.forEach((answer) => {
                    files.push(...CoreFilepool.extractDownloadableFilesFromHtmlAsFakeFileObjects(answer[0]));
                });
            });

            await CoreFilepool.addFilesToQueue(modOptions.siteId!, files, this.component, moduleId);
        }));
    }

    /**
     * Validate the password.
     *
     * @param lessonId Lesson ID.
     * @param accessInfo Lesson access info.
     * @param password Password to check.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    protected async validatePassword(
        lessonId: number,
        accessInfo: AddonModLessonGetAccessInformationWSResponse,
        password: string,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModLessonGetPasswordResult> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const lesson = await AddonModLesson.getLessonWithPassword(lessonId, {
            password,
            ...options, // Include all options.
        });

        // Password is ok, store it and return the data.
        await AddonModLesson.storePassword(lesson.id, password, options.siteId);

        return {
            password,
            lesson,
            accessInfo,
        };
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModLessonSyncResult> {
        return AddonModLessonSync.syncLesson(module.instance, false, false, siteId);
    }

}

export const AddonModLessonPrefetchHandler = makeSingleton(AddonModLessonPrefetchHandlerService);

/**
 * Options to pass to get lesson password.
 */
export type AddonModLessonGetPasswordOptions = CoreCourseCommonModWSOptions & {
    askPassword?: boolean; // True if we should ask for password if needed, false otherwise.
};

/**
 * Result of getLessonPassword.
 */
export type AddonModLessonGetPasswordResult = {
    password?: string;
    lesson?: AddonModLessonLessonWSData;
    accessInfo: AddonModLessonGetAccessInformationWSResponse;
};
