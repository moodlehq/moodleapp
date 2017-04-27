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

angular.module('mm.addons.mod_choice')

/**
 * Choice service.
 *
 * @module mm.addons.mod_choice
 * @ngdoc service
 * @name $mmaModChoice
 */
.factory('$mmaModChoice', function($q, $mmSite, $mmSitesManager, mmaModChoiceResultsAfterAnswer, mmaModChoiceResultsAfterClose,
            mmaModChoiceResultsAlways, mmaModChoiceComponent, $mmFilepool, $mmApp, $mmaModChoiceOffline, $mmUtil) {
    var self = {};

    /**
     * Check if results can be seen by a student. The student can see the results if:
     *     - they're always published, OR
     *     - they're published after the choice is closed and it's closed, OR
     *     - they're published after answering and the user has answered.
     *
     * @param {Object}  choice      Choice to check.
     * @param {Boolean} hasAnswered True if user has answered the choice, false otherwise.
     * @return {Boolean} [description]
     */
    self.canStudentSeeResults = function(choice, hasAnswered) {
        var now = new Date().getTime();
        return  choice.showresults === mmaModChoiceResultsAlways ||
                choice.showresults === mmaModChoiceResultsAfterClose && choice.timeclose !== 0 && choice.timeclose <= now ||
                choice.showresults === mmaModChoiceResultsAfterAnswer && hasAnswered;
    };

    /**
     * Delete responses from a choice.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#deleteResponses
     * @param {Number}   choiceId    Choice ID.
     * @param {String}   name        Choice name.
     * @param {Number}   courseId    Course ID the choice belongs to.
     * @param {Number[]} [responses] IDs of the answers. If not defined, delete all the answers of the current user.
     * @param {String}   [siteId]    Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when the options are deleted.
     */
    self.deleteResponses = function(choiceId, name, courseId, responses, siteId) {
        siteId = siteId || $mmSite.getId();
        responses = responses || [];

        if (!$mmApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        return $mmaModChoiceOffline.deleteResponse(choiceId, siteId).then(function() {
            return self.deleteResponsesOnline(choiceId, responses, siteId).then(function() {
                return true;
            }).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means that responses cannot be deleted.
                    return $q.reject(error.error);
                } else {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                }
            });
        });

        // Convenience function to store a message to be synchronized later.
        function storeOffline() {
            return $mmaModChoiceOffline.saveResponse(choiceId, name, courseId, responses, true, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Delete responses from a choice. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#deleteResponsesOnline
     * @param {Number}   choiceId    Choice ID.
     * @param {Number[]} [responses] IDs of the answers. If not defined, delete all the answers of the current user.
     * @param  {String}  [siteId]    Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when responses are successfully deleted.
     */
    self.deleteResponsesOnline = function(choiceId, responses, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                choiceid: choiceId,
                responses: responses
            };

            return site.write('mod_choice_delete_choice_responses', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(response) {
                // Other errors ocurring.
                if (!response || response.status === false) {
                    return $q.reject({
                        wserror: true
                    });
                }
                // Invalidate related data.
                var promises = [
                    self.invalidateOptions(choiceId, siteId),
                    self.invalidateResults(choiceId, siteId)
                ];
                return $q.all(promises).catch(function() {
                    // Ignore errors.
                });
            });
        });
    };

    /**
     * Get cache key for choice data WS calls.
     *
     * @param {Number} courseid Course ID.
     * @return {String}         Cache key.
     */
    function getChoiceDataCacheKey(courseid) {
        return 'mmaModChoice:choice:' + courseid;
    }

    /**
     * Get cache key for choice options WS calls.
     *
     * @param {Number} choiceid Choice ID.
     * @return {String}     Cache key.
     */
    function getChoiceOptionsCacheKey(choiceid) {
        return 'mmaModChoice:options:' + choiceid;
    }

    /**
     * Get cache key for choice results WS calls.
     *
     * @param {Number} choiceid Choice ID.
     * @return {String}     Cache key.
     */
    function getChoiceResultsCacheKey(choiceid) {
        return 'mmaModChoice:results:' + choiceid;
    }

    /**
     * Returns if current site supports deleting choice responses.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#isDeleteResponsesEnabled
     * @return {Boolean} True if supported, false otherwise.
     */
    self.isDeleteResponsesEnabled = function() {
        return $mmSite.wsAvailable('mod_choice_delete_choice_responses');
    };

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the choice WS are available.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_choice_get_choice_options') &&
                    site.wsAvailable('mod_choice_get_choice_results') &&
                    site.wsAvailable('mod_choice_get_choices_by_courses') &&
                    site.wsAvailable('mod_choice_submit_choice_response');
        });
    };

    /**
     * Get a choice with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String}     siteId          Site ID.
     * @param  {Number}     courseId        Course ID.
     * @param  {String}     key             Name of the property to check.
     * @param  {Mixed}      value           Value to search.
     * @param  {Boolean}    [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}                    Promise resolved when the choice is retrieved.
     */
    function getChoice(siteId, courseId, key, value, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getChoiceDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_choice_get_choices_by_courses', params, preSets).then(function(response) {
                if (response && response.choices) {
                    var currentChoice;
                    angular.forEach(response.choices, function(choice) {
                        if (!currentChoice && choice[key] == value) {
                            currentChoice = choice;
                        }
                    });
                    if (currentChoice) {
                        return currentChoice;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a choice by course module ID.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#getChoice
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    cmId            Course module ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the choice is retrieved.
     */
    self.getChoice = function(courseId, cmId, siteId, forceCache) {
        siteId = siteId || $mmSite.getId();
        return getChoice(siteId, courseId, 'coursemodule', cmId, forceCache);
    };

    /**
     * Get a choice by ID.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#getChoiceById
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    id              Choice ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the choice is retrieved.
     */
    self.getChoiceById = function(courseId, id, siteId, forceCache) {
        siteId = siteId || $mmSite.getId();
        return getChoice(siteId, courseId, 'id', id, forceCache);
    };

    /**
     * Get a choice options.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#getOptions
     * @param {Number} choiceid Choice ID.
     * @return {Promise}        Promise resolved with choice options.
     */
    self.getOptions = function(choiceid) {
        var params = {
                choiceid: choiceid
            },
            preSets = {
                cacheKey: getChoiceOptionsCacheKey(choiceid)
            };

        return $mmSite.read('mod_choice_get_choice_options', params, preSets).then(function(response) {
            if (response.options) {
                return response.options;
            }
            return $q.reject();
        });
    };

    /**
     * Get a choice results.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#getResults
     * @param {Number} choiceid Choice ID.
     * @return {Promise}        Promise resolved with choice results.
     */
    self.getResults = function(choiceid) {
        var params = {
                choiceid: choiceid
            },
            preSets = {
                cacheKey: getChoiceResultsCacheKey(choiceid)
            };

        return $mmSite.read('mod_choice_get_choice_results', params, preSets).then(function(response) {
            if (response.options) {
                return response.options;
            }
            return $q.reject();
        });
    };

    /**
     * Invalidates choice data.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#invalidateChoiceData
     * @param {Number} courseid Course ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateChoiceData = function(courseid) {
        return $mmSite.invalidateWsCacheForKey(getChoiceDataCacheKey(courseid));
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        var promises = [],
            siteId = $mmSite.getId();

        promises.push(self.getChoice(courseId, moduleId).then(function(choice) {
            var ps = [];
            ps.push(self.invalidateChoiceData(courseId));
            ps.push(self.invalidateOptions(choice.id));
            ps.push(self.invalidateResults(choice.id));

            return $q.all(ps);
        }));

        promises.push($mmFilepool.invalidateFilesByComponent(siteId, mmaModChoiceComponent, moduleId));

        return $q.all(promises);
    };

    /**
     * Invalidates options.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#invalidateOptions
     * @param {Number} choiceId     Choice ID.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateOptions = function(choiceId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getChoiceOptionsCacheKey(choiceId));
        });
    };

    /**
     * Invalidates results.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#invalidateResults
     * @param {Number} choiceId     Choice ID.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateResults = function(choiceId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getChoiceResultsCacheKey(choiceId));
        });
    };

    /**
     * Report the choice as being viewed.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#logView
     * @param {String} id Choice ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                choiceid: id
            };
            return $mmSite.write('mod_choice_view_choice', params);
        }
        return $q.reject();
    };

    /**
     * Send a response to a choice to Moodle.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#submitResponse
     * @param  {Number}   choiceId  Choice ID.
     * @param  {String}   name      Choice name.
     * @param  {Number}   courseId  Course ID the choice belongs to.
     * @param  {Number[]} responses IDs of selected options.
     * @param  {String}   [siteId]  Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with boolean: true if response was sent to server, false if stored in device.
     */
    self.submitResponse = function(choiceId, name, courseId, responses, siteId) {
        siteId = siteId || $mmSite.getId();
        if (!$mmApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        return $mmaModChoiceOffline.deleteResponse(choiceId, siteId).then(function() {
            return self.submitResponseOnline(choiceId, responses, siteId).then(function() {
                return true;
            }).catch(function(error) {
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
            return $mmaModChoiceOffline.saveResponse(choiceId, name, courseId, responses, false, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Send a response to a choice to Moodle. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#submitResponseOnline
     * @param  {Number}   choiceId  Choice ID.
     * @param  {Number[]} responses IDs of selected options.
     * @param  {String}   [siteId]  Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when responses are successfully submitted.
     */
    self.submitResponseOnline = function(choiceId, responses, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                choiceid: choiceId,
                responses: responses
            };

            return site.write('mod_choice_submit_choice_response', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function() {
                // Invalidate related data.
                var promises = [
                    self.invalidateOptions(choiceId, siteId),
                    self.invalidateResults(choiceId, siteId)
                ];
                return $q.all(promises).catch(function() {
                    // Ignore errors.
                });
            });
        });
    };

    return self;
});
