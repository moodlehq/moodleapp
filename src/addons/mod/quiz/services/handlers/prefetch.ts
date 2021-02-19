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

import { CoreConstants } from '@/core/constants';

import { Injectable } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseAnyModuleData, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModQuizAccessRuleDelegate } from '../access-rules-delegate';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizGetQuizAccessInformationWSResponse,
    AddonModQuizProvider,
    AddonModQuizQuizWSData,
} from '../quiz';
import { AddonModQuizHelper } from '../quiz-helper';
import { AddonModQuizSync, AddonModQuizSyncResult } from '../quiz-sync';

/**
 * Handler to prefetch quizzes.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModQuiz';
    modName = 'quiz';
    component = AddonModQuizProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^grades$|^gradeitems$|^questions$|^attempts$/;

    /**
     * Download the module.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param dirPath Path of the directory where to store all the content files.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param canStart If true, start a new attempt if needed.
     * @return Promise resolved when all content is downloaded.
     */
    download(
        module: CoreCourseAnyModuleData,
        courseId: number,
        dirPath?: string,
        single?: boolean,
        canStart: boolean = true,
    ): Promise<void> {
        // Same implementation for download and prefetch.
        return this.prefetch(module, courseId, single, dirPath, canStart);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the list of files.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getFiles(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<CoreWSExternalFile[]> {
        try {
            const quiz = await AddonModQuiz.instance.getQuiz(courseId, module.id);

            const files = this.getIntroFilesFromInstance(module, quiz);

            const attempts = await AddonModQuiz.instance.getUserAttempts(quiz.id, {
                cmId: module.id,
                readingStrategy: CoreSitesReadingStrategy.OnlyNetwork,
            });

            const attemptFiles = await this.getAttemptsFeedbackFiles(quiz, attempts);

            return files.concat(attemptFiles);
        } catch {
            // Quiz not found, return empty list.
            return [];
        }
    }

    /**
     * Get the list of downloadable files on feedback attemptss.
     *
     * @param quiz Quiz.
     * @param attempts Quiz user attempts.
     * @param siteId Site ID. If not defined, current site.
     * @return List of Files.
     */
    protected async getAttemptsFeedbackFiles(
        quiz: AddonModQuizQuizWSData,
        attempts: AddonModQuizAttemptWSData[],
        siteId?: string,
    ): Promise<CoreWSExternalFile[]> {
        const getInlineFiles = CoreSites.instance.getCurrentSite()?.isVersionGreaterEqualThan('3.2');
        let files: CoreWSExternalFile[] = [];

        await Promise.all(attempts.map(async (attempt) => {
            if (!AddonModQuiz.instance.isAttemptFinished(attempt.state)) {
                // Attempt not finished, no feedback files.
                return;
            }

            const attemptGrade = AddonModQuiz.instance.rescaleGrade(attempt.sumgrades, quiz, false);
            if (typeof attemptGrade == 'undefined') {
                return;
            }

            const feedback = await AddonModQuiz.instance.getFeedbackForGrade(quiz.id, Number(attemptGrade), {
                cmId: quiz.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.OnlyNetwork,
                siteId,
            });

            if (getInlineFiles && feedback.feedbackinlinefiles?.length) {
                files = files.concat(feedback.feedbackinlinefiles);
            } else if (feedback.feedbacktext && !getInlineFiles) {
                files = files.concat(
                    CoreFilepool.instance.extractDownloadableFilesFromHtmlAsFakeFileObjects(feedback.feedbacktext),
                );
            }
        }));

        return files;
    }

    /**
     * Gather some preflight data for an attempt. This function will start a new attempt if needed.
     *
     * @param quiz Quiz.
     * @param accessInfo Quiz access info returned by AddonModQuizProvider.getQuizAccessInformation.
     * @param attempt Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param askPreflight Whether it should ask for preflight data if needed.
     * @param modalTitle Lang key of the title to set to preflight modal (e.g. 'addon.mod_quiz.startattempt').
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the preflight data.
     */
    async getPreflightData(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        attempt?: AddonModQuizAttemptWSData,
        askPreflight?: boolean,
        title?: string,
        siteId?: string,
    ): Promise<Record<string, string>> {
        const preflightData: Record<string, string> = {};

        if (askPreflight) {
            // We can ask preflight, check if it's needed and get the data.
            await AddonModQuizHelper.instance.getAndCheckPreflightData(
                quiz,
                accessInfo,
                preflightData,
                attempt,
                false,
                true,
                title,
                siteId,
            );
        } else {
            // Get some fixed preflight data from access rules (data that doesn't require user interaction).
            const rules = accessInfo?.activerulenames || [];

            await AddonModQuizAccessRuleDelegate.instance.getFixedPreflightData(rules, quiz, preflightData, attempt, true, siteId);

            if (!attempt) {
                // We need to create a new attempt.
                await AddonModQuiz.instance.startAttempt(quiz.id, preflightData, false, siteId);
            }
        }

        return preflightData;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModQuiz.instance.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        // Invalidate the calls required to check if a quiz is downloadable.
        await Promise.all([
            AddonModQuiz.instance.invalidateQuizData(courseId),
            AddonModQuiz.instance.invalidateUserAttemptsForUser(module.instance!),
        ]);
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Whether the module can be downloaded. The promise should never be rejected.
     */
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        if (CoreSites.instance.getCurrentSite()?.isOfflineDisabled()) {
            // Don't allow downloading the quiz if offline is disabled to prevent wasting a lot of data when opening it.
            return false;
        }

        const siteId = CoreSites.instance.getCurrentSiteId();

        const quiz = await AddonModQuiz.instance.getQuiz(courseId, module.id, { siteId });

        if (quiz.allowofflineattempts !== 1 || quiz.hasquestions === 0) {
            return false;
        }

        // Not downloadable if we reached max attempts or the quiz has an unfinished attempt.
        const attempts = await AddonModQuiz.instance.getUserAttempts(quiz.id, {
            cmId: module.id,
            siteId,
        });

        const isLastFinished = !attempts.length || AddonModQuiz.instance.isAttemptFinished(attempts[attempts.length - 1].state);

        return quiz.attempts === 0 || quiz.attempts! > attempts.length || !isLastFinished;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Prefetch a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param dirPath Path of the directory where to store all the content files.
     * @param canStart If true, start a new attempt if needed.
     * @return Promise resolved when done.
     */
    async prefetch(
        module: SyncedModule,
        courseId?: number,
        single?: boolean,
        dirPath?: string,
        canStart: boolean = true,
    ): Promise<void> {
        if (module.attemptFinished) {
            // Delete the value so it does not block anything if true.
            delete module.attemptFinished;

            // Quiz got synced recently and an attempt has finished. Do not prefetch.
            return;
        }

        const siteId = CoreSites.instance.getCurrentSiteId();

        return this.prefetchPackage(module, courseId, this.prefetchQuiz.bind(this, module, courseId, single, siteId, canStart));
    }

    /**
     * Prefetch a quiz.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @param canStart If true, start a new attempt if needed.
     * @return Promise resolved when done.
     */
    protected async prefetchQuiz(
        module: CoreCourseAnyModuleData,
        courseId: number,
        single: boolean,
        siteId: string,
        canStart: boolean,
    ): Promise<void> {
        const commonOptions = {
            readingStrategy: CoreSitesReadingStrategy.OnlyNetwork,
            siteId,
        };
        const modOptions = {
            cmId: module.id,
            ...commonOptions, // Include all common options.
        };

        // Get quiz.
        const quiz = await AddonModQuiz.instance.getQuiz(courseId, module.id, commonOptions);

        const introFiles = this.getIntroFilesFromInstance(module, quiz);

        // Prefetch some quiz data.
        // eslint-disable-next-line prefer-const
        let [quizAccessInfo, attempts, attemptAccessInfo] = await Promise.all([
            AddonModQuiz.instance.getQuizAccessInformation(quiz.id, modOptions),
            AddonModQuiz.instance.getUserAttempts(quiz.id, modOptions),
            AddonModQuiz.instance.getAttemptAccessInformation(quiz.id, 0, modOptions),
            AddonModQuiz.instance.getQuizRequiredQtypes(quiz.id, modOptions),
            CoreFilepool.instance.addFilesToQueue(siteId, introFiles, AddonModQuizProvider.COMPONENT, module.id),
        ]);

        // Check if we need to start a new attempt.
        let attempt: AddonModQuizAttemptWSData | undefined = attempts[attempts.length - 1];
        let preflightData: Record<string, string> = {};
        let startAttempt = false;

        if (canStart || attempt) {
            if (canStart && (!attempt || AddonModQuiz.instance.isAttemptFinished(attempt.state))) {
                // Check if the user can attempt the quiz.
                if (attemptAccessInfo.preventnewattemptreasons.length) {
                    throw new CoreError(CoreTextUtils.instance.buildMessage(attemptAccessInfo.preventnewattemptreasons));
                }

                startAttempt = true;
                attempt = undefined;
            }

            // Get the preflight data. This function will also start a new attempt if needed.
            preflightData = await this.getPreflightData(quiz, quizAccessInfo, attempt, single, 'core.download', siteId);
        }

        const promises: Promise<unknown>[] = [];

        if (startAttempt) {
            // Re-fetch user attempts since we created a new one.
            promises.push(AddonModQuiz.instance.getUserAttempts(quiz.id, modOptions).then(async (atts) => {
                attempts = atts;

                const attemptFiles = await this.getAttemptsFeedbackFiles(quiz, attempts, siteId);

                return CoreFilepool.instance.addFilesToQueue(siteId, attemptFiles, AddonModQuizProvider.COMPONENT, module.id);
            }));

            // Update the download time to prevent detecting the new attempt as an update.
            promises.push(CoreUtils.instance.ignoreErrors(
                CoreFilepool.instance.updatePackageDownloadTime(siteId, AddonModQuizProvider.COMPONENT, module.id),
            ));
        } else {
            // Use the already fetched attempts.
            promises.push(this.getAttemptsFeedbackFiles(quiz, attempts, siteId).then((attemptFiles) =>
                CoreFilepool.instance.addFilesToQueue(siteId, attemptFiles, AddonModQuizProvider.COMPONENT, module.id)));
        }

        // Fetch attempt related data.
        promises.push(AddonModQuiz.instance.getCombinedReviewOptions(quiz.id, modOptions));
        promises.push(AddonModQuiz.instance.getUserBestGrade(quiz.id, modOptions));
        promises.push(this.prefetchGradeAndFeedback(quiz, modOptions, siteId));
        promises.push(AddonModQuiz.instance.getAttemptAccessInformation(quiz.id, 0, modOptions)); // Last attempt.

        await Promise.all(promises);

        // We have quiz data, now we'll get specific data for each attempt.
        await Promise.all(attempts.map(async (attempt) => {
            await this.prefetchAttempt(quiz, attempt, preflightData, siteId);
        }));

        if (!canStart) {
            // Nothing else to do.
            return;
        }

        // If there's nothing to send, mark the quiz as synchronized.
        const hasData = await AddonModQuizSync.instance.hasDataToSync(quiz.id, siteId);

        if (!hasData) {
            AddonModQuizSync.instance.setSyncTime(quiz.id, siteId);
        }
    }

    /**
     * Prefetch all WS data for an attempt.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param preflightData Preflight required data (like password).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the prefetch is finished. Data returned is not reliable.
     */
    async prefetchAttempt(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        preflightData: Record<string, string>,
        siteId?: string,
    ): Promise<void> {
        const pages = AddonModQuiz.instance.getPagesFromLayout(attempt.layout);
        const isSequential = AddonModQuiz.instance.isNavigationSequential(quiz);
        let promises: Promise<unknown>[] = [];

        const modOptions: CoreCourseCommonModWSOptions = {
            cmId: quiz.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.OnlyNetwork,
            siteId,
        };

        if (AddonModQuiz.instance.isAttemptFinished(attempt.state)) {
            // Attempt is finished, get feedback and review data.
            const attemptGrade = AddonModQuiz.instance.rescaleGrade(attempt.sumgrades, quiz, false);
            if (typeof attemptGrade != 'undefined') {
                promises.push(AddonModQuiz.instance.getFeedbackForGrade(quiz.id, Number(attemptGrade), modOptions));
            }

            // Get the review for each page.
            pages.forEach((page) => {
                promises.push(CoreUtils.instance.ignoreErrors(AddonModQuiz.instance.getAttemptReview(attempt.id, {
                    page,
                    ...modOptions, // Include all options.
                })));
            });

            // Get the review for all questions in same page.
            promises.push(this.prefetchAttemptReviewFiles(quiz, attempt, modOptions, siteId));
        } else {

            // Attempt not finished, get data needed to continue the attempt.
            promises.push(AddonModQuiz.instance.getAttemptAccessInformation(quiz.id, attempt.id, modOptions));
            promises.push(AddonModQuiz.instance.getAttemptSummary(attempt.id, preflightData, modOptions));

            if (attempt.state == AddonModQuizProvider.ATTEMPT_IN_PROGRESS) {
                // Get data for each page.
                promises = promises.concat(pages.map(async (page) => {
                    if (isSequential && page < attempt.currentpage!) {
                        // Sequential quiz, cannot get pages before the current one.
                        return;
                    }

                    const data = await AddonModQuiz.instance.getAttemptData(attempt.id, page, preflightData, modOptions);

                    // Download the files inside the questions.
                    await Promise.all(data.questions.map(async (question) => {
                        await CoreQuestionHelper.instance.prefetchQuestionFiles(
                            question,
                            this.component,
                            quiz.coursemodule,
                            siteId,
                            attempt.uniqueid,
                        );
                    }));

                }));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Prefetch attempt review and its files.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param options Other options.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchAttemptReviewFiles(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        modOptions: CoreCourseCommonModWSOptions,
        siteId?: string,
    ): Promise<void> {
        // Get the review for all questions in same page.
        const data = await CoreUtils.instance.ignoreErrors(AddonModQuiz.instance.getAttemptReview(attempt.id, {
            page: -1,
            ...modOptions, // Include all options.
        }));

        if (!data) {
            return;
        }
        // Download the files inside the questions.
        await Promise.all(data.questions.map((question) => {
            CoreQuestionHelper.instance.prefetchQuestionFiles(
                question,
                this.component,
                quiz.coursemodule,
                siteId,
                attempt.uniqueid,
            );
        }));
    }

    /**
     * Prefetch quiz grade and its feedback.
     *
     * @param quiz Quiz.
     * @param modOptions Other options.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchGradeAndFeedback(
        quiz: AddonModQuizQuizWSData,
        modOptions: CoreCourseCommonModWSOptions,
        siteId?: string,
    ): Promise<void> {
        try {
            const gradebookData = await AddonModQuiz.instance.getGradeFromGradebook(quiz.course, quiz.coursemodule, true, siteId);

            if (typeof gradebookData.graderaw != 'undefined') {
                await AddonModQuiz.instance.getFeedbackForGrade(quiz.id, gradebookData.graderaw, modOptions);
            }
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Prefetches some data for a quiz and its last attempt.
     * This function will NOT start a new attempt, it only reads data for the quiz and the last attempt.
     *
     * @param quiz Quiz.
     * @param askPreflight Whether it should ask for preflight data if needed.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async prefetchQuizAndLastAttempt(quiz: AddonModQuizQuizWSData, askPreflight?: boolean, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const modOptions = {
            cmId: quiz.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.OnlyNetwork,
            siteId,
        };

        // Get quiz data.
        const [quizAccessInfo, attempts] = await Promise.all([
            AddonModQuiz.instance.getQuizAccessInformation(quiz.id, modOptions),
            AddonModQuiz.instance.getUserAttempts(quiz.id, modOptions),
            AddonModQuiz.instance.getQuizRequiredQtypes(quiz.id, modOptions),
            AddonModQuiz.instance.getCombinedReviewOptions(quiz.id, modOptions),
            AddonModQuiz.instance.getUserBestGrade(quiz.id, modOptions),
            this.prefetchGradeAndFeedback(quiz, modOptions, siteId),
            AddonModQuiz.instance.getAttemptAccessInformation(quiz.id, 0, modOptions), // Last attempt.
        ]);

        const lastAttempt = attempts[attempts.length - 1];
        let preflightData: Record<string, string> = {};
        if (lastAttempt) {
            // Get the preflight data.
            preflightData = await this.getPreflightData(quiz, quizAccessInfo, lastAttempt, askPreflight, 'core.download', siteId);

            // Get data for last attempt.
            await this.prefetchAttempt(quiz, lastAttempt, preflightData, siteId);
        }

        // Prefetch finished, set the right status.
        await this.setStatusAfterPrefetch(quiz, {
            cmId: quiz.coursemodule,
            attempts,
            readingStrategy: CoreSitesReadingStrategy.PreferCache,
            siteId,
        });
    }

    /**
     * Set the right status to a quiz after prefetching.
     * If the last attempt is finished or there isn't one, set it as not downloaded to show download icon.
     *
     * @param quiz Quiz.
     * @param options Other options.
     * @return Promise resolved when done.
     */
    async setStatusAfterPrefetch(
        quiz: AddonModQuizQuizWSData,
        options: AddonModQuizSetStatusAfterPrefetchOptions = {},
    ): Promise<void> {
        options.siteId = options.siteId || CoreSites.instance.getCurrentSiteId();

        let attempts = options.attempts;

        if (!attempts) {
            // Get the attempts.
            attempts = await AddonModQuiz.instance.getUserAttempts(quiz.id, options);
        }

        // Check the current status of the quiz.
        const status = await CoreFilepool.instance.getPackageStatus(options.siteId, this.component, quiz.coursemodule);

        if (status === CoreConstants.NOT_DOWNLOADED) {
            return;
        }

        // Quiz was downloaded, set the new status.
        // If no attempts or last is finished we'll mark it as not downloaded to show download icon.
        const lastAttempt = attempts[attempts.length - 1];
        const isLastFinished = !lastAttempt || AddonModQuiz.instance.isAttemptFinished(lastAttempt.state);
        const newStatus = isLastFinished ? CoreConstants.NOT_DOWNLOADED : CoreConstants.DOWNLOADED;

        await CoreFilepool.instance.storePackageStatus(options.siteId, newStatus, this.component, quiz.coursemodule);
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async sync(module: SyncedModule, courseId: number, siteId?: string): Promise<AddonModQuizSyncResult | undefined> {
        const quiz = await AddonModQuiz.instance.getQuiz(courseId, module.id, { siteId });

        try {
            const result = await AddonModQuizSync.instance.syncQuiz(quiz, false, siteId);

            module.attemptFinished = result.attemptFinished || false;

            return result;
        } catch {
            // Ignore errors.
            module.attemptFinished = false;
        }
    }

}

export class AddonModQuizPrefetchHandler extends makeSingleton(AddonModQuizPrefetchHandlerService) {}

/**
 * Options to pass to setStatusAfterPrefetch.
 */
export type AddonModQuizSetStatusAfterPrefetchOptions = CoreCourseCommonModWSOptions & {
    attempts?: AddonModQuizAttemptWSData[]; // List of attempts. If not provided, they will be calculated.
};

/**
 * Module data with some calculated data.
 */
type SyncedModule = CoreCourseAnyModuleData & {
    attemptFinished?: boolean;
};
