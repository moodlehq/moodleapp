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
.factory('$mmaModChoice', function($q, $mmSite, mmaModChoiceResultsAfterAnswer, mmaModChoiceResultsAfterClose,
            mmaModChoiceResultsAlways) {
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
     * @param {Number} choiceid      Choice ID.
     * @param {Number[]} [responses] IDs of the answers. If not defined, delete all the answers of the current user.
     * @return {Promise}             Promise resolved when the options are deleted.
     */
    self.deleteResponses = function(choiceid, responses) {
        responses = responses || [];
        var params = {
            choiceid: choiceid,
            responses: responses
        };
        return $mmSite.write('mod_choice_delete_choice_responses', params).then(function(response) {
            if (!response || response.status === false) {
                return $q.reject();
            }
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
     * Return whether or not the plugin is enabled. Plugin is enabled if the choice WS are available.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return  $mmSite.wsAvailable('mod_choice_get_choice_options') &&
                $mmSite.wsAvailable('mod_choice_get_choice_results') &&
                $mmSite.wsAvailable('mod_choice_get_choices_by_courses') &&
                $mmSite.wsAvailable('mod_choice_submit_choice_response');
    };

    /**
     * Get a choice.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#getChoice
     * @param {Number} courseid Course ID.
     * @param {Number} cmid     Course module ID.
     * @return {Promise}        Promise resolved when the choice is retrieved.
     */
    self.getChoice = function(courseid, cmid) {
        var params = {
                courseids: [courseid]
            },
            preSets = {
                cacheKey: getChoiceDataCacheKey(courseid)
            };

        return $mmSite.read('mod_choice_get_choices_by_courses', params, preSets).then(function(response) {
            if (response.choices) {
                var currentChoice;
                angular.forEach(response.choices, function(choice) {
                    if (choice.coursemodule == cmid) {
                        currentChoice = choice;
                    }
                });
                if (currentChoice) {
                    return currentChoice;
                }
            }
            return $q.reject();
        });
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
     * Invalidates options.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#invalidateOptions
     * @param {Number} choiceid Choice ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateOptions = function(choiceid) {
        return $mmSite.invalidateWsCacheForKey(getChoiceOptionsCacheKey(choiceid));
    };

    /**
     * Invalidates results.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoice#invalidateResults
     * @param {Number} choiceid Choice ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateResults = function(choiceid) {
        return $mmSite.invalidateWsCacheForKey(getChoiceResultsCacheKey(choiceid));
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
     * @param {Number} choiceid    Choice ID.
     * @param {Number[]} responses IDs of selected options.
     * @return {Promise}           Promise resolved when results are successfully submitted.
     */
    self.submitResponse = function(choiceid, responses) {
        var params = {
            choiceid: choiceid,
            responses: responses
        };
        return $mmSite.write('mod_choice_submit_choice_response', params);
    };

    return self;
});
