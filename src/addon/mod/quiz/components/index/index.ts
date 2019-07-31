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

import { Component, Optional, Injector } from '@angular/core';
import { Content, NavController } from 'ionic-angular';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { CoreQuestionBehaviourDelegate } from '@core/question/providers/behaviour-delegate';
import { AddonModQuizProvider } from '../../providers/quiz';
import { AddonModQuizHelperProvider } from '../../providers/helper';
import { AddonModQuizOfflineProvider } from '../../providers/quiz-offline';
import { AddonModQuizSyncProvider } from '../../providers/quiz-sync';
import { AddonModQuizPrefetchHandler } from '../../providers/prefetch-handler';
import { CoreConstants } from '@core/constants';

/**
 * Component that displays a quiz entry page.
 */
@Component({
    selector: 'addon-mod-quiz-index',
    templateUrl: 'addon-mod-quiz-index.html',
})
export class AddonModQuizIndexComponent extends CoreCourseModuleMainActivityComponent {
    component = AddonModQuizProvider.COMPONENT;
    moduleName = 'quiz';

    quiz: any; // The quiz.
    now: number; // Current time.
    syncTime: string; // Last synchronization time.
    hasOffline: boolean; // Whether the quiz has offline data.
    hasSupportedQuestions: boolean; // Whether the quiz has at least 1 supported question.
    accessRules: string[]; // List of access rules of the quiz.
    unsupportedRules: string[]; // List of unsupported access rules of the quiz.
    unsupportedQuestions: string[]; // List of unsupported question types of the quiz.
    behaviourSupported: boolean; // Whether the quiz behaviour is supported.
    showResults: boolean; // Whether to show the result of the quiz (grade, etc.).
    gradeOverridden: boolean; // Whether grade has been overridden.
    gradebookFeedback: string; // The feedback in the gradebook.
    gradeResult: string; // Message with the grade.
    overallFeedback: string; // The feedback for the grade.
    buttonText: string; // Text to display in the start/continue button.
    preventMessages: string[]; // List of messages explaining why the quiz cannot be attempted.
    showStatusSpinner = true; // Whether to show a spinner due to quiz status.

    protected fetchContentDefaultError = 'addon.mod_quiz.errorgetquiz'; // Default error to show when loading contents.
    protected syncEventName = AddonModQuizSyncProvider.AUTO_SYNCED;

    protected quizData: any; // Quiz instance. This variable will store the quiz instance until it's ready to be shown
    protected autoReview: any; // Data to auto-review an attempt. It's used to automatically open the review page after finishing.
    protected quizAccessInfo: any; // Quiz access info.
    protected attemptAccessInfo: any; // Last attempt access info.
    protected attempts: any[]; // List of attempts the user has made.
    protected moreAttempts: boolean; // Whether user can create/continue attempts.
    protected options: any; // Combined review options.
    protected bestGrade: any; // Best grade data.
    protected gradebookData: {grade: number, feedback?: string}; // The gradebook grade and feedback.
    protected overallStats: boolean; // Equivalent to overallstats in mod_quiz_view_object in Moodle.
    protected finishedObserver: any; // It will observe attempt finished events.
    protected hasPlayed = false; // Whether the user has gone to the quiz player (attempted).

    constructor(injector: Injector, protected quizProvider: AddonModQuizProvider, @Optional() content: Content,
            protected quizHelper: AddonModQuizHelperProvider, protected quizOffline: AddonModQuizOfflineProvider,
            protected quizSync: AddonModQuizSyncProvider, protected behaviourDelegate: CoreQuestionBehaviourDelegate,
            protected prefetchHandler: AddonModQuizPrefetchHandler, protected navCtrl: NavController) {
        super(injector, content);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.loadContent(false, true).then(() => {
            if (!this.quizData) {
                return;
            }

            this.quizProvider.logViewQuiz(this.quizData.id, this.quizData.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch((error) => {
                // Ignore errors.
            });
        });

        // Listen for attempt finished events.
        this.finishedObserver = this.eventsProvider.on(AddonModQuizProvider.ATTEMPT_FINISHED_EVENT, (data) => {
            // Go to review attempt if an attempt in this quiz was finished and synced.
            if (this.quizData && data.quizId == this.quizData.id) {
                this.autoReview = data;
            }
        }, this.siteId);
    }

    /**
     * Attempt the quiz.
     */
    attemptQuiz(): void {
        if (this.showStatusSpinner) {
            // Quiz is being downloaded or synchronized, abort.
            return;
        }

        if (this.quizProvider.isQuizOffline(this.quizData)) {
            // Quiz supports offline, check if it needs to be downloaded.
            // If the site doesn't support check updates, always prefetch it because we cannot tell if there's something new.
            const isDownloaded = this.currentStatus == CoreConstants.DOWNLOADED;

            if (!isDownloaded || !this.modulePrefetchDelegate.canCheckUpdates()) {
                // Prefetch the quiz.
                this.showStatusSpinner = true;

                this.prefetchHandler.prefetch(this.module, this.courseId, true).then(() => {
                    // Success downloading, open quiz.
                    this.openQuiz();
                }).catch((error) => {
                    if (this.hasOffline || (isDownloaded && !this.modulePrefetchDelegate.canCheckUpdates())) {
                        // Error downloading but there is something offline, allow continuing it.
                        // If the site doesn't support check updates, continue too because we cannot tell if there's something new.
                        this.openQuiz();
                    } else {
                        this.domUtils.showErrorModalDefault(error, 'core.errordownloading', true);
                    }

                }).finally(() => {
                    this.showStatusSpinner = false;
                });
            } else {
                // Already downloaded, open it.
                this.openQuiz();
            }
        } else {
            // Quiz isn't offline, just open it.
            this.openQuiz();
        }
    }

    /**
     * Get the quiz data.
     *
     * @param {boolean} [refresh=false] If it's refreshing content.
     * @param {boolean} [sync=false] If it should try to sync.
     * @param {boolean} [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {

        // First get the quiz instance.
        return this.quizProvider.getQuiz(this.courseId, this.module.id).then((quizData) => {
            this.quizData = quizData;
            this.quizData.gradeMethodReadable = this.quizProvider.getQuizGradeMethod(this.quizData.grademethod);

            this.now = new Date().getTime();
            this.dataRetrieved.emit(this.quizData);
            this.description = this.quizData.intro || this.description;

            // Try to get warnings from automatic sync.
            return this.quizSync.getSyncWarnings(this.quizData.id).then((warnings) => {
                if (warnings && warnings.length) {
                    // Show warnings and delete them so they aren't shown again.
                    this.domUtils.showErrorModal(this.textUtils.buildMessage(warnings));

                    return this.quizSync.setSyncWarnings(this.quizData.id, []);
                }
            });
        }).then(() => {
            if (this.quizProvider.isQuizOffline(this.quizData)) {
                // Try to sync the quiz.
                return this.syncActivity(showErrors).catch(() => {
                    // Ignore errors, keep getting data even if sync fails.
                    this.autoReview = undefined;
                });
            } else {
                this.autoReview = undefined;
                this.showStatusSpinner = false;
            }
        }).then(() => {

            if (this.quizProvider.isQuizOffline(this.quizData)) {
                // Handle status.
                this.setStatusListener();

                // Get last synchronization time and check if sync button should be seen.
                // No need to return these promises, they should be faster than the rest.
                this.quizSync.getReadableSyncTime(this.quizData.id).then((syncTime) => {
                    this.syncTime = syncTime;
                });

                this.quizSync.hasDataToSync(this.quizData.id).then((hasOffline) => {
                    this.hasOffline = hasOffline;
                });
            }

            // Get quiz access info.
            return this.quizProvider.getQuizAccessInformation(this.quizData.id).then((info) => {
                this.quizAccessInfo = info;
                this.quizData.showReviewColumn = info.canreviewmyattempts;
                this.accessRules = info.accessrules;
                this.unsupportedRules = this.quizProvider.getUnsupportedRules(info.activerulenames);

                if (this.quizData.preferredbehaviour) {
                    this.behaviourSupported = this.behaviourDelegate.isBehaviourSupported(this.quizData.preferredbehaviour);
                }

                // Get question types in the quiz.
                return this.quizProvider.getQuizRequiredQtypes(this.quizData.id).then((types) => {
                    this.unsupportedQuestions = this.quizProvider.getUnsupportedQuestions(types);
                    this.hasSupportedQuestions = !!types.find((type) => {
                        return type != 'random' && this.unsupportedQuestions.indexOf(type) == -1;
                    });

                    return this.getAttempts();
                });
            });

        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);

            // Quiz is ready to be shown, move it to the variable that is displayed.
            this.quiz = this.quizData;
        });
    }

    /**
     * Get the user attempts in the quiz and the result info.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected getAttempts(): Promise<void> {

        // Get access information of last attempt (it also works if no attempts made).
        return this.quizProvider.getAttemptAccessInformation(this.quizData.id, 0).then((info) => {
            this.attemptAccessInfo = info;

            // Get attempts.
            return this.quizProvider.getUserAttempts(this.quizData.id).then((atts) => {

                return this.treatAttempts(atts).then((atts) => {
                    this.attempts = atts;

                    // Check if user can create/continue attempts.
                    if (this.attempts.length) {
                        const last = this.attempts[this.attempts.length - 1];
                        this.moreAttempts = !this.quizProvider.isAttemptFinished(last.state) || !this.attemptAccessInfo.isfinished;
                    } else {
                        this.moreAttempts = !this.attemptAccessInfo.isfinished;
                    }

                    this.getButtonText();

                    return this.getResultInfo();
                });
            });
        });
    }

    /**
     * Get the text to show in the button. It also sets restriction messages if needed.
     */
    protected getButtonText(): void {
        this.buttonText = '';

        if (this.quizData.hasquestions !== 0) {
            if (this.attempts.length && !this.quizProvider.isAttemptFinished(this.attempts[this.attempts.length - 1].state)) {
                // Last attempt is unfinished.
                if (this.quizAccessInfo.canattempt) {
                    this.buttonText = 'addon.mod_quiz.continueattemptquiz';
                } else if (this.quizAccessInfo.canpreview) {
                    this.buttonText = 'addon.mod_quiz.continuepreview';
                }

            } else {
                // Last attempt is finished or no attempts.
                if (this.quizAccessInfo.canattempt) {
                    this.preventMessages = this.attemptAccessInfo.preventnewattemptreasons;
                    if (!this.preventMessages.length) {
                        if (!this.attempts.length) {
                            this.buttonText = 'addon.mod_quiz.attemptquiznow';
                        } else {
                            this.buttonText = 'addon.mod_quiz.reattemptquiz';
                        }
                    }
                } else if (this.quizAccessInfo.canpreview) {
                    this.buttonText = 'addon.mod_quiz.previewquiznow';
                }
            }
        }

        if (this.buttonText) {
            // So far we think a button should be printed, check if they will be allowed to access it.
            this.preventMessages = this.quizAccessInfo.preventaccessreasons;

            if (!this.moreAttempts) {
                this.buttonText = '';
            } else if (this.quizAccessInfo.canattempt && this.preventMessages.length) {
                this.buttonText = '';
            } else if (!this.hasSupportedQuestions || this.unsupportedRules.length || !this.behaviourSupported) {
                this.buttonText = '';
            }
        }
    }

    /**
     * Get result info to show.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected getResultInfo(): Promise<void> {

        if (this.attempts.length && this.quizData.showGradeColumn && this.bestGrade.hasgrade &&
                typeof this.gradebookData.grade != 'undefined') {

            const formattedGradebookGrade = this.quizProvider.formatGrade(this.gradebookData.grade, this.quizData.decimalpoints),
                formattedBestGrade = this.quizProvider.formatGrade(this.bestGrade.grade, this.quizData.decimalpoints);
            let gradeToShow = formattedGradebookGrade; // By default we show the grade in the gradebook.

            this.showResults = true;
            this.gradeOverridden = formattedGradebookGrade != formattedBestGrade;
            this.gradebookFeedback = this.gradebookData.feedback;

            if (this.bestGrade.grade > this.gradebookData.grade && this.gradebookData.grade == this.quizData.grade) {
                // The best grade is higher than the max grade for the quiz.
                // We'll do like Moodle web and show the best grade instead of the gradebook grade.
                this.gradeOverridden = false;
                gradeToShow = formattedBestGrade;
            }

            if (this.overallStats) {
                // Show the quiz grade. The message shown is different if the quiz is finished.
                if (this.moreAttempts) {
                    this.gradeResult = this.translate.instant('addon.mod_quiz.gradesofar', {$a: {
                        method: this.quizData.gradeMethodReadable,
                        mygrade: gradeToShow,
                        quizgrade: this.quizData.gradeFormatted
                    }});
                } else {
                    const outOfShort = this.translate.instant('addon.mod_quiz.outofshort', {$a: {
                        grade: gradeToShow,
                        maxgrade: this.quizData.gradeFormatted
                    }});

                    this.gradeResult = this.translate.instant('addon.mod_quiz.yourfinalgradeis', {$a: outOfShort});
                }
            }

            if (this.quizData.showFeedbackColumn) {
                // Get the quiz overall feedback.
                return this.quizProvider.getFeedbackForGrade(this.quizData.id, this.gradebookData.grade).then((response) => {
                    this.overallFeedback = response.feedbacktext;
                });
            }
        } else {
            this.showResults = false;
        }

        return Promise.resolve();
    }

    /**
     * Go to review an attempt that has just been finished.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected goToAutoReview(): Promise<any> {
        // If we go to auto review it means an attempt was finished. Check completion status.
        this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);

        // Verify that user can see the review.
        const attemptId = this.autoReview.attemptId;

        if (this.quizAccessInfo.canreviewmyattempts) {
            return this.quizProvider.getAttemptReview(attemptId, -1).then(() => {
                this.navCtrl.push('AddonModQuizReviewPage', {courseId: this.courseId, quizId: this.quizData.id, attemptId});
            }).catch(() => {
                // Ignore errors.
            });
        }

        return Promise.resolve();
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param {any} result Data returned on the sync function.
     * @return {boolean} If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        if (result.attemptFinished) {
            // An attempt was finished, check completion status.
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }

        // If the sync call isn't rejected it means the sync was successful.
        return result.answersSent;
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        if (this.hasPlayed) {
            this.hasPlayed = false;

            // Update data when we come back from the player since the attempt status could have changed.
            let promise;

            // Check if we need to go to review an attempt automatically.
            if (this.autoReview && this.autoReview.synced) {
                promise = this.goToAutoReview();
                this.autoReview = undefined;
            } else {
                promise = Promise.resolve();
            }

            // Refresh data.
            this.loaded = false;
            this.refreshIcon = 'spinner';
            this.syncIcon = 'spinner';
            this.domUtils.scrollToTop(this.content);

            promise.then(() => {
                this.refreshContent().finally(() => {
                    this.loaded = true;
                    this.refreshIcon = 'refresh';
                    this.syncIcon = 'sync';
                });
            });
        } else {
            this.autoReview = undefined;
        }
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();
        this.autoReview = undefined;

        if (this.navCtrl.getActive().component.name == 'AddonModQuizPlayerPage') {
            this.hasPlayed = true;
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.quizProvider.invalidateQuizData(this.courseId));

        if (this.quizData) {
            promises.push(this.quizProvider.invalidateUserAttemptsForUser(this.quizData.id));
            promises.push(this.quizProvider.invalidateQuizAccessInformation(this.quizData.id));
            promises.push(this.quizProvider.invalidateQuizRequiredQtypes(this.quizData.id));
            promises.push(this.quizProvider.invalidateAttemptAccessInformation(this.quizData.id));
            promises.push(this.quizProvider.invalidateCombinedReviewOptionsForUser(this.quizData.id));
            promises.push(this.quizProvider.invalidateUserBestGradeForUser(this.quizData.id));
            promises.push(this.quizProvider.invalidateGradeFromGradebook(this.courseId));
        }

        return Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param {any} syncEventData Data receiven on sync observer.
     * @return {boolean} True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        if (syncEventData.attemptFinished) {
            // An attempt was finished, check completion status.
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }

        if (this.quizData && syncEventData.quizId == this.quizData.id) {
            this.domUtils.scrollToTop(this.content);

            return true;
        }

        return false;
    }

    /**
     * Open a quiz to attempt it.
     */
    protected openQuiz(): void {
        this.navCtrl.push('AddonModQuizPlayerPage', {courseId: this.courseId, quizId: this.quiz.id, moduleUrl: this.module.url});
    }

    /**
     * Displays some data based on the current status.
     *
     * @param {string} status The current status.
     * @param {string} [previousStatus] The previous status. If not defined, there is no previous status.
     */
    protected showStatus(status: string, previousStatus?: string): void {
        this.showStatusSpinner = status == CoreConstants.DOWNLOADING;

        if (status == CoreConstants.DOWNLOADED && previousStatus == CoreConstants.DOWNLOADING) {
            // Quiz downloaded now, maybe a new attempt was created. Load content again.
            this.loaded = false;
            this.loadContent();
        }
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.quizSync.syncQuiz(this.quizData, true);
    }

    /**
     * Treat user attempts.
     *
     * @param {any} attempts The attempts to treat.
     * @return {Promise<void>} Promise resolved when done.
     */
    protected treatAttempts(attempts: any): Promise<any> {
        if (!attempts || !attempts.length) {
            // There are no attempts to treat.
            return Promise.resolve(attempts);
        }

        const lastFinished = this.quizProvider.getLastFinishedAttemptFromList(attempts),
            promises = [];

        if (this.autoReview && lastFinished && lastFinished.id >= this.autoReview.attemptId) {
            // User just finished an attempt in offline and it seems it's been synced, since it's finished in online.
            // Go to the review of this attempt if the user hasn't left this view.
            if (!this.isDestroyed && this.isCurrentView) {
                promises.push(this.goToAutoReview());
            }
            this.autoReview = undefined;
        }

        // Load flag to show if attempts are finished but not synced.
        promises.push(this.quizProvider.loadFinishedOfflineData(attempts));

        // Get combined review options.
        promises.push(this.quizProvider.getCombinedReviewOptions(this.quizData.id).then((result) => {
            this.options = result;
        }));

        // Get best grade.
        promises.push(this.quizProvider.getUserBestGrade(this.quizData.id).then((best) => {
            this.bestGrade = best;

            // Get gradebook grade.
            return this.quizProvider.getGradeFromGradebook(this.courseId, this.module.id).then((data) => {
                this.gradebookData = {
                    grade: data.graderaw,
                    feedback: data.feedback
                };
            }).catch(() => {
                // Fallback to quiz best grade if failure or not found.
                this.gradebookData = {
                    grade: this.bestGrade.grade
                };
            });
        }));

        return Promise.all(promises).then(() => {
            const grade: number = typeof this.gradebookData.grade != 'undefined' ? this.gradebookData.grade : this.bestGrade.grade,
                quizGrade = this.quizProvider.formatGrade(grade, this.quizData.decimalpoints);

            // Calculate data to construct the header of the attempts table.
            this.quizHelper.setQuizCalculatedData(this.quizData, this.options);

            this.overallStats = lastFinished && this.options.alloptions.marks >= AddonModQuizProvider.QUESTION_OPTIONS_MARK_AND_MAX;

            // Calculate data to show for each attempt.
            attempts.forEach((attempt) => {
                // Highlight the highest grade if appropriate.
                const shouldHighlight = this.overallStats && this.quizData.grademethod == AddonModQuizProvider.GRADEHIGHEST &&
                        attempts.length > 1;

                this.quizHelper.setAttemptCalculatedData(this.quizData, attempt, shouldHighlight, quizGrade);
            });

            return attempts;
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.finishedObserver && this.finishedObserver.off();
    }
}
