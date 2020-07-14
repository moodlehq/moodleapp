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

import { Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { AddonModQuizProvider } from './quiz';
import { AddonModQuizHelperProvider } from './helper';
import { AddonModQuizAccessRuleDelegate } from './access-rules-delegate';
import { AddonModQuizSyncProvider } from './quiz-sync';
import { CoreConstants } from '@core/constants';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

/**
 * Handler to prefetch quizzes.
 */
@Injectable()
export class AddonModQuizPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModQuiz';
    modName = 'quiz';
    component = AddonModQuizProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^grades$|^gradeitems$|^questions$|^attempts$/;

    protected syncProvider: AddonModQuizSyncProvider; // It will be injected later to prevent circular dependencies.

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected injector: Injector,
            protected quizProvider: AddonModQuizProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected quizHelper: AddonModQuizHelperProvider,
            protected accessRuleDelegate: AddonModQuizAccessRuleDelegate,
            protected questionHelper: CoreQuestionHelperProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

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
    download(module: any, courseId: number, dirPath?: string, single?: boolean, canStart: boolean = true): Promise<any> {
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
    getFiles(module: any, courseId: number, single?: boolean): Promise<any[]> {
        return this.quizProvider.getQuiz(courseId, module.id).then((quiz) => {
            const files = this.getIntroFilesFromInstance(module, quiz);

            return this.quizProvider.getUserAttempts(quiz.id, 'all', true, false, true).then((attempts) => {
                return this.getAttemptsFeedbackFiles(quiz, attempts).then((attemptFiles) => {
                    return files.concat(attemptFiles);
                });
            });
        }).catch(() => {
            // Quiz not found, return empty list.
            return [];
        });
    }

    /**
     * Get the list of downloadable files on feedback attemptss.
     *
     * @param quiz Quiz.
     * @param attempts Quiz user attempts.
     * @return List of Files.
     */
    protected getAttemptsFeedbackFiles(quiz: any, attempts: any[]): Promise<any[]> {
        // We have quiz data, now we'll get specific data for each attempt.
        const promises = [];
        const getInlineFiles = this.sitesProvider.getCurrentSite() &&
                this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.2');
        let files = [];

        attempts.forEach((attempt) => {
            if (this.quizProvider.isAttemptFinished(attempt.state)) {
                // Attempt is finished, get feedback and review data.

                const attemptGrade = this.quizProvider.rescaleGrade(attempt.sumgrades, quiz, false);
                if (typeof attemptGrade != 'undefined') {
                    promises.push(this.quizProvider.getFeedbackForGrade(quiz.id, Number(attemptGrade), true)
                        .then((feedback) => {
                            if (getInlineFiles && feedback.feedbackinlinefiles && feedback.feedbackinlinefiles.length) {
                                files = files.concat(feedback.feedbackinlinefiles);
                            } else if (feedback.feedbacktext && !getInlineFiles) {
                                files = files.concat(
                                    this.filepoolProvider.extractDownloadableFilesFromHtmlAsFakeFileObjects(feedback.feedbacktext));
                            }
                    }));
                }
            }
        });

        return Promise.all(promises).then(() => {
            return files;
        });
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
    getPreflightData(quiz: any, accessInfo: any, attempt?: any, askPreflight?: boolean, title?: string, siteId?: string)
            : Promise<any> {
        const preflightData = {};
        let promise;

        if (askPreflight) {
            // We can ask preflight, check if it's needed and get the data.
            promise = this.quizHelper.getAndCheckPreflightData(
                    quiz, accessInfo, preflightData, attempt, false, true, title, siteId);
        } else {
            // Get some fixed preflight data from access rules (data that doesn't require user interaction).
            const rules = accessInfo && accessInfo.activerulenames;

            promise = this.accessRuleDelegate.getFixedPreflightData(rules, quiz, preflightData, attempt, true, siteId).then(() => {
                if (!attempt) {
                    // We need to create a new attempt.
                    return this.quizProvider.startAttempt(quiz.id, preflightData, false, siteId);
                }
            });
        }

        return promise.then(() => {
            return preflightData;
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.quizProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        // Invalidate the calls required to check if a quiz is downloadable.
        const promises = [];

        promises.push(this.quizProvider.invalidateQuizData(courseId));
        promises.push(this.quizProvider.invalidateUserAttemptsForUser(module.instance));

        return Promise.all(promises);
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable(module: any, courseId: number): boolean | Promise<boolean> {
        if (this.sitesProvider.getCurrentSite().isOfflineDisabled()) {
            // Don't allow downloading the quiz if offline is disabled to prevent wasting a lot of data when opening it.
            return false;
        }

        const siteId = this.sitesProvider.getCurrentSiteId();

        return this.quizProvider.getQuiz(courseId, module.id, false, false, siteId).then((quiz) => {
            if (quiz.allowofflineattempts !== 1 || quiz.hasquestions === 0) {
                return false;
            }

            // Not downloadable if we reached max attempts or the quiz has an unfinished attempt.
            return this.quizProvider.getUserAttempts(quiz.id, undefined, true, false, false, siteId).then((attempts) => {
                const isLastFinished = !attempts.length || this.quizProvider.isAttemptFinished(attempts[attempts.length - 1].state);

                return quiz.attempts === 0 || quiz.attempts > attempts.length || !isLastFinished;
            });
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.quizProvider.isPluginEnabled();
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
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string, canStart: boolean = true): Promise<any> {
        if (module.attemptFinished) {
            // Delete the value so it does not block anything if true.
            delete module.attemptFinished;

            // Quiz got synced recently and an attempt has finished. Do not prefetch.
            return Promise.resolve();
        }

        return this.prefetchPackage(module, courseId, single, this.prefetchQuiz.bind(this), undefined, canStart);

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
    protected prefetchQuiz(module: any, courseId: number, single: boolean, siteId: string, canStart: boolean): Promise<any> {
        let attempts: any[],
            startAttempt = false,
            quiz,
            quizAccessInfo,
            attemptAccessInfo,
            preflightData;

        // Get quiz.
        return this.quizProvider.getQuiz(courseId, module.id, false, true, siteId).then((quizData) => {
            quiz = quizData;

            const promises = [],
                introFiles = this.getIntroFilesFromInstance(module, quiz);

            // Prefetch some quiz data.
            promises.push(this.quizProvider.getQuizAccessInformation(quiz.id, false, true, siteId).then((info) => {
                quizAccessInfo = info;
            }));
            promises.push(this.quizProvider.getQuizRequiredQtypes(quiz.id, true, siteId));
            promises.push(this.quizProvider.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then((atts) => {
                attempts = atts;

                return this.getAttemptsFeedbackFiles(quiz, attempts).then((attemptFiles) => {
                    return this.filepoolProvider.addFilesToQueue(siteId, attemptFiles, AddonModQuizProvider.COMPONENT, module.id);
                });
            }));
            promises.push(this.quizProvider.getAttemptAccessInformation(quiz.id, 0, false, true, siteId).then((info) => {
                attemptAccessInfo = info;
            }));

            promises.push(this.filepoolProvider.addFilesToQueue(siteId, introFiles, AddonModQuizProvider.COMPONENT, module.id));

            return Promise.all(promises);
        }).then(() => {
            // Check if we need to start a new attempt.
            let attempt = attempts[attempts.length - 1];

            if (!canStart && !attempt) {
                // No attempts and we won't start a new one, so we don't need preflight data.
                return;
            }

            if (canStart && (!attempt || this.quizProvider.isAttemptFinished(attempt.state))) {
                // Check if the user can attempt the quiz.
                if (attemptAccessInfo.preventnewattemptreasons.length) {
                    return Promise.reject(this.textUtils.buildMessage(attemptAccessInfo.preventnewattemptreasons));
                }

                startAttempt = true;
                attempt = undefined;
            }

            // Get the preflight data. This function will also start a new attempt if needed.
            return this.getPreflightData(quiz, quizAccessInfo, attempt, single, 'core.download', siteId);

        }).then((data) => {
            preflightData = data;

            const promises = [];

            if (startAttempt) {
                // Re-fetch user attempts since we created a new one.
                promises.push(this.quizProvider.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then((atts) => {
                    attempts = atts;

                    return this.getAttemptsFeedbackFiles(quiz, attempts).then((attemptFiles) => {
                        return this.filepoolProvider.addFilesToQueue(siteId, attemptFiles, AddonModQuizProvider.COMPONENT,
                            module.id);
                    });
                }));

                // Update the download time to prevent detecting the new attempt as an update.
                promises.push(this.filepoolProvider.updatePackageDownloadTime(siteId, AddonModQuizProvider.COMPONENT, module.id)
                        .catch(() => {
                    // Ignore errors.
                }));
            }

            // Fetch attempt related data.
            promises.push(this.quizProvider.getCombinedReviewOptions(quiz.id, true, siteId));
            promises.push(this.quizProvider.getUserBestGrade(quiz.id, true, siteId));
            promises.push(this.quizProvider.getGradeFromGradebook(courseId, module.id, true, siteId).then((gradebookData) => {
                if (typeof gradebookData.graderaw != 'undefined') {
                    return this.quizProvider.getFeedbackForGrade(quiz.id, gradebookData.graderaw, true, siteId);
                }
            }).catch(() => {
                // Ignore errors.
            }));
            promises.push(this.quizProvider.getAttemptAccessInformation(quiz.id, 0, false, true, siteId)); // Last attempt.

            return Promise.all(promises);
        }).then(() => {
            // We have quiz data, now we'll get specific data for each attempt.
            const promises = [];

            attempts.forEach((attempt) => {
                promises.push(this.prefetchAttempt(quiz, attempt, preflightData, siteId));
            });

            return Promise.all(promises);
        }).then(() => {
            if (!canStart) {
                // Nothing else to do.
                return;
            }

            // If there's nothing to send, mark the quiz as synchronized.
            // We don't return the promises because it should be fast and we don't want to block the user for this.
            if (!this.syncProvider) {
                this.syncProvider = this.injector.get(AddonModQuizSyncProvider);
            }

            this.syncProvider.hasDataToSync(quiz.id, siteId).then((hasData) => {
                if (!hasData) {
                    this.syncProvider.setSyncTime(quiz.id, siteId);
                }
            });
        });
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
    prefetchAttempt(quiz: any, attempt: any, preflightData: any, siteId?: string): Promise<any> {
        const pages = this.quizProvider.getPagesFromLayout(attempt.layout),
            promises = [],
            isSequential = this.quizProvider.isNavigationSequential(quiz);

        if (this.quizProvider.isAttemptFinished(attempt.state)) {
            // Attempt is finished, get feedback and review data.

            const attemptGrade = this.quizProvider.rescaleGrade(attempt.sumgrades, quiz, false);
            if (typeof attemptGrade != 'undefined') {
                promises.push(this.quizProvider.getFeedbackForGrade(quiz.id, Number(attemptGrade), true, siteId));
            }

            // Get the review for each page.
            pages.forEach((page) => {
                promises.push(this.quizProvider.getAttemptReview(attempt.id, page, true, siteId).catch(() => {
                    // Ignore failures, maybe the user can't review the attempt.
                }));
            });

             // Get the review for all questions in same page.
            promises.push(this.quizProvider.getAttemptReview(attempt.id, -1, true, siteId).then((data) => {
                // Download the files inside the questions.
                const questionPromises = [];

                data.questions.forEach((question) => {
                    questionPromises.push(this.questionHelper.prefetchQuestionFiles(
                            question, this.component, quiz.coursemodule, siteId, attempt.uniqueid));
                });

                return Promise.all(questionPromises);
            }, () => {
                // Ignore failures, maybe the user can't review the attempt.
            }));
        } else {

            // Attempt not finished, get data needed to continue the attempt.
            promises.push(this.quizProvider.getAttemptAccessInformation(quiz.id, attempt.id, false, true, siteId));
            promises.push(this.quizProvider.getAttemptSummary(attempt.id, preflightData, false, true, false, siteId));

            if (attempt.state == AddonModQuizProvider.ATTEMPT_IN_PROGRESS) {
                // Get data for each page.
                pages.forEach((page) => {
                    if (isSequential && page < attempt.currentpage) {
                        // Sequential quiz, cannot get pages before the current one.
                        return;
                    }

                    promises.push(this.quizProvider.getAttemptData(attempt.id, page, preflightData, false, true, siteId)
                            .then((data) => {
                        // Download the files inside the questions.
                        const questionPromises = [];

                        data.questions.forEach((question) => {
                            questionPromises.push(this.questionHelper.prefetchQuestionFiles(
                                    question, this.component, quiz.coursemodule, siteId, attempt.uniqueid));
                        });

                        return Promise.all(questionPromises);
                    }));
                });
            }
        }

        return Promise.all(promises);
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
    prefetchQuizAndLastAttempt(quiz: any, askPreflight?: boolean, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];
        let attempts,
            quizAccessInfo,
            preflightData,
            lastAttempt;

        // Get quiz data.
        promises.push(this.quizProvider.getQuizAccessInformation(quiz.id, false, true, siteId).then((info) => {
            quizAccessInfo = info;
        }));
        promises.push(this.quizProvider.getQuizRequiredQtypes(quiz.id, true, siteId));
        promises.push(this.quizProvider.getCombinedReviewOptions(quiz.id, true, siteId));
        promises.push(this.quizProvider.getUserBestGrade(quiz.id, true, siteId));
        promises.push(this.quizProvider.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then((atts) => {
            attempts = atts;
        }));
        promises.push(this.quizProvider.getGradeFromGradebook(quiz.course, quiz.coursemodule, true, siteId)
                .then((gradebookData) => {
            if (typeof gradebookData.graderaw != 'undefined') {
                return this.quizProvider.getFeedbackForGrade(quiz.id, gradebookData.graderaw, true, siteId);
            }
        }).catch(() => {
            // Ignore errors.
        }));
        promises.push(this.quizProvider.getAttemptAccessInformation(quiz.id, 0, false, true, siteId)); // Last attempt.

        return Promise.all(promises).then(() => {
            lastAttempt = attempts[attempts.length - 1];
            if (!lastAttempt) {
                // No need to get attempt data, we don't need preflight data.
                return;
            }

            // Get the preflight data.
            return this.getPreflightData(quiz, quizAccessInfo, lastAttempt, askPreflight, 'core.download', siteId);

        }).then((data) => {
            preflightData = data;

            if (lastAttempt) {
                // Get data for last attempt.
                return this.prefetchAttempt(quiz, lastAttempt, preflightData, siteId);
            }
        }).then(() => {
            // Prefetch finished, set the right status.
            return this.setStatusAfterPrefetch(quiz, attempts, true, false, siteId);
        });
    }

    /**
     * Set the right status to a quiz after prefetching.
     * If the last attempt is finished or there isn't one, set it as not downloaded to show download icon.
     *
     * @param quiz Quiz.
     * @param attempts List of attempts. If not provided, they will be calculated.
     * @param forceCache Whether it should always return cached data. Only if attempts is undefined.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down). Only if
     *                    attempts is undefined.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    setStatusAfterPrefetch(quiz: any, attempts?: any[], forceCache?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];
        let status;

        if (!attempts) {
            // Get the attempts.
            promises.push(this.quizProvider.getUserAttempts(quiz.id, 'all', true, forceCache, ignoreCache, siteId).then((atts) => {
                attempts = atts;
            }));
        }

        // Check the current status of the quiz.
        promises.push(this.filepoolProvider.getPackageStatus(siteId, this.component, quiz.coursemodule).then((stat) => {
            status = stat;
        }));

        return Promise.all(promises).then(() => {

            if (status !== CoreConstants.NOT_DOWNLOADED) {
                // Quiz was downloaded, set the new status.
                // If no attempts or last is finished we'll mark it as not downloaded to show download icon.
                const lastAttempt = attempts[attempts.length - 1],
                    isLastFinished = !lastAttempt || this.quizProvider.isAttemptFinished(lastAttempt.state),
                    newStatus = isLastFinished ? CoreConstants.NOT_DOWNLOADED : CoreConstants.DOWNLOADED;

                return this.filepoolProvider.storePackageStatus(siteId, newStatus, this.component, quiz.coursemodule);
            }
        });
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    sync(module: any, courseId: number, siteId?: any): Promise<any> {
        if (!this.syncProvider) {
            this.syncProvider = this.injector.get(AddonModQuizSyncProvider);
        }

        return this.quizProvider.getQuiz(courseId, module.id).then((quiz) => {
            return this.syncProvider.syncQuiz(quiz, false, siteId).then((results) => {
                module.attemptFinished = (results && results.attemptFinished) || false;

                return results;
            }).catch(() => {
                // Ignore errors.

                module.attemptFinished = false;
            });
        });
    }
}
