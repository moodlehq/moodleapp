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

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CoreQuestionQuestionParsed } from '@features/question/services/question';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { IonContent } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreDom } from '@singletons/dom';
import { CoreTime } from '@singletons/time';
import {
    AddonModQuizNavigationModalComponent,
    AddonModQuizNavigationModalReturn,
    AddonModQuizNavigationQuestion,
} from '../../components/navigation-modal/navigation-modal';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizCombinedReviewOptions,
    AddonModQuizGetAttemptReviewResponse,
    AddonModQuizProvider,
    AddonModQuizQuizWSData,
    AddonModQuizWSAdditionalData,
} from '../../services/quiz';
import { AddonModQuizHelper } from '../../services/quiz-helper';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';

/**
 * Page that allows reviewing a quiz attempt.
 */
@Component({
    selector: 'page-addon-mod-quiz-review',
    templateUrl: 'review.html',
    styleUrls: ['review.scss'],
})
export class AddonModQuizReviewPage implements OnInit {

    @ViewChild(IonContent) content?: IonContent;

    attempt?: AddonModQuizAttemptWSData; // The attempt being reviewed.
    component = AddonModQuizProvider.COMPONENT; // Component to link the files to.
    showAll = false; // Whether to view all questions in the same page.
    numPages = 1; // Number of pages.
    showCompleted = false; // Whether to show completed time.
    additionalData?: AddonModQuizWSAdditionalData[]; // Additional data to display for the attempt.
    loaded = false; // Whether data has been loaded.
    navigation: AddonModQuizNavigationQuestion[] = []; // List of questions to navigate them.
    questions: QuizQuestion[] = []; // Questions of the current page.
    nextPage = -2; // Next page.
    previousPage = -2; // Previous page.
    readableState?: string;
    readableGrade?: string;
    readableMark?: string;
    timeTaken?: string;
    overTime?: string;
    quiz?: AddonModQuizQuizWSData; // The quiz the attempt belongs to.
    courseId!: number; // The course ID the quiz belongs to.
    cmId!: number; // Course module id the attempt belongs to.

    protected attemptId!: number; // The attempt being reviewed.
    protected currentPage!: number; // The current page being reviewed.
    protected options?: AddonModQuizCombinedReviewOptions; // Review options.
    protected logView: () => void;

    constructor(
        protected elementRef: ElementRef,
    ) {
        this.logView = CoreTime.once(() => this.performLogView(true, {
            showAllDisabled: !this.showAll,
            page: this.currentPage,
        }));
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.attemptId = CoreNavigator.getRequiredRouteNumberParam('attemptId');
            this.currentPage = CoreNavigator.getRouteNumberParam('page') || -1;
            this.showAll = this.currentPage == -1;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        try {
            await this.fetchData();
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Change the current page. If slot is supplied, try to scroll to that question.
     *
     * @param page Page to load. -1 means all questions in same page.
     * @param slot Slot of the question to scroll to.
     */
    async changePage(page: number, slot?: number): Promise<void> {
        if (slot !== undefined && (this.attempt?.currentpage == -1 || page == this.currentPage)) {
            // Scrol to a certain question in the current page.
            this.scrollToQuestion(slot);

            return;
        } else if (page == this.currentPage) {
            // If the user is navigating to the current page and no question specified, we do nothing.
            return;
        }

        this.loaded = false;
        this.content?.scrollToTop();

        try {
            await this.loadPage(page);

            this.performLogView(false, { page });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquestions', true);
        } finally {
            this.loaded = true;

            if (slot !== undefined) {
                // Scroll to the question.
                this.scrollToQuestion(slot);
            }
        }
    }

    /**
     * Convenience function to get the quiz data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.quiz = await AddonModQuiz.getQuiz(this.courseId, this.cmId);

            this.options = await AddonModQuiz.getCombinedReviewOptions(this.quiz.id, { cmId: this.cmId });

            // Load the navigation data.
            await this.loadNavigation();

            // Load questions.
            await this.loadPage(this.currentPage);

            this.logView();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetquiz', true);
        }
    }

    /**
     * Load a page questions.
     *
     * @param page The page to load.
     * @returns Promise resolved when done.
     */
    protected async loadPage(page: number): Promise<void> {
        const data = await AddonModQuiz.getAttemptReview(this.attemptId, { page, cmId: this.quiz?.coursemodule });

        this.attempt = data.attempt;
        this.attempt.currentpage = page;
        this.currentPage = page;

        // Set the summary data.
        this.setSummaryCalculatedData(data);

        this.questions = data.questions;
        this.nextPage = page + 1;
        this.previousPage = page - 1;

        this.questions.forEach((question) => {
            // Get the readable mark for each question.
            question.readableMark = AddonModQuizHelper.getQuestionMarkFromHtml(question.html);

            // Extract the question info box.
            CoreQuestionHelper.extractQuestionInfoBox(question, '.info');
        });
    }

    /**
     * Load data to navigate the questions using the navigation modal.
     *
     * @returns Promise resolved when done.
     */
    protected async loadNavigation(): Promise<void> {
        // Get all questions in single page to retrieve all the questions.
        const data = await AddonModQuiz.getAttemptReview(this.attemptId, { page: -1, cmId: this.quiz?.coursemodule });

        this.navigation = data.questions;

        this.navigation.forEach((question) => {
            question.stateClass = CoreQuestionHelper.getQuestionStateClass(question.state || '');
        });

        const lastQuestion = data.questions[data.questions.length - 1];
        this.numPages = lastQuestion ? lastQuestion.page + 1 : 0;
    }

    /**
     * Refreshes data.
     *
     * @param refresher Refresher
     */
    async refreshData(refresher: HTMLIonRefresherElement): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModQuiz.invalidateQuizData(this.courseId));
        promises.push(AddonModQuiz.invalidateAttemptReview(this.attemptId));
        if (this.quiz) {
            promises.push(AddonModQuiz.invalidateCombinedReviewOptionsForUser(this.quiz.id));
        }

        await CoreUtils.ignoreErrors(Promise.all(promises));

        try {
            await this.fetchData();
        } finally {
            refresher.complete();
        }
    }

    /**
     * Scroll to a certain question.
     *
     * @param slot Slot of the question to scroll to.
     */
    protected scrollToQuestion(slot: number): void {
        CoreDom.scrollToElement(
            this.elementRef.nativeElement,
            `#addon-mod_quiz-question-${slot}`,
        );
    }

    /**
     * Calculate review summary data.
     *
     * @param data Result of getAttemptReview.
     */
    protected setSummaryCalculatedData(data: AddonModQuizGetAttemptReviewResponse): void {
        if (!this.attempt || !this.quiz) {
            return;
        }

        this.readableState = AddonModQuiz.getAttemptReadableStateName(this.attempt.state ?? '');

        if (this.attempt.state != AddonModQuizProvider.ATTEMPT_FINISHED) {
            return;
        }

        this.showCompleted = true;
        this.additionalData = data.additionaldata;

        const timeTaken = (this.attempt.timefinish || 0) - (this.attempt.timestart || 0);
        if (timeTaken > 0) {
            // Format time taken.
            this.timeTaken = CoreTime.formatTime(timeTaken);

            // Calculate overdue time.
            if (this.quiz.timelimit && timeTaken > this.quiz.timelimit + 60) {
                this.overTime = CoreTime.formatTime(timeTaken - this.quiz.timelimit);
            }
        } else {
            this.timeTaken = undefined;
        }

        // Treat grade.
        if (this.options && this.options.someoptions.marks >= AddonModQuizProvider.QUESTION_OPTIONS_MARK_AND_MAX &&
                AddonModQuiz.quizHasGrades(this.quiz)) {

            if (data.grade === null || data.grade === undefined) {
                this.readableGrade = AddonModQuiz.formatGrade(data.grade, this.quiz.decimalpoints);
            } else {
                // Show raw marks only if they are different from the grade (like on the entry page).
                if (this.quiz.grade != this.quiz.sumgrades) {
                    this.readableMark = Translate.instant('addon.mod_quiz.outofshort', { $a: {
                        grade: AddonModQuiz.formatGrade(this.attempt.sumgrades, this.quiz.decimalpoints),
                        maxgrade: AddonModQuiz.formatGrade(this.quiz.sumgrades, this.quiz.decimalpoints),
                    } });
                }

                // Now the scaled grade.
                const gradeObject: Record<string, unknown> = {
                    grade: AddonModQuiz.formatGrade(Number(data.grade), this.quiz.decimalpoints),
                    maxgrade: AddonModQuiz.formatGrade(this.quiz.grade, this.quiz.decimalpoints),
                };

                if (this.quiz.grade != 100) {
                    gradeObject.percent = AddonModQuiz.formatGrade(
                        (this.attempt.sumgrades ?? 0) * 100 / (this.quiz.sumgrades ?? 1),
                        this.quiz.decimalpoints,
                    );
                    this.readableGrade = Translate.instant('addon.mod_quiz.outofpercent', { $a: gradeObject });
                } else {
                    this.readableGrade = Translate.instant('addon.mod_quiz.outof', { $a: gradeObject });
                }
            }
        }

        // Treat additional data.
        this.additionalData.forEach((data) => {
            // Remove help links from additional data.
            data.content = CoreDomUtils.removeElementFromHtml(data.content, '.helptooltip');
        });
    }

    /**
     * Switch mode: all questions in same page OR one page at a time.
     */
    async switchMode(): Promise<void> {
        this.showAll = !this.showAll;

        // Load all questions or first page, depending on the mode.
        await this.loadPage(this.showAll ? -1 : 0);

        this.performLogView(false, { showAllDisabled: !this.showAll });
    }

    async openNavigation(): Promise<void> {
        // Create the navigation modal.
        const modalData = await CoreDomUtils.openSideModal<AddonModQuizNavigationModalReturn>({
            component: AddonModQuizNavigationModalComponent,
            componentProps: {
                navigation: this.navigation,
                summaryShown: false,
                currentPage: this.attempt?.currentpage,
                isReview: true,
            },
        });

        if (!modalData) {
            return;
        }

        this.changePage(modalData.page, modalData.slot);
    }

    /**
     * Perform log view.
     *
     * @param logInLMS Whether to log in LMS too or only in analytics.
     * @param options Other options.
     */
    protected async performLogView(logInLMS = false, options: LogViewOptions = {}): Promise<void> {
        if (!this.quiz) {
            return;
        }

        if (logInLMS) {
            await CoreUtils.ignoreErrors(AddonModQuiz.logViewAttemptReview(this.attemptId, this.quiz.id));
        }

        let url = `/mod/quiz/review.php?attempt=${this.attemptId}&cmid=${this.cmId}`;
        if (options.showAllDisabled) {
            url += '&showall=0';
        } else if (options.page && options.page > 0) {
            url += `&page=${ options.page}`;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'mod_quiz_view_attempt_review',
            name: this.quiz.name,
            data: { id: this.attemptId, quizid: this.quiz.id, page: options.page, category: 'quiz' },
            url: url,
        });
    }

}

/**
 * Question with some calculated data for the view.
 */
type QuizQuestion = CoreQuestionQuestionParsed & {
    readableMark?: string;
};

type LogViewOptions = {
    page?: number; // Page being viewed (if viewing pages);
    showAllDisabled?: boolean; // Whether the showAll option has just been disabled.
};
