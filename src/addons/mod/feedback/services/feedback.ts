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
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreNetwork } from '@services/network';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreObject } from '@singletons/object';
import { CoreWSExternalFile, CoreWSExternalWarning, CoreWSStoredFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModFeedbackOffline } from './feedback-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    ADDON_MOD_FEEDBACK_COMPONENT,
    ADDON_MOD_FEEDBACK_FORM_SUBMITTED,
    ADDON_MOD_FEEDBACK_LINE_SEP,
    ADDON_MOD_FEEDBACK_MULTICHOICE_ADJUST_SEP,
    ADDON_MOD_FEEDBACK_MULTICHOICE_TYPE_SEP,
    ADDON_MOD_FEEDBACK_MULTICHOICERATED_VALUE_SEP,
    ADDON_MOD_FEEDBACK_PER_PAGE,
    AddonModFeedbackIndexTabName,
    AddonModFeedbackMultichoiceSubtype,
    AddonModFeedbackQuestionType,
} from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSError } from '@classes/errors/wserror';

/**
 * Service that provides some features for feedbacks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackProvider {

    protected static readonly ROOT_CACHE_KEY = 'AddonModFeedback:';

    /**
     * Check dependency of a question item.
     *
     * @param items All question items to check dependency.
     * @param item Item to check.
     * @returns Return true if dependency is acomplished and it can be shown. False, otherwise.
     */
    protected checkDependencyItem(items: AddonModFeedbackItem[], item: AddonModFeedbackItem): boolean {
        const depend = items.find((itemFind) => itemFind.id == item.dependitem);

        // Item not found, looks like dependent item has been removed or is in the same or following pages.
        if (!depend) {
            return true;
        }

        switch (depend.typ) {
            case AddonModFeedbackQuestionType.LABEL:
                return false;
            case AddonModFeedbackQuestionType.MULTICHOICE:
            case AddonModFeedbackQuestionType.MULTICHOICERATED:
                return this.compareDependItemMultichoice(depend, item.dependvalue);
            default:
                break;
        }

        return item.dependvalue == depend.rawValue;
    }

    /**
     * Check dependency item of type Multichoice.
     *
     * @param item Item to check.
     * @param dependValue Value to compare.
     * @returns Return true if dependency is acomplished and it can be shown. False, otherwise.
     */
    protected compareDependItemMultichoice(item: AddonModFeedbackItem, dependValue: string): boolean {
        const parts = item.presentation.split(ADDON_MOD_FEEDBACK_MULTICHOICE_TYPE_SEP) || [];
        const subtype = parts.length > 0 && parts[0]
            ? parts[0] as AddonModFeedbackMultichoiceSubtype
            : AddonModFeedbackMultichoiceSubtype.RADIO;

        const choicesStr = (parts[1] || '').split(ADDON_MOD_FEEDBACK_MULTICHOICE_ADJUST_SEP)[0] || '';
        const choices = choicesStr.split(ADDON_MOD_FEEDBACK_LINE_SEP) || [];
        let values: AddonModFeedbackResponseValue[];

        if (subtype === AddonModFeedbackMultichoiceSubtype.CHECKBOX) {
            if (item.rawValue === undefined) {
                values = [''];
            } else {
                item.rawValue = '' + item.rawValue;
                values = item.rawValue.split(ADDON_MOD_FEEDBACK_LINE_SEP);
            }
        } else {
            values = [item.rawValue || ''];
        }

        for (let index = 0; index < choices.length; index++) {
            for (const x in values) {
                if (values[x] == index + 1) {
                    let value = choices[index];

                    if (item.typ === AddonModFeedbackQuestionType.MULTICHOICERATED) {
                        value = value.split(ADDON_MOD_FEEDBACK_MULTICHOICERATED_VALUE_SEP)[1] || '';
                    }

                    if (value.trim() == dependValue) {
                        return true;
                    }

                    // We can finish checking if only searching on one value and we found it.
                    if (values.length == 1) {
                        return false;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Fill values of item questions.
     *
     * @param feedbackId Feedback ID.
     * @param items Item to fill the value.
     * @param options Other options.
     * @returns Resolved with values when done.
     */
    protected async fillValues(
        feedbackId: number,
        items: AddonModFeedbackWSItem[],
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModFeedbackItem[]> {
        const filledItems = <AddonModFeedbackItem[]> items;

        try {
            const valuesArray = await this.getCurrentValues(feedbackId, options);

            const values: Record<number, string> = {};

            valuesArray.forEach((value) => {
                values[value.item] = value.value;
            });

            filledItems.forEach((itemData) => {
                if (itemData.hasvalue && values[itemData.id] !== undefined) {
                    itemData.rawValue = values[itemData.id];
                }
            });
        } catch {
            // Ignore errors.
        }

        // Merge with offline data.
        const offlineResponses = await CorePromiseUtils.ignoreErrors(
            AddonModFeedbackOffline.getFeedbackResponses(feedbackId, options.siteId),
        );

        if (!offlineResponses) {
            return items;
        }

        const offlineValues: Record<number, AddonModFeedbackResponseValue[]> = {};

        // Merge all values into one array.
        const offlineValuesArray = offlineResponses.reduce((array, entry) => {
            const responses = <OfflineResponsesArray> CoreObject.toArrayOfObjects(entry.responses, 'id', 'value');

            return array.concat(responses);
        }, <OfflineResponsesArray> []).map((valueEntry) => {
            const parts = valueEntry.id.split('_');
            const item = (parts[1] || '').replace(/\[.*\]/, ''); // Remove [0] and similar.

            return {
                ...valueEntry,
                typ: parts[0],
                item: Number(item),
            };
        });

        offlineValuesArray.forEach((value) => {
            if (offlineValues[value.item] === undefined) {
                offlineValues[value.item] = [];
            }
            offlineValues[value.item].push(value.value);
        });

        filledItems.forEach((item) => {
            if (!item.hasvalue || offlineValues[item.id] === undefined) {
                return;
            }

            // Treat multichoice checkboxes.
            if (item.typ === AddonModFeedbackQuestionType.MULTICHOICE &&
                item.presentation.split(ADDON_MOD_FEEDBACK_MULTICHOICE_TYPE_SEP)[0] ===
                AddonModFeedbackMultichoiceSubtype.CHECKBOX) {

                offlineValues[item.id] = offlineValues[item.id].filter((value) => Number(value) > 0);
                item.rawValue = offlineValues[item.id].join(ADDON_MOD_FEEDBACK_LINE_SEP);
            } else {
                item.rawValue = offlineValues[item.id][0];
            }
        });

        return filledItems;
    }

    /**
     * Returns all the feedback non respondents users.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @param previous Only for recurrent use. Object with the previous fetched info.
     * @returns Promise resolved when the info is retrieved.
     */
    async getAllNonRespondents(
        feedbackId: number,
        options: AddonModFeedbackGroupOptions = {},
        previous?: AddonModFeedbackPreviousNonRespondents,
    ): Promise<AddonModFeedbackAllNonRespondent> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();
        previous = previous || {
            page: 0,
            users: [],
        };

        const response = await this.getNonRespondents(feedbackId, {
            page: previous.page,
            ...options, // Include all options.
        });

        if (previous.users.length < response.total) {
            previous.users = previous.users.concat(response.users);
        }

        if (previous.users.length < response.total) {
            // Can load more.
            previous.page++;

            return this.getAllNonRespondents(feedbackId, options, previous);
        }

        return {
            ...previous,
            total: response.total,
        };
    }

    /**
     * Returns all the feedback user responses.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @param previous Only for recurrent use. Object with the previous fetched info.
     * @returns Promise resolved when the info is retrieved.
     */
    async getAllResponsesAnalysis(
        feedbackId: number,
        options: AddonModFeedbackGroupOptions = {},
        previous?: AddonModFeedbackPreviousResponsesAnalysis,
    ): Promise<AddonModFeedbackAllResponsesAnalysis> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();
        previous = previous || {
            page: 0,
            attempts: [],
            anonattempts: [],
        };

        const responses = await this.getResponsesAnalysis(feedbackId, {
            page: previous.page,
            ...options, // Include all options.
        });

        if (previous.anonattempts.length < responses.totalanonattempts) {
            previous.anonattempts = previous.anonattempts.concat(responses.anonattempts);
        }

        if (previous.attempts.length < responses.totalattempts) {
            previous.attempts = previous.attempts.concat(responses.attempts);
        }

        if (previous.anonattempts.length < responses.totalanonattempts || previous.attempts.length < responses.totalattempts) {
            // Can load more.
            previous.page++;

            return this.getAllResponsesAnalysis(feedbackId, options, previous);
        }

        return {
            ...previous,
            totalattempts: responses.totalattempts,
            totalanonattempts: responses.totalanonattempts,
        };
    }

    /**
     * Get analysis information for a given feedback.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the feedback is retrieved.
     */
    async getAnalysis(
        feedbackId: number,
        options: AddonModFeedbackGroupOptions = {},
    ): Promise<AddonModFeedbackGetAnalysisWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetAnalysisWSParams = {
            feedbackid: feedbackId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAnalysisDataCacheKey(feedbackId, options.groupId),
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        if (options.groupId) {
            params.groupid = options.groupId;
        }

        return site.read('mod_feedback_get_analysis', params, preSets);
    }

    /**
     * Get cache key for feedback analysis data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getAnalysisDataCacheKey(feedbackId: number, groupId: number = 0): string {
        return this.getAnalysisDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback analysis data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getAnalysisDataPrefixCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':analysis:';
    }

    /**
     * Find an attempt in all responses analysis.
     *
     * @param feedbackId Feedback ID.
     * @param attemptId Attempt ID to find.
     * @param options Other options.
     * @param previous Only for recurrent use. Object with the previous fetched info.
     * @returns Promise resolved when the info is retrieved.
     */
    async getAttempt(
        feedbackId: number,
        attemptId: number,
        options: AddonModFeedbackGroupOptions = {},
        previous?: AddonModFeedbackGetAttemptPreviousData,
    ): Promise<AddonModFeedbackWSAttempt | AddonModFeedbackWSAnonAttempt> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();
        previous = previous || {
            page: 0,
            attemptsLoaded: 0,
            anonAttemptsLoaded: 0,
        };

        const responses = await this.getResponsesAnalysis(feedbackId, {
            page: previous.page,
            ...options, // Include all options.
        });

        const attempt = responses.attempts.find((attempt) => attemptId == attempt.id);

        if (attempt) {
            return attempt;
        }

        const anonAttempt = responses.anonattempts.find((attempt) => attemptId == attempt.id);

        if (anonAttempt) {
            return anonAttempt;
        }

        if (previous.anonAttemptsLoaded < responses.totalanonattempts) {
            previous.anonAttemptsLoaded += responses.anonattempts.length;
        }
        if (previous.attemptsLoaded < responses.totalattempts) {
            previous.attemptsLoaded += responses.attempts.length;
        }

        if (previous.anonAttemptsLoaded < responses.totalanonattempts || previous.attemptsLoaded < responses.totalattempts) {
            // Can load more. Check there.
            previous.page++;

            return this.getAttempt(feedbackId, attemptId, options, previous);
        }

        // Not found and all loaded. Reject.
        throw new CoreError('Attempt not found.');
    }

    /**
     * Get prefix cache key for feedback completion data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getCompletedDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':completed:';
    }

    /**
     * Returns the temporary completion timemodified for the current user.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async getCurrentCompletedTimeModified(feedbackId: number, options: CoreCourseCommonModWSOptions = {}): Promise<number> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetCurrentCompletedTmpWSParams = {
            feedbackid: feedbackId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCurrentCompletedTimeModifiedDataCacheKey(feedbackId),
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        try {
            const response = await site.read<AddonModFeedbackGetCurrentCompletedTmpWSResponse>(
                'mod_feedback_get_current_completed_tmp',
                params,
                preSets,
            );

            return response.feedback.timemodified;
        } catch {
            // Ignore errors.
            return 0;
        }
    }

    /**
     * Get prefix cache key for feedback current completed temp data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getCurrentCompletedTimeModifiedDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':completedtime:';
    }

    /**
     * Returns the temporary responses or responses of the last submission for the current user.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async getCurrentValues(
        feedbackId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModFeedbackWSResponse[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetUnfinishedResponsesWSParams = {
            feedbackid: feedbackId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCurrentValuesDataCacheKey(feedbackId),
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModFeedbackGetUnfinishedResponsesWSResponse>(
            'mod_feedback_get_unfinished_responses',
            params,
            preSets,
        );

        if (response.responses.length) {
            return response.responses;
        }

        // No unfinished responses, fetch responses of the last submission.
        const finishedResponse = await site.read<AddonModFeedbackGetFinishedResponsesWSResponse>(
            'mod_feedback_get_finished_responses',
            params,
            preSets,
        );

        return finishedResponse.responses;
    }

    /**
     * Get cache key for get current values feedback data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getCurrentValuesDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':currentvalues';
    }

    /**
     * Get access information for a given feedback.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the feedback is retrieved.
     */
    async getFeedbackAccessInformation(
        feedbackId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModFeedbackGetFeedbackAccessInformationWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetFeedbackAccessInformationWSParams = {
            feedbackid: feedbackId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getFeedbackAccessInformationDataCacheKey(feedbackId),
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_feedback_get_feedback_access_information', params, preSets);
    }

    /**
     * Get cache key for feedback access information data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getFeedbackAccessInformationDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':access';
    }

    /**
     * Get cache key for feedback data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getFeedbackCacheKey(courseId: number): string {
        return AddonModFeedbackProvider.ROOT_CACHE_KEY + 'feedback:' + courseId;
    }

    /**
     * Get prefix cache key for all feedback activity data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getFeedbackDataPrefixCacheKey(feedbackId: number): string {
        return AddonModFeedbackProvider.ROOT_CACHE_KEY + feedbackId;
    }

    /**
     * Get a feedback with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the feedback is retrieved.
     */
    protected async getFeedbackDataByKey(
        courseId: number,
        key: string,
        value: unknown,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModFeedbackWSFeedback> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetFeedbacksByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getFeedbackCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModFeedbackGetFeedbacksByCoursesWSResponse>(
            'mod_feedback_get_feedbacks_by_courses',
            params,
            preSets,
        );

        const currentFeedback = response.feedbacks.find((feedback) => feedback[key] == value);
        if (currentFeedback) {
            return currentFeedback;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get a feedback by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the feedback is retrieved.
     */
    getFeedback(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModFeedbackWSFeedback> {
        return this.getFeedbackDataByKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a feedback by ID.
     *
     * @param courseId Course ID.
     * @param id Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the feedback is retrieved.
     */
    getFeedbackById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModFeedbackWSFeedback> {
        return this.getFeedbackDataByKey(courseId, 'id', id, options);
    }

    /**
     * Returns the items (questions) in the given feedback.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async getItems(feedbackId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModFeedbackGetItemsWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetItemsWSParams = {
            feedbackid: feedbackId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getItemsDataCacheKey(feedbackId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_feedback_get_items', params, preSets);
    }

    /**
     * Get cache key for get items feedback data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getItemsDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':items';
    }

    /**
     * Retrieves a list of students who didn't submit the feedback.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async getNonRespondents(
        feedbackId: number,
        options: AddonModFeedbackGroupPaginatedOptions = {},
    ): Promise<AddonModFeedbackGetNonRespondentsWSResponse> {
        options.groupId = options.groupId || 0;
        options.page = options.page || 0;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetNonRespondentsWSParams = {
            feedbackid: feedbackId,
            groupid: options.groupId,
            page: options.page,
            perpage: ADDON_MOD_FEEDBACK_PER_PAGE,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getNonRespondentsDataCacheKey(feedbackId, options.groupId),
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_feedback_get_non_respondents', params, preSets);
    }

    /**
     * Get cache key for non respondents feedback data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @param groupId Group id, 0 means that the function will determine the user group.
     * @returns Cache key.
     */
    protected getNonRespondentsDataCacheKey(feedbackId: number, groupId: number = 0): string {
        return this.getNonRespondentsDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback non respondents data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getNonRespondentsDataPrefixCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':nonrespondents:';
    }

    /**
     * Get a single feedback page items. This function is not cached, use AddonModFeedbackHelperProvider#getPageItems instead.
     *
     * @param feedbackId Feedback ID.
     * @param page The page to get.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getPageItems(feedbackId: number, page: number, siteId?: string): Promise<AddonModFeedbackGetPageItemsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModFeedbackGetPageItemsWSParams = {
            feedbackid: feedbackId,
            page: page,
        };

        return site.write('mod_feedback_get_page_items', params);
    }

    /**
     * Get a single feedback page items. If offline or server down it will use getItems to calculate dependencies.
     *
     * @param feedbackId Feedback ID.
     * @param page The page to get.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async getPageItemsWithValues(
        feedbackId: number,
        page: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModFeedbackPageItems> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        try {
            const response: AddonModFeedbackPageItems = await this.getPageItems(feedbackId, page, options.siteId);

            response.items = await this.fillValues(feedbackId, response.items, options);

            return response;
        } catch {
            // If getPageItems fail we should calculate it using getItems.
            const response = await this.getItems(feedbackId, options);

            const items = await this.fillValues(feedbackId, response.items, options);

            // Separate items by pages.
            let currentPage = 0;
            const previousPageItems: AddonModFeedbackItem[] = [];

            const pageItems = items.filter((item) => {
                // Greater page, discard all entries.
                if (currentPage > page) {
                    return false;
                }

                if (item.typ === AddonModFeedbackQuestionType.PAGEBREAK) {
                    currentPage++;

                    return false;
                }

                // Save items on previous page to check dependencies and discard entry.
                if (currentPage < page) {
                    previousPageItems.push(item);

                    return false;
                }

                // Filter depending items.
                if (item && item.dependitem > 0 && previousPageItems.length > 0) {
                    return this.checkDependencyItem(previousPageItems, item);
                }

                // Filter items with errors.
                return item;
            });

            return {
                items: pageItems,
                hasprevpage: page > 0,
                hasnextpage: currentPage > page,
                warnings: response.warnings,
            };
        }
    }

    /**
     * Convenience function to get the page we can jump.
     *
     * @param feedbackId Feedback ID.
     * @param page Page where we want to jump.
     * @param changePage If page change is forward (1) or backward (-1).
     * @param options Other options.
     * @returns Page number where to jump. Or false if completed or first page.
     */
    protected async getPageJumpTo(
        feedbackId: number,
        page: number,
        changePage: number,
        options: { cmId?: number; siteId?: string },
    ): Promise<number | false> {

        const response = await this.getPageItemsWithValues(feedbackId, page, {
            cmId: options.cmId,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId: options.siteId,
        });

        // The page we are going has items.
        if (response.items.length > 0) {
            return page;
        }

        // Check we can jump futher.
        if ((changePage == 1 && response.hasnextpage) || (changePage == -1 && response.hasprevpage)) {
            return this.getPageJumpTo(feedbackId, page + changePage, changePage, options);
        }

        // Completed or first page.
        return false;
    }

    /**
     * Returns the feedback user responses.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async getResponsesAnalysis(
        feedbackId: number,
        options: AddonModFeedbackGroupPaginatedOptions = {},
    ): Promise<AddonModFeedbackGetResponsesAnalysisWSResponse> {
        options.groupId = options.groupId || 0;
        options.page = options.page || 0;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetResponsesAnalysisWSParams = {
            feedbackid: feedbackId,
            groupid: options.groupId,
            page: options.page,
            perpage: ADDON_MOD_FEEDBACK_PER_PAGE,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getResponsesAnalysisDataCacheKey(feedbackId, options.groupId),
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_feedback_get_responses_analysis', params, preSets);
    }

    /**
     * Get cache key for responses analysis feedback data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @param groupId Group id, 0 means that the function will determine the user group.
     * @returns Cache key.
     */
    protected getResponsesAnalysisDataCacheKey(feedbackId: number, groupId: number = 0): string {
        return this.getResponsesAnalysisDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback responses analysis data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getResponsesAnalysisDataPrefixCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':responsesanalysis:';
    }

    /**
     * Gets the resume page information.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async getResumePage(feedbackId: number, options: CoreCourseCommonModWSOptions = {}): Promise<number> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackLaunchFeedbackWSParams = {
            feedbackid: feedbackId,
        };
        const preSets = {
            cacheKey: this.getResumePageDataCacheKey(feedbackId),
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModFeedbackLaunchFeedbackWSResponse>('mod_feedback_launch_feedback', params, preSets);

        // WS will return -1 for last page but the user need to start again.
        return response.gopage > 0 ? response.gopage : 0;
    }

    /**
     * Get prefix cache key for resume feedback page data WS calls.
     *
     * @param feedbackId Feedback ID.
     * @returns Cache key.
     */
    protected getResumePageDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':launch';
    }

    /**
     * Invalidates feedback data except files and module info.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllFeedbackData(feedbackId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getFeedbackDataPrefixCacheKey(feedbackId));
    }

    /**
     * Invalidates feedback analysis data.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAnalysisData(feedbackId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKeyStartingWith(this.getAnalysisDataPrefixCacheKey(feedbackId));
    }

    /**
     * Invalidate the prefetched content.
     * To invalidate files, use AddonModFeedbackProvider#invalidateFiles.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const feedback = await this.getFeedback(courseId, moduleId, { siteId });

        await Promise.all([
            this.invalidateFeedbackData(courseId, siteId),
            this.invalidateAllFeedbackData(feedback.id, siteId),
        ]);
    }

    /**
     * Invalidates temporary completion record data.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCurrentValuesData(feedbackId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getCurrentValuesDataCacheKey(feedbackId));
    }

    /**
     * Invalidates feedback access information data.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateFeedbackAccessInformationData(feedbackId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getFeedbackAccessInformationDataCacheKey(feedbackId));
    }

    /**
     * Invalidates feedback data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateFeedbackData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getFeedbackCacheKey(courseId));
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param moduleId The module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the files are invalidated.
     */
    async invalidateFiles(moduleId: number, siteId?: string): Promise<void> {
        return CoreFilepool.invalidateFilesByComponent(siteId, ADDON_MOD_FEEDBACK_COMPONENT, moduleId);
    }

    /**
     * Invalidates feedback non respondents record data.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateNonRespondentsData(feedbackId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getNonRespondentsDataPrefixCacheKey(feedbackId));
    }

    /**
     * Invalidates feedback user responses record data.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateResponsesAnalysisData(feedbackId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getResponsesAnalysisDataPrefixCacheKey(feedbackId));
    }

    /**
     * Invalidates launch feedback data.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateResumePageData(feedbackId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getResumePageDataCacheKey(feedbackId));
    }

    /**
     * Returns if feedback has been completed
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async isCompleted(feedbackId: number, options: CoreCourseCommonModWSOptions = {}): Promise<boolean> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFeedbackGetLastCompletedWSParams = {
            feedbackid: feedbackId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCompletedDataCacheKey(feedbackId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_FEEDBACK_COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return CorePromiseUtils.promiseWorks(site.read('mod_feedback_get_last_completed', params, preSets));
    }

    /**
     * Report the feedback as being viewed.
     *
     * @param id Module ID.
     * @param formViewed True if form was viewed.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, formViewed: boolean = false, siteId?: string): Promise<void> {
        const params: AddonModFeedbackViewFeedbackWSParams = {
            feedbackid: id,
            moduleviewed: formViewed,
        };

        await CoreCourseLogHelper.log(
            'mod_feedback_view_feedback',
            params,
            ADDON_MOD_FEEDBACK_COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Process a jump between pages.
     *
     * @param feedbackId Feedback ID.
     * @param page The page being processed.
     * @param responses The data to be processed the key is the field name (usually type[index]_id).
     * @param options Other options.
     * @returns Promise resolved when the info is retrieved.
     */
    async processPage(
        feedbackId: number,
        page: number,
        responses: Record<string, AddonModFeedbackResponseValue>,
        options: AddonModFeedbackProcessPageOptions = {},
    ): Promise<AddonModFeedbackProcessPageResponse> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<AddonModFeedbackProcessPageResponse> => {
            await AddonModFeedbackOffline.saveResponses(feedbackId, page, responses, options.courseId!, options.siteId);

            // Simulate process_page response.
            const response: AddonModFeedbackProcessPageResponse = {
                jumpto: page,
                completed: false,
                offline: true,
            };
            let changePage = 0;

            if (options.goPrevious) {
                if (page > 0) {
                    changePage = -1;
                }
            } else if (!options.formHasErrors) {
                // We can only go next if it has no errors.
                changePage = 1;
            }

            if (changePage === 0) {
                return response;
            }

            const pageItems = await this.getPageItemsWithValues(feedbackId, page, {
                cmId: options.cmId,
                readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                siteId: options.siteId,
            });

            // Check completion.
            if (changePage == 1 && !pageItems.hasnextpage) {
                response.completed = true;

                return response;
            }

            const loadPage = await this.getPageJumpTo(feedbackId, page + changePage, changePage, options);

            if (loadPage === false) {
                // Completed or first page.
                if (changePage == -1) {
                    response.jumpto = 0;
                } else {
                    response.completed = true;
                }
            } else {
                response.jumpto = loadPage;
            }

            return response;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        await AddonModFeedbackOffline.deleteFeedbackPageResponses(feedbackId, page, options.siteId);

        try {
            return await this.processPageOnline(feedbackId, page, responses, !!options.goPrevious, options.siteId);
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
    }

    /**
     * Process a jump between pages.
     *
     * @param feedbackId Feedback ID.
     * @param page The page being processed.
     * @param responses The data to be processed the key is the field name (usually type[index]_id).
     * @param goPrevious Whether we want to jump to previous page.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async processPageOnline(
        feedbackId: number,
        page: number,
        responses: Record<string, AddonModFeedbackResponseValue>,
        goPrevious: boolean,
        siteId?: string,
    ): Promise<AddonModFeedbackProcessPageWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModFeedbackProcessPageWSParams = {
            feedbackid: feedbackId,
            page: page,
            responses: CoreObject.toArrayOfObjects(responses, 'name', 'value'),
            goprevious: goPrevious,
        };

        const response = await site.write<AddonModFeedbackProcessPageWSResponse>('mod_feedback_process_page', params);

        // Invalidate and update current values because they will change.
        await CorePromiseUtils.ignoreErrors(this.invalidateCurrentValuesData(feedbackId, site.getId()));

        await CorePromiseUtils.ignoreErrors(this.getCurrentValues(feedbackId, { siteId: site.getId() }));

        return response;
    }

}

export const AddonModFeedback = makeSingleton(AddonModFeedbackProvider);

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_FEEDBACK_FORM_SUBMITTED]: AddonModFeedbackFormSubmittedData;
    }

}

/**
 * Data passed to FORM_SUBMITTED event.
 */
export type AddonModFeedbackFormSubmittedData = {
    feedbackId: number;
    tab: AddonModFeedbackIndexTabName;
    offline: boolean;
};

/**
 * Params of mod_feedback_get_analysis WS.
 */
export type AddonModFeedbackGetAnalysisWSParams = {
    feedbackid: number; // Feedback instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_analysis WS.
 */
export type AddonModFeedbackGetAnalysisWSResponse = {
    completedcount: number; // Number of completed submissions.
    itemscount: number; // Number of items (questions).
    itemsdata: {
        item: AddonModFeedbackWSItem;
        data: string[];
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Item data returneds by feedback_item_exporter.
 */
export type AddonModFeedbackWSItem = {
    id: number; // The record id.
    feedback: number; // The feedback instance id this records belongs to.
    template: number; // If it belogns to a template, the template id.
    name: string; // The item name.
    label: string; // The item label.
    presentation: string; // The text describing the item or the available possible answers.
    typ: AddonModFeedbackQuestionType; // The type of the item.
    hasvalue: number; // Whether it has a value or not.
    position: number; // The position in the list of questions.
    required: boolean; // Whether is a item (question) required or not.
    dependitem: number; // The item id this item depend on.
    dependvalue: string; // The depend value.
    options: string; // Different additional settings for the item (question).
    itemfiles: CoreWSStoredFile[]; // Itemfiles.
    itemnumber: number; // The item position number.
    otherdata: string; // Additional data that may be required by external functions.
};

/**
 * Item with some calculated data.
 */
export type AddonModFeedbackItem = AddonModFeedbackWSItem & {
    rawValue?: AddonModFeedbackResponseValue;
};

/**
 * Params of mod_feedback_get_current_completed_tmp WS.
 */
export type AddonModFeedbackGetCurrentCompletedTmpWSParams = {
    feedbackid: number; // Feedback instance id.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_current_completed_tmp WS.
 */
export type AddonModFeedbackGetCurrentCompletedTmpWSResponse = {
    feedback: {
        id: number; // The record id.
        feedback: number; // The feedback instance id this records belongs to.
        userid: number; // The user who completed the feedback (0 for anonymous).
        guestid: string; // For guests, this is the session key.
        timemodified: number; // The last time the feedback was completed.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        random_response: number; // The response number (used when shuffling anonymous responses).
        // eslint-disable-next-line @typescript-eslint/naming-convention
        anonymous_response: number; // Whether is an anonymous response.
        courseid: number; // The course id where the feedback was completed.
    };
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_feedback_get_unfinished_responses WS.
 */
export type AddonModFeedbackGetUnfinishedResponsesWSParams = {
    feedbackid: number; // Feedback instance id.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_unfinished_responses WS.
 */
export type AddonModFeedbackGetUnfinishedResponsesWSResponse = {
    responses: AddonModFeedbackWSUnfinishedResponse[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Unfinished response data returned by feedback_valuetmp_exporter.
 */
export type AddonModFeedbackWSUnfinishedResponse = {
    id: number; // The record id.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    course_id: number; // The course id this record belongs to.
    item: number; // The item id that was responded.
    completed: number; // Reference to the feedback_completedtmp table.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tmp_completed: number; // Old field - not used anymore.
    value: string; // The response value.
};

/**
 * Params of mod_feedback_get_finished_responses WS.
 */
export type AddonModFeedbackGetFinishedResponsesWSParams = {
    feedbackid: number; // Feedback instance id.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_finished_responses WS.
 */
export type AddonModFeedbackGetFinishedResponsesWSResponse = {
    responses: AddonModFeedbackWSFinishedResponse[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Unfinished response data returned by feedback_value_exporter.
 */
export type AddonModFeedbackWSFinishedResponse = {
    id: number; // The record id.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    course_id: number; // The course id this record belongs to.
    item: number; // The item id that was responded.
    completed: number; // Reference to the feedback_completed table.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tmp_completed: number; // Old field - not used anymore.
    value: string; // The response value.
};

/**
 * A response, either finished or unfinished.
 */
export type AddonModFeedbackWSResponse = AddonModFeedbackWSFinishedResponse | AddonModFeedbackWSUnfinishedResponse;

/**
 * Params of mod_feedback_get_feedback_access_information WS.
 */
export type AddonModFeedbackGetFeedbackAccessInformationWSParams = {
    feedbackid: number; // Feedback instance id.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_feedback_access_information WS.
 */
export type AddonModFeedbackGetFeedbackAccessInformationWSResponse = {
    canviewanalysis: boolean; // Whether the user can view the analysis or not.
    cancomplete: boolean; // Whether the user can complete the feedback or not.
    cansubmit: boolean; // Whether the user can submit the feedback or not.
    candeletesubmissions: boolean; // Whether the user can delete submissions or not.
    canviewreports: boolean; // Whether the user can view the feedback reports or not.
    canedititems: boolean; // Whether the user can edit feedback items or not.
    isempty: boolean; // Whether the feedback has questions or not.
    isopen: boolean; // Whether the feedback has active access time restrictions or not.
    isalreadysubmitted: boolean; // Whether the feedback is already submitted or not.
    isanonymous: boolean; // Whether the feedback is anonymous or not.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_feedback_get_feedbacks_by_courses WS.
 */
export type AddonModFeedbackGetFeedbacksByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_feedback_get_feedbacks_by_courses WS.
 */
export type AddonModFeedbackGetFeedbacksByCoursesWSResponse = {
    feedbacks: AddonModFeedbackWSFeedback[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Feedback data returned by mod_feedback_get_feedbacks_by_courses WS.
 */
export type AddonModFeedbackWSFeedback = {
    id: number; // The primary key of the record.
    course: number; // Course id this feedback is part of.
    name: string; // Feedback name.
    intro: string; // Feedback introduction text.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    anonymous: number; // Whether the feedback is anonymous.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    email_notification?: boolean; // Whether email notifications will be sent to teachers.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    multiple_submit: boolean; // Whether multiple submissions are allowed.
    autonumbering: boolean; // Whether questions should be auto-numbered.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    site_after_submit?: string; // Link to next page after submission.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    page_after_submit?: string; // Text to display after submission.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    page_after_submitformat?: number; // Page_after_submit format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    // eslint-disable-next-line @typescript-eslint/naming-convention
    publish_stats: boolean; // Whether stats should be published.
    timeopen?: number; // Allow answers from this time.
    timeclose?: number; // Allow answers until this time.
    timemodified?: number; // The time this record was modified.
    completionsubmit: boolean; // If set to 1, then the activity will be automatically marked as complete on submission.
    coursemodule: number; // Coursemodule.
    introfiles: CoreWSExternalFile[]; // Introfiles.
    pageaftersubmitfiles?: CoreWSExternalFile[]; // Pageaftersubmitfiles.
};

/**
 * Params of mod_feedback_get_items WS.
 */
export type AddonModFeedbackGetItemsWSParams = {
    feedbackid: number; // Feedback instance id.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_items WS.
 */
export type AddonModFeedbackGetItemsWSResponse = {
    items: AddonModFeedbackWSItem[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_feedback_get_non_respondents WS.
 */
export type AddonModFeedbackGetNonRespondentsWSParams = {
    feedbackid: number; // Feedback instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    sort?: string; // Sort param, must be firstname, lastname or lastaccess (default).
    page?: number; // The page of records to return.
    perpage?: number; // The number of records to return per page.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_non_respondents WS.
 */
export type AddonModFeedbackGetNonRespondentsWSResponse = {
    users: AddonModFeedbackWSNonRespondent[];
    total: number; // Total number of non respondents.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by mod_feedback_get_non_respondents WS.
 */
export type AddonModFeedbackWSNonRespondent = {
    courseid: number; // Course id.
    userid: number; // The user id.
    fullname: string; // User full name.
    started: boolean; // If the user has started the attempt.
};

/**
 * Params of mod_feedback_get_page_items WS.
 */
export type AddonModFeedbackGetPageItemsWSParams = {
    feedbackid: number; // Feedback instance id.
    page: number; // The page to get starting by 0.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_page_items WS.
 */
export type AddonModFeedbackGetPageItemsWSResponse = {
    items: AddonModFeedbackWSItem[];
    hasprevpage: boolean; // Whether is a previous page.
    hasnextpage: boolean; // Whether there are more pages.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Page items with some calculated data.
 */
export type AddonModFeedbackPageItems = Omit<AddonModFeedbackGetPageItemsWSResponse, 'items'> & {
    items: AddonModFeedbackItem[];
};

/**
 * Params of mod_feedback_get_responses_analysis WS.
 */
export type AddonModFeedbackGetResponsesAnalysisWSParams = {
    feedbackid: number; // Feedback instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    page?: number; // The page of records to return.
    perpage?: number; // The number of records to return per page.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_get_responses_analysis WS.
 */
export type AddonModFeedbackGetResponsesAnalysisWSResponse = {
    attempts: AddonModFeedbackWSAttempt[];
    totalattempts: number; // Total responses count.
    anonattempts: AddonModFeedbackWSAnonAttempt[];
    totalanonattempts: number; // Total anonymous responses count.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Attempt data returned by mod_feedback_get_responses_analysis WS.
 */
export type AddonModFeedbackWSAttempt = {
    id: number; // Completed id.
    courseid: number; // Course id.
    userid: number; // User who responded.
    timemodified: number; // Time modified for the response.
    fullname: string; // User full name.
    responses: AddonModFeedbackWSAttemptResponse[];
};

/**
 * Anonymous attempt data returned by mod_feedback_get_responses_analysis WS.
 */
export type AddonModFeedbackWSAnonAttempt = {
    id: number; // Completed id.
    courseid: number; // Course id.
    // eslint-disable-next-line id-blacklist
    number: number; // Response number.
    responses: AddonModFeedbackWSAttemptResponse[];
};

/**
 * Response data returned by mod_feedback_get_responses_analysis WS.
 */
export type AddonModFeedbackWSAttemptResponse = {
    id: number; // Response id.
    name: string; // Response name.
    printval: string; // Response ready for output.
    rawval: string; // Response raw value.
};

/**
 * Params of mod_feedback_launch_feedback WS.
 */
export type AddonModFeedbackLaunchFeedbackWSParams = {
    feedbackid: number; // Feedback instance id.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_launch_feedback WS.
 */
export type AddonModFeedbackLaunchFeedbackWSResponse = {
    gopage: number; // The next page to go (-1 if we were already in the last page). 0 for first page.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_feedback_get_last_completed WS.
 */
export type AddonModFeedbackGetLastCompletedWSParams = {
    feedbackid: number; // Feedback instance id.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Params of mod_feedback_view_feedback WS.
 */
export type AddonModFeedbackViewFeedbackWSParams = {
    feedbackid: number; // Feedback instance id.
    moduleviewed?: boolean; // If we need to mark the module as viewed for completion.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Params of mod_feedback_process_page WS.
 */
export type AddonModFeedbackProcessPageWSParams = {
    feedbackid: number; // Feedback instance id.
    page: number; // The page being processed.
    responses?: { // The data to be processed.
        name: string; // The response name (usually type[index]_id).
        value: string | number; // The response value.
    }[];
    goprevious?: boolean; // Whether we want to jump to previous page.
    courseid?: number; // Course where user completes the feedback (for site feedbacks only).
};

/**
 * Data returned by mod_feedback_process_page WS.
 */
export type AddonModFeedbackProcessPageWSResponse = {
    jumpto: number; // The page to jump to.
    completed: boolean; // If the user completed the feedback.
    completionpagecontents: string; // The completion page contents.
    siteaftersubmit: string; // The link (could be relative) to show after submit.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by process page.
 */
export type AddonModFeedbackProcessPageResponse = {
    jumpto: number | null; // The page to jump to.
    completed: boolean; // If the user completed the feedback.
    offline?: boolean; // Whether data has been stored in offline.
} & Partial<AddonModFeedbackProcessPageWSResponse>;

/**
 * Common options with a group ID.
 */
export type AddonModFeedbackGroupOptions = CoreCourseCommonModWSOptions & {
    groupId?: number; // Group id, 0 means that the function will determine the user group. Defaults to 0.
};

/**
 * Common options with a group ID and page.
 */
export type AddonModFeedbackGroupPaginatedOptions = AddonModFeedbackGroupOptions & {
    page?: number; // The page of records to return. The page of records to return.
};

/**
 * Common options with a group ID and page.
 */
export type AddonModFeedbackProcessPageOptions = {
    goPrevious?: boolean; // Whether we want to jump to previous page.
    formHasErrors?: boolean; // Whether the form we sent has required but empty fields (only used in offline).
    cmId?: number; // Module ID.
    courseId?: number; // Course ID the feedback belongs to.
    siteId?: string; // Site ID. If not defined, current site.;
};

/**
 * Possible types of responses.
 */
export type AddonModFeedbackResponseValue = string | number;

type OfflineResponsesArray = {
    id: string;
    value: AddonModFeedbackResponseValue;
}[];

/**
 * Previous non respondents when using recursive function.
 */
export type AddonModFeedbackPreviousNonRespondents = {
    page: number;
    users: AddonModFeedbackWSNonRespondent[];
};

/**
 * All non respondents.
 */
export type AddonModFeedbackAllNonRespondent = AddonModFeedbackPreviousNonRespondents & {
    total: number;
};

export type AddonModFeedbackPreviousResponsesAnalysis = {
    page: number;
    attempts: AddonModFeedbackWSAttempt[];
    anonattempts: AddonModFeedbackWSAnonAttempt[];
};

export type AddonModFeedbackAllResponsesAnalysis = AddonModFeedbackPreviousResponsesAnalysis & {
    totalattempts: number;
    totalanonattempts: number;
};

export type AddonModFeedbackGetAttemptPreviousData = {
    page: number;
    attemptsLoaded: number;
    anonAttemptsLoaded: number;
};
