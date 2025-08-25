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

import { Component, ElementRef, OnInit, inject, viewChild } from '@angular/core';
import { CoreQuestionQuestionForView } from '@features/question/services/question';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { IonContent } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreDom } from '@singletons/dom';
import { CoreTime } from '@singletons/time';
import {
    AddonModQuizNavigationModalReturn,
    AddonModQuizNavigationQuestion,
} from '../../components/navigation-modal/navigation-modal';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizCombinedReviewOptions,
    AddonModQuizQuizWSData,
    AddonModQuizWSAdditionalData,
} from '../../services/quiz';
import { AddonModQuizHelper } from '../../services/quiz-helper';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_QUIZ_COMPONENT_LEGACY } from '../../constants';
import { CoreModals } from '@services/overlays/modals';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { AddonModQuizQuestionCardComponent } from '../../components/question-card/question-card';
import { AddonModQuizAttemptInfoComponent } from '../../components/attempt-info/attempt-info';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreQuestionComponent } from '@features/question/components/question/question';
import { CoreWait } from '@singletons/wait';
import { CoreLoadings } from '@services/overlays/loadings';

/**
 * Page that allows reviewing a quiz attempt.
 */
@Component({
    selector: 'page-addon-mod-quiz-review',
    templateUrl: 'review.html',
    imports: [
        CoreSharedModule,
        AddonModQuizAttemptInfoComponent,
        AddonModQuizQuestionCardComponent,
        CoreQuestionComponent,
    ],
})
export default class AddonModQuizReviewPage implements OnInit {

    readonly content = viewChild(IonContent);

    protected static readonly QUESTIONS_PER_LOAD_WHEN_SHOW_ALL = 10;

    attempt?: AddonModQuizAttemptWSData; // The attempt being reviewed.
    component = ADDON_MOD_QUIZ_COMPONENT_LEGACY; // Component to link the files to.
    showAll = false; // Whether to view all questions in the same page.
    numPages = 1; // Number of pages.
    showCompleted = false; // Whether to show completed time.
    additionalData?: AddonModQuizWSAdditionalData[]; // Additional data to display for the attempt.
    loaded = false; // Whether data has been loaded.
    navigation: AddonModQuizNavigationQuestion[] = []; // List of questions to navigate them.
    questions: CoreQuestionQuestionForView[] = []; // Questions of the current page.
    nextPage = -2; // Next page.
    previousPage = -2; // Previous page.
    readableGrade?: string;
    timeTaken?: string;
    gradeItemMarks: { name: string; grade: string }[] = [];
    overTime?: string;
    quiz?: AddonModQuizQuizWSData; // The quiz the attempt belongs to.
    courseId!: number; // The course ID the quiz belongs to.
    cmId!: number; // Course module id the attempt belongs to.
    canLoadMore = false;
    allQuestions: CoreQuestionQuestionForView[] = []; // When using infinite loading, this will contain all the questions.

    protected attemptId!: number; // The attempt being reviewed.
    protected currentPage!: number; // The current page being reviewed.
    protected options?: AddonModQuizCombinedReviewOptions; // Review options.
    protected logView: () => void;
    protected element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
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
            this.currentPage = CoreNavigator.getRouteNumberParam('page') || 0;
        } catch (error) {
            CoreAlerts.showError(error);
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
        if (slot !== undefined && (this.attempt?.currentpage === -1 || page === this.currentPage)) {
            // Scrol to a certain question in the current page.
            this.scrollToQuestion(slot);

            return;
        } else if (page === this.currentPage) {
            // If the user is navigating to the current page and no question specified, we do nothing.
            return;
        }

        this.loaded = false;
        this.content()?.scrollToTop();

        try {
            await this.loadPage(page);

            this.performLogView(false, { page });
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_quiz.errorgetquestions') });
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
     */
    protected async fetchData(): Promise<void> {
        try {
            this.quiz = await AddonModQuiz.getQuiz(this.courseId, this.cmId);

            this.options = await AddonModQuiz.getCombinedReviewOptions(this.quiz.id, { cmId: this.cmId });

            AddonModQuizHelper.setQuizCalculatedData(this.quiz, this.options);

            // Load the navigation data.
            await this.loadNavigation();

            // Load questions.
            await this.loadPage(this.currentPage);

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_quiz.errorgetquiz') });
            if (error.errorcode === 'noreview' || error.errorcode === 'noreviewattempt') {
                CoreNavigator.back();
            }
        }
    }

    /**
     * Load a page questions.
     *
     * @param page The page to load.
     */
    protected async loadPage(page: number): Promise<void> {
        if (!this.quiz) {
            return;
        }

        const data = await AddonModQuiz.getAttemptReview(this.attemptId, { page, cmId: this.quiz.coursemodule });

        this.attempt = await AddonModQuizHelper.setAttemptCalculatedData(this.quiz, data.attempt);
        this.attempt.currentpage = page;
        this.additionalData = data.additionaldata;
        this.currentPage = page;

        if (page === -1) {
            this.allQuestions = data.questions;
            this.questions = data.questions.slice(0, AddonModQuizReviewPage.QUESTIONS_PER_LOAD_WHEN_SHOW_ALL);
            this.canLoadMore = this.allQuestions.length > this.questions.length;
        } else {
            this.questions = data.questions;
            this.nextPage = page + 1;
            this.previousPage = page - 1;
        }

        this.questions.forEach((question) => {
            // Get the readable mark for each question.
            question.readableMark = AddonModQuizHelper.getQuestionMarkFromHtml(question.html);

            // Extract the question info box.
            CoreQuestionHelper.extractQuestionInfoBox(question, '.info');
        });
    }

    /**
     * Show more questions (only used when showing all the questions at the same time).
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    loadMore(infiniteComplete?: () => void): void {
        this.questions = this.questions.concat(this.allQuestions.slice(
            this.questions.length,
            this.questions.length + AddonModQuizReviewPage.QUESTIONS_PER_LOAD_WHEN_SHOW_ALL,
        ));
        this.canLoadMore = this.allQuestions.length > this.questions.length;

        infiniteComplete?.();
    }

    /**
     * Load data to navigate the questions using the navigation modal.
     */
    protected async loadNavigation(): Promise<void> {
        // Get all questions in single page to retrieve all the questions.
        const data = await AddonModQuiz.getAttemptReview(this.attemptId, { page: -1, cmId: this.quiz?.coursemodule });

        this.navigation = data.questions;

        this.navigation.forEach((question) => {
            CoreQuestionHelper.populateQuestionStateClass(question);
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

        await CorePromiseUtils.ignoreErrors(Promise.all(promises));

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
    protected async scrollToQuestion(slot: number): Promise<void> {
        if (this.showAll && this.canLoadMore) {
            // First make sure that the question is visible.
            const pageIndex = this.allQuestions.findIndex(question => question.slot === slot);
            if (pageIndex > this.questions.length) {
                // Not visible, load the needed questions.
                // Show a loading modal because if there are a lot of questions to load it can take a few seconds to render.
                const loading = await CoreLoadings.show();

                const lastQuestionToLoad = Math.ceil(pageIndex / AddonModQuizReviewPage.QUESTIONS_PER_LOAD_WHEN_SHOW_ALL) *
                    AddonModQuizReviewPage.QUESTIONS_PER_LOAD_WHEN_SHOW_ALL;
                this.questions = this.questions.concat(this.allQuestions.slice(this.questions.length, lastQuestionToLoad));
                this.canLoadMore = this.allQuestions.length > this.questions.length;

                // Wait some ticks to let the questions render, otherwise the scroll might end up in a wrong position.
                await CoreWait.nextTicks(5);
                await loading.dismiss();
                await CoreWait.nextTick(); // For some reason scrolling doesn't work right after dismiss, wait a tick.
            }
        }

        CoreDom.scrollToElement(
            this.element,
            `#addon-mod_quiz-question-${slot}`,
        );
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
        const { AddonModQuizNavigationModalComponent } = await import('../../components/navigation-modal/navigation-modal');

        // Create the navigation modal.
        const modalData = await CoreModals.openSideModal<AddonModQuizNavigationModalReturn>({
            component: AddonModQuizNavigationModalComponent,
            componentProps: {
                navigation: this.navigation,
                summaryShown: false,
                currentPage: this.attempt?.currentpage,
                nextPage: this.nextPage,
                isReview: true,
                isSequential: this.quiz && AddonModQuiz.isNavigationSequential(this.quiz),
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
            await CorePromiseUtils.ignoreErrors(AddonModQuiz.logViewAttemptReview(this.attemptId, this.quiz.id));
        }

        let url = `/mod/quiz/review.php?attempt=${this.attemptId}&cmid=${this.cmId}`;
        if (options.showAllDisabled) {
            url += '&showall=0';
        } else if (options.page && options.page > 0) {
            url += `&page=${options.page}`;
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

type LogViewOptions = {
    page?: number; // Page being viewed (if viewing pages);
    showAllDisabled?: boolean; // Whether the showAll option has just been disabled.
};
