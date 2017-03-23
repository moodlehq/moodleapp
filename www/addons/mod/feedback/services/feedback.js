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

angular.module('mm.addons.mod_feedback')

/**
 * Feedback service.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc service
 * @name $mmaModFeedback
 */
.factory('$mmaModFeedback', function($q, $mmSite, $mmSitesManager, $mmFilepool, mmaModFeedbackComponent, $mmUtil) {
    var self = {};

    /**
     * Get cache key for feedback data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getFeedbackDataCacheKey(courseId) {
        return 'mmaModFeedback:feedback:' + courseId;
    }

    /**
     * Get prefix cache key for all feedback activity data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @return {String}         Cache key.
     */
    function getFeedbackDataPrefixCacheKey(feedbackId) {
        return 'mmaModFeedback:' + feedbackId;
    }

    /**
     * Get cache key for feedback access information data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @return {String}         Cache key.
     */
    function getFeedbackAccessInformationDataCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':access';
    }

    /**
     * Get prefix cache key for feedback analysis data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @return {String}         Cache key.
     */
    function getAnalysisDataPrefixCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':analysis';
    }

    /**
     * Get cache key for feedback analysis data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @param {Number} [groupId]  Group ID.
     * @return {String}         Cache key.
     */
    function getAnalysisDataCacheKey(feedbackId, groupId) {
        groupId = groupId || 0;
        return getAnalysisDataPrefixCacheKey(feedbackId) + ":" + groupId;
    }

    /**
     * Get prefix cache key for resume feedback page data WS calls.
     *
     * @param {Number} feedbackId   Feedback ID.
     * @return {String}             Cache key.
     */
    function getResumePageDataCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':launch';
    }

    /**
     * Get cache key for get items feedback data WS calls.
     *
     * @param  {Number} feedbackId  Feedback ID.
     * @return {String}             Cache key.
     */
    function getItemsDataCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':items';
    }

    /**
     * Get cache key for get current values feedback data WS calls.
     *
     * @param  {Number} feedbackId  Feedback ID.
     * @return {String}             Cache key.
     */
    function getCurrentValuesDataCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':currentvalues';
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the feedback WS are available.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_feedback_get_feedbacks_by_courses') &&
                    site.wsAvailable('mod_feedback_get_feedback_access_information');
        });
    };

    /**
     * Get a feedback with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {Number}     courseId        Course ID.
     * @param  {String}     key             Name of the property to check.
     * @param  {Mixed}      value           Value to search.
     * @param  {String}     [siteId]        Site ID. If not defined, current site.
     * @param  {Boolean}    [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}                    Promise resolved when the feedback is retrieved.
     */
    function getFeedback(courseId, key, value, siteId, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getFeedbackDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_feedback_get_feedbacks_by_courses', params, preSets).then(function(response) {
                if (response && response.feedbacks) {
                    var current;
                    angular.forEach(response.feedbacks, function(feedback) {
                        if (!current && feedback[key] == value) {
                            current = feedback;
                        }
                    });
                    if (current) {
                        return current;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a feedback by course module ID.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getFeedback
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    cmId            Course module ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the feedback is retrieved.
     */
    self.getFeedback = function(courseId, cmId, siteId, forceCache) {
        return getFeedback(courseId, 'coursemodule', cmId, siteId, forceCache);
    };

    /**
     * Get a feedback by ID.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getFeedbackById
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    id              Feedback ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the feedback is retrieved.
     */
    self.getFeedbackById = function(courseId, id, siteId, forceCache) {
        return getFeedback(courseId, 'id', id, siteId, forceCache);
    };

    /**
     * Invalidates feedback data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateFeedbackData
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateFeedbackData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getFeedbackDataCacheKey(courseId));
        });
    };

    /**
     * Get  access information for a given feedback.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getFeedbackAccessInformation
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the feedback is retrieved.
     */
    self.getFeedbackAccessInformation = function(feedbackId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: getFeedbackAccessInformationDataCacheKey(feedbackId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_feedback_get_feedback_access_information', params, preSets);
        });
    };

    /**
     * Invalidates feedback access information data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateFeedbackAccessInformationData
     * @param {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateFeedbackAccessInformationData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getFeedbackAccessInformationDataCacheKey(feedbackId));
        });
    };

    /**
     * Get analysis information for a given feedback.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getAnalysis
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    [groupId]       Group ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the feedback is retrieved.
     */
    self.getAnalysis = function(feedbackId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: getAnalysisDataCacheKey(feedbackId, groupId)
                };

            if (groupId) {
                params.groupid = groupId;
            }

            return site.read('mod_feedback_get_analysis', params, preSets);
        });
    };

    /**
     * Invalidates feedback analysis data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateAnalysisData
     * @param {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAnalysisData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getAnalysisDataPrefixCacheKey(feedbackId));
        });
    };

    /**
     * Gets the resume page information.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getResumePage
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getResumePage = function(feedbackId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: getResumePageDataCacheKey(feedbackId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_feedback_launch_feedback', params, preSets).then(function(response) {
                if (response && typeof response.gopage != "undefined") {
                    // WS will return -1 for last page but the user need to start again.
                    return response.gopage > 0 ? response.gopage : 0;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates launch feedback data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateLaunchFeedbackData
     * @param {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateResumePageData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getResumePageDataCacheKey(feedbackId));
        });
    };

    /**
     * Get a single feedback page items. This function is not cached, use $mmaModFeedbackHelper.getPageItems instead.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getPageItems
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    page            The page to get.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getPageItems = function(feedbackId, page, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId,
                    page: page
                };

            return site.write('mod_feedback_get_page_items', params);
        });
    };

    /**
     * Returns the items (questions) in the given feedback.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getItems
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getItems = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: getItemsDataCacheKey(feedbackId)
                };

            return site.read('mod_feedback_get_items', params, preSets);
        });
    };

    /**
     * Invalidates get items data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateItemsData
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateItemsData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getItemsDataCacheKey(feedbackId));
        });
    };

    /**
     * Process a jump between pages.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#processPage
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    page            The page being processed.
     * @param   {Object}    responses       The data to be processed the key is the field name (usually type[index]_id).
     * @param   {Boolean}   goprevious      Whether we want to jump to previous page.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.processPage = function(feedbackId, page, responses, goprevious, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId,
                    page: page,
                    responses: $mmUtil.objectToArrayOfObjects(responses, 'name', 'value'),
                    goprevious: goprevious ? 1 : 0
                };

            return site.write('mod_feedback_process_page', params).then(function(response) {
                // Invalidate corrent values because they will change.
                return self.invalidateCurrentValuesData(feedbackId, site.getId()).then(function() {
                    return response;
                });
            });
        });
    };

    /**
     * Returns the temporary completion record for the current user.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getCurrentValues
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getCurrentValues = function(feedbackId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: getCurrentValuesDataCacheKey(feedbackId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_feedback_get_unfinished_responses', params, preSets).then(function(response) {
                if (response && typeof response.responses != "undefined") {
                    return response.responses;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates temporary completion record data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateCurrentVlauesData
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCurrentValuesData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCurrentValuesDataCacheKey(feedbackId));
        });
    };

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use $mmaModFeedback#invalidateFiles.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return self.getFeedback(courseId, moduleId, siteId, true).then(function(feedback) {
            var ps = [];
            // Do not invalidate feedback data before getting feedback info, we need it!
            ps.push(self.invalidateFeedbackData(courseId, siteId));
            ps.push(self.invalidateWsCacheForKeyStartingWith(getFeedbackDataPrefixCacheKey(feedback.id), siteId));

            return $q.all(ps);
        });
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateFiles
     * @param {Number} moduleId  The module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the files are invalidated.
     */
    self.invalidateFiles = function(moduleId, siteId) {
        return $mmFilepool.invalidateFilesByComponent(siteId, mmaModFeedbackComponent, moduleId);
    };

    /**
     * Report the feedback as being viewed.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#logView
     * @param {String}  id       Feedback ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                feedbackid: id
            };
            return site.write('mod_feedback_view_feedback', params);
        });
    };

    return self;
});
