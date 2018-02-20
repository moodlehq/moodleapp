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
.factory('$mmaModFeedback', function($q, $mmSite, $mmSitesManager, $mmFilepool, mmaModFeedbackComponent, $mmUtil, $mmApp,
        $mmaModFeedbackOffline) {
    var self = {};
    self.FEEDBACK_LINE_SEP = '|';
    self.FEEDBACK_MULTICHOICE_TYPE_SEP = '>>>>>';
    self.FEEDBACK_MULTICHOICE_ADJUST_SEP = '<<<<<';
    self.FEEDBACK_MULTICHOICE_HIDENOSELECT = 'h';
    self.FEEDBACK_MULTICHOICERATED_VALUE_SEP = '####';

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
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':analysis:';
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
        return getAnalysisDataPrefixCacheKey(feedbackId) + groupId;
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
     * Get prefix cache key for feedback responses analysis data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @return {String}         Cache key.
     */
    function getResponsesAnalysisDataPrefixCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':responsesanalysis:';
    }

    /**
     * Get cache key for responses analysis feedback data WS calls.
     *
     * @param  {Number} feedbackId  Feedback ID.
     * @param  {Number} groupId     Group id, 0 means that the function will determine the user group.
     * @return {String}             Cache key.
     */
    function getResponsesAnalysisDataCacheKey(feedbackId, groupId) {
        groupId = groupId || 0;
        return getResponsesAnalysisDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback non respondents data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @return {String}         Cache key.
     */
    function getNonRespondentsDataPrefixCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':nonrespondents:';
    }

    /**
     * Get cache key for non respondents feedback data WS calls.
     *
     * @param  {Number} feedbackId  Feedback ID.
     * @param  {Number} groupId     Group id, 0 means that the function will determine the user group.
     * @return {String}             Cache key.
     */
    function getNonRespondentsDataCacheKey(feedbackId, groupId) {
        groupId = groupId || 0;
        return getNonRespondentsDataPrefixCacheKey(feedbackId) + groupId;
    }

    /**
     * Get prefix cache key for feedback current completed temp data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @return {String}         Cache key.
     */
    function getCurrentCompletedTimeModifiedDataCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':completedtime:';
    }

    /**
     * Get prefix cache key for feedback completion data WS calls.
     *
     * @param {Number} feedbackId Feedback ID.
     * @return {String}         Cache key.
     */
    function getCompletedDataCacheKey(feedbackId) {
        return getFeedbackDataPrefixCacheKey(feedbackId) + ':completed:';
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
     * Get a single feedback page items. If offline or server down it will use getItems to calculate dependencies.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getPageItemsWithValues
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    page            The page to get.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getPageItemsWithValues = function(feedbackId, page, offline, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();
        return self.getPageItems(feedbackId, page, siteId).then(function(response) {
            return fillValues(feedbackId, response.items, offline, ignoreCache, siteId).then(function(items) {
                response.items = items;
                return response;
            });
        }).catch(function() {
            // If getPageItems fail we should calculate it using getItems.
            return self.getItems(feedbackId, siteId).then(function(response) {
                return fillValues(feedbackId, response.items, offline, ignoreCache, siteId).then(function(items) {
                    // Separate items by pages.
                    var pageItems = [],
                        currentPage = 0,
                        previousPageItems = [];

                    pageItems = items.filter(function(item) {
                        // Greater page, discard all entries.
                        if (currentPage > page) {
                            return false;
                        }

                        if (item.typ == "pagebreak") {
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
                            return checkDependencyItem(previousPageItems, item);
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

        /**
         * Fill values of item questions.
         *
         * @param   {Number}   feedbackId   Feedback ID.
         * @param   {Array}    items        Item to fill the value.
         * @param   {Boolean}  offline      True if it should return cached data. Has priority over ignoreCache.
         * @param   {Boolean}  ignoreCache  True if it should ignore cached data (it will always fail in offline or server down).
         * @param   {String}   siteId       Site ID.
         * @return  {Promise}               Resolved with values when done.
         */
        function fillValues(feedbackId, items, offline, ignoreCache, siteId) {
            return self.getCurrentValues(feedbackId, offline, ignoreCache, siteId).then(function(valuesArray) {
                if (valuesArray.length == 0) {
                    // Try sending empty values to get the last completed attempt values.
                    return self.processPageOnline(feedbackId, 0, {}, undefined, siteId).then(function() {
                        return self.getCurrentValues(feedbackId, offline, ignoreCache, siteId);
                    }).catch(function() {
                        // Ignore errors
                    });
                }
                return valuesArray;

            }).then(function(valuesArray) {
                var values = {};
                angular.forEach(valuesArray, function(value) {
                    values[value.item] = value.value;
                });

                angular.forEach(items, function(itemData) {
                    if (itemData.hasvalue && typeof values[itemData.id] != "undefined") {
                        itemData.rawValue = values[itemData.id];
                    }
                });
            }).catch(function() {
                // Ignore errors.
            }).then(function() {
                // Merge with offline data.
                return $mmaModFeedbackOffline.getFeedbackResponses(feedbackId, siteId).then(function(offlineValuesArray) {
                    var offlineValues = {};

                    // Merge all values into one array.
                    offlineValuesArray = offlineValuesArray.reduce(function(a, b) {
                        var responses = $mmUtil.objectToArrayOfObjects(b.responses, 'id', 'value');
                        return a.concat(responses);
                    }, []).map(function(a) {
                        var parts = a.id.split('_');
                        a.typ = parts[0];
                        a.item = parseInt(parts[1], 0);
                        return a;
                    });

                    angular.forEach(offlineValuesArray, function(value) {
                        if (typeof offlineValues[value.item] == "undefined") {
                            offlineValues[value.item] = [];
                        }
                        offlineValues[value.item].push(value.value);
                    });

                    angular.forEach(items, function(itemData) {
                        if (itemData.hasvalue && typeof offlineValues[itemData.id] != "undefined") {
                            // Treat multichoice checkboxes.
                            if (itemData.typ == "multichoice" &&
                                    itemData.presentation.split(self.FEEDBACK_MULTICHOICE_TYPE_SEP)[0] == 'c') {

                                offlineValues[itemData.id] = offlineValues[itemData.id].filter(function(value) {
                                    return value > 0;
                                });
                                itemData.rawValue = offlineValues[itemData.id].join(self.FEEDBACK_LINE_SEP);
                            } else {
                                itemData.rawValue = offlineValues[itemData.id][0];
                            }
                        }
                    });
                    return items;
                });
            }).catch(function() {
                // Ignore errors.
                return items;
            });
        }

        /**
         * Check dependency of a question item.
         *
         * @param   {Array}     items       All question items to check dependency.
         * @param   {Number}    item       Item to check.
         * @return  {Boolean}              Return true if dependency is acomplished and it can be shown. False, otherwise.
         */
        function checkDependencyItem(items, item) {
            var depend;
            for (var x in items) {
                if (items[x].id == item.dependitem) {
                    depend = items[x];
                    break;
                }
            }

            // Item not found, looks like dependent item has been removed or is in the same or following pages.
            if (!depend) {
                return true;
            }

            switch (depend.typ) {
                case 'label':
                    return false;
                case 'multichoice':
                case 'multichoicerated':
                    return compareDependItemMultichoice(depend, item.dependvalue);
            }

            return item.dependvalue == depend.rawValue;

            // Helper functions by type:
            function compareDependItemMultichoice(item, dependValue) {
                var values, choices,
                    parts = item.presentation.split(self.FEEDBACK_MULTICHOICE_TYPE_SEP) || [],
                    subtype = parts.length > 0 && parts[0] ? parts[0] : 'r';

                choices = parts[1] || '';
                choices = choices.split(self.FEEDBACK_MULTICHOICE_ADJUST_SEP)[0] || '';
                choices = choices.split(self.FEEDBACK_LINE_SEP) || [];


                if (subtype === 'c') {
                    if (typeof item.rawValue == "undefined") {
                        values = [''];
                    } else {
                        item.rawValue = "" + item.rawValue;
                        values = item.rawValue.split(self.FEEDBACK_LINE_SEP);
                    }
                } else {
                    values = [item.rawValue];
                }

                for (var index = 0; index < choices.length; index++) {
                    for (var x in values) {
                        if (values[x] == index + 1) {
                            var value = choices[index];
                            if (item.typ == 'multichoicerated') {
                                value = value.split(self.FEEDBACK_MULTICHOICERATED_VALUE_SEP)[1] || '';
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
        }

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
     * @param   {Boolean}   goPrevious      Whether we want to jump to previous page.
     * @param   {Boolean}   formHasErrors   Whether the form we sent has required but empty fields (only used in offline).
     * @param   {Number}    courseId        Course ID the feedback belongs to.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.processPage = function(feedbackId, page, responses, goPrevious, formHasErrors, courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        if (!$mmApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        return $mmaModFeedbackOffline.deleteFeedbackPageResponses(feedbackId, page, siteId).then(function() {
            return self.processPageOnline(feedbackId, page, responses, goPrevious, siteId).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return $q.reject(error.error);
                } else {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                }
            });
        });

        // Convenience function to store a message to be synchronized later.
        function storeOffline() {
            return $mmaModFeedbackOffline.saveResponses(feedbackId, page, responses, courseId, siteId).then(function() {
                // Simulate process_page response.
                var response = {
                        jumpto: page,
                        completed: false,
                        offline: true
                    },
                    changePage = 0;

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

                return self.getPageItemsWithValues(feedbackId, page, true, false, siteId).then(function(resp) {
                    // Check completion.
                    if (changePage == 1 && !resp.hasnextpage) {
                        response.completed = true;
                        return response;
                    }
                    return getPageJumpTo(feedbackId, page + changePage, changePage, siteId).then(function(loadPage) {
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
        }

        // Convenience functio to get the page we can jump.
        function getPageJumpTo(feedbackId, page, changePage, siteId) {
            return self.getPageItemsWithValues(feedbackId, page, true, false, siteId).then(function(resp) {
                // The page we are going has items.
                if (resp.items.length > 0) {
                    return page;
                }

                // Check we can jump futher.
                if ((changePage == 1 && resp.hasnextpage) || (changePage == -1 && resp.hasprevpage)) {
                    return getPageJumpTo(feedbackId, page + changePage, changePage, siteId);
                }

                // Completed or first page.
                return false;
            });
        }
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
     * @param   {Boolean}   goPrevious      Whether we want to jump to previous page.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.processPageOnline = function(feedbackId, page, responses, goPrevious, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId,
                    page: page,
                    responses: $mmUtil.objectToArrayOfObjects(responses, 'name', 'value'),
                    goprevious: goPrevious ? 1 : 0
                };

            return site.write('mod_feedback_process_page', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(response) {
                // Invalidate and update current values because they will change.
                return self.invalidateCurrentValuesData(feedbackId, site.getId()).then(function() {
                    return self.getCurrentValues(feedbackId, false, false, site.getId());
                }).catch(function() {
                    // Ignore errors.
                }).then(function() {
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
     * Returns the feedback user responses.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getResponsesAnalysis
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {Number}    page            The page of records to return.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getResponsesAnalysis = function(feedbackId, groupId, page, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId,
                    groupid: groupId || 0,
                    page: page || 0
                },
                preSets = {
                    cacheKey: getResponsesAnalysisDataCacheKey(feedbackId, groupId)
                };

            return site.read('mod_feedback_get_responses_analysis', params, preSets);
        });
    };

    /**
     * Returns all the feedback user responses.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getAllResponsesAnalysis
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Object}    [previous]      Only for recurrent use. Object with the previous fetched info.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getAllResponsesAnalysis = function(feedbackId, groupId, siteId, previous) {
        siteId = siteId || $mmSite.getId();
        if (typeof previous == "undefined") {
            previous = {
                page: 0,
                attempts: [],
                anonattempts: []
            };
        }

        return self.getResponsesAnalysis(feedbackId, groupId, previous.page, siteId).then(function(responses) {
            if (previous.anonattempts.length < responses.totalanonattempts) {
                previous.anonattempts = previous.anonattempts.concat(responses.anonattempts);
            }

            if (previous.attempts.length < responses.totalattempts) {
                previous.attempts = previous.attempts.concat(responses.attempts);
            }

            if (previous.anonattempts.length < responses.totalanonattempts || previous.attempts.length < responses.totalattempts) {
                // Can load more.
                previous.page++;
                return self.getAllResponsesAnalysis(feedbackId, groupId, siteId, previous);
            }

            previous.totalattempts = responses.totalattempts;
            previous.totalanonattempts = responses.totalanonattempts;
            return previous;
        });
    };

    /**
     * Find an attemp in all responses analysis.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getAttempt
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    attemptId       Attempt id to find.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Object}    [previous]      Only for recurrent use. Object with the previous fetched info.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getAttempt = function(feedbackId, attemptId, siteId, previous) {
        siteId = siteId || $mmSite.getId();
        if (typeof previous == "undefined") {
            previous = {
                page: 0,
                attemptsLoaded: 0,
                anonAttemptsLoaded: 0
            };
        }

        return self.getResponsesAnalysis(feedbackId, 0, previous.page, siteId).then(function(responses) {
            for (var x in responses.attempts) {
                if (responses.attempts[x].id == attemptId) {
                    // Found, return.
                    return responses.attempts[x];
                }
            }

            for (var y in responses.anonattempts) {
                if (responses.anonattempts[y].id == attemptId) {
                    // Found, return.
                    return responses.anonattempts[y];
                }
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
                return self.getAttempt(feedbackId, attemptId, siteId, previous);
            }

            // Not found and all loaded. Reject.
            return $q.reject();
        });
    };

    /**
     * Invalidates feedback user responses record data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateResponsesAnalysisData
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateResponsesAnalysisData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getResponsesAnalysisDataPrefixCacheKey(feedbackId));

        });
    };


    /**
     * Retrieves a list of students who didn't submit the feedback.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getNonRespondents
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {Number}    page            The page of records to return.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getNonRespondents = function(feedbackId, groupId, page, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId,
                    groupid: groupId || 0,
                    page: page || 0
                },
                preSets = {
                    cacheKey: getNonRespondentsDataCacheKey(feedbackId, groupId)
                };

            return site.read('mod_feedback_get_non_respondents', params, preSets);
        });
    };

    /**
     * Returns all the feedback non respondents users.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getAllNonRespondents
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Object}    [previous]      Only for recurrent use. Object with the previous fetched info.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getAllNonRespondents = function(feedbackId, groupId, siteId, previous) {
        siteId = siteId || $mmSite.getId();
        if (typeof previous == "undefined") {
            previous = {
                page: 0,
                users: []
            };
        }

        return self.getNonRespondents(feedbackId, groupId, previous.page, siteId).then(function(response) {
            if (previous.users.length < response.total) {
                previous.users = previous.users.concat(response.users);
            }

            if (previous.users.length < response.total) {
                // Can load more.
                previous.page++;
                return self.getAllNonRespondents(feedbackId, groupId, siteId, previous);
            }

            previous.total = response.total;
            return previous;
        });
    };

    /**
     * Invalidates feedback non respondents record data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateNonRespondentsData
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateNonRespondentsData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getNonRespondentsDataPrefixCacheKey(feedbackId));

        });
    };

    /**
     * Returns the temporary completion timemodified for the current user.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#getCurrentCompletedTimeModified
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getCurrentCompletedTimeModified = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: getCurrentCompletedTimeModifiedDataCacheKey(feedbackId)
                };

            return site.read('mod_feedback_get_current_completed_tmp', params, preSets).then(function(response) {
                if (response && typeof response.feedback != "undefined" && typeof response.feedback.timemodified != "undefined") {
                    return response.feedback.timemodified;
                }
                return 0;
            }).catch(function() {
                // Ignore errors.
                return 0;
            });
        });
    };

    /**
     * Invalidates temporary completion timemodified data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateCurrentCompletedInfoData
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidategetCurrentCompletedTimeModifiedData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCurrentCompletedTimeModifiedDataCacheKey(feedbackId));
        });
    };

    /**
     * Returns if feedback has been completed
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#isCompleted
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.isCompleted = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    feedbackid: feedbackId
                },
                preSets = {
                    cacheKey: getCompletedDataCacheKey(feedbackId)
                };

            return $mmUtil.promiseWorks(site.read('mod_feedback_get_last_completed', params, preSets));
        });
    };

    /**
     * Invalidates temporary completion timemodified data.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateCurrentCompletedInfoData
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCompletedData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCompletedDataCacheKey(feedbackId));
        });
    };

    /**
     * Invalidates feedback data except files and module info.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedback#invalidateFeedbackWSData
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateFeedbackWSData = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getFeedbackDataPrefixCacheKey(feedbackId));

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
            ps.push(self.invalidateFeedbackWSData(feedback.id, siteId));

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
     * @param  {String}  id           Feedback ID.
     * @param  {Boolean} [formViewed] True if form was viewed.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved when the WS call is successful.
     */
    self.logView = function(id, formViewed, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                feedbackid: id,
                moduleviewed: formViewed ? 1 : 0
            };
            return site.write('mod_feedback_view_feedback', params);
        });
    };

    return self;
});
