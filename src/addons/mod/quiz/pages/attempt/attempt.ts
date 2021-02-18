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

import { Component, OnInit } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizGetQuizAccessInformationWSResponse,
    AddonModQuizProvider,
} from '../../services/quiz';
import { AddonModQuizAttempt, AddonModQuizHelper, AddonModQuizQuizData } from '../../services/quiz-helper';

/**
 * Page that displays some summary data about an attempt.
 */
@Component({
    selector: 'page-addon-mod-quiz-attempt',
    templateUrl: 'attempt.html',
})
export class AddonModQuizAttemptPage implements OnInit {

    courseId!: number; // The course ID the quiz belongs to.
    quiz?: AddonModQuizQuizData; // The quiz the attempt belongs to.
    attempt?: AddonModQuizAttempt; // The attempt to view.
    component = AddonModQuizProvider.COMPONENT; // Component to link the files to.
    componentId?: number; // Component ID to use in conjunction with the component.
    loaded = false; // Whether data has been loaded.
    feedback?: string; // Attempt feedback.
    showReviewColumn = false;

    protected attemptId!: number; // Attempt to view.
    protected quizId!: number; // ID of the quiz the attempt belongs to.

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.quizId = CoreNavigator.instance.getRouteNumberParam('quizId')!;
        this.courseId = CoreNavigator.instance.getRouteNumberParam('courseId')!;
        this.attemptId = CoreNavigator.instance.getRouteNumberParam('attemptId')!;

        this.fetchQuizData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher: IonRefresher): void {
        this.refreshData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Get quiz data and attempt data.
     *
     * @return Promise resolved when done.
     */
    protected async fetchQuizData(): Promise<void> {
        try {
            this.quiz = await AddonModQuiz.instance.getQuizById(this.courseId, this.quizId);

            this.componentId = this.quiz.coursemodule;

            // Load attempt data.
            const [options, accessInfo, attempt] = await Promise.all([
                AddonModQuiz.instance.getCombinedReviewOptions(this.quiz.id, { cmId: this.quiz.coursemodule }),
                this.fetchAccessInfo(),
                this.fetchAttempt(),
            ]);

            // Set calculated data.
            this.showReviewColumn = accessInfo.canreviewmyattempts;
            AddonModQuizHelper.instance.setQuizCalculatedData(this.quiz, options);

            this.attempt = await AddonModQuizHelper.instance.setAttemptCalculatedData(this.quiz!, attempt, false, undefined, true);

            // Check if the feedback should be displayed.
            const grade = Number(this.attempt!.rescaledGrade);

            if (this.quiz.showFeedbackColumn && AddonModQuiz.instance.isAttemptFinished(this.attempt!.state) &&
                    options.someoptions.overallfeedback && !isNaN(grade)) {

                // Feedback should be displayed, get the feedback for the grade.
                const response = await AddonModQuiz.instance.getFeedbackForGrade(this.quiz.id, grade, {
                    cmId: this.quiz.coursemodule,
                });

                this.feedback = response.feedbacktext;
            } else {
                delete this.feedback;
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.mod_quiz.errorgetattempt', true);
        }
    }

    /**
     * Get the attempt.
     *
     * @return Promise resolved when done.
     */
    protected async fetchAttempt(): Promise<AddonModQuizAttemptWSData> {
        // Get all the attempts and search the one we want.
        const attempts = await AddonModQuiz.instance.getUserAttempts(this.quizId, { cmId: this.quiz!.coursemodule });

        const attempt = attempts.find(attempt => attempt.id == this.attemptId);

        if (!attempt) {
            // Attempt not found, error.
            this.attempt = undefined;

            throw new CoreError(Translate.instance.instant('addon.mod_quiz.errorgetattempt'));
        }

        return attempt;
    }

    /**
     * Get the access info.
     *
     * @return Promise resolved when done.
     */
    protected async fetchAccessInfo(): Promise<AddonModQuizGetQuizAccessInformationWSResponse> {
        const accessInfo = await AddonModQuiz.instance.getQuizAccessInformation(this.quizId, { cmId: this.quiz!.coursemodule });

        if (!accessInfo.canreviewmyattempts) {
            return accessInfo;
        }

        // Check if the user can review the attempt.
        await CoreUtils.instance.ignoreErrors(AddonModQuiz.instance.invalidateAttemptReviewForPage(this.attemptId, -1));

        try {
            await AddonModQuiz.instance.getAttemptReview(this.attemptId, { page: -1, cmId: this.quiz!.coursemodule });
        } catch {
            // Error getting the review, assume the user cannot review the attempt.
            accessInfo.canreviewmyattempts = false;
        }

        return accessInfo;
    }

    /**
     * Refresh the data.
     *
     * @return Promise resolved when done.
     */
    protected async refreshData(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModQuiz.instance.invalidateQuizData(this.courseId));
        promises.push(AddonModQuiz.instance.invalidateUserAttemptsForUser(this.quizId));
        promises.push(AddonModQuiz.instance.invalidateQuizAccessInformation(this.quizId));
        promises.push(AddonModQuiz.instance.invalidateCombinedReviewOptionsForUser(this.quizId));
        promises.push(AddonModQuiz.instance.invalidateAttemptReview(this.attemptId));

        if (this.attempt && typeof this.feedback != 'undefined') {
            promises.push(AddonModQuiz.instance.invalidateFeedback(this.quizId));
        }

        await CoreUtils.instance.ignoreErrors(Promise.all(promises));

        await this.fetchQuizData();
    }

    /**
     * Go to the page to review the attempt.
     *
     * @return Promise resolved when done.
     */
    async reviewAttempt(): Promise<void> {
        // @todo navPush="AddonModQuizReviewPage" [navParams]="{courseId: courseId, quizId: quiz.id, attemptId: attempt.id}"
    }

}
