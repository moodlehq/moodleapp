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

import { Component, OnInit } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModQuizProvider } from '../../providers/quiz';
import { AddonModQuizHelperProvider } from '../../providers/helper';

/**
 * Page that displays some summary data about an attempt.
 */
@IonicPage({ segment: 'addon-mod-quiz-attempt' })
@Component({
    selector: 'page-addon-mod-quiz-attempt',
    templateUrl: 'attempt.html',
})
export class AddonModQuizAttemptPage implements OnInit {
    courseId: number; // The course ID the quiz belongs to.
    quiz: any; // The quiz the attempt belongs to.
    attempt: any; // The attempt to view.
    component = AddonModQuizProvider.COMPONENT; // Component to link the files to.
    componentId: number; // Component ID to use in conjunction with the component.
    loaded: boolean; // Whether data has been loaded.

    protected attemptId: number; // Attempt to view.
    protected quizId: number; // ID of the quiz the attempt belongs to.

    constructor(navParams: NavParams, protected domUtils: CoreDomUtilsProvider, protected quizProvider: AddonModQuizProvider,
            protected quizHelper: AddonModQuizHelperProvider) {

        this.attemptId = navParams.get('attemptId');
        this.quizId = navParams.get('quizId');
        this.courseId = navParams.get('courseId');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchQuizData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    doRefresh(refresher: any): void {
        this.refreshData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Get quiz data and attempt data.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected fetchQuizData(): Promise<void> {
        return this.quizProvider.getQuizById(this.courseId, this.quizId).then((quizData) => {
            this.quiz = quizData;
            this.componentId = this.quiz.coursemodule;

            return this.fetchAttempt();
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.mod_quiz.errorgetattempt', true);
        });
    }

    /**
     * Get the attempt data.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected fetchAttempt(): Promise<void> {
        const promises = [];
        let options,
            accessInfo;

        // Get all the attempts and search the one we want.
        promises.push(this.quizProvider.getUserAttempts(this.quizId).then((attempts) => {
            for (let i = 0; i < attempts.length; i++) {
                const attempt = attempts[i];
                if (attempt.id == this.attemptId) {
                    this.attempt = attempt;
                    break;
                }
            }

            if (!this.attempt) {
                // Attempt not found, error.
                return Promise.reject(null);
            }

            // Load flag to show if attempt is finished but not synced.
            return this.quizProvider.loadFinishedOfflineData([this.attempt]);
        }));

        promises.push(this.quizProvider.getCombinedReviewOptions(this.quiz.id).then((opts) => {
            options = opts;
        }));

        // Check if the user can review the attempt.
        promises.push(this.quizProvider.getQuizAccessInformation(this.quiz.id).then((quizAccessInfo) => {
            accessInfo = quizAccessInfo;

            if (accessInfo.canreviewmyattempts) {
                // Check if the user can review the attempt.
                return this.quizProvider.invalidateAttemptReviewForPage(this.attemptId, -1).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return this.quizProvider.getAttemptReview(this.attemptId, -1);
                }).catch(() => {
                    // Error getting the review, assume the user cannot review the attempt.
                    accessInfo.canreviewmyattempts = false;
                });
            }
        }));

        return Promise.all(promises).then(() => {

            // Determine fields to show.
            this.quizHelper.setQuizCalculatedData(this.quiz, options);
            this.quiz.showReviewColumn = accessInfo.canreviewmyattempts;

            // Get readable data for the attempt.
            this.quizHelper.setAttemptCalculatedData(this.quiz, this.attempt, false);

            // Check if the feedback should be displayed.
            const grade = Number(this.attempt.rescaledGrade);
            if (this.quiz.showFeedbackColumn && this.quizProvider.isAttemptFinished(this.attempt.state) &&
                        options.someoptions.overallfeedback && !isNaN(grade)) {

                // Feedback should be displayed, get the feedback for the grade.
                return this.quizProvider.getFeedbackForGrade(this.quiz.id, grade).then((response) => {
                    this.attempt.feedback = response.feedbacktext;
                });
            } else {
                delete this.attempt.feedback;
            }
        });
    }

    /**
     * Refresh the data.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected refreshData(): Promise<void> {
        const promises = [];

        promises.push(this.quizProvider.invalidateQuizData(this.courseId));
        promises.push(this.quizProvider.invalidateUserAttemptsForUser(this.quizId));
        promises.push(this.quizProvider.invalidateQuizAccessInformation(this.quizId));
        promises.push(this.quizProvider.invalidateCombinedReviewOptionsForUser(this.quizId));
        promises.push(this.quizProvider.invalidateAttemptReview(this.attemptId));

        if (this.attempt && typeof this.attempt.feedback != 'undefined') {
            promises.push(this.quizProvider.invalidateFeedback(this.quizId));
        }

        return Promise.all(promises).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fetchQuizData();
        });
    }
}
