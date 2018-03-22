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

/**
 * Service that provides some features for feedbacks.
 */
@Injectable()
export class AddonModFeedbackProvider {
    static COMPONENT = 'mmaModFeedback';
    static FORM_SUBMITTED = 'addon_mod_feedback_form_submitted';

    protected ROOT_CACHE_KEY = this.ROOT_CACHE_KEY + '';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private filepoolProvider: CoreFilepoolProvider) {
        this.logger = logger.getInstance('AddonModFeedbackProvider');
    }

    /**
     * Get analysis information for a given feedback.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    [groupId]       Group ID.
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}                   Promise resolved when the feedback is retrieved.
     */
    getAnalysis(feedbackId: number, groupId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: this.getAnalysisDataCacheKey(feedbackId, groupId)
                };

            if (groupId) {
                params['groupid'] = groupId;
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
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}                   Promise resolved when the info is retrieved.
     */
    getCurrentCompletedTimeModified(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: this.getCurrentCompletedTimeModifiedDataCacheKey(feedbackId)
                };

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
     * Returns the temporary completion record for the current user.
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
                if (response && typeof response.responses != 'undefined') {
                    return response.responses;
                }

                return Promise.reject(null);
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
     * @param  {boolean} [forceCache=false]  True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}  Promise resolved when the feedback is retrieved.
     */
    protected getFeedbackDataByKey(courseId: number, key: string, value: any, siteId?: string, forceCache?: boolean): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getFeedbackCacheKey(courseId)
                };

            if (forceCache) {
                preSets['omitExpires'] = true;
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
     * @param  {boolean} [forceCache]   True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}   Promise resolved when the feedback is retrieved.
     */
    getFeedback(courseId: number, cmId: number, siteId?: string, forceCache?: boolean): Promise<any> {
        return this.getFeedbackDataByKey(courseId, 'coursemodule', cmId, siteId, forceCache);
    }

    /**
     * Get a feedback by ID.
     *
     * @param {number}  courseId      Course ID.
     * @param {number}  id            Feedback ID.
     * @param {string}  [siteId]      Site ID. If not defined, current site.
     * @param {boolean} [forceCache]  True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}         Promise resolved when the feedback is retrieved.
     */
    getFeedbackById(courseId: number, id: number, siteId?: string, forceCache?: boolean): Promise<any> {
        return this.getFeedbackDataByKey(courseId, 'id', id, siteId, forceCache);
    }

    /**
     * Retrieves a list of students who didn't submit the feedback.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    [groupId=0]     Group id, 0 means that the function will determine the user group.
     * @param   {number}    [page=0]        The page of records to return.
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getNonRespondents(feedbackId: number, groupId: number = 0, page: number = 0, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId,
                    groupid: groupId,
                    page: page
                },
                preSets = {
                    cacheKey: this.getNonRespondentsDataCacheKey(feedbackId, groupId)
                };

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
     * Returns the feedback user responses.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {number}    page            The page of records to return.
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getResponsesAnalysis(feedbackId: number, groupId: number, page: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId,
                    groupid: groupId || 0,
                    page: page || 0
                },
                preSets = {
                    cacheKey: this.getResponsesAnalysisDataCacheKey(feedbackId, groupId)
                };

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
     * @param   {string}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    isCompleted(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: this.getCompletedDataCacheKey(feedbackId)
                };

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
     * @param  {boolean} [formViewed=false] True if form was viewed.
     * @return {Promise<any>}               Promise resolved when the WS call is successful.
     */
    logView(id: number, formViewed: boolean = false): Promise<any> {
        const params = {
            feedbackid: id,
            moduleviewed: formViewed ? 1 : 0
        };

        return this.sitesProvider.getCurrentSite().write('mod_feedback_view_feedback', params);
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
                return this.utils.createFakeWSError(error);
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
