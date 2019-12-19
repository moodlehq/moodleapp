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

import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Content, ModalController, Modal } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { AddonModQuizProvider } from '../../providers/quiz';
import { AddonModQuizHelperProvider } from '../../providers/helper';

/**
 * Page that allows reviewing a quiz attempt.
 */
@IonicPage({ segment: 'addon-mod-quiz-review' })
@Component({
    selector: 'page-addon-mod-quiz-review',
    templateUrl: 'review.html',
})
export class AddonModQuizReviewPage implements OnInit {
    @ViewChild(Content) content: Content;

    attempt: any; // The attempt being reviewed.
    component = AddonModQuizProvider.COMPONENT; // Component to link the files to.
    componentId: number; // ID to use in conjunction with the component.
    showAll: boolean; // Whether to view all questions in the same page.
    numPages: number; // Number of pages.
    showCompleted: boolean; // Whether to show completed time.
    additionalData: any[]; // Additional data to display for the attempt.
    loaded: boolean; // Whether data has been loaded.
    navigation: any[]; // List of questions to navigate them.
    questions: any[]; // Questions of the current page.
    nextPage: number; // Next page.
    previousPage: number; // Previous page.
    navigationModal: Modal; // Modal to navigate through the questions.

    protected quiz: any; // The quiz the attempt belongs to.
    protected courseId: number; // The course ID the quiz belongs to.
    protected quizId: number; // Quiz ID the attempt belongs to.
    protected attemptId: number; // The attempt being reviewed.
    protected currentPage: number; // The current page being reviewed.
    protected options: any; // Review options.

    constructor(navParams: NavParams, modalCtrl: ModalController, protected translate: TranslateService,
            protected domUtils: CoreDomUtilsProvider, protected timeUtils: CoreTimeUtilsProvider,
            protected quizProvider: AddonModQuizProvider, protected quizHelper: AddonModQuizHelperProvider,
            protected questionHelper: CoreQuestionHelperProvider, protected textUtils: CoreTextUtilsProvider) {

        this.quizId = navParams.get('quizId');
        this.courseId = navParams.get('courseId');
        this.attemptId = navParams.get('attemptId');
        this.currentPage = navParams.get('page') || -1;
        this.showAll = this.currentPage == -1;

        // Create the navigation modal.
        this.navigationModal = modalCtrl.create('AddonModQuizNavigationModalPage', {
            isReview: true,
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
        this.fetchData().then(() => {
            this.quizProvider.logViewAttemptReview(this.attemptId, this.quizId, this.quiz.name).catch((error) => {
                // Ignore errors.
            });
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Change the current page. If slot is supplied, try to scroll to that question.
     *
     * @param page Page to load. -1 means all questions in same page.
     * @param fromModal Whether the page was selected using the navigation modal.
     * @param slot Slot of the question to scroll to.
     */
    changePage(page: number, fromModal?: boolean, slot?: number): void {
        if (typeof slot != 'undefined' && (this.attempt.currentpage == -1 || page == this.currentPage)) {
            // Scrol to a certain question in the current page.
            this.scrollToQuestion(slot);

            return;
        } else if (page == this.currentPage) {
            // If the user is navigating to the current page and no question specified, we do nothing.
            return;
        }

        this.loaded = false;
        this.domUtils.scrollToTop(this.content);

        this.loadPage(page).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquestions', true);
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
        return this.quizProvider.getQuizById(this.courseId, this.quizId).then((quizData) => {
            this.quiz = quizData;
            this.componentId = this.quiz.coursemodule;

            return this.quizProvider.getCombinedReviewOptions(this.quizId).then((result) => {
                this.options = result;

                // Load the navigation data.
                return this.loadNavigation().then(() => {
                    // Load questions.
                    return this.loadPage(this.currentPage);
                });
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquiz', true);
        });
    }

    /**
     * Load a page questions.
     *
     * @param page The page to load.
     * @return Promise resolved when done.
     */
    protected loadPage(page: number): Promise<void> {
        return this.quizProvider.getAttemptReview(this.attemptId, page).then((data) => {
            this.attempt = data.attempt;
            this.attempt.currentpage = page;
            this.currentPage = page;

            // Set the summary data.
            this.setSummaryCalculatedData(data);

            this.questions = data.questions;
            this.nextPage = page == -1 ? undefined : page + 1;
            this.previousPage = page - 1;

            this.questions.forEach((question) => {
                // Get the readable mark for each question.
                question.readableMark = this.quizHelper.getQuestionMarkFromHtml(question.html);

                // Extract the question info box.
                this.questionHelper.extractQuestionInfoBox(question, '.info');

                // Set the preferred behaviour.
                question.preferredBehaviour = this.quiz.preferredbehaviour;
            });
        });
    }

    /**
     * Load data to navigate the questions using the navigation modal.
     *
     * @return Promise resolved when done.
     */
    protected loadNavigation(): Promise<void> {
        // Get all questions in single page to retrieve all the questions.
        return this.quizProvider.getAttemptReview(this.attemptId, -1).then((data) => {
            const lastQuestion = data.questions[data.questions.length - 1];

            data.questions.forEach((question) => {
                question.stateClass = this.questionHelper.getQuestionStateClass(question.state);
            });

            this.navigation = data.questions;
            this.numPages = lastQuestion ? lastQuestion.page + 1 : 0;
        });
    }

    /**
     * Refreshes data.
     *
     * @param refresher Refresher
     */
    refreshData(refresher: any): void {
        const promises = [];

        promises.push(this.quizProvider.invalidateQuizData(this.courseId));
        promises.push(this.quizProvider.invalidateCombinedReviewOptionsForUser(this.quizId));
        promises.push(this.quizProvider.invalidateAttemptReview(this.attemptId));

        Promise.all(promises).finally(() => {
            return this.fetchData();
        }).finally(() => {
            refresher.complete();
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
     * Calculate review summary data.
     *
     * @param data Result of getAttemptReview.
     */
    protected setSummaryCalculatedData(data: any): void {

        this.attempt.readableState = this.quizProvider.getAttemptReadableStateName(this.attempt.state);

        if (this.attempt.state == AddonModQuizProvider.ATTEMPT_FINISHED) {
            this.showCompleted = true;
            this.additionalData = data.additionaldata;

            const timeTaken = this.attempt.timefinish - this.attempt.timestart;
            if (timeTaken) {
                // Format time taken.
                this.attempt.timeTaken = this.timeUtils.formatTime(timeTaken);

                // Calculate overdue time.
                if (this.quiz.timelimit && timeTaken > this.quiz.timelimit + 60) {
                    this.attempt.overTime = this.timeUtils.formatTime(timeTaken - this.quiz.timelimit);
                }
            }

            // Treat grade.
            if (this.options.someoptions.marks >= AddonModQuizProvider.QUESTION_OPTIONS_MARK_AND_MAX &&
                    this.quizProvider.quizHasGrades(this.quiz)) {

                if (data.grade === null || typeof data.grade == 'undefined') {
                    this.attempt.readableGrade = this.quizProvider.formatGrade(data.grade, this.quiz.decimalpoints);
                } else {
                    // Show raw marks only if they are different from the grade (like on the entry page).
                    if (this.quiz.grade != this.quiz.sumgrades) {
                        this.attempt.readableMark = this.translate.instant('addon.mod_quiz.outofshort', {$a: {
                            grade: this.quizProvider.formatGrade(this.attempt.sumgrades, this.quiz.decimalpoints),
                            maxgrade: this.quizProvider.formatGrade(this.quiz.sumgrades, this.quiz.decimalpoints)
                        }});
                    }

                    // Now the scaled grade.
                    const gradeObject: any = {
                        grade: this.quizProvider.formatGrade(data.grade, this.quiz.decimalpoints),
                        maxgrade: this.quizProvider.formatGrade(this.quiz.grade, this.quiz.decimalpoints)
                    };

                    if (this.quiz.grade != 100) {
                        gradeObject.percent = this.textUtils.roundToDecimals(this.attempt.sumgrades * 100 / this.quiz.sumgrades, 0);
                        this.attempt.readableGrade = this.translate.instant('addon.mod_quiz.outofpercent', {$a: gradeObject});
                    } else {
                        this.attempt.readableGrade = this.translate.instant('addon.mod_quiz.outof', {$a: gradeObject});
                    }
                }
            }

            // Treat additional data.
            this.additionalData.forEach((data) => {
                // Remove help links from additional data.
                data.content = this.domUtils.removeElementFromHtml(data.content, '.helptooltip');
            });
        }
    }

    /**
     * Switch mode: all questions in same page OR one page at a time.
     */
    switchMode(): void {
        this.showAll = !this.showAll;

        // Load all questions or first page, depending on the mode.
        this.loadPage(this.showAll ? -1 : 0);
    }
}
