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
import { CoreError } from '@classes/errors/error';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreApp } from '@services/app';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModSurveyOffline } from './survey-offline';

const ROOT_CACHE_KEY = 'mmaModSurvey:';

/**
 * Service that provides some features for surveys.
 */
@Injectable( { providedIn: 'root' })
export class AddonModSurveyProvider {

    static readonly COMPONENT = 'mmaModSurvey';

    /**
     * Get a survey's questions.
     *
     * @param surveyId Survey ID.
     * @param options Other options.
     * @return Promise resolved when the questions are retrieved.
     */
    async getQuestions(surveyId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModSurveyQuestion[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModSurveyGetQuestionsWSParams = {
            surveyid: surveyId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getQuestionsCacheKey(surveyId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModSurveyProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModSurveyGetQuestionsWSResponse>('mod_survey_get_questions', params, preSets);
        if (response.questions) {
            return response.questions;
        }

        throw new CoreError('No questions were found.');
    }

    /**
     * Get cache key for survey questions WS calls.
     *
     * @param surveyId Survey ID.
     * @return Cache key.
     */
    protected getQuestionsCacheKey(surveyId: number): string {
        return ROOT_CACHE_KEY + 'questions:' + surveyId;
    }

    /**
     * Get cache key for survey data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getSurveyCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'survey:' + courseId;
    }

    /**
     * Get a survey data.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @return Promise resolved when the survey is retrieved.
     */
    protected async getSurveyDataByKey(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModSurveySurvey> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModSurveyGetSurveysByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSurveyCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModSurveyProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response =
            await site.read<AddonModSurveyGetSurveysByCoursesWSResponse>('mod_survey_get_surveys_by_courses', params, preSets);

        const currentSurvey = response.surveys.find((survey) => survey[key] == value);
        if (currentSurvey) {
            return currentSurvey;
        }

        throw new CoreError('Activity not found.');
    }

    /**
     * Get a survey by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @return Promise resolved when the survey is retrieved.
     */
    getSurvey(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModSurveySurvey> {
        return this.getSurveyDataByKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a survey by ID.
     *
     * @param courseId Course ID.
     * @param id Survey ID.
     * @param options Other options.
     * @return Promise resolved when the survey is retrieved.
     */
    getSurveyById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModSurveySurvey> {
        return this.getSurveyDataByKey(courseId, 'id', id, options);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.getSurvey(courseId, moduleId).then(async (survey) => {
            const ps: Promise<void>[] = [];

            // Do not invalidate activity data before getting activity info, we need it!
            ps.push(this.invalidateSurveyData(courseId, siteId));
            ps.push(this.invalidateQuestions(survey.id, siteId));

            await Promise.all(ps);

            return;
        }));

        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, AddonModSurveyProvider.COMPONENT, moduleId));

        await CoreUtils.allPromises(promises);
    }

    /**
     * Invalidates survey questions.
     *
     * @param surveyId Survey ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateQuestions(surveyId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getQuestionsCacheKey(surveyId));
    }

    /**
     * Invalidates survey data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateSurveyData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSurveyCacheKey(courseId));
    }

    /**
     * Report the survey as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the assign.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    async logView(id: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModSurveyViewSurveyWSParams = {
            surveyid: id,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_survey_view_survey',
            params,
            AddonModSurveyProvider.COMPONENT,
            id,
            name,
            'survey',
            {},
            siteId,
        );
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
    async submitAnswers(
        surveyId: number,
        name: string,
        courseId: number,
        answers: AddonModSurveySubmitAnswerData[],
        siteId?: string,
    ): Promise<boolean> {

        // Convenience function to store a survey to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModSurveyOffline.saveAnswers(surveyId, name, courseId, answers, siteId);

            return false;
        };

        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!CoreApp.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        try {
            // If there's already answers to be sent to the server, discard it first.
            await AddonModSurveyOffline.deleteSurveyAnswers(surveyId, siteId);

            // Device is online, try to send them to server.
            await this.submitAnswersOnline(surveyId, answers, siteId);

            return true;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                throw error;
            }

            return storeOffline();
        }
    }

    /**
     * Send survey answers to Moodle.
     *
     * @param surveyId Survey ID.
     * @param answers Answers.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when answers are successfully submitted.
     */
    async submitAnswersOnline(surveyId: number, answers: AddonModSurveySubmitAnswerData[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModSurveySubmitAnswersWSParams = {
            surveyid: surveyId,
            answers: answers,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('mod_survey_submit_answers', params);
        if (!response.status) {
            throw new CoreError('Error submitting answers.');
        }
    }

}
export const AddonModSurvey = makeSingleton(AddonModSurveyProvider);

/**
 * Params of mod_survey_view_survey WS.
 */
type AddonModSurveyViewSurveyWSParams = {
    surveyid: number; // Survey instance id.
};

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
 * Params of mod_survey_get_questions WS.
 */
type AddonModSurveyGetQuestionsWSParams = {
    surveyid: number; // Survey instance id.
};

/**
 * Data returned by mod_survey_get_questions WS.
 */
export type AddonModSurveyGetQuestionsWSResponse = {
    questions: AddonModSurveyQuestion[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_survey_get_surveys_by_courses WS.
 */
type AddonModSurveyGetSurveysByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_survey_get_surveys_by_courses WS.
 */
export type AddonModSurveyGetSurveysByCoursesWSResponse = {
    surveys: AddonModSurveySurvey[];
    warnings?: CoreWSExternalWarning[];
};

export type AddonModSurveySubmitAnswerData = {
    key: string; // Answer key.
    value: string; // Answer value.
};

/**
 * Params of mod_survey_submit_answers WS.
 */
type AddonModSurveySubmitAnswersWSParams = {
    surveyid: number; // Survey id.
    answers: AddonModSurveySubmitAnswerData[];
};
