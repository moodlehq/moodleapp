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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModSurveyOfflineProvider } from './offline';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

/**
 * Service that provides some features for surveys.
 */
@Injectable()
export class AddonModSurveyProvider {
    static COMPONENT = 'mmaModSurvey';

    protected ROOT_CACHE_KEY = 'mmaModSurvey:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider,
            private filepoolProvider: CoreFilepoolProvider, private utils: CoreUtilsProvider,
            private surveyOffline: AddonModSurveyOfflineProvider, private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModSurveyProvider');
    }

    /**
     * Get a survey's questions.
     *
     * @param {number} surveyId Survey ID.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the questions are retrieved.
     */
    getQuestions(surveyId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    surveyid: surveyId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getQuestionsCacheKey(surveyId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_survey_get_questions', params, preSets).then((response) => {
                if (response.questions) {
                    return response.questions;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for survey questions WS calls.
     *
     * @param {number} surveyId Survey ID.
     * @return {string}         Cache key.
     */
    protected getQuestionsCacheKey(surveyId: number): string {
        return this.ROOT_CACHE_KEY + 'questions:' + surveyId;
    }

    /**
     * Get cache key for survey data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string}         Cache key.
     */
    protected getSurveyCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'survey:' + courseId;
    }

    /**
     * Get a survey data.
     *
     * @param {number} courseId Course ID.
     * @param {string} key Name of the property to check.
     * @param {any} value Value to search.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the survey is retrieved.
     */
    protected getSurveyDataByKey(courseId: number, key: string, value: any, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getSurveyCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_survey_get_surveys_by_courses', params, preSets).then((response) => {
                if (response && response.surveys) {
                    const currentSurvey = response.surveys.find((survey) => {
                        return survey[key] == value;
                    });
                    if (currentSurvey) {
                        return currentSurvey;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a survey by course module ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} cmId Course module ID.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the survey is retrieved.
     */
    getSurvey(courseId: number, cmId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getSurveyDataByKey(courseId, 'coursemodule', cmId, ignoreCache, siteId);
    }

    /**
     * Get a survey by ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} id Survey ID.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved when the survey is retrieved.
     */
    getSurveyById(courseId: number, id: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getSurveyDataByKey(courseId, 'id', id, ignoreCache, siteId);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param  {number} moduleId The module ID.
     * @param  {number} courseId Course ID of the module.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.getSurvey(courseId, moduleId).then((survey) => {
            const ps = [];

            // Do not invalidate activity data before getting activity info, we need it!
            ps.push(this.invalidateSurveyData(courseId, siteId));
            ps.push(this.invalidateQuestions(survey.id, siteId));

            return Promise.all(ps);
        }));

        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModSurveyProvider.COMPONENT, moduleId));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates survey questions.
     *
     * @param {number} surveyId Survey ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the data is invalidated.
     */
    invalidateQuestions(surveyId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getQuestionsCacheKey(surveyId));
        });
    }

    /**
     * Invalidates survey data.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the data is invalidated.
     */
    invalidateSurveyData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSurveyCacheKey(courseId));
        });
    }

    /**
     * Report the survey as being viewed.
     *
     * @param {number} id Module ID.
     * @param {string} [name] Name of the assign.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            surveyid: id
        };

        return this.logHelper.logSingle('mod_survey_view_survey', params, AddonModSurveyProvider.COMPONENT, id, name, 'survey',
                {}, siteId);
    }

    /**
     * Send survey answers. If cannot send them to Moodle, they'll be stored in offline to be sent later.
     *
     * @param  {number} surveyId  Survey ID.
     * @param  {string} name      Survey name.
     * @param  {number} courseId  Course ID the survey belongs to.
     * @param  {any[]} answers Answers.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>}    Promise resolved with boolean if success: true if answers were sent to server,
     *                           false if stored in device.
     */
    submitAnswers(surveyId: number, name: string, courseId: number, answers: any[], siteId?: string): Promise<boolean> {
        // Convenience function to store a survey to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.surveyOffline.saveAnswers(surveyId, name, courseId, answers, siteId).then(() => {
                return false;
            });
        };

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!this.appProvider.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        // If there's already answers to be sent to the server, discard it first.
        return this.surveyOffline.deleteSurveyAnswers(surveyId, siteId).then(() => {
            // Device is online, try to send them to server.
            return this.submitAnswersOnline(surveyId, answers, siteId).then(() => {
                return true;
            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // It's a WebService error, the user cannot send the message so don't store it.
                    return Promise.reject(error);
                }

                // Couldn't connect to server, store in offline.
                return storeOffline();
            });
        });
    }

    /**
     * Send survey answers to Moodle.
     *
     * @param  {number} surveyId  Survey ID.
     * @param  {any[]} answers Answers.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}     Promise resolved when answers are successfully submitted. Rejected with object containing
     *                            the error message (if any) and a boolean indicating if the error was returned by WS.
     */
    submitAnswersOnline(surveyId: number, answers: any[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                surveyid: surveyId,
                answers: answers
            };

            return site.write('mod_survey_submit_answers', params).then((response) => {
                if (!response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }
            });
        });
    }
}
