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
.factory('$mmaModSurvey', function($q, $mmSite, $translate, $mmSitesManager, $mmFilepool, $mmApp, $mmaModSurveyOffline, $mmUtil,
            mmaModSurveyComponent) {
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
     * Get a survey with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String} siteId    Site ID.
     * @param  {Number} courseId  Course ID.
     * @param  {String} key       Name of the property to check.
     * @param  {Mixed} value      Value to search.
     * @return {Promise}          Promise resolved when the survey is retrieved.
     */
    function getSurvey(siteId, courseId, key, value) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getSurveyDataCacheKey(courseId)
                };

            return site.read('mod_survey_get_surveys_by_courses', params, preSets).then(function(response) {
                if (response && response.surveys) {
                    var currentSurvey;
                    angular.forEach(response.surveys, function(survey) {
                        if (!currentSurvey && survey[key] == value) {
                            currentSurvey = survey;
                        }
                    });
                    if (currentSurvey) {
                        return currentSurvey;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a survey by course module ID.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#getSurvey
     * @param {Number} courseId Course ID.
     * @param {Number} cmId     Course module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the survey is retrieved.
     */
    self.getSurvey = function(courseId, cmId, siteId) {
        siteId = siteId || $mmSite.getId();
        return getSurvey(siteId, courseId, 'coursemodule', cmId);
    };

    /**
     * Get a survey by ID.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#getSurveyById
     * @param {Number} courseId  Course ID.
     * @param {Number} id        Survey ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the survey is retrieved.
     */
    self.getSurveyById = function(courseId, id, siteId) {
        siteId = siteId || $mmSite.getId();
        return getSurvey(siteId, courseId, 'id', id);
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
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        var promises = [],
            siteId = $mmSite.getId();

        promises.push(self.getSurvey(courseId, moduleId).then(function(survey) {
            var ps = [];
            // Do not invalidate wiki data before getting wiki info, we need it!
            ps.push(self.invalidateSurveyData(courseId));
            ps.push(self.invalidateQuestions(survey.id));

            return $q.all(ps);
        }));

        promises.push($mmFilepool.invalidateFilesByComponent(siteId, mmaModSurveyComponent, moduleId));

        return $q.all(promises);
    };

    /**
     * Invalidates survey questions.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#invalidateQuestions
     * @param {Number} id Survey ID.
     * @return {Promise}  Promise resolved when the data is invalidated.
     */
    self.invalidateQuestions = function(id) {
        return $mmSite.invalidateWsCacheForKey(getQuestionsCacheKey(id));
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
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the survey WS are available.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_survey_get_questions') &&
                    site.wsAvailable('mod_survey_get_surveys_by_courses') &&
                    site.wsAvailable('mod_survey_submit_answers');
        });
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
     * Send survey answers. If cannot send them to Moodle, they'll be stored in offline to be sent later.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#submitAnswers
     * @param  {Number} surveyId  Survey ID.
     * @param  {String} name      Survey name.
     * @param  {Number} courseId  Course ID the survey belongs to.
     * @param  {Object[]} answers Answers.
     * @return {Promise}          Promise resolved with boolean if success: true if answers were sent to server,
     *                            false if stored in device.
     */
    self.submitAnswers = function(surveyId, name, courseId, answers, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!$mmApp.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        // If there's already answers to be sent to the server, discard it first.
        return $mmaModSurveyOffline.deleteSurveyAnswers(surveyId, siteId).then(function() {
            // Device is online, try to send them to server.
            return self.submitAnswersOnline(surveyId, answers, siteId).then(function() {
                return true;
            }).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means that answers cannot be submitted.
                    return $q.reject(error.error);
                } else {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                }
            });
        });

        // Convenience function to store a message to be synchronized later.
        function storeOffline() {
            return $mmaModSurveyOffline.saveAnswers(surveyId, name, courseId, answers, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Send survey answers to Moodle.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurvey#submitAnswersOnline
     * @param  {Number} surveyId  Survey ID.
     * @param  {Object[]} answers Answers.
     * @return {Promise}          Promise resolved when answers are successfully submitted. Rejected with object containing
     *                            the error message (if any) and a boolean indicating if the error was returned by WS.
     */
    self.submitAnswersOnline = function(surveyId, answers, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                surveyid: surveyId,
                answers: answers
            };
            return site.write('mod_survey_submit_answers', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(response) {
                if (!response.status) {
                    return $q.reject({
                        wserror: true
                    });
                }
            });
        });
    };

    return self;
});
