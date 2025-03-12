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
import { makeSingleton, Translate } from '@singletons';
import { AddonModSurveyQuestion } from './survey';

/**
 * Service that provides helper functions for surveys.
 */
@Injectable( { providedIn: 'root' })
export class AddonModSurveyHelperProvider {

    /**
     * Turns a string with values separated by commas into an array.
     *
     * @param value Value to convert.
     * @returns Array.
     */
    protected commaStringToArray(value: string | string[]): string[] {
        if (typeof value == 'string') {
            if (value.length > 0) {
                return value.split(',');
            }

            return [];
        }

        return value;
    }

    /**
     * Gets the parent questions and puts them in an object: ID -> question.
     *
     * @param questions Questions.
     * @returns Object with parent questions.
     */
    protected getParentQuestions(questions: AddonModSurveyQuestion[]): {[id: number]: AddonModSurveyQuestion} {
        const parents: { [id: number]: AddonModSurveyQuestion } = {};

        questions.forEach((question) => {
            if (question.parent === 0) {
                parents[question.id] = question;
            }
        });

        return parents;
    }

    /**
     * Format a questions list, turning "multi" and "options" strings into arrays and adding the properties
     * 'num' and 'name'.
     *
     * @param questions Questions.
     * @returns Promise resolved with the formatted questions.
     */
    formatQuestions(questions: AddonModSurveyQuestion[]): AddonModSurveyQuestionFormatted[] {
        const strIPreferThat = Translate.instant('addon.mod_survey.ipreferthat');
        const strIFoundThat = Translate.instant('addon.mod_survey.ifoundthat');

        const formatted: AddonModSurveyQuestionFormatted[] = [];
        const parents = this.getParentQuestions(questions);

        let num = 1;

        questions.forEach((question) => {
            // Copy the object to prevent modifying the original.
            const q1: AddonModSurveyQuestionFormatted = Object.assign({}, question);
            const parent = parents[q1.parent];

            // Turn multi and options into arrays.
            q1.multiArray = this.commaStringToArray(q1.multi);
            q1.optionsArray = this.commaStringToArray(q1.options);

            if (parent) {
                // It's a sub-question.
                q1.required = true;

                if (parent.type === 1 || parent.type === 2) {
                    // One answer question. Set its name and add it to the returned array.
                    q1.name = `q${parent.type == 2 ? 'P' : ''}${q1.id}`;
                    q1.num = num++;
                } else {
                    // Two answers per question (COLLES P&A). We'll add two questions.
                    const q2 = Object.assign({}, q1);

                    q1.text = `${strIPreferThat} ${q1.text}`;
                    q1.name = `qP${q1.id}`;
                    q1.num = num++;
                    formatted.push(q1);

                    q2.text = `${strIFoundThat} ${q2.text}`;
                    q2.name = `q${q1.id}`;
                    q2.num = num++;
                    formatted.push(q2);

                    return;
                }
            } else if (q1.multiArray && q1.multiArray.length === 0) {
                // It's a single question.
                q1.name = `q${q1.id}`;
                q1.num = num++;
            }

            formatted.push(q1);
        });

        return formatted;
    }

}
export const AddonModSurveyHelper = makeSingleton(AddonModSurveyHelperProvider);

/**
 * Survey question with some calculated data.
 */
export type AddonModSurveyQuestionFormatted = AddonModSurveyQuestion & {
    required?: boolean; // Calculated in the app. Whether the question is required.
    name?: string; // Calculated in the app. The name of the question.
    num?: number; // Calculated in the app. Number of the question.
    multiArray?: string[]; // Subquestions ids, converted to an array.
    optionsArray?: string[]; // Question options, converted to an array.
};
