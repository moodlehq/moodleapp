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
    cmId!: number; // Course module id the attempt belongs to.

    protected attemptId!: number; // Attempt to view.

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.attemptId = CoreNavigator.getRequiredRouteNumberParam('attemptId');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

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
     * @returns Promise resolved when done.
     */
    protected async fetchQuizData(): Promise<void> {
        try {
            this.quiz = await AddonModQuiz.getQuiz(this.courseId, this.cmId);

            this.componentId = this.quiz.coursemodule;

            // Load attempt data.
            const [options, accessInfo, attempt] = await Promise.all([
                AddonModQuiz.getCombinedReviewOptions(this.quiz.id, { cmId: this.quiz.coursemodule }),
                this.fetchAccessInfo(),
                this.fetchAttempt(),
            ]);

            // Set calculated data.
            this.showReviewColumn = accessInfo.canreviewmyattempts;
            AddonModQuizHelper.setQuizCalculatedData(this.quiz, options);

            this.attempt = await AddonModQuizHelper.setAttemptCalculatedData(this.quiz!, attempt, false, undefined, true);

            // Check if the feedback should be displayed.
            const grade = Number(this.attempt!.rescaledGrade);

            if (this.quiz.showFeedbackColumn && AddonModQuiz.isAttemptFinished(this.attempt!.state) &&
                    options.someoptions.overallfeedback && !isNaN(grade)) {

                // Feedback should be displayed, get the feedback for the grade.
                const response = await AddonModQuiz.getFeedbackForGrade(this.quiz.id, grade, {
                    cmId: this.quiz.coursemodule,
                });

                this.feedback = response.feedbacktext;
            } else {
                delete this.feedback;
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorgetattempt', true);
        }
    }

    /**
     * Get the attempt.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchAttempt(): Promise<AddonModQuizAttemptWSData> {
        // Get all the attempts and search the one we want.
        const attempts = await AddonModQuiz.getUserAttempts(this.quiz!.id, { cmId: this.cmId });

        const attempt = attempts.find(attempt => attempt.id == this.attemptId);

        if (!attempt) {
            // Attempt not found, error.
            this.attempt = undefined;

            throw new CoreError(Translate.instant('addon.mod_quiz.errorgetattempt'));
        }

        return attempt;
    }

    /**
     * Get the access info.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchAccessInfo(): Promise<AddonModQuizGetQuizAccessInformationWSResponse> {
        const accessInfo = await AddonModQuiz.getQuizAccessInformation(this.quiz!.id, { cmId: this.cmId });

        if (!accessInfo.canreviewmyattempts) {
            return accessInfo;
        }

        // Check if the user can review the attempt.
        await CoreUtils.ignoreErrors(AddonModQuiz.invalidateAttemptReviewForPage(this.attemptId, -1));

        try {
            await AddonModQuiz.getAttemptReview(this.attemptId, { page: -1, cmId: this.quiz!.coursemodule });
        } catch {
            // Error getting the review, assume the user cannot review the attempt.
            accessInfo.canreviewmyattempts = false;
        }

        return accessInfo;
    }

    /**
     * Refresh the data.
     *
     * @returns Promise resolved when done.
     */
    protected async refreshData(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModQuiz.invalidateQuizData(this.courseId));
        promises.push(AddonModQuiz.invalidateAttemptReview(this.attemptId));

        if (this.quiz) {
            promises.push(AddonModQuiz.invalidateUserAttemptsForUser(this.quiz.id));
            promises.push(AddonModQuiz.invalidateQuizAccessInformation(this.quiz.id));
            promises.push(AddonModQuiz.invalidateCombinedReviewOptionsForUser(this.quiz.id));

            if (this.attempt && this.feedback !== undefined) {
                promises.push(AddonModQuiz.invalidateFeedback(this.quiz.id));
            }
        }

        await CoreUtils.ignoreErrors(Promise.all(promises));

        await this.fetchQuizData();
    }

    /**
     * Go to the page to review the attempt.
     *
     * @returns Promise resolved when done.
     */
    async reviewAttempt(): Promise<void> {
        CoreNavigator.navigate(`../../review/${this.attempt!.id}`);
    }

}
