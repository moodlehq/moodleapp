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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Service to handle Offline survey.
 */
@Injectable()
export class AddonModSurveyOfflineProvider {

    protected logger;

    // Variables for database.
    static SURVEY_TABLE = 'addon_mod_survey_answers';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModSurveyOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModSurveyOfflineProvider.SURVEY_TABLE,
                columns: [
                    {
                        name: 'surveyid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'name',
                        type: 'TEXT'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'answers',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['surveyid', 'userid']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider) {
        this.logger = logger.getInstance('AddonModSurveyOfflineProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a survey answers.
     *
     * @param  {number} surveyId Survey ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @param  {number} [userId] User the answers belong to. If not defined, current user in site.
     * @return {Promise<any>}         Promise resolved if deleted, rejected if failure.
     */
    deleteSurveyAnswers(surveyId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().deleteRecords(AddonModSurveyOfflineProvider.SURVEY_TABLE, {surveyid: surveyId, userid: userId});
        });
    }

    /**
     * Get all the stored data from all the surveys.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved with answers.
     */
    getAllData(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getAllRecords(AddonModSurveyOfflineProvider.SURVEY_TABLE).then((entries) => {
                entries.forEach((entry) => {
                    entry.answers = this.textUtils.parseJSON(entry.answers);
                });

                return entries;
            });
        });
    }

    /**
     * Get a survey stored answers.
     *
     * @param  {number} surveyId Survey ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @param  {number} [userId] User the answers belong to. If not defined, current user in site.
     * @return {Promise<any>}    Promise resolved with the answers.
     */
    getSurveyAnswers(surveyId: number, siteId?: string, userId?: number): Promise<any> {
        return this.getSurveyData(surveyId, siteId, userId).then((entry) => {
            return entry.answers || [];
        }).catch(() => {
            return [];
        });
    }

    /**
     * Get a survey stored data.
     *
     * @param  {number} surveyId Survey ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @param  {number} [userId] User the answers belong to. If not defined, current user in site.
     * @return {Promise<any>}         Promise resolved with the data.
     */
    getSurveyData(surveyId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().getRecord(AddonModSurveyOfflineProvider.SURVEY_TABLE, {surveyid: surveyId, userid: userId});
        }).then((entry) => {
            entry.answers = this.textUtils.parseJSON(entry.answers);

            return entry;
        });
    }

    /**
     * Check if there are offline answers to send.
     *
     * @param  {number} surveyId  Survey ID.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @param  {number} [userId]  User the answers belong to. If not defined, current user in site.
     * @return {Promise<boolean>}          Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    hasAnswers(surveyId: number, siteId?: string, userId?: number): Promise<boolean> {
        return this.getSurveyAnswers(surveyId, siteId, userId).then((answers) => {
            return !!answers.length;
        });
    }

    /**
     * Save answers to be sent later.
     *
     * @param  {number} surveyId  Survey ID.
     * @param  {string} name      Survey name.
     * @param  {number} courseId  Course ID the survey belongs to.
     * @param  {any[]} answers    Answers.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @param  {number} [userId]  User the answers belong to. If not defined, current user in site.
     * @return {Promise<any>}     Promise resolved if stored, rejected if failure.
     */
    saveAnswers(surveyId: number, name: string, courseId: number, answers: any[], siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const entry = {
                surveyid: surveyId,
                name: name,
                courseid: courseId,
                userid: userId,
                answers: JSON.stringify(answers),
                timecreated: new Date().getTime()
            };

            return site.getDb().insertRecord(AddonModSurveyOfflineProvider.SURVEY_TABLE, entry);
        });
    }
}
