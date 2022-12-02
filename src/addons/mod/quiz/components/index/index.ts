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
import { Component, OnDestroy, OnInit, Optional } from '@angular/core';

import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreQuestionBehaviourDelegate } from '@features/question/services/behaviour-delegate';
import { IonContent } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonModQuizModuleHandlerService } from '../../services/handlers/module';
import { AddonModQuizPrefetchHandler } from '../../services/handlers/prefetch';
import {
    AddonModQuiz,
    AddonModQuizAttemptFinishedData,
    AddonModQuizAttemptWSData,
    AddonModQuizCombinedReviewOptions,
    AddonModQuizGetAttemptAccessInformationWSResponse,
    AddonModQuizGetQuizAccessInformationWSResponse,
    AddonModQuizGetUserBestGradeWSResponse,
    AddonModQuizProvider,
} from '../../services/quiz';
import { AddonModQuizAttempt, AddonModQuizHelper, AddonModQuizQuizData } from '../../services/quiz-helper';
import {
    AddonModQuizAutoSyncData,
    AddonModQuizSync,
    AddonModQuizSyncProvider,
    AddonModQuizSyncResult,
} from '../../services/quiz-sync';

/**
 * Component that displays a quiz entry page.
 */
@Component({
    selector: 'addon-mod-quiz-index',
    templateUrl: 'addon-mod-quiz-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModQuizIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    component = AddonModQuizProvider.COMPONENT;
    moduleName = 'quiz';
    quiz?: AddonModQuizQuizData; // The quiz.
    now?: number; // Current time.
    syncTime?: string; // Last synchronization time.
    hasOffline = false; // Whether the quiz has offline data.
    hasSupportedQuestions = false; // Whether the quiz has at least 1 supported question.
    accessRules: string[] = []; // List of access rules of the quiz.
    unsupportedRules: string[] = []; // List of unsupported access rules of the quiz.
    unsupportedQuestions: string[] = []; // List of unsupported question types of the quiz.
    behaviourSupported = false; // Whether the quiz behaviour is supported.
    showResults = false; // Whether to show the result of the quiz (grade, etc.).
    gradeOverridden = false; // Whether grade has been overridden.
    gradebookFeedback?: string; // The feedback in the gradebook.
    gradeResult?: string; // Message with the grade.
    overallFeedback?: string; // The feedback for the grade.
    buttonText?: string; // Text to display in the start/continue button.
    preventMessages: string[] = []; // List of messages explaining why the quiz cannot be attempted.
    showStatusSpinner = true; // Whether to show a spinner due to quiz status.
    gradeMethodReadable?: string; // Grade method in a readable format.
    showReviewColumn = false; // Whether to show the review column.
    attempts: AddonModQuizAttempt[] = []; // List of attempts the user has made.
    bestGrade?: AddonModQuizGetUserBestGradeWSResponse; // Best grade data.

    protected fetchContentDefaultError = 'addon.mod_quiz.errorgetquiz'; // Default error to show when loading contents.
    protected syncEventName = AddonModQuizSyncProvider.AUTO_SYNCED;

    // protected quizData: any; // Quiz instance. This variable will store the quiz instance until it's ready to be shown
    protected autoReview?: AddonModQuizAttemptFinishedData; // Data to auto-review an attempt after finishing.
    protected quizAccessInfo?: AddonModQuizGetQuizAccessInformationWSResponse; // Quiz access info.
    protected attemptAccessInfo?: AddonModQuizGetAttemptAccessInformationWSResponse; // Last attempt access info.
    protected moreAttempts = false; // Whether user can create/continue attempts.
    protected options?: AddonModQuizCombinedReviewOptions; // Combined review options.
    protected gradebookData?: { grade?: number; feedback?: string }; // The gradebook grade and feedback.
    protected overallStats = false; // Equivalent to overallstats in mod_quiz_view_object in Moodle.
    protected finishedObserver?: CoreEventObserver; // It will observe attempt finished events.
    protected hasPlayed = false; // Whether the user has gone to the quiz player (attempted).
    protected candidateQuiz?: AddonModQuizQuizData;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModQuizIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        // Listen for attempt finished events.
        this.finishedObserver = CoreEvents.on(
            AddonModQuizProvider.ATTEMPT_FINISHED_EVENT,
            (data) => {
                // Go to review attempt if an attempt in this quiz was finished and synced.
                if (this.quiz && data.quizId == this.quiz.id) {
                    this.autoReview = data;
                }
            },
            this.siteId,
        );

        await this.loadContent(false, true);
    }

    /**
     * Attempt the quiz.
     *
     * @returns Promise resolved when done.
     */
    async attemptQuiz(): Promise<void> {
        if (this.showStatusSpinner || !this.quiz) {
            // Quiz is being downloaded or synchronized, abort.
            return;
        }

        if (!AddonModQuiz.isQuizOffline(this.quiz)) {
            // Quiz isn't offline, just open it.
            return this.openQuiz();
        }

        // Quiz supports offline, check if it needs to be downloaded.
        // If the site doesn't support check updates, always prefetch it because we cannot tell if there's something new.
        const isDownloaded = this.currentStatus == CoreConstants.DOWNLOADED;

        if (isDownloaded) {
            // Already downloaded, open it.
            return this.openQuiz();
        }

        // Prefetch the quiz.
        this.showStatusSpinner = true;

        try {
            await AddonModQuizPrefetchHandler.prefetch(this.module, this.courseId, true);

            // Success downloading, open quiz.
            this.openQuiz();
        } catch (error) {
            if (this.hasOffline) {
                // Error downloading but there is something offline, allow continuing it.
                // If the site doesn't support check updates, continue too because we cannot tell if there's something new.
                this.openQuiz();
            } else {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        } finally {
            this.showStatusSpinner = false;
        }
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        // First get the quiz instance.
        const quiz = await AddonModQuiz.getQuiz(this.courseId, this.module.id);

        this.gradeMethodReadable = AddonModQuiz.getQuizGradeMethod(quiz.grademethod);
        this.now = Date.now();
        this.dataRetrieved.emit(quiz);
        this.description = quiz.intro || this.description;
        this.candidateQuiz = quiz;

        // Try to get warnings from automatic sync.
        const warnings = await AddonModQuizSync.getSyncWarnings(quiz.id);

        if (warnings?.length) {
            // Show warnings and delete them so they aren't shown again.
            CoreDomUtils.showErrorModal(CoreTextUtils.buildMessage(warnings));

            await AddonModQuizSync.setSyncWarnings(quiz.id, []);
        }

        if (AddonModQuiz.isQuizOffline(quiz)) {
            if (sync) {
                // Try to sync the quiz.
                try {
                    await this.syncActivity(showErrors);
                } catch {
                    // Ignore errors, keep getting data even if sync fails.
                    this.autoReview = undefined;
                }
            }
        } else {
            this.autoReview = undefined;
            this.showStatusSpinner = false;
        }

        if (AddonModQuiz.isQuizOffline(quiz)) {
            // Handle status.
            this.setStatusListener();

            // Get last synchronization time and check if sync button should be seen.
            this.syncTime = await AddonModQuizSync.getReadableSyncTime(quiz.id);
            this.hasOffline = await AddonModQuizSync.hasDataToSync(quiz.id);
        }

        // Get quiz access info.
        this.quizAccessInfo = await AddonModQuiz.getQuizAccessInformation(quiz.id, { cmId: this.module.id });

        this.showReviewColumn = this.quizAccessInfo.canreviewmyattempts;
        this.accessRules = this.quizAccessInfo.accessrules;
        this.unsupportedRules = AddonModQuiz.getUnsupportedRules(this.quizAccessInfo.activerulenames);

        if (quiz.preferredbehaviour) {
            this.behaviourSupported = CoreQuestionBehaviourDelegate.isBehaviourSupported(quiz.preferredbehaviour);
        }

        // Get question types in the quiz.
        const types = await AddonModQuiz.getQuizRequiredQtypes(quiz.id, { cmId: this.module.id });

        this.unsupportedQuestions = AddonModQuiz.getUnsupportedQuestions(types);
        this.hasSupportedQuestions = !!types.find((type) => type != 'random' && this.unsupportedQuestions.indexOf(type) == -1);

        await this.getAttempts(quiz);

        // Quiz is ready to be shown, move it to the variable that is displayed.
        this.quiz = quiz;
    }

    /**
     * Get the user attempts in the quiz and the result info.
     *
     * @param quiz Quiz instance.
     * @returns Promise resolved when done.
     */
    protected async getAttempts(quiz: AddonModQuizQuizData): Promise<void> {
        // Always get the best grade because it includes the grade to pass.
        this.bestGrade = await AddonModQuiz.getUserBestGrade(quiz.id, { cmId: this.module.id });

        // Get access information of last attempt (it also works if no attempts made).
        this.attemptAccessInfo = await AddonModQuiz.getAttemptAccessInformation(quiz.id, 0, { cmId: this.module.id });

        // Get attempts.
        const attempts = await AddonModQuiz.getUserAttempts(quiz.id, { cmId: this.module.id });

        this.attempts = await this.treatAttempts(quiz, attempts);

        // Check if user can create/continue attempts.
        if (this.attempts.length) {
            const last = this.attempts[this.attempts.length - 1];
            this.moreAttempts = !AddonModQuiz.isAttemptFinished(last.state) || !this.attemptAccessInfo.isfinished;
        } else {
            this.moreAttempts = !this.attemptAccessInfo.isfinished;
        }

        this.getButtonText(quiz);

        await this.getResultInfo(quiz);
    }

    /**
     * Get the text to show in the button. It also sets restriction messages if needed.
     *
     * @param quiz Quiz.
     */
    protected getButtonText(quiz: AddonModQuizQuizData): void {
        this.buttonText = '';

        if (quiz.hasquestions !== 0) {
            if (this.attempts.length && !AddonModQuiz.isAttemptFinished(this.attempts[this.attempts.length - 1].state)) {
                // Last attempt is unfinished.
                if (this.quizAccessInfo?.canattempt) {
                    this.buttonText = 'addon.mod_quiz.continueattemptquiz';
                } else if (this.quizAccessInfo?.canpreview) {
                    this.buttonText = 'addon.mod_quiz.continuepreview';
                }

            } else {
                // Last attempt is finished or no attempts.
                if (this.quizAccessInfo?.canattempt) {
                    this.preventMessages = this.attemptAccessInfo?.preventnewattemptreasons || [];
                    if (!this.preventMessages.length) {
                        if (!this.attempts.length) {
                            this.buttonText = 'addon.mod_quiz.attemptquiznow';
                        } else {
                            this.buttonText = 'addon.mod_quiz.reattemptquiz';
                        }
                    }
                } else if (this.quizAccessInfo?.canpreview) {
                    this.buttonText = 'addon.mod_quiz.previewquiznow';
                }
            }
        }

        if (!this.buttonText) {
            return;
        }

        // So far we think a button should be printed, check if they will be allowed to access it.
        this.preventMessages = this.quizAccessInfo?.preventaccessreasons || [];

        if (!this.moreAttempts) {
            this.buttonText = '';
        } else if (this.quizAccessInfo?.canattempt && this.preventMessages.length) {
            this.buttonText = '';
        } else if (!this.hasSupportedQuestions || this.unsupportedRules.length || !this.behaviourSupported) {
            this.buttonText = '';
        }
    }

    /**
     * Get result info to show.
     *
     * @param quiz Quiz.
     * @returns Promise resolved when done.
     */
    protected async getResultInfo(quiz: AddonModQuizQuizData): Promise<void> {
        if (!this.attempts.length || !quiz.showGradeColumn || !this.bestGrade?.hasgrade ||
            this.gradebookData?.grade === undefined) {
            this.showResults = false;

            return;
        }

        const formattedGradebookGrade = AddonModQuiz.formatGrade(this.gradebookData.grade, quiz.decimalpoints);
        const formattedBestGrade = AddonModQuiz.formatGrade(this.bestGrade.grade, quiz.decimalpoints);
        let gradeToShow = formattedGradebookGrade; // By default we show the grade in the gradebook.

        this.showResults = true;
        this.gradeOverridden = formattedGradebookGrade != formattedBestGrade;
        this.gradebookFeedback = this.gradebookData.feedback;

        if (this.bestGrade.grade! > this.gradebookData.grade && this.gradebookData.grade == quiz.grade) {
            // The best grade is higher than the max grade for the quiz.
            // We'll do like Moodle web and show the best grade instead of the gradebook grade.
            this.gradeOverridden = false;
            gradeToShow = formattedBestGrade;
        }

        if (this.overallStats) {
            // Show the quiz grade. The message shown is different if the quiz is finished.
            if (this.moreAttempts) {
                this.gradeResult = Translate.instant('addon.mod_quiz.gradesofar', { $a: {
                    method: this.gradeMethodReadable,
                    mygrade: gradeToShow,
                    quizgrade: quiz.gradeFormatted,
                } });
            } else {
                const outOfShort = Translate.instant('addon.mod_quiz.outofshort', { $a: {
                    grade: gradeToShow,
                    maxgrade: quiz.gradeFormatted,
                } });

                this.gradeResult = Translate.instant('addon.mod_quiz.yourfinalgradeis', { $a: outOfShort });
            }
        }

        if (quiz.showFeedbackColumn) {
            // Get the quiz overall feedback.
            const response = await AddonModQuiz.getFeedbackForGrade(quiz.id, this.gradebookData.grade, {
                cmId: this.module.id,
            });

            this.overallFeedback = response.feedbacktext;
        }
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.quiz) {
            return; // Shouldn't happen.
        }

        await AddonModQuiz.logViewQuiz(this.quiz.id, this.quiz.name);
    }

    /**
     * Go to review an attempt that has just been finished.
     *
     * @returns Promise resolved when done.
     */
    protected async goToAutoReview(): Promise<void> {
        if (!this.autoReview) {
            return;
        }

        // If we go to auto review it means an attempt was finished. Check completion status.
        this.checkCompletion();

        // Verify that user can see the review.
        const attemptId = this.autoReview.attemptId;

        if (this.quizAccessInfo?.canreviewmyattempts) {
            try {
                await AddonModQuiz.getAttemptReview(attemptId, { page: -1, cmId: this.module.id });

                await CoreNavigator.navigateToSitePath(
                    `${AddonModQuizModuleHandlerService.PAGE_NAME}/${this.courseId}/${this.module.id}/review/${attemptId}`,
                );
            } catch {
                // Ignore errors.
            }
        }
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @returns If suceed or not.
     */
    protected hasSyncSucceed(result: AddonModQuizSyncResult): boolean {
        if (result.attemptFinished) {
            // An attempt was finished, check completion status.
            this.checkCompletion();
        }

        // If the sync call isn't rejected it means the sync was successful.
        return result.updated;
    }

    /**
     * User entered the page that contains the component.
     */
    async ionViewDidEnter(): Promise<void> {
        super.ionViewDidEnter();

        if (!this.hasPlayed) {
            this.autoReview = undefined;

            return;
        }

        this.hasPlayed = false;
        let promise = Promise.resolve();

        // Update data when we come back from the player since the attempt status could have changed.
        // Check if we need to go to review an attempt automatically.
        if (this.autoReview && this.autoReview.synced) {
            promise = this.goToAutoReview();
            this.autoReview = undefined;
        }

        // Refresh data.
        this.showLoading = true;
        this.content?.scrollToTop();

        await promise;
        await CoreUtils.ignoreErrors(this.refreshContent(true));

        this.showLoading = false;
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();
        this.autoReview = undefined;
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModQuiz.invalidateQuizData(this.courseId));

        if (this.quiz) {
            promises.push(AddonModQuiz.invalidateUserAttemptsForUser(this.quiz.id));
            promises.push(AddonModQuiz.invalidateQuizAccessInformation(this.quiz.id));
            promises.push(AddonModQuiz.invalidateQuizRequiredQtypes(this.quiz.id));
            promises.push(AddonModQuiz.invalidateAttemptAccessInformation(this.quiz.id));
            promises.push(AddonModQuiz.invalidateCombinedReviewOptionsForUser(this.quiz.id));
            promises.push(AddonModQuiz.invalidateUserBestGradeForUser(this.quiz.id));
            promises.push(AddonModQuiz.invalidateGradeFromGradebook(this.courseId));
        }

        await Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @returns True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModQuizAutoSyncData): boolean {
        if (!this.courseId || !this.module) {
            return false;
        }

        if (syncEventData.attemptFinished) {
            // An attempt was finished, check completion status.
            this.checkCompletion();
        }

        if (this.quiz && syncEventData.quizId == this.quiz.id) {
            this.content?.scrollToTop();

            return true;
        }

        return false;
    }

    /**
     * Open a quiz to attempt it.
     */
    protected openQuiz(): void {
        this.hasPlayed = true;

        CoreNavigator.navigateToSitePath(
            `${AddonModQuizModuleHandlerService.PAGE_NAME}/${this.courseId}/${this.module.id}/player`,
            {
                params: {
                    moduleUrl: this.module.url,
                },
            },
        );
    }

    /**
     * Displays some data based on the current status.
     *
     * @param status The current status.
     * @param previousStatus The previous status. If not defined, there is no previous status.
     */
    protected showStatus(status: string, previousStatus?: string): void {
        this.showStatusSpinner = status == CoreConstants.DOWNLOADING;

        if (status == CoreConstants.DOWNLOADED && previousStatus == CoreConstants.DOWNLOADING) {
            // Quiz downloaded now, maybe a new attempt was created. Load content again.
            this.showLoadingAndFetch();
        }
    }

    /**
     * Performs the sync of the activity.
     *
     * @returns Promise resolved when done.
     */
    protected sync(): Promise<AddonModQuizSyncResult> {
        return AddonModQuizSync.syncQuiz(this.candidateQuiz!, true);
    }

    /**
     * Treat user attempts.
     *
     * @param quiz Quiz data.
     * @param attempts The attempts to treat.
     * @returns Promise resolved when done.
     */
    protected async treatAttempts(
        quiz: AddonModQuizQuizData,
        attempts: AddonModQuizAttemptWSData[],
    ): Promise<AddonModQuizAttempt[]> {
        if (!attempts || !attempts.length) {
            // There are no attempts to treat.
            quiz.gradeFormatted = AddonModQuiz.formatGrade(quiz.grade, quiz.decimalpoints);

            return [];
        }

        const lastFinished = AddonModQuiz.getLastFinishedAttemptFromList(attempts);
        const promises: Promise<unknown>[] = [];

        if (this.autoReview && lastFinished && lastFinished.id >= this.autoReview.attemptId) {
            // User just finished an attempt in offline and it seems it's been synced, since it's finished in online.
            // Go to the review of this attempt if the user hasn't left this view.
            if (!this.isDestroyed && this.isCurrentView) {
                promises.push(this.goToAutoReview());
            }
            this.autoReview = undefined;
        }

        // Get combined review options.
        promises.push(AddonModQuiz.getCombinedReviewOptions(quiz.id, { cmId: this.module.id }).then((options) => {
            this.options = options;

            return;
        }));

        // Get best grade.
        promises.push(this.getQuizGrade());

        await Promise.all(promises);

        const grade = this.gradebookData?.grade !== undefined ? this.gradebookData.grade : this.bestGrade?.grade;
        const quizGrade = AddonModQuiz.formatGrade(grade, quiz.decimalpoints);

        // Calculate data to construct the header of the attempts table.
        AddonModQuizHelper.setQuizCalculatedData(quiz, this.options!);

        this.overallStats = !!lastFinished && this.options!.alloptions.marks >= AddonModQuizProvider.QUESTION_OPTIONS_MARK_AND_MAX;

        // Calculate data to show for each attempt.
        const formattedAttempts = await Promise.all(attempts.map((attempt, index) => {
            // Highlight the highest grade if appropriate.
            const shouldHighlight = this.overallStats && quiz.grademethod == AddonModQuizProvider.GRADEHIGHEST &&
                attempts.length > 1;
            const isLast = index == attempts.length - 1;

            return AddonModQuizHelper.setAttemptCalculatedData(quiz, attempt, shouldHighlight, quizGrade, isLast);
        }));

        return formattedAttempts;
    }

    /**
     * Get quiz grade data.
     *
     * @returns Promise resolved when done.
     */
    protected async getQuizGrade(): Promise<void> {
        try {
            // Get gradebook grade.
            const data = await AddonModQuiz.getGradeFromGradebook(this.courseId, this.module.id);

            if (data) {
                this.gradebookData = {
                    grade: data.graderaw ?? (data.grade !== undefined && data.grade !== null ? Number(data.grade) : undefined),
                    feedback: data.feedback,
                };
            }
        } catch {
            // Fallback to quiz best grade if failure or not found.
            this.gradebookData = {
                grade: this.bestGrade?.grade,
            };
        }
    }

    /**
     * Go to page to view the attempt details.
     *
     * @returns Promise resolved when done.
     */
    async viewAttempt(attemptId: number): Promise<void> {
        await CoreNavigator.navigateToSitePath(
            `${AddonModQuizModuleHandlerService.PAGE_NAME}/${this.courseId}/${this.module.id}/attempt/${attemptId}`,
        );
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.finishedObserver?.off();
    }

}
