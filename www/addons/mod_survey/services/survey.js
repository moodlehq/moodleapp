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

angular.module('mm.addons.mod_survey')

/**
 * Survey service.
 *
 * @module mm.addons.mod_survey
 * @ngdoc service
 * @name $mmaModSurvey
 */
.factory('$mmaModSurvey', function($q, $mmSite, $translate) {
    var self = {};

    /**
     * Turns a string with values separated by commas into an array.
     *
     * @param {String} value Value to convert.
     * @return {Array}       Array.
     */
    function commaStringToArray(value) {
        if (typeof value == 'string') {
            if (value !== '') {
                return value.split(',');
            } else {
                return [];
            }
        } else {
            return value;
        }
    }

    /**
     * Format a questions list, turning "multi" and "options" strings into arrays and adding the properties
     * 'num' and 'name'.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#formatQuestions
     * @param {Object[]} questions Questions.
     * @return {Promise}           Promise resolved with the formatted questions.
     */
    self.formatQuestions = function(questions) {
        var stringkeys = [
            'mma.mod_survey.ipreferthat',
            'mma.mod_survey.ifoundthat',
            'mm.core.choose'
        ];

        return $translate(stringkeys).then(function(translates) {
            var stripreferthat = translates[stringkeys[0]],
                strifoundthat = translates[stringkeys[1]],
                strchoose = translates[stringkeys[2]],
                formatted = [],
                parents = self.getParentQuestions(questions),
                num = 1;

            questions = angular.copy(questions); // Copy the array to prevent modifying the original.

            angular.forEach(questions, function(question) {
                var parent = parents[question.parent];

                // Turn multi and options into arrays.
                question.multi = commaStringToArray(question.multi);
                question.options = commaStringToArray(question.options);

                if (parent) {
                    // It's a sub-question.
                    question.required = true;

                    if (parent.type === 1 || parent.type === 2) {
                        // One answer question. Set its name and add it to the returned array.
                        question.name = 'q' + (parent.type == 2 ? 'P' : '') + question.id;
                        question.num = num++;
                    } else {
                        // Two answers per question (COLLES P&A). We'll add two questions.
                        var q2 = angular.copy(question);

                        question.text = stripreferthat + ' ' + question.text;
                        question.name = 'qP' + question.id;
                        question.num = num++;
                        formatted.push(question);

                        q2.text = strifoundthat + ' ' + q2.text;
                        q2.name = 'q' + question.id;
                        q2.num = num++;
                        formatted.push(q2);

                        return;
                    }
                } else if (question.multi && question.multi.length === 0) {
                    // It's a single question.
                    question.name = 'q' + question.id;
                    question.num = num++;
                    if (question.type > 0) { // Add "choose" option since this question is not required.
                        question.options.unshift(strchoose);
                    }
                }

                formatted.push(question);
            });

            return formatted;
        });
    };

    /**
     * Gets the parent questions and puts them in an object: ID -> question.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#getParentQuestions
     * @param {Object[]} questions Questions.
     * @return {Object}            Object with parent questions.
     */
    self.getParentQuestions = function(questions) {
        var parents = {};

        angular.forEach(questions, function(question) {
            if (question.parent === 0) {
                parents[question.id] = question;
            }
        });

        return parents;
    };

    /**
     * Get a survey's questions.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#getQuestions
     * @param {Number} id Survey ID.
     * @return {Promise}  Promise resolved when the questions are retrieved.
     */
    self.getQuestions = function(id) {
        var params = {
                surveyid: id
            },
            preSets = {
                cacheKey: getQuestionsCacheKey(id)
            };

        return $mmSite.read('mod_survey_get_questions', params, preSets).then(function(response) {
            if (response.questions) {
                return response.questions;
            }
            return $q.reject();
        });
    };

    /**
     * Get cache key for survey questions WS calls.
     *
     * @param {Number} id Survey ID.
     * @return {String}   Cache key.
     */
    function getQuestionsCacheKey(id) {
        return 'mmaModSurvey:questions:' + id;
    }

    /**
     * Get a survey.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#getSurvey
     * @param {Number} courseid Course ID.
     * @param {Number} cmid     Course module ID.
     * @return {Promise}        Promise resolved when the survey is retrieved.
     */
    self.getSurvey = function(courseid, cmid) {
        var params = {
                courseids: [courseid]
            },
            preSets = {
                cacheKey: getSurveyDataCacheKey(courseid)
            };

        return $mmSite.read('mod_survey_get_surveys_by_courses', params, preSets).then(function(response) {
            if (response.surveys) {
                var currentSurvey;
                angular.forEach(response.surveys, function(survey) {
                    if (survey.coursemodule == cmid) {
                        currentSurvey = survey;
                    }
                });
                if (currentSurvey) {
                    return currentSurvey;
                }
            }
            return $q.reject();
        });
    };

    /**
     * Get cache key for survey data WS calls.
     *
     * @param {Number} courseid Course ID.
     * @return {String}         Cache key.
     */
    function getSurveyDataCacheKey(courseid) {
        return 'mmaModSurvey:survey:' + courseid;
    }

    /**
     * Invalidates survey questions.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#invalidateQuestions
     * @param {Number} id Survey ID.
     * @return {Promise}  Promise resolved when the data is invalidated.
     */
    self.invalidateQuestions = function(courseid) {
        return $mmSite.invalidateWsCacheForKey(getQuestionsCacheKey(courseid));
    };

    /**
     * Invalidates survey data.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#invalidateSurveyData
     * @param {Number} courseid Course ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSurveyData = function(courseid) {
        return $mmSite.invalidateWsCacheForKey(getSurveyDataCacheKey(courseid));
    };

    /**
     * Return whether or not the plugin is enabled. Plugin is enabled if the survey WS are available.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return  $mmSite.wsAvailable('mod_survey_get_questions') &&
                $mmSite.wsAvailable('mod_survey_get_surveys_by_courses') &&
                $mmSite.wsAvailable('mod_survey_submit_answers');
    };

    /**
     * Report the survey as being viewed.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#logView
     * @param {String} id Survey ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                surveyid: id
            };
            return $mmSite.write('mod_survey_view_survey', params);
        }
        return $q.reject();
    };

    /**
     * Send survey answers to Moodle.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#submitAnswers
     * @param {Number} surveyid  urvey ID.
     * @param {Object[]} answers Answers.
     * @return {Promise}         Promise resolved when answers are successfully submitted.
     */
    self.submitAnswers = function(surveyid, answers) {
        var params = {
            surveyid: surveyid,
            answers: answers
        };
        return $mmSite.write('mod_survey_submit_answers', params);
    };

    return self;
});
