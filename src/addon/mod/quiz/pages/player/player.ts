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

import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { IonicPage, NavParams, Content, PopoverController, ModalController, Modal, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { CoreQuestionComponent } from '@core/question/components/question/question';
import { MoodleMobileApp } from '../../../../../app/app.component';
import { AddonModQuizProvider } from '../../providers/quiz';
import { AddonModQuizSyncProvider } from '../../providers/quiz-sync';
import { AddonModQuizHelperProvider } from '../../providers/helper';
import { AddonModQuizAutoSave } from '../../classes/auto-save';
import { Subscription } from 'rxjs';

/**
 * Page that allows attempting a quiz.
 */
@IonicPage({ segment: 'addon-mod-quiz-player' })
@Component({
    selector: 'page-addon-mod-quiz-player',
    templateUrl: 'player.html',
})
export class AddonModQuizPlayerPage implements OnInit, OnDestroy {
    @ViewChild(Content) content: Content;
    @ViewChildren(CoreQuestionComponent) questionComponents: QueryList<CoreQuestionComponent>;

    quiz: any; // The quiz the attempt belongs to.
    attempt: any; // The attempt being attempted.
    moduleUrl: string; // URL to the module in the site.
    component = AddonModQuizProvider.COMPONENT; // Component to link the files to.
    loaded: boolean; // Whether data has been loaded.
    quizAborted: boolean; // Whether the quiz was aborted due to an error.
    offline: boolean; // Whether the quiz is being attempted in offline mode.
    navigation: any[]; // List of questions to navigate them.
    questions: any[]; // Questions of the current page.
    nextPage: number; // Next page.
    previousPage: number; // Previous page.
    showSummary: boolean; // Whether the attempt summary should be displayed.
    summaryQuestions: any[]; // The questions to display in the summary.
    canReturn: boolean; // Whether the user can return to a page after seeing the summary.
    preventSubmitMessages: string[]; // List of messages explaining why the quiz cannot be submitted.
    endTime: number; // The time when the attempt must be finished.
    autoSaveError: boolean; // Whether there's been an error in auto-save.
    navigationModal: Modal; // Modal to navigate through the questions.

    protected courseId: number; // The course ID the quiz belongs to.
    protected quizId: number; // Quiz ID to attempt.
    protected preflightData: any = {}; // Preflight data to attempt the quiz.
    protected quizAccessInfo: any; // Quiz access information.
    protected attemptAccessInfo: any; // Attempt access info.
    protected lastAttempt: any; // Last user attempt before a new one is created (if needed).
    protected newAttempt: boolean; // Whether the user is starting a new attempt.
    protected quizDataLoaded: boolean; // Whether the quiz data has been loaded.
    protected timeUpCalled: boolean; // Whether the time up function has been called.
    protected autoSave: AddonModQuizAutoSave; // Class to auto-save answers every certain time.
    protected autoSaveErrorSubscription: Subscription; // To be notified when an error happens in auto-save.
    protected forceLeave = false; // If true, don't perform any check when leaving the view.
    protected reloadNavigaton = false; // Whether navigation needs to be reloaded because some data was sent to server.

    constructor(navParams: NavParams, logger: CoreLoggerProvider, protected translate: TranslateService,
            protected eventsProvider: CoreEventsProvider, protected sitesProvider: CoreSitesProvider,
            protected syncProvider: CoreSyncProvider, protected domUtils: CoreDomUtilsProvider, popoverCtrl: PopoverController,
            protected timeUtils: CoreTimeUtilsProvider, protected quizProvider: AddonModQuizProvider,
            protected quizHelper: AddonModQuizHelperProvider, protected quizSync: AddonModQuizSyncProvider,
            protected questionHelper: CoreQuestionHelperProvider, protected cdr: ChangeDetectorRef,
            modalCtrl: ModalController, protected navCtrl: NavController,  protected mmApp: MoodleMobileApp) {

        this.quizId = navParams.get('quizId');
        this.courseId = navParams.get('courseId');
        this.moduleUrl = navParams.get('moduleUrl');

        // Block the quiz so it cannot be synced.
        this.syncProvider.blockOperation(AddonModQuizProvider.COMPONENT, this.quizId);

        // Create the auto save instance.
        this.autoSave = new AddonModQuizAutoSave('addon-mod_quiz-player-form', '#addon-mod_quiz-connection-error-button',
                logger, popoverCtrl, questionHelper, quizProvider);

        // Create the navigation modal.
        this.navigationModal = modalCtrl.create('AddonModQuizNavigationModalPage', {
            page: this
        }, { cssClass: 'core-modal-lateral',
            showBackdrop: true,
            enableBackdropDismiss: true,
            enterAnimation: 'core-modal-lateral-transition',
            leaveAnimation: 'core-modal-lateral-transition' });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Start the player when the page is loaded.
        this.start();

        // Listen for errors on auto-save.
        this.autoSaveErrorSubscription = this.autoSave.onError().subscribe((error) => {
            this.autoSaveError = error;
            this.cdr.detectChanges();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        // Stop auto save.
        this.autoSave.cancelAutoSave();
        this.autoSave.stopCheckChangesProcess();
        this.autoSaveErrorSubscription && this.autoSaveErrorSubscription.unsubscribe();

        // Unblock the quiz so it can be synced.
        this.syncProvider.unblockOperation(AddonModQuizProvider.COMPONENT, this.quizId);
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        if (this.questions && this.questions.length && !this.showSummary) {
            // Save answers.
            const modal = this.domUtils.showModalLoading('core.sending', true);

            return this.processAttempt(false, false).catch(() => {
                // Save attempt failed. Show confirmation.
                modal.dismiss();

                return this.domUtils.showConfirm(this.translate.instant('addon.mod_quiz.confirmleavequizonerror'));
            }).finally(() => {
                modal.dismiss();
            });
        }

        return Promise.resolve();
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.mmApp.closeModal();
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
    behaviourButtonClicked(button: any): void {
        // Confirm that the user really wants to do it.
        this.domUtils.showConfirm(this.translate.instant('core.areyousure')).then(() => {
            const modal = this.domUtils.showModalLoading('core.sending', true);

            // Get the answers.
            return this.prepareAnswers().then((answers) => {

                // Add the clicked button data.
                answers[button.name] = button.value;

                // Behaviour checks are always in online.
                return this.quizProvider.processAttempt(this.quiz, this.attempt, answers, this.preflightData);
            }).then(() => {
                this.reloadNavigaton = true; // Data sent to server, navigation should be reloaded.

                // Reload the current page.
                const scrollElement = this.content.getScrollElement(),
                    scrollTop = scrollElement.scrollTop || 0,
                    scrollLeft = scrollElement.scrollLeft || 0;

                this.loaded = false;
                this.domUtils.scrollToTop(this.content); // Scroll top so the spinner is seen.

                return this.loadPage(this.attempt.currentpage).finally(() => {
                    this.loaded = true;
                    this.domUtils.scrollTo(this.content, scrollLeft, scrollTop);
                });
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error performing action.');
        });
    }

    /**
     * Change the current page. If slot is supplied, try to scroll to that question.
     *
     * @param page Page to load. -1 means summary.
     * @param fromModal Whether the page was selected using the navigation modal.
     * @param slot Slot of the question to scroll to.
     */
    changePage(page: number, fromModal?: boolean, slot?: number): void {
        if (page != -1 && (this.attempt.state == AddonModQuizProvider.ATTEMPT_OVERDUE || this.attempt.finishedOffline)) {
            // We can't load a page if overdue or the local attempt is finished.
            return;
        } else if (page == this.attempt.currentpage && !this.showSummary && typeof slot != 'undefined') {
            // Navigating to a question in the current page.
            this.scrollToQuestion(slot);

            return;
        } else if ((page == this.attempt.currentpage && !this.showSummary) || (fromModal && this.quiz.isSequential && page != -1)) {
            // If the user is navigating to the current page we do nothing.
            // Also, in sequential quizzes we don't allow navigating using the modal except for finishing the quiz (summary).
            return;
        } else if (page === -1 && this.showSummary) {
            // Summary already shown.
            return;
        }

        this.loaded = false;
        this.domUtils.scrollToTop(this.content);

        // First try to save the attempt data. We only save it if we're not seeing the summary.
        const promise = this.showSummary ? Promise.resolve() : this.processAttempt(false, false);
        promise.then(() => {
            if (!this.showSummary) {
                this.reloadNavigaton = true; // Data sent to server, navigation should be reloaded.
            }

            // Attempt data successfully saved, load the page or summary.
            let subPromise;

            // Stop checking for changes during page change.
            this.autoSave.stopCheckChangesProcess();

            if (page === -1) {
                subPromise = this.loadSummary();
            } else {
                subPromise = this.loadPage(page);
            }

            return subPromise.catch((error) => {
                // If the user isn't seeing the summary, start the check again.
                if (!this.showSummary) {
                    this.autoSave.startCheckChangesProcess(this.quiz, this.attempt, this.preflightData, this.offline);
                }

                this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquestions', true);
            });
        }, (error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorsaveattempt', true);
        }).finally(() => {
            this.loaded = true;

            if (typeof slot != 'undefined') {
                // Scroll to the question. Give some time to the questions to render.
                setTimeout(() => {
                    this.scrollToQuestion(slot);
                }, 2000);
            }
        });
    }

    /**
     * Convenience function to get the quiz data.
     *
     * @return Promise resolved when done.
     */
    protected fetchData(): Promise<any> {
        // Wait for any ongoing sync to finish. We won't sync a quiz while it's being played.
        return this.quizSync.waitForSync(this.quizId).then(() => {
            // Sync finished, now get the quiz.
            return this.quizProvider.getQuizById(this.courseId, this.quizId);
        }).then((quizData) => {
            this.quiz = quizData;
            this.quiz.isSequential = this.quizProvider.isNavigationSequential(this.quiz);

            if (this.quizProvider.isQuizOffline(this.quiz)) {
                // Quiz supports offline.
                return true;
            } else {
                // Quiz doesn't support offline right now, but maybe it did and then the setting was changed.
                // If we have an unfinished offline attempt then we'll use offline mode.
                return this.quizProvider.isLastAttemptOfflineUnfinished(this.quiz);
            }
        }).then((offlineMode) => {
            this.offline = offlineMode;

            if (this.quiz.timelimit > 0) {
                this.quiz.readableTimeLimit = this.timeUtils.formatTime(this.quiz.timelimit);
            }

            // Get access information for the quiz.
            return this.quizProvider.getQuizAccessInformation(this.quiz.id, this.offline, true);
        }).then((info) => {
            this.quizAccessInfo = info;

            // Get user attempts to determine last attempt.
            return this.quizProvider.getUserAttempts(this.quiz.id, 'all', true, this.offline, true);
        }).then((attempts) => {
            if (!attempts.length) {
                // There are no attempts, start a new one.
                this.newAttempt = true;
            } else {
                const promises = [];

                // Get the last attempt. If it's finished, start a new one.
                this.lastAttempt = attempts[attempts.length - 1];
                this.newAttempt = this.quizProvider.isAttemptFinished(this.lastAttempt.state);

                // Load quiz last sync time.
                promises.push(this.quizSync.getSyncTime(this.quiz.id).then((time) => {
                    this.quiz.syncTime = time;
                    this.quiz.syncTimeReadable = this.quizSync.getReadableTimeFromTimestamp(time);
                }));

                // Load flag to show if attempts are finished but not synced.
                promises.push(this.quizProvider.loadFinishedOfflineData(attempts));

                return Promise.all(promises);
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquiz', true);
        });
    }

    /**
     * Finish an attempt, either by timeup or because the user clicked to finish it.
     *
     * @param userFinish Whether the user clicked to finish the attempt.
     * @param timeUp Whether the quiz time is up.
     * @return Promise resolved when done.
     */
    finishAttempt(userFinish?: boolean, timeUp?: boolean): Promise<void> {
        let promise;

        // Show confirm if the user clicked the finish button and the quiz is in progress.
        if (!timeUp && this.attempt.state == AddonModQuizProvider.ATTEMPT_IN_PROGRESS) {
            promise = this.domUtils.showConfirm(this.translate.instant('addon.mod_quiz.confirmclose'));
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            const modal = this.domUtils.showModalLoading('core.sending', true);

            return this.processAttempt(userFinish, timeUp).then(() => {
                // Trigger an event to notify the attempt was finished.
                this.eventsProvider.trigger(AddonModQuizProvider.ATTEMPT_FINISHED_EVENT, {
                    quizId: this.quizId,
                    attemptId: this.attempt.id,
                    synced: !this.offline
                }, this.sitesProvider.getCurrentSiteId());

                // Leave the player.
                this.forceLeave = true;
                this.navCtrl.pop();
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorsaveattempt', true);
        });
    }

    /**
     * Fix sequence checks of current page.
     *
     * @return Promise resolved when done.
     */
    protected fixSequenceChecks(): Promise<any> {
        // Get current page data again to get the latest sequencechecks.
        return this.quizProvider.getAttemptData(this.attempt.id, this.attempt.currentpage, this.preflightData, this.offline, true)
                .then((data) => {

            const newSequenceChecks = {};

            data.questions.forEach((question) => {
                newSequenceChecks[question.slot] = this.questionHelper.getQuestionSequenceCheckFromHtml(question.html);
            });

            // Notify the new sequence checks to the components.
            this.questionComponents.forEach((component) => {
                component.updateSequenceCheck(newSequenceChecks);
            });
        });
    }

    /**
     * Get the input answers.
     *
     * @return Object with the answers.
     */
    protected getAnswers(): any {
        return this.questionHelper.getAnswersFromForm(document.forms['addon-mod_quiz-player-form']);
    }

    /**
     * Initializes the timer if enabled.
     */
    protected initTimer(): void {
        if (this.attemptAccessInfo.endtime > 0) {
            // Quiz has an end time. Check if time left should be shown.
            if (this.quizProvider.shouldShowTimeLeft(this.quizAccessInfo.activerulenames, this.attempt,
                    this.attemptAccessInfo.endtime)) {
                this.endTime = this.attemptAccessInfo.endtime;
            } else {
                delete this.endTime;
            }
        }
    }

    /**
     * Load a page questions.
     *
     * @param page The page to load.
     * @return Promise resolved when done.
     */
    protected loadPage(page: number): Promise<void> {
        return this.quizProvider.getAttemptData(this.attempt.id, page, this.preflightData, this.offline, true).then((data) => {
            // Update attempt, status could change during the execution.
            this.attempt = data.attempt;
            this.attempt.currentpage = page;

            this.questions = data.questions;
            this.nextPage = data.nextpage;
            this.previousPage = this.quiz.isSequential ? -1 : page - 1;
            this.showSummary = false;

            this.questions.forEach((question) => {
                // Get the readable mark for each question.
                question.readableMark = this.quizHelper.getQuestionMarkFromHtml(question.html);

                // Extract the question info box.
                this.questionHelper.extractQuestionInfoBox(question, '.info');

                // Set the preferred behaviour.
                question.preferredBehaviour = this.quiz.preferredbehaviour;

                // Check if the question is blocked. If it is, treat it as a description question.
                if (this.quizProvider.isQuestionBlocked(question)) {
                    question.type = 'description';
                }
            });

            // Mark the page as viewed. We'll ignore errors in this call.
            this.quizProvider.logViewAttempt(this.attempt.id, page, this.preflightData, this.offline, this.quiz).catch((error) => {
                // Ignore errors.
            });

            // Start looking for changes.
            this.autoSave.startCheckChangesProcess(this.quiz, this.attempt, this.preflightData, this.offline);
        });
    }

    /**
     * Load attempt summary.
     *
     * @return Promise resolved when done.
     */
    protected loadSummary(): Promise<void> {
        this.summaryQuestions = [];

        return this.quizProvider.getAttemptSummary(this.attempt.id, this.preflightData, this.offline, true, true).then((qs) => {
            this.showSummary = true;
            this.summaryQuestions = qs;

            this.canReturn = this.attempt.state == AddonModQuizProvider.ATTEMPT_IN_PROGRESS && !this.attempt.finishedOffline;
            this.preventSubmitMessages = this.quizProvider.getPreventSubmitMessages(this.summaryQuestions);

            this.attempt.dueDateWarning = this.quizProvider.getAttemptDueDateWarning(this.quiz, this.attempt);

            // Log summary as viewed.
            this.quizProvider.logViewAttemptSummary(this.attempt.id, this.preflightData, this.quizId, this.quiz.name)
                    .catch((error) => {
                // Ignore errors.
            });
        });
    }

    /**
     * Load data to navigate the questions using the navigation modal.
     *
     * @return Promise resolved when done.
     */
    protected loadNavigation(): Promise<void> {
        // We use the attempt summary to build the navigation because it contains all the questions.
        return this.quizProvider.getAttemptSummary(this.attempt.id, this.preflightData, this.offline, true, true)
                .then((questions) => {

            questions.forEach((question) => {
                question.stateClass = this.questionHelper.getQuestionStateClass(question.state);
            });

            this.navigation = questions;
        });
    }

    /**
     * Open the navigation modal.
     *
     * @return Promise resolved when done.
     */
    openNavigation(): Promise<any> {
        let promise;

        if (this.reloadNavigaton) {
            // Some data has changed, reload the navigation.
            const modal = this.domUtils.showModalLoading();

            promise = this.loadNavigation().catch(() => {
                // Ignore errors.
            }).then(() => {
                modal.dismiss();
                this.reloadNavigaton = false;
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.finally(() => {
            this.navigationModal.present();
        });
    }

    // Prepare the answers to be sent for the attempt.
    protected prepareAnswers(): Promise<any> {
        return this.questionHelper.prepareAnswers(this.questions, this.getAnswers(), this.offline);
    }

    /**
     * Process attempt.
     *
     * @param userFinish Whether the user clicked to finish the attempt.
     * @param timeUp Whether the quiz time is up.
     * @return Promise resolved when done.
     * @param retrying Whether we're retrying the change.
     */
    protected processAttempt(userFinish?: boolean, timeUp?: boolean, retrying?: boolean): Promise<any> {
        // Get the answers to send.
        return this.prepareAnswers().then((answers) => {
            // Send the answers.
            return this.quizProvider.processAttempt(this.quiz, this.attempt, answers, this.preflightData, userFinish, timeUp,
                    this.offline).catch((error) => {

                if (error && error.errorcode == 'submissionoutofsequencefriendlymessage') {
                    // There was an error with the sequence check. Try to ammend it.
                    return this.fixSequenceChecks().then((): any => {
                        if (retrying) {
                            // We're already retrying, don't send the data again because it could cause an infinite loop.
                            return Promise.reject(error);
                        }

                        // Sequence checks updated, try to send the data again.
                        return this.processAttempt(userFinish, timeUp, true);
                    }, () => {
                        return Promise.reject(error);
                    });
                }

                return Promise.reject(error);
            });
        }).then(() => {
            // Answers saved, cancel auto save.
            this.autoSave.cancelAutoSave();
            this.autoSave.hideAutoSaveError();
        });
    }

    /**
     * Scroll to a certain question.
     *
     * @param slot Slot of the question to scroll to.
     */
    protected scrollToQuestion(slot: number): void {
        this.domUtils.scrollToElementBySelector(this.content, '#addon-mod_quiz-question-' + slot);
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
    start(): void {
        let promise;
        this.loaded = false;

        if (this.quizDataLoaded) {
            // Quiz data has been loaded, try to start or continue.
            promise = this.startOrContinueAttempt();
        } else {
            // Fetch data.
            promise = this.fetchData().then(() => {
                this.quizDataLoaded = true;

                return this.startOrContinueAttempt();
            });
        }

        promise.finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Start or continue an attempt.
     *
     * @return [description]
     */
    protected startOrContinueAttempt(): Promise<any> {
        const attempt = this.newAttempt ? undefined : this.lastAttempt;

        // Get the preflight data and start attempt if needed.
        return this.quizHelper.getAndCheckPreflightData(this.quiz, this.quizAccessInfo, this.preflightData, attempt, this.offline,
                false, 'addon.mod_quiz.startattempt').then((attempt) => {

            // Re-fetch attempt access information with the right attempt (might have changed because a new attempt was created).
            return this.quizProvider.getAttemptAccessInformation(this.quiz.id, attempt.id, this.offline, true).then((info) => {
                this.attemptAccessInfo = info;
                this.attempt = attempt;

                return this.loadNavigation();
            }).then(() => {
                if (this.attempt.state != AddonModQuizProvider.ATTEMPT_OVERDUE && !this.attempt.finishedOffline) {
                    // Attempt not overdue and not finished in offline, load page.
                    return this.loadPage(this.attempt.currentpage).then(() => {
                        this.initTimer();
                    });
                } else {
                    // Attempt is overdue or finished in offline, we can only load the summary.
                    return this.loadSummary();
                }
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquestions', true);
        });
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
