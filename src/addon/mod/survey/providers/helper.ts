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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Service that provides helper functions for surveys.
 */
@Injectable()
export class AddonModSurveyHelperProvider {

    constructor(private translate: TranslateService) { }

    /**
     * Turns a string with values separated by commas into an array.
     *
     * @param {any} value Value to convert.
     * @return {string[]}    Array.
     */
    protected commaStringToArray(value: any): string[] {
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
     * @param {Object[]} questions Questions.
     * @return {any}            Object with parent questions.
     */
    protected getParentQuestions(questions: any[]): any {
        const parents = {};

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
     * @param {any[]} questions Questions.
     * @return {any[]}           Promise resolved with the formatted questions.
     */
    formatQuestions(questions: any[]): any[] {

        const strIPreferThat = this.translate.instant('addon.mod_survey.ipreferthat'),
            strIFoundThat = this.translate.instant('addon.mod_survey.ifoundthat'),
            strChoose = this.translate.instant('core.choose'),
            formatted = [],
            parents = this.getParentQuestions(questions);

        let num = 1;

        questions.forEach((question) => {
            // Copy the object to prevent modifying the original.
            const q1 = Object.assign({}, question),
                parent = parents[q1.parent];

            // Turn multi and options into arrays.
            q1.multi = this.commaStringToArray(q1.multi);
            q1.options = this.commaStringToArray(q1.options);

            if (parent) {
                // It's a sub-question.
                q1.required = true;

                if (parent.type === 1 || parent.type === 2) {
                    // One answer question. Set its name and add it to the returned array.
                    q1.name = 'q' + (parent.type == 2 ? 'P' : '') + q1.id;
                    q1.num = num++;
                } else {
                    // Two answers per question (COLLES P&A). We'll add two questions.
                    const q2 = Object.assign({}, q1);

                    q1.text = strIPreferThat + ' ' + q1.text;
                    q1.name = 'qP' + q1.id;
                    q1.num = num++;
                    formatted.push(q1);

                    q2.text = strIFoundThat + ' ' + q2.text;
                    q2.name = 'q' + q1.id;
                    q2.num = num++;
                    formatted.push(q2);

                    return;
                }
            } else if (q1.multi && q1.multi.length === 0) {
                // It's a single question.
                q1.name = 'q' + q1.id;
                q1.num = num++;
                if (q1.type > 0) { // Add "choose" option since this question is not required.
                    q1.options.unshift(strChoose);
                }
            }

            formatted.push(q1);
        });

        return formatted;
    }

}
