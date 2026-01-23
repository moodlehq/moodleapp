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

import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ElementRef,
    inject,
    viewChild,
    viewChildren,
} from '@angular/core';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreQuestionComponent } from '@features/question/components/question/question';
import {
    CoreQuestionQuestionForView,
    CoreQuestionsAnswers,
} from '@features/question/services/question';
import { CoreQuestionBehaviourButton, CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ModalController, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModQuizAutoSave } from '../../classes/auto-save';
import {
    AddonModQuizNavigationModalReturn,
    AddonModQuizNavigationQuestion,
} from '../../components/navigation-modal/navigation-modal';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizGetAttemptAccessInformationWSResponse,
    AddonModQuizGetQuizAccessInformationWSResponse,
    AddonModQuizQuizWSData,
} from '../../services/quiz';
import { AddonModQuizHelper } from '../../services/quiz-helper';
import { AddonModQuizSync } from '../../services/quiz-sync';
import { CanLeave } from '@guards/can-leave';
import { CoreForms } from '@singletons/form';
import { CoreDom } from '@singletons/dom';
import { CoreTime } from '@singletons/time';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_QUIZ_ATTEMPT_FINISHED_EVENT,
    AddonModQuizAttemptStates,
    ADDON_MOD_QUIZ_COMPONENT_LEGACY,
    ADDON_MOD_QUIZ_COMPONENT,
} from '../../constants';
import { CoreWait } from '@singletons/wait';
import { CoreModals } from '@services/overlays/modals';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { AddonModQuizQuestionCardComponent } from '../../components/question-card/question-card';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that allows attempting a quiz.
 */
@Component({
    selector: 'page-addon-mod-quiz-player',
    templateUrl: 'player.html',
    styleUrl: 'player.scss',
    imports: [
        CoreSharedModule,
        AddonModQuizQuestionCardComponent,
        CoreQuestionComponent,
    ],
})
export default class AddonModQuizPlayerPage implements OnInit, OnDestroy, CanLeave {

    readonly content = viewChild.required(IonContent);
    readonly questionComponents = viewChildren(CoreQuestionComponent);
    readonly formElement = viewChild<ElementRef>('quizForm');

    quiz?: AddonModQuizQuizWSData; // The quiz the attempt belongs to.
    attempt?: QuizAttempt; // The attempt being attempted.
    moduleUrl?: string; // URL to the module in the site.
    component = ADDON_MOD_QUIZ_COMPONENT_LEGACY; // Component to link the files to.
    loaded = false; // Whether data has been loaded.
    quizAborted = false; // Whether the quiz was aborted due to an error.
    offline = false; // Whether the quiz is being attempted in offline mode.
    attemptSummary: AddonModQuizNavigationQuestion[] = []; // Attempt summary: list of questions to navigate.
    questions: CoreQuestionQuestionForView[] = []; // Questions of the current page.
    nextPage = -2; // Next page.
    previousPage = -1; // Previous page.
    showSummary = false; // Whether the attempt summary should be displayed.
    canReturn = false; // Whether the user can return to a page after seeing the summary.
    preventSubmitMessages: string[] = []; // List of messages explaining why the quiz cannot be submitted.
    endTime?: number; // The time when the attempt must be finished.
    autoSaveError = false; // Whether there's been an error in auto-save.
    isSequential = false; // Whether quiz navigation is sequential.
    readableTimeLimit?: string; // Time limit in a readable format.
    dueDateWarning?: string; // Warning about due date.
    courseId!: number; // The course ID the quiz belongs to.
    cmId!: number; // Course module ID.
    correctIcon = '';
    incorrectIcon = '';
    partialCorrectIcon = '';

    protected preflightData: Record<string, string> = {}; // Preflight data to attempt the quiz.
    protected quizAccessInfo?: AddonModQuizGetQuizAccessInformationWSResponse; // Quiz access information.
    protected attemptAccessInfo?: AddonModQuizGetAttemptAccessInformationWSResponse; // Attempt access info.
    protected lastAttempt?: QuizAttempt; // Last user attempt before a new one is created (if needed).
    protected newAttempt = false; // Whether the user is starting a new attempt.
    protected quizDataLoaded = false; // Whether the quiz data has been loaded.
    protected timeUpCalled = false; // Whether the time up function has been called.
    protected autoSave!: AddonModQuizAutoSave; // Class to auto-save answers every certain time.
    protected autoSaveErrorSubscription?: Subscription; // To be notified when an error happens in auto-save.
    protected forceLeave = false; // If true, don't perform any check when leaving the view.
    protected reloadNavigation = false; // Whether navigation needs to be reloaded because some data was sent to server.
    protected changeDetector = inject(ChangeDetectorRef);
    protected element: HTMLElement = inject(ElementRef).nativeElement;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.moduleUrl = CoreNavigator.getRouteParam('moduleUrl');
        } catch (error) {
            CoreAlerts.showError(error);

            CoreNavigator.back();

            return;
        }

        // Create the auto save instance.
        this.autoSave = new AddonModQuizAutoSave(
            'addon-mod_quiz-player-form',
            '#addon-mod_quiz-connection-error-button',
        );

        // Start the player when the page is loaded.
        this.start();

        // Listen for errors on auto-save.
        this.autoSaveErrorSubscription = this.autoSave.onError().subscribe((error) => {
            this.autoSaveError = error;
            this.changeDetector.detectChanges();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.stopAutoSave();

        if (this.quiz) {
            // Unblock the quiz so it can be synced.
            CoreSync.unblockOperation(ADDON_MOD_QUIZ_COMPONENT, this.quiz.id);
        }
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave || this.quizAborted || !this.questions.length || this.showSummary) {
            return true;
        }

        // Save answers.
        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await this.processAttempt(false, false);

            modal.dismissWithStatus('core.sent', true);
        } catch {
            // Save attempt failed. Show confirmation.
            modal.dismiss();

            await CoreAlerts.confirm(Translate.instant('addon.mod_quiz.confirmleavequizonerror'));

            CoreForms.triggerFormCancelledEvent(this.formElement(), CoreSites.getCurrentSiteId());
        }

        return true;
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    async ionViewWillLeave(): Promise<void> {
        // Close any modal if present.
        const modal = await ModalController.getTop();

        modal?.dismiss();
    }

    /**
     * Abort the quiz.
     */
    abortQuiz(): void {
        this.quizAborted = true;
    }

    /**
     * A behaviour button in a question was clicked (Check, Redo, ...).
     *
     * @param button Clicked button.
     */
    async behaviourButtonClicked(button: CoreQuestionBehaviourButton): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        let modal: CoreIonLoadingElement | undefined;

        try {
            // Confirm that the user really wants to do it.
            await CoreAlerts.confirm(Translate.instant('core.areyousure'));

            modal = await CoreLoadings.show('core.sending', true);

            // Get the answers.
            const answers = await this.prepareAnswers(this.quiz.coursemodule);

            // Add the clicked button data.
            answers[button.name] = button.value;

            // Behaviour checks are always in online.
            await AddonModQuiz.processAttempt(this.quiz, this.attempt, answers, this.preflightData);

            this.reloadNavigation = true; // Data sent to server, navigation should be reloaded.

            // Reload the current page.
            const content = this.content();
            const scrollElement = await content?.getScrollElement();
            const scrollTop = scrollElement?.scrollTop || -1;

            this.loaded = false;
            content?.scrollToTop(); // Scroll top so the spinner is seen.

            try {
                await this.loadPage(this.attempt.currentpage ?? 0);
            } finally {
                this.loaded = true;
                if (scrollTop != -1) {
                    // Wait for content to be rendered.
                    setTimeout(() => {
                        this.content().scrollToPoint(0, scrollTop);
                    }, 50);
                }
            }

            modal.dismissWithStatus('core.sent', true);
        } catch (error) {
            modal?.dismiss();
            CoreAlerts.showError(error, { default: 'Error performing action.' });
        }
    }

    /**
     * Change the current page. If slot is supplied, try to scroll to that question.
     *
     * @param page Page to load. -1 means summary.
     * @param fromModal Whether the page was selected using the navigation modal.
     * @param slot Slot of the question to scroll to.
     */
    async changePage(page: number, fromModal?: boolean, slot?: number): Promise<void> {
        if (!this.attempt) {
            return;
        }

        if (page !== -1 && (this.attempt.state === AddonModQuizAttemptStates.OVERDUE || this.attempt.finishedOffline)) {
            // We can't load a page if overdue or the local attempt is finished.
            return;
        } else if (page === this.attempt.currentpage && !this.showSummary && slot !== undefined) {
            // Navigating to a question in the current page.
            await this.scrollToQuestion(slot);

            return;
        } else if (
            (page === this.attempt.currentpage && !this.showSummary) ||
            (fromModal && this.isSequential && page !== this.attempt.currentpage && page !== this.nextPage)
        ) {
            // If the user is navigating to the current page we do nothing.
            // Also, in sequential quizzes we can only navigate to the current page.
            return;
        } else if (page === -1 && this.showSummary) {
            // Summary already shown.
            return;
        }

        this.content().scrollToTop();

        // First try to save the attempt data. We only save it if we're not seeing the summary.
        if (!this.showSummary) {
            const modal = await CoreLoadings.show('core.sending', true);

            try {
                await this.processAttempt(false, false);

                modal.dismissWithStatus('core.sent', true);
            } catch (error) {
                CoreAlerts.showError(error, { default: Translate.instant('addon.mod_quiz.errorsaveattempt') });
                modal.dismiss();

                return;
            }

            this.reloadNavigation = true; // Data sent to server, navigation should be reloaded.
        }

        this.loaded = false;

        try {
            // Attempt data successfully saved, load the page or summary.
            // Stop checking for changes during page change.
            this.autoSave.stopCheckChangesProcess();

            if (page === -1) {
                await this.loadSummary();
            } else {
                await this.loadPage(page);
            }
        } catch (error) {
            // If the user isn't seeing the summary, start the check again.
            if (!this.showSummary && this.quiz) {
                this.autoSave.startCheckChangesProcess(this.quiz, this.attempt, this.preflightData, this.offline);
            }

            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_quiz.errorgetquestions') });
        } finally {
            this.loaded = true;

            if (slot !== undefined) {
                // Scroll to the question.
                await this.scrollToQuestion(slot);
            }
        }
    }

    /**
     * Convenience function to get the quiz data.
     */
    protected async fetchData(): Promise<void> {
        this.quiz = await AddonModQuiz.getQuiz(this.courseId, this.cmId);

        // Block the quiz so it cannot be synced.
        CoreSync.blockOperation(ADDON_MOD_QUIZ_COMPONENT, this.quiz.id);

        // Wait for any ongoing sync to finish. We won't sync a quiz while it's being played.
        await AddonModQuizSync.waitForSync(this.quiz.id);

        this.isSequential = AddonModQuiz.isNavigationSequential(this.quiz);

        if (AddonModQuiz.isQuizOffline(this.quiz)) {
            // Quiz supports offline.
            this.offline = true;
        } else {
            // Quiz doesn't support offline right now, but maybe it did and then the setting was changed.
            // If we have an unfinished offline attempt then we'll use offline mode.
            this.offline = await AddonModQuiz.isLastAttemptOfflineUnfinished(this.quiz);
        }

        if (this.quiz.timelimit && this.quiz.timelimit > 0) {
            this.readableTimeLimit = CoreTime.formatTime(this.quiz.timelimit);
        }

        // Get access information for the quiz.
        this.quizAccessInfo = await AddonModQuiz.getQuizAccessInformation(this.quiz.id, {
            cmId: this.quiz.coursemodule,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        // Get user attempts to determine last attempt.
        const attempts = await AddonModQuiz.getUserAttempts(this.quiz.id, {
            cmId: this.quiz.coursemodule,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        if (!attempts.length) {
            // There are no attempts, start a new one.
            this.newAttempt = true;

            return;
        }

        // Get the last attempt. If it's finished, start a new one.
        this.lastAttempt = attempts[attempts.length - 1];

        this.lastAttempt.finishedOffline = await AddonModQuiz.isAttemptFinishedOffline(this.lastAttempt.id);

        this.newAttempt = AddonModQuiz.isAttemptCompleted(this.lastAttempt.state);
    }

    /**
     * Finish an attempt, either by timeup or because the user clicked to finish it.
     *
     * @param userFinish Whether the user clicked to finish the attempt.
     * @param timeUp Whether the quiz time is up.
     */
    async finishAttempt(userFinish?: boolean, timeUp?: boolean): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        let modal: CoreIonLoadingElement | undefined;

        try {
            // Show confirm if the user clicked the finish button and the quiz is in progress.
            if (!timeUp && this.attempt.state === AddonModQuizAttemptStates.IN_PROGRESS) {
                let message = Translate.instant('addon.mod_quiz.confirmclose');

                const unansweredCount = this.attemptSummary
                    .filter(question => AddonModQuiz.isQuestionUnanswered(question))
                    .length;

                if (!this.isSequential && unansweredCount > 0) {
                    const warning = Translate.instant(
                        'addon.mod_quiz.submission_confirmation_unanswered',
                        { $a: unansweredCount },
                    );

                    message += `
                        <ion-card class="core-warning-card">
                            <ion-item>
                                <ion-label>
                                    ${ warning }
                                </ion-label>
                            </ion-item>
                        </ion-card>
                    `;
                }

                await CoreAlerts.confirm(message, {
                    header: Translate.instant('addon.mod_quiz.submitallandfinish'),
                    okText: Translate.instant('core.submit'),
                });
            }

            modal = await CoreLoadings.show('core.sending', true);

            await this.processAttempt(userFinish, timeUp);

            // Trigger an event to notify the attempt was finished.
            CoreEvents.trigger(ADDON_MOD_QUIZ_ATTEMPT_FINISHED_EVENT, {
                quizId: this.quiz.id,
                attemptId: this.attempt.id,
                synced: !this.offline,
            }, CoreSites.getCurrentSiteId());

            CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'quiz' });

            if (!timeUp || !this.quiz.graceperiod) {
                // Leave the player.
                this.forceLeave = true;
                CoreNavigator.back();
            } else {
                // Stay in player to show summary.
                this.stopAutoSave();
                this.clearTimer();

                await this.refreshAttempt();
                await this.loadSummary();
            }

            modal.dismissWithStatus('core.sent', true);
        } catch (error) {
            modal?.dismiss();
            // eslint-disable-next-line promise/catch-or-return
            CoreAlerts
                .showError(error, { default: Translate.instant('addon.mod_quiz.errorsaveattempt') })
                .then(async alert => {
                    await alert?.onWillDismiss();

                    if (error instanceof CoreWSError && error.errorcode === 'attemptalreadyclosed') {
                        CoreNavigator.back();
                    }

                    return;
                });
        }
    }

    /**
     * Fix sequence checks of current page.
     */
    protected async fixSequenceChecks(): Promise<void> {
        if (!this.attempt) {
            return;
        }

        // Get current page data again to get the latest sequencechecks.
        const data = await AddonModQuiz.getAttemptData(this.attempt.id, this.attempt.currentpage ?? 0, this.preflightData, {
            cmId: this.quiz?.coursemodule,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        const newSequenceChecks: Record<number, { name: string; value: string }> = {};

        data.questions.forEach((question) => {
            const sequenceCheck = CoreQuestionHelper.getQuestionSequenceCheckFromHtml(question.html);
            if (sequenceCheck) {
                newSequenceChecks[question.slot] = sequenceCheck;
            }
        });

        // Notify the new sequence checks to the components.
        this.questionComponents()?.forEach((component) => {
            component.updateSequenceCheck(newSequenceChecks);
        });
    }

    /**
     * Get the input answers.
     *
     * @returns Object with the answers.
     */
    protected getAnswers(): CoreQuestionsAnswers {
        return CoreQuestionHelper.getAnswersFromForm(document.forms['addon-mod_quiz-player-form']);
    }

    /**
     * Initializes the timer if enabled.
     */
    protected initTimer(): void {
        if (!this.quizAccessInfo || !this.attempt || !this.attemptAccessInfo?.endtime || this.attemptAccessInfo.endtime < 0) {
            return;
        }

        // Quiz has an end time. Check if time left should be shown.
        const shouldShowTime = AddonModQuiz.shouldShowTimeLeft(
            this.quizAccessInfo.activerulenames,
            this.attempt,
            this.attemptAccessInfo.endtime,
        );

        if (shouldShowTime) {
            this.endTime = this.attemptAccessInfo.endtime;
        } else {
            delete this.endTime;
        }
    }

    /**
     * Remove timer info.
     */
    protected clearTimer(): void {
        delete this.endTime;
    }

    /**
     * Load a page questions.
     *
     * @param page The page to load.
     */
    protected async loadPage(page: number): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        if (this.isSequential) {
            await this.logViewPage(page);
        }

        const data = await AddonModQuiz.getAttemptData(this.attempt.id, page, this.preflightData, {
            cmId: this.quiz.coursemodule,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        // Update attempt, status could change during the execution.
        this.attempt = data.attempt;
        this.attempt.currentpage = page;

        this.questions = data.questions;
        this.nextPage = data.nextpage;
        this.previousPage = this.isSequential ? -1 : page - 1;
        this.showSummary = false;

        this.questions.forEach((question) => {
            // Get the readable mark for each question.
            question.readableMark = AddonModQuizHelper.getQuestionMarkFromHtml(question.html);

            // Extract the question info box.
            CoreQuestionHelper.extractQuestionInfoBox(question, '.info');

            // Check if the question is blocked. If it is, treat it as a description question.
            if (AddonModQuiz.isQuestionBlocked(question)) {
                question.type = 'description';
            }
        });

        // Mark the page as viewed.
        if (!this.isSequential) {
            await this.logViewPage(page);
        }

        // Start looking for changes.
        this.autoSave.startCheckChangesProcess(this.quiz, this.attempt, this.preflightData, this.offline);
    }

    /**
     * Log view a page.
     *
     * @param page Page viewed.
     */
    protected async logViewPage(page: number): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        await CorePromiseUtils.ignoreErrors(AddonModQuiz.logViewAttempt(this.attempt.id, page, this.preflightData, this.offline));

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'mod_quiz_view_attempt',
            name: this.quiz.name,
            data: { id: this.attempt.id, quizid: this.quiz.id, page, category: 'quiz' },
            url: `/mod/quiz/attempt.php?attempt=${this.attempt.id}&cmid=${this.cmId}` + (page > 0 ? `&page=${page}` : ''),
        });
    }

    /**
     * Log view summary.
     */
    protected async logViewSummary(): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        await CorePromiseUtils.ignoreErrors(
            AddonModQuiz.logViewAttemptSummary(this.attempt.id, this.preflightData, this.quiz.id),
        );

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'mod_quiz_view_attempt_summary',
            name: this.quiz.name,
            data: { id: this.attempt.id, quizid: this.quiz.id, category: 'quiz' },
            url: `/mod/quiz/summary.php?attempt=${this.attempt.id}&cmid=${this.cmId}`,
        });
    }

    /**
     * Refresh attempt data.
     */
    protected async refreshAttempt(): Promise<void> {
        if (!this.quiz) {
            return;
        }

        const attempts = await AddonModQuiz.getUserAttempts(this.quiz.id, {
            cmId: this.quiz.coursemodule,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        this.attempt = attempts.find(attempt => attempt.id === this.attempt?.id);
    }

    /**
     * Load attempt summary.
     */
    protected async loadSummary(): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        if (!this.correctIcon) {
            this.correctIcon = CoreQuestionHelper.getCorrectIcon().fullName;
            this.incorrectIcon = CoreQuestionHelper.getIncorrectIcon().fullName;
            this.partialCorrectIcon = CoreQuestionHelper.getPartiallyCorrectIcon().fullName;
        }

        await this.loadAttemptSummary();

        this.showSummary = true;
        this.canReturn = this.attempt.state === AddonModQuizAttemptStates.IN_PROGRESS && !this.attempt.finishedOffline;
        this.preventSubmitMessages = AddonModQuiz.getPreventSubmitMessages(this.attemptSummary);

        this.dueDateWarning = AddonModQuiz.getAttemptDueDateWarning(this.quiz, this.attempt);

        this.logViewSummary();
    }

    /**
     * Load attempt summary data.
     */
    protected async loadAttemptSummary(): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        // We use the attempt summary to build the navigation because it contains all the questions.
        this.attemptSummary = await AddonModQuiz.getAttemptSummary(this.attempt.id, this.preflightData, {
            cmId: this.quiz.coursemodule,
            loadLocal: this.offline,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        this.attemptSummary.forEach((question) => {
            CoreQuestionHelper.populateQuestionStateClass(question);
        });
    }

    /**
     * Open the navigation modal.
     */
    async openNavigation(): Promise<void> {

        if (this.reloadNavigation) {
            // Some data has changed, reload the navigation.
            const modal = await CoreLoadings.show();

            await CorePromiseUtils.ignoreErrors(this.loadAttemptSummary());

            modal.dismiss();
            this.reloadNavigation = false;
        }

        const { AddonModQuizNavigationModalComponent } = await import('../../components/navigation-modal/navigation-modal');

        // Create the navigation modal.
        const modalData = await CoreModals.openSideModal<AddonModQuizNavigationModalReturn>({
            component: AddonModQuizNavigationModalComponent,
            componentProps: {
                navigation: this.attemptSummary,
                summaryShown: this.showSummary,
                currentPage: this.attempt?.currentpage,
                nextPage: this.nextPage,
                isReview: false,
                isSequential: this.isSequential,
            },
        });

        if (!modalData) {
            return;
        }

        this.changePage(modalData.page, true, modalData.slot);
    }

    /**
     * Prepare the answers to be sent for the attempt.
     *
     * @param componentId Component ID.
     * @returns Promise resolved with the answers.
     */
    protected prepareAnswers(componentId: number): Promise<CoreQuestionsAnswers> {
        return CoreQuestionHelper.prepareAnswers(
            this.questions,
            this.getAnswers(),
            this.offline,
            this.component,
            componentId,
        );
    }

    /**
     * Process attempt.
     *
     * @param userFinish Whether the user clicked to finish the attempt.
     * @param timeUp Whether the quiz time is up.
     * @param retrying Whether we're retrying the change.
     */
    protected async processAttempt(userFinish?: boolean, timeUp?: boolean, retrying?: boolean): Promise<void> {
        if (!this.quiz || !this.attempt) {
            return;
        }

        // Get the answers to send.
        let answers: CoreQuestionsAnswers = {};

        if (!this.showSummary) {
            answers = await this.prepareAnswers(this.quiz.coursemodule);
        }

        try {
            // Send the answers.
            await AddonModQuiz.processAttempt(
                this.quiz,
                this.attempt,
                answers,
                this.preflightData,
                userFinish,
                timeUp,
                this.offline,
            );
        } catch (error) {
            if (!error || error.errorcode != 'submissionoutofsequencefriendlymessage') {
                throw error;
            }

            try {
                // There was an error with the sequence check. Try to ammend it.
                await this.fixSequenceChecks();
            } catch {
                throw error;
            }

            if (retrying) {
                // We're already retrying, don't send the data again because it could cause an infinite loop.
                throw error;
            }

            // Sequence checks updated, try to send the data again.
            await this.processAttempt(userFinish, timeUp, true);

            return;
        }

        // Answers saved, cancel auto save.
        this.autoSave.cancelAutoSave();
        this.autoSave.hideAutoSaveError();

        const formElement = this.formElement();
        if (formElement) {
            CoreForms.triggerFormSubmittedEvent(formElement, !this.offline, CoreSites.getCurrentSiteId());
        }

        await CoreQuestionHelper.clearTmpData(this.questions, this.component, this.quiz.coursemodule);
    }

    /**
     * Scroll to a certain question.
     *
     * @param slot Slot of the question to scroll to.
     */
    protected async scrollToQuestion(slot: number): Promise<void> {
        await CoreWait.nextTick();
        await CoreDirectivesRegistry.waitDirectivesReady(this.element, 'core-question');
        await CoreDom.scrollToElement(
            this.element,
            `#addon-mod_quiz-question-${slot}`,
        );
    }

    /**
     * Show connection error.
     *
     * @param ev Click event.
     */
    showConnectionError(ev: Event): void {
        this.autoSave.showAutoSaveError(ev);
    }

    /**
     * Convenience function to start the player.
     */
    async start(): Promise<void> {
        try {
            this.loaded = false;

            if (!this.quizDataLoaded) {
                // Fetch data.
                await this.fetchData();

                this.quizDataLoaded = true;
            }

            // Quiz data has been loaded, try to start or continue.
            await this.startOrContinueAttempt();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_quiz.errorgetquiz') });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Start or continue an attempt.
     */
    protected async startOrContinueAttempt(): Promise<void> {
        if (!this.quiz || !this.quizAccessInfo) {
            return;
        }

        let attempt = this.newAttempt ? undefined : this.lastAttempt;

        // Get the preflight data and start attempt if needed.
        attempt = await AddonModQuizHelper.getAndCheckPreflightData(
            this.quiz,
            this.quizAccessInfo,
            this.preflightData,
            {
                attempt,
                offline: this.offline,
                finishedOffline: attempt?.finishedOffline,
                title: 'addon.mod_quiz.startattempt',
            },
        );

        // Re-fetch attempt access information with the right attempt (might have changed because a new attempt was created).
        this.attemptAccessInfo = await AddonModQuiz.getAttemptAccessInformation(this.quiz.id, attempt.id, {
            cmId: this.quiz.coursemodule,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        this.attempt = attempt;

        await this.loadAttemptSummary();

        if (this.attempt.state !== AddonModQuizAttemptStates.OVERDUE && !this.attempt.finishedOffline) {
            // Attempt not overdue and not finished in offline, load page.
            await this.loadPage(this.attempt.currentpage ?? 0);

            this.initTimer();
        } else {
            // Attempt is overdue or finished in offline, we can only load the summary.
            await this.loadSummary();
        }
    }

    /**
     * Quiz time has finished.
     */
    timeUp(): void {
        if (this.timeUpCalled) {
            return;
        }

        this.timeUpCalled = true;
        this.finishAttempt(false, true);
    }

    /**
     * Stop auto-saving answers.
     */
    protected stopAutoSave(): void {
        this.autoSave.cancelAutoSave();
        this.autoSave.stopCheckChangesProcess();
        this.autoSaveErrorSubscription?.unsubscribe();
    }

}

/**
 * Attempt with some calculated data for the view.
 */
type QuizAttempt = AddonModQuizAttemptWSData & {
    finishedOffline?: boolean;
};
