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

import { Injectable } from '@angular/core';
import { QuestionCompleteGradableResponse } from '@features/question/constants';

import { CoreQuestionBehaviourHandler, CoreQuestionQuestionWithAnswers } from '@features/question/services/behaviour-delegate';
import { CoreQuestionDBRecord } from '@features/question/services/database/question';
import {
    CoreQuestion,
    CoreQuestionQuestionParsed,
    CoreQuestionsAnswers,
    CoreQuestionState,
} from '@features/question/services/question';
import { CoreQuestionDelegate } from '@features/question/services/question-delegate';
import { makeSingleton } from '@singletons';

/**
 * Handler to support deferred feedback question behaviour.
 */
@Injectable({ providedIn: 'root' })
export class AddonQbehaviourDeferredFeedbackHandlerService implements CoreQuestionBehaviourHandler {

    name = 'AddonQbehaviourDeferredFeedback';
    type = 'deferredfeedback';

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param component Component the question belongs to.
     * @param attemptId Attempt ID the question belongs to.
     * @param question The question.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns New state (or promise resolved with state).
     */
    determineNewState(
        component: string,
        attemptId: number,
        question: CoreQuestionQuestionWithAnswers,
        componentId: string | number,
        siteId?: string,
    ): CoreQuestionState | Promise<CoreQuestionState> {
        return this.determineNewStateDeferred(component, attemptId, question, componentId, siteId);
    }

    /**
     * Determine a question new state based on its answer(s) for deferred question behaviour.
     *
     * @param component Component the question belongs to.
     * @param attemptId Attempt ID the question belongs to.
     * @param question The question.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @param isCompleteFn Function to override the default isCompleteResponse check.
     * @param isSameFn Function to override the default isSameResponse check.
     * @returns Promise resolved with state.
     */
    async determineNewStateDeferred(
        component: string,
        attemptId: number,
        question: CoreQuestionQuestionWithAnswers,
        componentId: string | number,
        siteId?: string,
        isCompleteFn?: isCompleteResponseFunction,
        isSameFn?: isSameResponseFunction,
    ): Promise<CoreQuestionState> {

        // Check if we have local data for the question.
        let dbQuestion: CoreQuestionDBRecord | CoreQuestionQuestionWithAnswers = question;
        try {
            dbQuestion = await CoreQuestion.getQuestion(component, attemptId, question.slot, siteId);
        } catch (error) {
            // No entry found, use the original data.
        }

        const state = CoreQuestion.getState(dbQuestion.state);

        if (state.finished || !state.active) {
            // Question is finished, it cannot change.
            return state;
        }

        const newBasicAnswers = CoreQuestion.getBasicAnswers(question.answers || {});

        if (dbQuestion.state) {
            // Question already has a state stored. Check if answer has changed.
            const prevAnswersList = await CoreQuestion.getQuestionAnswers(
                component,
                attemptId,
                question.slot,
                false,
                siteId,
            );
            const prevAnswers = CoreQuestion.convertAnswersArrayToObject(prevAnswersList, true);
            const prevBasicAnswers = CoreQuestion.getBasicAnswers(prevAnswers);

            // If answers haven't changed the state is the same.
            let sameResponse = false;

            if (isSameFn) {
                sameResponse = isSameFn(
                    question,
                    prevAnswers,
                    prevBasicAnswers,
                    question.answers || {},
                    newBasicAnswers,
                    component,
                    componentId,
                );
            } else {
                sameResponse = CoreQuestionDelegate.isSameResponse(
                    question,
                    prevBasicAnswers,
                    newBasicAnswers,
                    component,
                    componentId,
                );
            }

            if (sameResponse) {
                return state;
            }
        }

        // Answers have changed. Now check if the response is complete and calculate the new state.
        let complete: QuestionCompleteGradableResponse;
        let newState: string;

        if (isCompleteFn) {
            // Pass all the answers since some behaviours might need the extra data.
            complete = isCompleteFn(question, question.answers || {}, component, componentId);
        } else {
            // Only pass the basic answers since questions should be independent of extra data.
            complete = CoreQuestionDelegate.isCompleteResponse(question, newBasicAnswers, component, componentId);
        }

        if (complete < 0) {
            newState = 'cannotdeterminestatus';
        } else if (complete > 0) {
            newState = 'complete';
        } else {
            const gradable = CoreQuestionDelegate.isGradableResponse(question, newBasicAnswers, component, componentId);
            if (gradable < 0) {
                newState = 'cannotdeterminestatus';
            } else if (gradable > 0) {
                newState = 'invalid';
            } else {
                newState = 'todo';
            }
        }

        return CoreQuestion.getState(newState);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}

export const AddonQbehaviourDeferredFeedbackHandler = makeSingleton(AddonQbehaviourDeferredFeedbackHandlerService);

/**
 * Check if a response is complete.
 *
 * @param question The question.
 * @param answers Object with the question answers (without prefix).
 * @param component The component the question is related to.
 * @param componentId Component ID.
 * @returns 1 if complete, 0 if not complete, -1 if cannot determine.
 */
export type isCompleteResponseFunction = (
    question: CoreQuestionQuestionParsed,
    answers: CoreQuestionsAnswers,
    component: string,
    componentId: string | number,
) => QuestionCompleteGradableResponse;

/**
 * Check if two responses are the same.
 *
 * @param question Question.
 * @param prevAnswers Object with the previous question answers.
 * @param prevBasicAnswers Object with the previous basic" answers (without sequencecheck, certainty, ...).
 * @param newAnswers Object with the new question answers.
 * @param newBasicAnswers Object with the previous basic" answers (without sequencecheck, certainty, ...).
 * @param component The component the question is related to.
 * @param componentId Component ID.
 * @returns Whether they're the same.
 */
export type isSameResponseFunction = (
    question: CoreQuestionQuestionParsed,
    prevAnswers: CoreQuestionsAnswers,
    prevBasicAnswers: CoreQuestionsAnswers,
    newAnswers: CoreQuestionsAnswers,
    newBasicAnswers: CoreQuestionsAnswers,
    component: string,
    componentId: string | number,
) => boolean;
