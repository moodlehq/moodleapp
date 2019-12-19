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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModSurveyOfflineProvider } from './offline';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

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
     * @param surveyId Survey ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the questions are retrieved.
     */
    getQuestions(surveyId: number, ignoreCache?: boolean, siteId?: string): Promise<AddonModSurveyQuestion[]> {
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

            return site.read('mod_survey_get_questions', params, preSets)
                    .then((response: AddonModSurveyGetQuestionsResult): any => {

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
     * @param surveyId Survey ID.
     * @return Cache key.
     */
    protected getQuestionsCacheKey(surveyId: number): string {
        return this.ROOT_CACHE_KEY + 'questions:' + surveyId;
    }

    /**
     * Get cache key for survey data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getSurveyCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'survey:' + courseId;
    }

    /**
     * Get a survey data.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the survey is retrieved.
     */
    protected getSurveyDataByKey(courseId: number, key: string, value: any, ignoreCache?: boolean, siteId?: string)
            : Promise<AddonModSurveySurvey> {

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

            return site.read('mod_survey_get_surveys_by_courses', params, preSets)
                    .then((response: AddonModSurveyGetSurveysByCoursesResult): any => {

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
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the survey is retrieved.
     */
    getSurvey(courseId: number, cmId: number, ignoreCache?: boolean, siteId?: string): Promise<AddonModSurveySurvey> {
        return this.getSurveyDataByKey(courseId, 'coursemodule', cmId, ignoreCache, siteId);
    }

    /**
     * Get a survey by ID.
     *
     * @param courseId Course ID.
     * @param id Survey ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the survey is retrieved.
     */
    getSurveyById(courseId: number, id: number, ignoreCache?: boolean, siteId?: string): Promise<AddonModSurveySurvey> {
        return this.getSurveyDataByKey(courseId, 'id', id, ignoreCache, siteId);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param surveyId Survey ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateQuestions(surveyId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getQuestionsCacheKey(surveyId));
        });
    }

    /**
     * Invalidates survey data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateSurveyData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSurveyCacheKey(courseId));
        });
    }

    /**
     * Report the survey as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the assign.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
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
     * @param surveyId Survey ID.
     * @param name Survey name.
     * @param courseId Course ID the survey belongs to.
     * @param answers Answers.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean if success: true if answers were sent to server,
     *         false if stored in device.
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
     * @param surveyId Survey ID.
     * @param answers Answers.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when answers are successfully submitted.
     */
    submitAnswersOnline(surveyId: number, answers: any[], siteId?: string): Promise<void> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                surveyid: surveyId,
                answers: answers
            };

            return site.write('mod_survey_submit_answers', params).then((response: AddonModSurveySubmitAnswersResult) => {
                if (!response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }
            });
        });
    }
}

/**
 * Survey returned by WS mod_survey_get_surveys_by_courses.
 */
export type AddonModSurveySurvey = {
    id: number; // Survey id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Survey name.
    intro?: string; // The Survey intro.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[]; // @since 3.2.
    template?: number; // Survey type.
    days?: number; // Days.
    questions?: string; // Question ids.
    surveydone?: number; // Did I finish the survey?.
    timecreated?: number; // Time of creation.
    timemodified?: number; // Time of last modification.
    section?: number; // Course section id.
    visible?: number; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
};

/**
 * Survey question.
 */
export type AddonModSurveyQuestion = {
    id: number; // Question id.
    text: string; // Question text.
    shorttext: string; // Question short text.
    multi: string; // Subquestions ids.
    intro: string; // The question intro.
    type: number; // Question type.
    options: string; // Question options.
    parent: number; // Parent question (for subquestions).
};

/**
 * Result of WS mod_survey_get_questions.
 */
export type AddonModSurveyGetQuestionsResult = {
    questions: AddonModSurveyQuestion[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_survey_get_surveys_by_courses.
 */
export type AddonModSurveyGetSurveysByCoursesResult = {
    surveys: AddonModSurveySurvey[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_survey_submit_answers.
 */
export type AddonModSurveySubmitAnswersResult = {
    status: boolean; // Status: true if success.
    warnings?: CoreWSExternalWarning[];
};
