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

import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreQuestionComponent } from '@features/question/components/question/question';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreQuestionBehaviourButton, CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { ModalController, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModQuizAutoSave } from '../../classes/auto-save';
import {
    AddonModQuizNavigationModalComponent,
    AddonModQuizNavigationModalReturn,
    AddonModQuizNavigationQuestion,
} from '../../components/navigation-modal/navigation-modal';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizGetAttemptAccessInformationWSResponse,
    AddonModQuizGetQuizAccessInformationWSResponse,
    AddonModQuizProvider,
    AddonModQuizQuizWSData,
} from '../../services/quiz';
import { AddonModQuizAttempt, AddonModQuizHelper } from '../../services/quiz-helper';
import { AddonModQuizSync } from '../../services/quiz-sync';
import { CanLeave } from '@guards/can-leave';
import { CoreForms } from '@singletons/form';

/**
 * Page that allows attempting a quiz.
 */
@Component({
    selector: 'page-addon-mod-quiz-player',
    templateUrl: 'player.html',
    styleUrls: ['player.scss'],
})
export class AddonModQuizPlayerPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild(IonContent) content?: IonContent;
    @ViewChildren(CoreQuestionComponent) questionComponents?: QueryList<CoreQuestionComponent>;
    @ViewChild('quizForm') formElement?: ElementRef;

    quiz?: AddonModQuizQuizWSData; // The quiz the attempt belongs to.
    attempt?: AddonModQuizAttempt; // The attempt being attempted.
    moduleUrl?: string; // URL to the module in the site.
    component = AddonModQuizProvider.COMPONENT; // Component to link the files to.
    loaded = false; // Whether data has been loaded.
    quizAborted = false; // Whether the quiz was aborted due to an error.
    offline = false; // Whether the quiz is being attempted in offline mode.
    navigation: AddonModQuizNavigationQuestion[] = []; // List of questions to navigate them.
    questions: QuizQuestion[] = []; // Questions of the current page.
    nextPage = -2; // Next page.
    previousPage = -1; // Previous page.
    showSummary = false; // Whether the attempt summary should be displayed.
    summaryQuestions: CoreQuestionQuestionParsed[] = []; // The questions to display in the summary.
    canReturn = false; // Whether the user can return to a page after seeing the summary.
    preventSubmitMessages: string[] = []; // List of messages explaining why the quiz cannot be submitted.
    endTime?: number; // The time when the attempt must be finished.
    autoSaveError = false; // Whether there's been an error in auto-save.
    isSequential = false; // Whether quiz navigation is sequential.
    readableTimeLimit?: string; // Time limit in a readable format.
    dueDateWarning?: string; // Warning about due date.
    courseId!: number; // The course ID the quiz belongs to.
    cmId!: number; // Course module ID.

    protected preflightData: Record<string, string> = {}; // Preflight data to attempt the quiz.
    protected quizAccessInfo?: AddonModQuizGetQuizAccessInformationWSResponse; // Quiz access information.
    protected attemptAccessInfo?: AddonModQuizGetAttemptAccessInformationWSResponse; // Attempt access info.
    protected lastAttempt?: AddonModQuizAttemptWSData; // Last user attempt before a new one is created (if needed).
    protected newAttempt = false; // Whether the user is starting a new attempt.
    protected quizDataLoaded = false; // Whether the quiz data has been loaded.
    protected timeUpCalled = false; // Whether the time up function has been called.
    protected autoSave!: AddonModQuizAutoSave; // Class to auto-save answers every certain time.
    protected autoSaveErrorSubscription?: Subscription; // To be notified when an error happens in auto-save.
    protected forceLeave = false; // If true, don't perform any check when leaving the view.
    protected reloadNavigation = false; // Whether navigation needs to be reloaded because some data was sent to server.

    constructor(
        protected changeDetector: ChangeDetectorRef,
        protected elementRef: ElementRef,
    ) {
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.moduleUrl = CoreNavigator.getRouteParam('moduleUrl');

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
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        // Stop auto save.
        this.autoSave.cancelAutoSave();
        this.autoSave.stopCheckChangesProcess();
        this.autoSaveErrorSubscription?.unsubscribe();

        if (this.quiz) {
            // Unblock the quiz so it can be synced.
            CoreSync.unblockOperation(AddonModQuizProvider.COMPONENT, this.quiz.id);
        }
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave || this.quizAborted || !this.questions.length || this.showSummary) {
            return true;
        }

        // Save answers.
        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        try {
            await this.processAttempt(false, false);
        } catch (error) {
            // Save attempt failed. Show confirmation.
            modal.dismiss();

            await CoreDomUtils.showConfirm(Translate.instant('addon.mod_quiz.confirmleavequizonerror'));

            CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());
        } finally {
            modal.dismiss();
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
        let modal: CoreIonLoadingElement | undefined;

        try {
            // Confirm that the user really wants to do it.
            await CoreDomUtils.showConfirm(Translate.instant('core.areyousure'));

            modal = await CoreDomUtils.showModalLoading('core.sending', true);

            // Get the answers.
            const answers = await this.prepareAnswers();

            // Add the clicked button data.
            answers[button.name] = button.value;

            // Behaviour checks are always in online.
            await AddonModQuiz.processAttempt(this.quiz!, this.attempt!, answers, this.preflightData);

            this.reloadNavigation = true; // Data sent to server, navigation should be reloaded.

            // Reload the current page.
            const scrollElement = await this.content?.getScrollElement();
            const scrollTop = scrollElement?.scrollTop || -1;

            this.loaded = false;
            this.content?.scrollToTop(); // Scroll top so the spinner is seen.

            try {
                await this.loadPage(this.attempt!.currentpage!);
            } finally {
                this.loaded = true;
                if (scrollTop != -1) {
                    // Wait for content to be rendered.
                    setTimeout(() => {
                        this.content?.scrollToPoint(0, scrollTop);
                    }, 50);
                }
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error performing action.');
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Change the current page. If slot is supplied, try to scroll to that question.
     *
     * @param page Page to load. -1 means summary.
     * @param fromModal Whether the page was selected using the navigation modal.
     * @param slot Slot of the question to scroll to.
     * @return Promise resolved when done.
     */
    async changePage(page: number, fromModal?: boolean, slot?: number): Promise<void> {
        if (!this.attempt) {
            return;
        }

        if (page != -1 && (this.attempt.state == AddonModQuizProvider.ATTEMPT_OVERDUE || this.attempt.finishedOffline)) {
            // We can't load a page if overdue or the local attempt is finished.
            return;
        } else if (page == this.attempt.currentpage && !this.showSummary && typeof slot != 'undefined') {
            // Navigating to a question in the current page.
            this.scrollToQuestion(slot);

            return;
        } else if ((page == this.attempt.currentpage && !this.showSummary) || (fromModal && this.isSequential && page != -1)) {
            // If the user is navigating to the current page we do nothing.
            // Also, in sequential quizzes we don't allow navigating using the modal except for finishing the quiz (summary).
            return;
        } else if (page === -1 && this.showSummary) {
            // Summary already shown.
            return;
        }

        this.content?.scrollToTop();

        // First try to save the attempt data. We only save it if we're not seeing the summary.
        if (!this.showSummary) {
            const modal = await CoreDomUtils.showModalLoading('core.sending', true);

            try {
                await this.processAttempt(false, false);

                modal.dismiss();
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorsaveattempt', true);
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
            if (!this.showSummary) {
                this.autoSave.startCheckChangesProcess(this.quiz!, this.attempt, this.preflightData, this.offline);
            }

            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquestions', true);
        } finally {
            this.loaded = true;

            if (typeof slot != 'undefined') {
                // Scroll to the question. Give some time to the questions to render.
                setTimeout(() => {
                    this.scrollToQuestion(slot);
                }, 2000);
            }
        }
    }

    /**
     * Convenience function to get the quiz data.
     *
     * @return Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.quiz = await AddonModQuiz.getQuiz(this.courseId, this.cmId);

            // Block the quiz so it cannot be synced.
            CoreSync.blockOperation(AddonModQuizProvider.COMPONENT, this.quiz.id);

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

            if (this.quiz!.timelimit && this.quiz!.timelimit > 0) {
                this.readableTimeLimit = CoreTimeUtils.formatTime(this.quiz.timelimit);
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
            this.lastAttempt = await AddonModQuizHelper.setAttemptCalculatedData(
                this.quiz,
                attempts[attempts.length - 1],
                false,
                undefined,
                true,
            );

            this.newAttempt = AddonModQuiz.isAttemptFinished(this.lastAttempt.state);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquiz', true);
        }
    }

    /**
     * Finish an attempt, either by timeup or because the user clicked to finish it.
     *
     * @param userFinish Whether the user clicked to finish the attempt.
     * @param timeUp Whether the quiz time is up.
     * @return Promise resolved when done.
     */
    async finishAttempt(userFinish?: boolean, timeUp?: boolean): Promise<void> {
        let modal: CoreIonLoadingElement | undefined;

        try {
            // Show confirm if the user clicked the finish button and the quiz is in progress.
            if (!timeUp && this.attempt!.state == AddonModQuizProvider.ATTEMPT_IN_PROGRESS) {
                await CoreDomUtils.showConfirm(Translate.instant('addon.mod_quiz.confirmclose'));
            }

            modal = await CoreDomUtils.showModalLoading('core.sending', true);

            await this.processAttempt(userFinish, timeUp);

            // Trigger an event to notify the attempt was finished.
            CoreEvents.trigger(AddonModQuizProvider.ATTEMPT_FINISHED_EVENT, {
                quizId: this.quiz!.id,
                attemptId: this.attempt!.id,
                synced: !this.offline,
            }, CoreSites.getCurrentSiteId());

            CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'quiz' });

            // Leave the player.
            this.forceLeave = true;
            CoreNavigator.back();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorsaveattempt', true);
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Fix sequence checks of current page.
     *
     * @return Promise resolved when done.
     */
    protected async fixSequenceChecks(): Promise<void> {
        // Get current page data again to get the latest sequencechecks.
        const data = await AddonModQuiz.getAttemptData(this.attempt!.id, this.attempt!.currentpage!, this.preflightData, {
            cmId: this.quiz!.coursemodule,
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
        this.questionComponents?.forEach((component) => {
            component.updateSequenceCheck(newSequenceChecks);
        });
    }

    /**
     * Get the input answers.
     *
     * @return Object with the answers.
     */
    protected getAnswers(): CoreQuestionsAnswers {
        return CoreQuestionHelper.getAnswersFromForm(document.forms['addon-mod_quiz-player-form']);
    }

    /**
     * Initializes the timer if enabled.
     */
    protected initTimer(): void {
        if (!this.attemptAccessInfo?.endtime || this.attemptAccessInfo.endtime < 0) {
            return;
        }

        // Quiz has an end time. Check if time left should be shown.
        const shouldShowTime = AddonModQuiz.shouldShowTimeLeft(
            this.quizAccessInfo!.activerulenames,
            this.attempt!,
            this.attemptAccessInfo.endtime,
        );

        if (shouldShowTime) {
            this.endTime = this.attemptAccessInfo.endtime;
        } else {
            delete this.endTime;
        }
    }

    /**
     * Load a page questions.
     *
     * @param page The page to load.
     * @return Promise resolved when done.
     */
    protected async loadPage(page: number): Promise<void> {
        const data = await AddonModQuiz.getAttemptData(this.attempt!.id, page, this.preflightData, {
            cmId: this.quiz!.coursemodule,
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
        CoreUtils.ignoreErrors(
            AddonModQuiz.logViewAttempt(this.attempt.id, page, this.preflightData, this.offline, this.quiz),
        );

        // Start looking for changes.
        this.autoSave.startCheckChangesProcess(this.quiz!, this.attempt, this.preflightData, this.offline);
    }

    /**
     * Load attempt summary.
     *
     * @return Promise resolved when done.
     */
    protected async loadSummary(): Promise<void> {
        this.summaryQuestions = [];

        this.summaryQuestions = await AddonModQuiz.getAttemptSummary(this.attempt!.id, this.preflightData, {
            cmId: this.quiz!.coursemodule,
            loadLocal: this.offline,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        this.showSummary = true;
        this.canReturn = this.attempt!.state == AddonModQuizProvider.ATTEMPT_IN_PROGRESS && !this.attempt!.finishedOffline;
        this.preventSubmitMessages = AddonModQuiz.getPreventSubmitMessages(this.summaryQuestions);

        this.dueDateWarning = AddonModQuiz.getAttemptDueDateWarning(this.quiz!, this.attempt!);

        // Log summary as viewed.
        CoreUtils.ignoreErrors(
            AddonModQuiz.logViewAttemptSummary(this.attempt!.id, this.preflightData, this.quiz!.id, this.quiz!.name),
        );
    }

    /**
     * Load data to navigate the questions using the navigation modal.
     *
     * @return Promise resolved when done.
     */
    protected async loadNavigation(): Promise<void> {
        // We use the attempt summary to build the navigation because it contains all the questions.
        this.navigation = await AddonModQuiz.getAttemptSummary(this.attempt!.id, this.preflightData, {
            cmId: this.quiz!.coursemodule,
            loadLocal: this.offline,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
        });

        this.navigation.forEach((question) => {
            question.stateClass = CoreQuestionHelper.getQuestionStateClass(question.state || '');
        });
    }

    /**
     * Open the navigation modal.
     *
     * @return Promise resolved when done.
     */
    async openNavigation(): Promise<void> {

        if (this.reloadNavigation) {
            // Some data has changed, reload the navigation.
            const modal = await CoreDomUtils.showModalLoading();

            await CoreUtils.ignoreErrors(this.loadNavigation());

            modal.dismiss();
            this.reloadNavigation = false;
        }

        // Create the navigation modal.
        const modalData = await CoreDomUtils.openSideModal<AddonModQuizNavigationModalReturn>({
            component: AddonModQuizNavigationModalComponent,
            componentProps: {
                navigation: this.navigation,
                summaryShown: this.showSummary,
                currentPage: this.attempt?.currentpage,
                isReview: false,
            },
        });

        if (modalData && modalData.action == AddonModQuizNavigationModalComponent.CHANGE_PAGE) {
            this.changePage(modalData.page!, true, modalData.slot);
        }
    }

    /**
     * Prepare the answers to be sent for the attempt.
     *
     * @return Promise resolved with the answers.
     */
    protected prepareAnswers(): Promise<CoreQuestionsAnswers> {
        return CoreQuestionHelper.prepareAnswers(
            this.questions,
            this.getAnswers(),
            this.offline,
            this.component,
            this.quiz!.coursemodule,
        );
    }

    /**
     * Process attempt.
     *
     * @param userFinish Whether the user clicked to finish the attempt.
     * @param timeUp Whether the quiz time is up.
     * @param retrying Whether we're retrying the change.
     * @return Promise resolved when done.
     */
    protected async processAttempt(userFinish?: boolean, timeUp?: boolean, retrying?: boolean): Promise<void> {
        // Get the answers to send.
        let answers: CoreQuestionsAnswers = {};

        if (!this.showSummary) {
            answers = await this.prepareAnswers();
        }

        try {
            // Send the answers.
            await AddonModQuiz.processAttempt(
                this.quiz!,
                this.attempt!,
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
            return this.processAttempt(userFinish, timeUp, true);
        }

        // Answers saved, cancel auto save.
        this.autoSave.cancelAutoSave();
        this.autoSave.hideAutoSaveError();

        if (this.formElement) {
            CoreForms.triggerFormSubmittedEvent(this.formElement, !this.offline, CoreSites.getCurrentSiteId());
        }

        return CoreQuestionHelper.clearTmpData(this.questions, this.component, this.quiz!.coursemodule);
    }

    /**
     * Scroll to a certain question.
     *
     * @param slot Slot of the question to scroll to.
     */
    protected scrollToQuestion(slot: number): void {
        CoreDomUtils.scrollToElementBySelector(
            this.elementRef.nativeElement,
            this.content,
            '#addon-mod_quiz-question-' + slot,
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
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Start or continue an attempt.
     *
     * @return Promise resolved when done.
     */
    protected async startOrContinueAttempt(): Promise<void> {
        try {
            let attempt = this.newAttempt ? undefined : this.lastAttempt;

            // Get the preflight data and start attempt if needed.
            attempt = await AddonModQuizHelper.getAndCheckPreflightData(
                this.quiz!,
                this.quizAccessInfo!,
                this.preflightData,
                attempt,
                this.offline,
                false,
                'addon.mod_quiz.startattempt',
            );

            // Re-fetch attempt access information with the right attempt (might have changed because a new attempt was created).
            this.attemptAccessInfo = await AddonModQuiz.getAttemptAccessInformation(this.quiz!.id, attempt.id, {
                cmId: this.quiz!.coursemodule,
                readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
            });

            this.attempt = attempt;

            await this.loadNavigation();

            if (this.attempt.state != AddonModQuizProvider.ATTEMPT_OVERDUE && !this.attempt.finishedOffline) {
                // Attempt not overdue and not finished in offline, load page.
                await this.loadPage(this.attempt.currentpage!);

                this.initTimer();
            } else {
                // Attempt is overdue or finished in offline, we can only load the summary.
                await this.loadSummary();
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquestions', true);
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

}

/**
 * Question with some calculated data for the view.
 */
type QuizQuestion = CoreQuestionQuestionParsed & {
    readableMark?: string;
};
