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
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { makeSingleton } from '@singletons';
import { AddonModSurveyAnswersDBRecord, SURVEY_TABLE } from './database/survey';
import { AddonModSurveySubmitAnswerData } from './survey';

/**
 * Service to handle Offline survey.
 */
@Injectable( { providedIn: 'root' })
export class AddonModSurveyOfflineProvider {

    /**
     * Delete a survey answers.
     *
     * @param surveyId Survey ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the answers belong to. If not defined, current user in site.
     * @return Promise resolved if deleted, rejected if failure.
     */
    async deleteSurveyAnswers(surveyId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.getDb().deleteRecords(SURVEY_TABLE, { surveyid: surveyId, userid: userId });
    }

    /**
     * Get all the stored data from all the surveys.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with answers.
     */
    async getAllData(siteId?: string): Promise<AddonModSurveyAnswersDBRecordFormatted[]> {
        const site = await CoreSites.getSite(siteId);
        const entries = await site.getDb().getAllRecords<AddonModSurveyAnswersDBRecord>(SURVEY_TABLE);

        return entries.map((entry) => Object.assign(entry, {
            answers: CoreTextUtils.parseJSON<AddonModSurveySubmitAnswerData[]>(entry.answers),
        }));
    }

    /**
     * Get a survey stored answers.
     *
     * @param surveyId Survey ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the answers belong to. If not defined, current user in site.
     * @return Promise resolved with the answers.
     */
    async getSurveyAnswers(surveyId: number, siteId?: string, userId?: number): Promise<AddonModSurveySubmitAnswerData[]> {
        try {
            const entry = await this.getSurveyData(surveyId, siteId, userId);

            return entry.answers || [];
        } catch {
            return [];
        }
    }

    /**
     * Get a survey stored data.
     *
     * @param surveyId Survey ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the answers belong to. If not defined, current user in site.
     * @return Promise resolved with the data.
     */
    async getSurveyData(surveyId: number, siteId?: string, userId?: number): Promise<AddonModSurveyAnswersDBRecordFormatted> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const entry = await site.getDb().getRecord<AddonModSurveyAnswersDBRecord>(
            SURVEY_TABLE,
            { surveyid: surveyId, userid: userId },
        );

        return Object.assign(entry, {
            answers: CoreTextUtils.parseJSON<AddonModSurveySubmitAnswerData[]>(entry.answers),
        });
    }

    /**
     * Check if there are offline answers to send.
     *
     * @param surveyId Survey ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the answers belong to. If not defined, current user in site.
     * @return Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    async hasAnswers(surveyId: number, siteId?: string, userId?: number): Promise<boolean> {
        const answers = await this.getSurveyAnswers(surveyId, siteId, userId);

        return !!answers.length;
    }

    /**
     * Save answers to be sent later.
     *
     * @param surveyId Survey ID.
     * @param name Survey name.
     * @param courseId Course ID the survey belongs to.
     * @param answers Answers.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the answers belong to. If not defined, current user in site.
     * @return Promise resolved if stored, rejected if failure.
     */
    async saveAnswers(
        surveyId: number,
        name: string,
        courseId: number,
        answers: AddonModSurveySubmitAnswerData[],
        siteId?: string,
        userId?: number,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const entry: AddonModSurveyAnswersDBRecord = {
            surveyid: surveyId,
            name: name,
            courseid: courseId,
            userid: userId,
            answers: JSON.stringify(answers),
            timecreated: new Date().getTime(),
        };

        await site.getDb().insertRecord(SURVEY_TABLE, entry);
    }

}
export const AddonModSurveyOffline = makeSingleton(AddonModSurveyOfflineProvider);

export type AddonModSurveyAnswersDBRecordFormatted = Omit<AddonModSurveyAnswersDBRecord, 'answers'> & {
    answers: AddonModSurveySubmitAnswerData[];
};
