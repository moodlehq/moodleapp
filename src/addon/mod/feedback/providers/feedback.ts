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
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreAppProvider } from '@providers/app';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModFeedbackOfflineProvider } from './offline';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

/**
 * Service that provides some features for feedbacks.
 */
@Injectable()
export class AddonModFeedbackProvider {
    static COMPONENT = 'mmaModFeedback';
    static FORM_SUBMITTED = 'addon_mod_feedback_form_submitted';
    static LINE_SEP = '|';
    static MULTICHOICE_TYPE_SEP = '>>>>>';
    static MULTICHOICE_ADJUST_SEP = '<<<<<';
    static MULTICHOICE_HIDENOSELECT = 'h';
    static MULTICHOICERATED_VALUE_SEP = '####';

    protected ROOT_CACHE_KEY = this.ROOT_CACHE_KEY + '';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private filepoolProvider: CoreFilepoolProvider, private feedbackOffline: AddonModFeedbackOfflineProvider,
            private appProvider: CoreAppProvider, private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModFeedbackProvider');
    }

    /**
     * Check dependency of a question item.
     *
     * @param   {any[]}  items      All question items to check dependency.
     * @param   {any}    item       Item to check.
     * @return  {boolean}           Return true if dependency is acomplished and it can be shown. False, otherwise.
     */
    protected checkDependencyItem(items: any[], item: any): boolean {
        const depend = items.find((itemFind) => {
            return itemFind.id == item.dependitem;
        });

        // Item not found, looks like dependent item has been removed or is in the same or following pages.
        if (!depend) {
            return true;
        }

        switch (depend.typ) {
            case 'label':
                return false;
            case 'multichoice':
            case 'multichoicerated':
                return this.compareDependItemMultichoice(depend, item.dependvalue);
            default:
                break;
        }

        return item.dependvalue == depend.rawValue;
    }

    /**
     * Check dependency item of type Multichoice.
     *
     * @param  {any}     item        Item to check.
     * @param  {string}  dependValue Value to compare.
     * @return {boolean}             Return true if dependency is acomplished and it can be shown. False, otherwise.
     */
    protected compareDependItemMultichoice(item: any, dependValue: string): boolean {
        let values, choices;
        const parts = item.presentation.split(AddonModFeedbackProvider.MULTICHOICE_TYPE_SEP) || [],
            subtype = parts.length > 0 && parts[0] ? parts[0] : 'r';

        choices = parts[1] || '';
        choices = choices.split(AddonModFeedbackProvider.MULTICHOICE_ADJUST_SEP)[0] || '';
        choices = choices.split(AddonModFeedbackProvider.LINE_SEP) || [];

        if (subtype === 'c') {
            if (typeof item.rawValue == 'undefined') {
                values = [''];
            } else {
                item.rawValue = '' + item.rawValue;
                values = item.rawValue.split(AddonModFeedbackProvider.LINE_SEP);
            }
        } else {
            values = [item.rawValue];
        }

        for (let index = 0; index < choices.length; index++) {
            for (const x in values) {
                if (values[x] == index + 1) {
                    let value = choices[index];

                    if (item.typ == 'multichoicerated') {
                        value = value.split(AddonModFeedbackProvider.MULTICHOICERATED_VALUE_SEP)[1] || '';
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
     * @param   {number}   feedbackId   Feedback ID.
     * @param   {any[]}    items        Item to fill the value.
     * @param   {boolean}  offline      True if it should return cached data. Has priority over ignoreCache.
     * @param   {boolean}  ignoreCache  True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}   siteId       Site ID.
     * @return  {Promise<any>}          Resolved with values when done.
     */
    protected fillValues(feedbackId: number, items: any[], offline: boolean, ignoreCache: boolean, siteId: string): Promise<any> {
        return this.getCurrentValues(feedbackId, offline, ignoreCache, siteId).then((valuesArray) => {
            const values = {};

            valuesArray.forEach((value) => {
                values[value.item] = value.value;
            });

            items.forEach((itemData) => {
                if (itemData.hasvalue && typeof values[itemData.id] != 'undefined') {
                    itemData.rawValue = values[itemData.id];
                }
            });
        }).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Merge with offline data.
            return this.feedbackOffline.getFeedbackResponses(feedbackId, siteId).then((offlineValuesArray) => {
                const offlineValues = {};

                // Merge all values into one array.
                offlineValuesArray = offlineValuesArray.reduce((a, b) => {
                    const responses = this.utils.objectToArrayOfObjects(b.responses, 'id', 'value');

                    return a.concat(responses);
                }, []).map((a) => {
                    const parts = a.id.split('_');
                    a.typ = parts[0];
                    a.item = parseInt(parts[1], 0);

                    return a;
                });

                offlineValuesArray.forEach((value) => {
                    if (typeof offlineValues[value.item] == 'undefined') {
                        offlineValues[value.item] = [];
                    }
                    offlineValues[value.item].push(value.value);
                });

                items.forEach((itemData) => {
                    if (itemData.hasvalue && typeof offlineValues[itemData.id] != 'undefined') {
                        // Treat multichoice checkboxes.
                        if (itemData.typ == 'multichoice' &&
                                itemData.presentation.split(AddonModFeedbackProvider.MULTICHOICE_TYPE_SEP)[0] == 'c') {

                            offlineValues[itemData.id] = offlineValues[itemData.id].filter((value) => {
                                return value > 0;
                            });
                            itemData.rawValue = offlineValues[itemData.id].join(AddonModFeedbackProvider.LINE_SEP);
                        } else {
                            itemData.rawValue = offlineValues[itemData.id][0];
                        }
                    }
                });

                return items;
            });
        }).catch(() => {
            // Ignore errors.
            return items;
        });
    }

    /**
     * Returns all the feedback non respondents users.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @param   {any}       [previous]      Only for recurrent use. Object with the previous fetched info.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getAllNonRespondents(feedbackId: number, groupId: number, ignoreCache?: boolean, siteId?: string, previous?: any)
            : Promise<any> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (typeof previous == 'undefined') {
            previous = {
                page: 0,
                users: []
            };
        }

        return this.getNonRespondents(feedbackId, groupId, previous.page, ignoreCache, siteId).then((response) => {
            if (previous.users.length < response.total) {
                previous.users = previous.users.concat(response.users);
            }

            if (previous.users.length < response.total) {
                // Can load more.
                previous.page++;

                return this.getAllNonRespondents(feedbackId, groupId, ignoreCache, siteId, previous);
            }
            previous.total = response.total;

            return previous;
        });
    }

    /**
     * Returns all the feedback user responses.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @param   {any}       [previous]      Only for recurrent use. Object with the previous fetched info.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getAllResponsesAnalysis(feedbackId: number, groupId: number, ignoreCache?: boolean, siteId?: string, previous?: any)
            : Promise<any> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (typeof previous == 'undefined') {
            previous = {
                page: 0,
                attempts: [],
                anonattempts: []
            };
        }

        return this.getResponsesAnalysis(feedbackId, groupId, previous.page, ignoreCache, siteId).then((responses) => {
            if (previous.anonattempts.length < responses.totalanonattempts) {
                previous.anonattempts = previous.anonattempts.concat(responses.anonattempts);
            }

            if (previous.attempts.length < responses.totalattempts) {
                previous.attempts = previous.attempts.concat(responses.attempts);
            }

            if (previous.anonattempts.length < responses.totalanonattempts || previous.attempts.length < responses.totalattempts) {
                // Can load more.
                previous.page++;

                return this.getAllResponsesAnalysis(feedbackId, groupId, ignoreCache, siteId, previous);
            }

            previous.totalattempts = responses.totalattempts;
            previous.totalanonattempts = responses.totalanonattempts;

            return previous;
        });
    }

    /**
     * Get analysis information for a given feedback.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    [groupId]       Group ID.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}                   Promise resolved when the feedback is retrieved.
     */
    getAnalysis(feedbackId: number, groupId?: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAnalysisDataCacheKey(feedbackId, groupId)
                };

            if (groupId) {
                params['groupid'] = groupId;
            }

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_feedback_get_analysis', params, preSets);
        });
    }

    /**
     * Get cache key for feedback analysis data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @param {number} [groupId=0]  Group ID.
     * @return {string}         Cache key.
     */
    protected getAnalysisDataCacheKey(feedbackId: number, groupId: number = 0): string {
        return this.getAnalysisDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback analysis data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @return {string}         Cache key.
     */
    protected getAnalysisDataPrefixCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':analysis:';
    }

    /**
     * Find an attempt in all responses analysis.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    attemptId       Attempt id to find.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @param   {any}       [previous]      Only for recurrent use. Object with the previous fetched info.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getAttempt(feedbackId: number, attemptId: number, ignoreCache?: boolean, siteId?: string, previous?: any): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (typeof previous == 'undefined') {
            previous = {
                page: 0,
                attemptsLoaded: 0,
                anonAttemptsLoaded: 0
            };
        }

        return this.getResponsesAnalysis(feedbackId, 0, previous.page, ignoreCache, siteId).then((responses) => {
            let attempt;

            attempt = responses.attempts.find((attempt) => {
                return attemptId == attempt.id;
            });

            if (attempt) {
                return attempt;
            }

            attempt = responses.anonattempts.find((attempt) => {
                return attemptId == attempt.id;
            });

            if (attempt) {
                return attempt;
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

                return this.getAttempt(feedbackId, attemptId, ignoreCache, siteId, previous);
            }

            // Not found and all loaded. Reject.
            return Promise.reject(null);
        });
    }

    /**
     * Get prefix cache key for feedback completion data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @return {string}         Cache key.
     */
    protected getCompletedDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':completed:';
    }

    /**
     * Returns the temporary completion timemodified for the current user.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}                   Promise resolved when the info is retrieved.
     */
    getCurrentCompletedTimeModified(feedbackId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getCurrentCompletedTimeModifiedDataCacheKey(feedbackId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_feedback_get_current_completed_tmp', params, preSets).then((response) => {
                if (response && typeof response.feedback != 'undefined' && typeof response.feedback.timemodified != 'undefined') {
                    return response.feedback.timemodified;
                }

                return 0;
            }).catch(() => {
                // Ignore errors.
                return 0;
            });
        });
    }

    /**
     * Get prefix cache key for feedback current completed temp data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @return {string}         Cache key.
     */
    protected getCurrentCompletedTimeModifiedDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':completedtime:';
    }

    /**
     * Returns the temporary responses or responses of the last submission for the current user.
     *
     * @param   {number}    feedbackId          Feedback ID.
     * @param   {boolean}   [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param   {boolean}   [ignoreCache=false] True if it should ignore cached data (it always fail in offline or server down).
     * @param   {string}    [siteId]            Site ID. If not defined, current site.
     * @return  {Promise<any>}                  Promise resolved when the info is retrieved.
     */
    getCurrentValues(feedbackId: number, offline: boolean = false, ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: this.getCurrentValuesDataCacheKey(feedbackId)
                };

            if (offline) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            return site.read('mod_feedback_get_unfinished_responses', params, preSets).then((response) => {
                if (!response || typeof response.responses == 'undefined') {
                    return Promise.reject(null);
                }

                if (response.responses.length == 0) {
                    // No unfinished responses, fetch responses of the last submission.
                    return site.read('mod_feedback_get_finished_responses', params, preSets).then((response) => {
                        if (!response || typeof response.responses == 'undefined') {
                            return Promise.reject(null);
                        }

                        return response.responses;
                    });
                }

                return response.responses;
            });
        });
    }

    /**
     * Get cache key for get current values feedback data WS calls.
     *
     * @param  {number} feedbackId  Feedback ID.
     * @return {string}             Cache key.
     */
    protected getCurrentValuesDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':currentvalues';
    }

    /**
     * Get  access information for a given feedback.
     *
     * @param   {number}    feedbackId          Feedback ID.
     * @param   {boolean}   [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param   {boolean}   [ignoreCache=false] True if it should ignore cached data (it always fail in offline or server down).
     * @param   {string}    [siteId]            Site ID. If not defined, current site.
     * @return  {Promise<any>}                  Promise resolved when the feedback is retrieved.
     */
    getFeedbackAccessInformation(feedbackId: number, offline: boolean = false, ignoreCache: boolean = false, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: this.getFeedbackAccessInformationDataCacheKey(feedbackId)
                };

            if (offline) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            return site.read('mod_feedback_get_feedback_access_information', params, preSets);
        });
    }

    /**
     * Get cache key for feedback access information data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @return {string}         Cache key.
     */
    protected getFeedbackAccessInformationDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':access';
    }

    /**
     * Get cache key for feedback data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string}         Cache key.
     */
    protected getFeedbackCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'feedback:' + courseId;
    }

    /**
     * Get prefix cache key for all feedback activity data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @return {string}         Cache key.
     */
    protected getFeedbackDataPrefixCacheKey(feedbackId: number): string {
        return this.ROOT_CACHE_KEY + feedbackId;
    }

    /**
     * Get a feedback with key=value. If more than one is found, only the first will be returned.
     *
     * @param {number}   courseId            Course ID.
     * @param {string}   key                 Name of the property to check.
     * @param {any}      value               Value to search.
     * @param {string}   [siteId]            Site ID. If not defined, current site.
     * @param {boolean} [forceCache]  True to always get the value from cache, false otherwise. Default false.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}  Promise resolved when the feedback is retrieved.
     */
    protected getFeedbackDataByKey(courseId: number, key: string, value: any, siteId?: string, forceCache?: boolean,
            ignoreCache?: boolean): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getFeedbackCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_feedback_get_feedbacks_by_courses', params, preSets).then((response) => {
                if (response && response.feedbacks) {
                    const currentFeedback = response.feedbacks.find((feedback) => {
                        return feedback[key] == value;
                    });
                    if (currentFeedback) {
                        return currentFeedback;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a feedback by course module ID.
     *
     * @param {number}   courseId       Course ID.
     * @param {number}   cmId           Course module ID.
     * @param {string}   [siteId]       Site ID. If not defined, current site.
     * @param {boolean} [forceCache]   True to always get the value from cache, false otherwise. Default false.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}   Promise resolved when the feedback is retrieved.
     */
    getFeedback(courseId: number, cmId: number, siteId?: string, forceCache?: boolean, ignoreCache?: boolean): Promise<any> {
        return this.getFeedbackDataByKey(courseId, 'coursemodule', cmId, siteId, forceCache, ignoreCache);
    }

    /**
     * Get a feedback by ID.
     *
     * @param {number}  courseId      Course ID.
     * @param {number}  id            Feedback ID.
     * @param {string}  [siteId]      Site ID. If not defined, current site.
     * @param {boolean} [forceCache]  True to always get the value from cache, false otherwise. Default false.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}         Promise resolved when the feedback is retrieved.
     */
    getFeedbackById(courseId: number, id: number, siteId?: string, forceCache?: boolean, ignoreCache?: boolean): Promise<any> {
        return this.getFeedbackDataByKey(courseId, 'id', id, siteId, forceCache, ignoreCache);
    }

    /**
     * Returns the items (questions) in the given feedback.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}                   Promise resolved when the info is retrieved.
     */
    getItems(feedbackId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getItemsDataCacheKey(feedbackId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_feedback_get_items', params, preSets);
        });
    }

    /**
     * Get cache key for get items feedback data WS calls.
     *
     * @param  {number} feedbackId  Feedback ID.
     * @return {string}             Cache key.
     */
    protected getItemsDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':items';
    }

    /**
     * Retrieves a list of students who didn't submit the feedback.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    [groupId=0]     Group id, 0 means that the function will determine the user group.
     * @param   {number}    [page=0]        The page of records to return.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getNonRespondents(feedbackId: number, groupId: number = 0, page: number = 0, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId,
                    groupid: groupId,
                    page: page
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getNonRespondentsDataCacheKey(feedbackId, groupId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_feedback_get_non_respondents', params, preSets);
        });
    }

    /**
     * Get cache key for non respondents feedback data WS calls.
     *
     * @param  {number} feedbackId  Feedback ID.
     * @param  {number} [groupId=0] Group id, 0 means that the function will determine the user group.
     * @return {string}             Cache key.
     */
    protected getNonRespondentsDataCacheKey(feedbackId: number, groupId: number = 0): string {
        return this.getNonRespondentsDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback non respondents data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @return {string}           Cache key.
     */
    protected getNonRespondentsDataPrefixCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':nonrespondents:';
    }

    /**
     * Get a single feedback page items. This function is not cached, use AddonModFeedbackHelperProvider#getPageItems instead.
     *
     * @param   {number}    feedbackId  Feedback ID.
     * @param   {number}    page        The page to get.
     * @param   {string}    [siteId]    Site ID. If not defined, current site.
     * @return  {Promise<any>}          Promise resolved when the info is retrieved.
     */
    getPageItems(feedbackId: number, page: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId,
                    page: page
                };

            return site.write('mod_feedback_get_page_items', params);
        });
    }

    /**
     * Get a single feedback page items. If offline or server down it will use getItems to calculate dependencies.
     *
     * @param   {number}  feedbackId          Feedback ID.
     * @param   {number}  page                The page to get.
     * @param   {boolean} [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param   {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}  [siteId]            Site ID. If not defined, current site.
     * @return  {Promise<any>}                Promise resolved when the info is retrieved.
     */
    getPageItemsWithValues(feedbackId: number, page: number, offline: boolean = false, ignoreCache: boolean = false,
            siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getPageItems(feedbackId, page, siteId).then((response) => {
            return this.fillValues(feedbackId, response.items, offline, ignoreCache, siteId).then((items) => {
                response.items = items;

                return response;
            });
        }).catch(() => {
            // If getPageItems fail we should calculate it using getItems.
            return this.getItems(feedbackId, false, siteId).then((response) => {
                return this.fillValues(feedbackId, response.items, offline, ignoreCache, siteId).then((items) => {
                    // Separate items by pages.
                    let currentPage = 0;
                    const previousPageItems = [];

                    const pageItems = items.filter((item) => {
                        // Greater page, discard all entries.
                        if (currentPage > page) {
                            return false;
                        }

                        if (item.typ == 'pagebreak') {
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

                    // Check if there are more pages.
                    response.hasprevpage = page > 0;
                    response.hasnextpage = currentPage > page;
                    response.items = pageItems;

                    return response;
                });
            });
        });
    }

    /**
     * Convenience function to get the page we can jump.
     *
     * @param  {number}  feedbackId Feedback ID.
     * @param  {number}  page       Page where we want to jump.
     * @param  {number}  changePage If page change is forward (1) or backward (-1).
     * @param  {string}  siteId     Site ID.
     * @return {Promise<number | false>}  Page number where to jump. Or false if completed or first page.
     */
    protected getPageJumpTo(feedbackId: number, page: number, changePage: number, siteId: string): Promise<number | false> {
        return this.getPageItemsWithValues(feedbackId, page, true, false, siteId).then((resp) => {
            // The page we are going has items.
            if (resp.items.length > 0) {
                return page;
            }

            // Check we can jump futher.
            if ((changePage == 1 && resp.hasnextpage) || (changePage == -1 && resp.hasprevpage)) {
                return this.getPageJumpTo(feedbackId, page + changePage, changePage, siteId);
            }

            // Completed or first page.
            return false;
        });
    }

    /**
     * Returns the feedback user responses.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {number}    page            The page of records to return.
     * @param   {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getResponsesAnalysis(feedbackId: number, groupId: number, page: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId,
                    groupid: groupId || 0,
                    page: page || 0
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getResponsesAnalysisDataCacheKey(feedbackId, groupId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_feedback_get_responses_analysis', params, preSets);
        });
    }

    /**
     * Get cache key for responses analysis feedback data WS calls.
     *
     * @param  {number} feedbackId  Feedback ID.
     * @param  {number} [groupId=0] Group id, 0 means that the function will determine the user group.
     * @return {string}             Cache key.
     */
    protected getResponsesAnalysisDataCacheKey(feedbackId: number, groupId: number = 0): string {
        return this.getResponsesAnalysisDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback responses analysis data WS calls.
     *
     * @param {number} feedbackId Feedback ID.
     * @return {string}         Cache key.
     */
    protected getResponsesAnalysisDataPrefixCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':responsesanalysis:';
    }

    /**
     * Gets the resume page information.
     *
     * @param   {number}    feedbackId          Feedback ID.
     * @param   {boolean}   [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param   {boolean}   [ignoreCache=false] True if it should ignore cached data (it always fail in offline or server down).
     * @param   {string}    [siteId]            Site ID. If not defined, current site.
     * @return  {Promise<any>}                  Promise resolved when the info is retrieved.
     */
    getResumePage(feedbackId: number, offline: boolean = false, ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: this.getResumePageDataCacheKey(feedbackId)
                };

            if (offline) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            return site.read('mod_feedback_launch_feedback', params, preSets).then((response) => {
                if (response && typeof response.gopage != 'undefined') {
                    // WS will return -1 for last page but the user need to start again.
                    return response.gopage > 0 ? response.gopage : 0;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get prefix cache key for resume feedback page data WS calls.
     *
     * @param {number} feedbackId   Feedback ID.
     * @return {string}             Cache key.
     */
    protected getResumePageDataCacheKey(feedbackId: number): string {
        return this.getFeedbackDataPrefixCacheKey(feedbackId) + ':launch';
    }

    /**
     * Invalidates feedback data except files and module info.
     *
     * @param  {number} feedbackId   Feedback ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateAllFeedbackData(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getFeedbackDataPrefixCacheKey(feedbackId));
        });
    }

    /**
     * Invalidates feedback analysis data.
     *
     * @param {number} feedbackId   Feedback ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateAnalysisData(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getAnalysisDataPrefixCacheKey(feedbackId));
        });
    }

    /**
     * Invalidate the prefetched content.
     * To invalidate files, use AddonFeedbackProvider#invalidateFiles.
     *
     * @param  {number} moduleId The module ID.
     * @param  {number} courseId Course ID of the module.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.getFeedback(courseId, moduleId, siteId).then((feedback) => {
            const ps = [];

            // Do not invalidate module data before getting module info, we need it!
            ps.push(this.invalidateFeedbackData(courseId, siteId));
            ps.push(this.invalidateAllFeedbackData(feedback.id, siteId));

            return Promise.all(ps);
        }));

        promises.push(this.invalidateFiles(moduleId, siteId));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates temporary completion record data.
     *
     * @param  {number} feedbackId   Feedback ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateCurrentValuesData(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCurrentValuesDataCacheKey(feedbackId));
        });
    }

    /**
     * Invalidates feedback access information data.
     *
     * @param {number} feedbackId   Feedback ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateFeedbackAccessInformationData(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getFeedbackAccessInformationDataCacheKey(feedbackId));
        });
    }

    /**
     * Invalidates feedback data.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the data is invalidated.
     */
    invalidateFeedbackData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getFeedbackCacheKey(courseId));
        });
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param {number} moduleId  The module ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved when the files are invalidated.
     */
    invalidateFiles(moduleId: number, siteId?: string): Promise<any> {
        return this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModFeedbackProvider.COMPONENT, moduleId);
    }

    /**
     * Invalidates feedback non respondents record data.
     *
     * @param  {number} feedbackId   Feedback ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateNonRespondentsData(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getNonRespondentsDataPrefixCacheKey(feedbackId));

        });
    }

    /**
     * Invalidates feedback user responses record data.
     *
     * @param  {number} feedbackId   Feedback ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateResponsesAnalysisData(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getResponsesAnalysisDataPrefixCacheKey(feedbackId));

        });
    }

    /**
     * Invalidates launch feedback data.
     *
     * @param {number} feedbackId   Feedback ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateResumePageData(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getResumePageDataCacheKey(feedbackId));
        });
    }

    /**
     * Returns if feedback has been completed
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<boolean>}              Promise resolved when the info is retrieved.
     */
    isCompleted(feedbackId: number, ignoreCache?: boolean, siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getCompletedDataCacheKey(feedbackId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return this.utils.promiseWorks(site.read('mod_feedback_get_last_completed', params, preSets));
        });
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the feedback WS are available.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     * @since 3.3
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return  site.wsAvailable('mod_feedback_get_feedbacks_by_courses') &&
                    site.wsAvailable('mod_feedback_get_feedback_access_information');
        });
    }

    /**
     * Report the feedback as being viewed.
     *
     * @param {number} id                   Module ID.
     * @param {string} [name] Name of the feedback.
     * @param  {boolean} [formViewed=false] True if form was viewed.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}               Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, formViewed: boolean = false, siteId?: string): Promise<any> {
        const params = {
            feedbackid: id,
            moduleviewed: formViewed ? 1 : 0
        };

        return this.logHelper.logSingle('mod_feedback_view_feedback', params, AddonModFeedbackProvider.COMPONENT, id, name,
                'feedback', {moduleviewed: params.moduleviewed}, siteId);
    }

    /**
     * Process a jump between pages.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    page            The page being processed.
     * @param   {any}       responses       The data to be processed the key is the field name (usually type[index]_id).
     * @param   {boolean}   goPrevious      Whether we want to jump to previous page.
     * @param   {boolean}   formHasErrors   Whether the form we sent has required but empty fields (only used in offline).
     * @param   {number}    courseId        Course ID the feedback belongs to.
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    processPage(feedbackId: number, page: number, responses: any, goPrevious: boolean, formHasErrors: boolean, courseId: number,
            siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.feedbackOffline.saveResponses(feedbackId, page, responses, courseId, siteId).then(() => {
                // Simulate process_page response.
                const response = {
                        jumpto: page,
                        completed: false,
                        offline: true
                    };
                let changePage = 0;

                if (goPrevious) {
                    if (page > 0) {
                        changePage = -1;
                    }
                } else if (!formHasErrors) {
                    // We can only go next if it has no errors.
                    changePage = 1;
                }

                if (changePage === 0) {
                    return response;
                }

                return this.getPageItemsWithValues(feedbackId, page, true, false, siteId).then((resp) => {
                    // Check completion.
                    if (changePage == 1 && !resp.hasnextpage) {
                        response.completed = true;

                        return response;
                    }

                    return this.getPageJumpTo(feedbackId, page + changePage, changePage, siteId).then((loadPage) => {
                        if (loadPage === false) {
                            // Completed or first page.
                            if (changePage == -1) {
                                // First page.
                                response.jumpto = 0;
                            } else {
                                // Completed.
                                response.completed = true;
                            }
                        } else {
                            response.jumpto = loadPage;
                        }

                        return response;
                    });
                });
            });
        };

        if (!this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        return this.feedbackOffline.deleteFeedbackPageResponses(feedbackId, page, siteId).then(() => {
            return this.processPageOnline(feedbackId, page, responses, goPrevious, siteId).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return Promise.reject(error);
                }

                // Couldn't connect to server, store in offline.
                return storeOffline();
            });
        });
    }

    /**
     * Process a jump between pages.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    page            The page being processed.
     * @param   {any}       responses       The data to be processed the key is the field name (usually type[index]_id).
     * @param   {boolean}   goPrevious      Whether we want to jump to previous page.
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}                   Promise resolved when the info is retrieved.
     */
    processPageOnline(feedbackId: number, page: number, responses: any, goPrevious: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId,
                    page: page,
                    responses: this.utils.objectToArrayOfObjects(responses, 'name', 'value'),
                    goprevious: goPrevious ? 1 : 0
                };

            return site.write('mod_feedback_process_page', params).catch((error) => {
                return Promise.reject(this.utils.createFakeWSError(error));
            }).then((response) => {
                // Invalidate and update current values because they will change.
                return this.invalidateCurrentValuesData(feedbackId, site.getId()).then(() => {
                    return this.getCurrentValues(feedbackId, false, false, site.getId());
                }).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return response;
                });
            });
        });
    }
}
