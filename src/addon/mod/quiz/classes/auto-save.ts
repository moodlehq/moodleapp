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

import { PopoverController, Popover } from 'ionic-angular';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { AddonModQuizProvider } from '../providers/quiz';
import { AddonModQuizConnectionErrorComponent } from '../components/connection-error/connection-error';
import { BehaviorSubject } from 'rxjs';

/**
 * Class to support auto-save in quiz. Every certain seconds, it will check if there are changes in the current page answers
 * and, if so, it will save them automatically.
 */
export class AddonModQuizAutoSave {
    protected CHECK_CHANGES_INTERVAL = 5000;

    protected logger;
    protected checkChangesInterval; // Interval to check if there are changes in the answers.
    protected loadPreviousAnswersTimeout; // Timeout to load previous answers.
    protected autoSaveTimeout; // Timeout to auto-save the answers.
    protected popover: Popover; // Popover to display there's been an error.
    protected popoverShown = false; // Whether the popover is shown.
    protected previousAnswers: any; // The previous answers. It is used to check if answers have changed.
    protected errorObservable: BehaviorSubject<boolean>; // An observable to notify if there's been an error.

    /**
     * Constructor.
     *
     * @param formName Name of the form where the answers are stored.
     * @param buttonSelector Selector to find the button to show the connection error.
     * @param loggerProvider CoreLoggerProvider instance.
     * @param popoverCtrl PopoverController instance.
     * @param questionHelper CoreQuestionHelperProvider instance.
     * @param quizProvider AddonModQuizProvider instance.
     */
    constructor(protected formName: string, protected buttonSelector: string, loggerProvider: CoreLoggerProvider,
            protected popoverCtrl: PopoverController, protected questionHelper: CoreQuestionHelperProvider,
            protected quizProvider: AddonModQuizProvider) {

        this.logger = loggerProvider.getInstance('AddonModQuizAutoSave');

        // Create the popover.
        this.popover = this.popoverCtrl.create(AddonModQuizConnectionErrorComponent);
        this.popover.onDidDismiss(() => {
            this.popoverShown = false;
        });

        // Create the observable to notify if an error happened.
        this.errorObservable = new BehaviorSubject<boolean>(false);
    }

    /**
     * Cancel a pending auto save.
     */
    cancelAutoSave(): void {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = undefined;
    }

    /**
     * Check if the answers have changed in a page.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param preflightData Preflight data.
     * @param offline Whether the quiz is being attempted in offline mode.
     */
    checkChanges(quiz: any, attempt: any, preflightData: any, offline?: boolean): void {
        if (this.autoSaveTimeout) {
            // We already have an auto save pending, no need to check changes.
            return;
        }

        const answers = this.getAnswers();

        if (!this.previousAnswers) {
            // Previous answers isn't set, set it now.
            this.previousAnswers = answers;
        } else {
            // Check if answers have changed.
            let equal = true;

            for (const name in answers) {
                if (this.previousAnswers[name] != answers[name]) {
                    equal = false;
                    break;
                }
            }

            if (!equal) {
                this.setAutoSaveTimer(quiz, attempt, preflightData, offline);
            }

            this.previousAnswers = answers;
        }
    }

    /**
     * Get answers from a form.
     *
     * @return Answers.
     */
    protected getAnswers(): any {
        return this.questionHelper.getAnswersFromForm(document.forms[this.formName]);
    }

    /**
     * Hide the auto save error.
     */
    hideAutoSaveError(): void {
        this.errorObservable.next(false);
        this.popover.dismiss();
    }

    /**
     * Returns an observable that will notify when an error happens or stops.
     * It will send true when there's an error, and false when the error has been ammended.
     *
     * @return Observable.
     */
    onError(): BehaviorSubject<boolean> {
        return this.errorObservable;
    }

    /**
     * Schedule an auto save process if it's not scheduled already.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param preflightData Preflight data.
     * @param offline Whether the quiz is being attempted in offline mode.
     */
    setAutoSaveTimer(quiz: any, attempt: any, preflightData: any, offline?: boolean): void {
        // Don't schedule if already shceduled or quiz is almost closed.
        if (quiz.autosaveperiod && !this.autoSaveTimeout && !this.quizProvider.isAttemptTimeNearlyOver(quiz, attempt)) {

            // Schedule save.
            this.autoSaveTimeout = setTimeout(() => {
                const answers = this.getAnswers();
                this.cancelAutoSave();
                this.previousAnswers = answers; // Update previous answers to match what we're sending to the server.

                this.quizProvider.saveAttempt(quiz, attempt, answers, preflightData, offline).then(() => {
                    // Save successful, we can hide the connection error if it was shown.
                    this.hideAutoSaveError();
                }).catch((error) => {
                    // Error auto-saving. Show error and set timer again.
                    this.logger.warn('Error auto-saving data.', error);

                    // If there was no error already, show the error message.
                    if (!this.errorObservable.getValue()) {
                        this.errorObservable.next(true);
                        this.showAutoSaveError();
                    }

                    // Try again.
                    this.setAutoSaveTimer(quiz, attempt, preflightData, offline);
                });
            }, quiz.autosaveperiod * 1000);
        }
    }

    /**
     * Show an error popover due to an auto save error.
     */
    showAutoSaveError(ev?: Event): void {
        // Don't show popover if it was already shown.
        if (!this.popoverShown) {
            this.popoverShown = true;

            // If no event is provided, simulate it targeting the button.
            this.popover.present({
                ev: ev || { target: document.querySelector(this.buttonSelector) }
            });
        }
    }

    /**
     * Start a process to periodically check changes in answers.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param preflightData Preflight data.
     * @param offline Whether the quiz is being attempted in offline mode.
     */
    startCheckChangesProcess(quiz: any, attempt: any, preflightData: any, offline?: boolean): void {
        if (this.checkChangesInterval || !quiz.autosaveperiod) {
            // We already have the interval in place or the quiz has autosave disabled.
            return;
        }

        this.previousAnswers = undefined;

        // Load initial answers in 2.5 seconds so the first check interval finds them already loaded.
        this.loadPreviousAnswersTimeout = setTimeout(() => {
            this.checkChanges(quiz, attempt, preflightData, offline);
        }, 2500);

        // Check changes every certain time.
        this.checkChangesInterval = setInterval(() => {
            this.checkChanges(quiz, attempt, preflightData, offline);
        }, this.CHECK_CHANGES_INTERVAL);
    }

    /**
     * Stops the periodical check for changes.
     */
    stopCheckChangesProcess(): void {
        clearTimeout(this.loadPreviousAnswersTimeout);
        clearInterval(this.checkChangesInterval);

        this.loadPreviousAnswersTimeout = undefined;
        this.checkChangesInterval = undefined;
    }
}
