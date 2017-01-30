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

angular.module('mm.core.question')

.constant('mmQuestionStore', 'questions')
.constant('mmQuestionAnswersStore', 'question_answers')

.config(function($mmSitesFactoryProvider, mmQuestionStore, mmQuestionAnswersStore) {
    var stores = [
        {
            name: mmQuestionStore,
            keyPath: ['component', 'attemptid', 'slot'],
            indexes: [
                {
                    name: 'userid'
                },
                {
                    name: 'component'
                },
                {
                    name: 'componentId'
                },
                {
                    name: 'attemptid'
                },
                {
                    name: 'slot'
                },
                {
                    name: 'state'
                },
                {
                    name: 'componentAndAttempt',
                    keyPath: ['component', 'attemptid']
                },
                {
                    name: 'componentAndComponentId',
                    keyPath: ['component', 'componentId']
                }
            ]
        },
        {
            name: mmQuestionAnswersStore,
            keyPath: ['component', 'attemptid', 'name'],
            indexes: [
                {
                    name: 'userid'
                },
                {
                    name: 'component'
                },
                {
                    name: 'componentId'
                },
                {
                    name: 'attemptid'
                },
                {
                    name: 'name'
                },
                {
                    name: 'questionslot'
                },
                {
                    name: 'componentAndAttempt',
                    keyPath: ['component', 'attemptid']
                },
                {
                    name: 'componentAndComponentId',
                    keyPath: ['component', 'componentId']
                },
                {
                    name: 'componentAndAttemptAndQuestion',
                    keyPath: ['component', 'attemptid', 'questionslot']
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Question service.
 *
 * @module mm.core.question
 * @ngdoc service
 * @name $mmQuestion
 */
.factory('$mmQuestion', function($log, $mmSite, $mmSitesManager, $mmUtil, $q, $mmQuestionDelegate, mmQuestionStore,
            mmQuestionAnswersStore) {

    $log = $log.getInstance('$mmQuestion');

    var self = {},
        questionPrefixRegex = /q\d+:(\d+)_/,
        states = {
            todo: {
                name: 'todo',
                class: 'mm-question-notyetanswered',
                status: 'notyetanswered',
                active: true,
                finished: false
            },
            invalid: {
                name: 'invalid',
                class: 'mm-question-invalidanswer',
                status: 'invalidanswer',
                active: true,
                finished: false
            },
            complete: {
                name: 'complete',
                class: 'mm-question-answersaved',
                status: 'answersaved',
                active: true,
                finished: false
            },
            needsgrading: {
                name: 'needsgrading',
                class: 'mm-question-requiresgrading',
                status: 'requiresgrading',
                active: false,
                finished: true
            },
            finished: {
                name: 'finished',
                class: 'mm-question-complete',
                status: 'complete',
                active: false,
                finished: true
            },
            gaveup: {
                name: 'gaveup',
                class: 'mm-question-notanswered',
                status: 'notanswered',
                active: false,
                finished: true
            },
            gradedwrong: {
                name: 'gradedwrong',
                class: 'mm-question-incorrect',
                status: 'incorrect',
                active: false,
                finished: true
            },
            gradedpartial: {
                name: 'gradedpartial',
                class: 'mm-question-partiallycorrect',
                status: 'partiallycorrect',
                active: false,
                finished: true
            },
            gradedright: {
                name: 'gradedright',
                class: 'mm-question-correct',
                status: 'correct',
                active: false,
                finished: true
            },
            mangrwrong: {
                name: 'mangrwrong',
                class: 'mm-question-incorrect',
                status: 'incorrect',
                active: false,
                finished: true
            },
            mangrpartial: {
                name: 'mangrpartial',
                class: 'mm-question-partiallycorrect',
                status: 'partiallycorrect',
                active: false,
                finished: true
            },
            mangrright: {
                name: 'mangrright',
                class: 'mm-question-correct',
                status: 'correct',
                active: false,
                finished: true
            },
            unknown: { // Special state for Mobile, sometimes we won't have enough data to detemrine the state.
                name: 'unknown',
                class: 'mm-question-unknown',
                status: 'unknown',
                active: true,
                finished: false
            }
        };

    /**
     * Compare that all the answers in two objects are equal, except sequencecheck.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#compareAllAnswers
     * @param  {Object} prevAnswers Previous answers.
     * @param  {Object} newAnswers  New answers.
     * @return {Boolean}            True if equal, false otherwise.
     */
    self.compareAllAnswers = function(prevAnswers, newAnswers) {
        // Get all the keys.
        var equal = true,
            keys = $mmUtil.mergeArraysWithoutDuplicates(Object.keys(prevAnswers), Object.keys(newAnswers));

        // Check that all the keys have the same value on both objects.
        angular.forEach(keys, function(key) {
            // Ignore extra answers like sequencecheck or certainty.
            if (!self.isExtraAnswer(key[0])) {
                if (!$mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, key)) {
                    equal = false;
                }
            }
        });

        return equal;
    };

    /**
     * Convert a list of answers retrieved from local DB to an object with name - value.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#convertAnswersArrayToObject
     * @param  {Object[]} answers     List of answers.
     * @param  {Boolean} removePrefix True if prefix should be removed, false otherwise.
     * @return {Object}               Object with name -> value.
     */
    self.convertAnswersArrayToObject = function(answers, removePrefix) {
        var result = {};
        angular.forEach(answers, function(answer) {
            if (removePrefix) {
                var nameWithoutPrefix = self.removeQuestionPrefix(answer.name);
                result[nameWithoutPrefix] = answer.value;
            } else {
                result[answer.name] = answer.value;
            }
        });
        return result;
    };

    /**
     * Retrieve an answer from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getAnswer
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} name      Answer's name.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the answers.
     */
    self.getAnswer = function(component, attemptId, name, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmQuestionAnswersStore, [component, attemptId, name]);
        });
    };

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getAttemptAnswers
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the answers.
     */
    self.getAttemptAnswers = function(component, attemptId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmQuestionAnswersStore, 'componentAndAttempt', [component, attemptId]);
        });
    };

    /**
     * Retrieve an attempt questions from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getAttemptQuestions
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the questions.
     */
    self.getAttemptQuestions = function(component, attemptId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmQuestionStore, 'componentAndAttempt', [component, attemptId]);
        });
    };

    /**
     * Get all the answers that aren't "extra" (sequencecheck, certainty, ...).
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getBasicAnswers
     * @param  {Object} answers List of answers.
     * @return {Object}         Basic answers.
     */
    self.getBasicAnswers = function(answers) {
        var result = {};
        angular.forEach(answers, function(value, name) {
            if (!self.isExtraAnswer(name)) {
                result[name] = value;
            }
        });
        return result;
    };

    /**
     * Retrieve a question from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getQuestion
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {Number} slot      Question slot.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the questions.
     */
    self.getQuestion = function(component, attemptId, slot, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmQuestionStore, [component, attemptId, slot]);
        });
    };

    /**
     * Retrieve a question answers from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getQuestionAnswers
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {Number} slot      Question slot.
     * @param  {Boolean} filter   True if it shouldn't return "extra" answers like sequencecheck or certainty.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the answers.
     */
    self.getQuestionAnswers = function(component, attemptId, slot, filter, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmQuestionAnswersStore, 'componentAndAttemptAndQuestion',
                        [component, attemptId, slot]).then(function(answers) {

                if (filter) {
                    // Get only answers that isn't "extra" data like sequencecheck or certainty.
                    var result = [];
                    angular.forEach(answers, function(answer) {
                        if (self.isExtraAnswer(answer.name)) {
                            result.push(answer);
                        }
                    });
                    return result;
                } else {
                    return answers;
                }
            });
        });
    };

    /**
     * Extract the question slot from a question name.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getQuestionSlotFromName
     * @param  {String} name Question name.
     * @return {Number}      Question slot.
     */
    self.getQuestionSlotFromName = function(name) {
        if (name) {
            var match = name.match(questionPrefixRegex);
            if (match && match[1]) {
                return parseInt(match[1], 10);
            }
        }

        return -1;
    };

    /**
     * Get question state based on state name.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getState
     * @param  {String} name State name.
     * @return {Object}      State.
     */
    self.getState = function(name) {
        return states[name];
    };

    /**
     * Check if a response is complete.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#isCompleteResponse
     * @param  {Object} answers Question answers (without prefix).
     * @return {Mixed}          True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        return $mmQuestionDelegate.isCompleteResponse(question, answers);
    };

    /**
     * Check if an answer is extra data like sequencecheck or certainty.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#isExtraAnswer
     * @param  {String}  name Answer name.
     * @return {Boolean}      True if extra data, false otherwise.
     */
    self.isExtraAnswer = function(name) {
        // Maybe the name still has the prefix.
        name = self.removeQuestionPrefix(name);
        return name[0] == '-' || name[0] == ':';
    };

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#isGradableResponse
     * @param  {Object} answers Question answers (without prefix).
     * @return {Mixed}          True if gradable, false if not gradable, -1 if cannot determine.
     */
    self.isGradableResponse = function(question, answers) {
        return $mmQuestionDelegate.isGradableResponse(question, answers);
    };

    /**
     * Check if two responses are the same.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#isSameResponse
     * @param  {Object} question    Question.
     * @param  {Object} prevAnswers Previous answers.
     * @param  {Object} newAnswers  New answers.
     * @return {Boolean}            True if same, false otherwise.
     */
    self.isSameResponse = function(question, prevAnswers, newAnswers) {
        return $mmQuestionDelegate.isSameResponse(question, prevAnswers, newAnswers);
    };

    /**
     * Remove an attempt answers from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#removeAttemptAnswers
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved when done.
     */
    self.removeAttemptAnswers = function(component, attemptId, siteId) {
        siteId = siteId || $mmSite.getId();

        return self.getAttemptAnswers(component, attemptId, siteId).then(function(answers) {
            var promises = [];
            angular.forEach(answers, function(answer) {
                promises.push(self.removeAnswer(component, attemptId, answer.name, siteId));
            });

            return $q.all(promises);
        });
    };

    /**
     * Remove an attempt questions from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#removeAttemptQuestions
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved when done.
     */
    self.removeAttemptQuestions = function(component, attemptId, siteId) {
        siteId = siteId || $mmSite.getId();

        return self.getAttemptQuestions(component, attemptId, siteId).then(function(questions) {
            var promises = [];
            angular.forEach(questions, function(question) {
                promises.push(self.removeQuestion(component, attemptId, question.slot, siteId));
            });

            return $q.all(promises);
        });
    };

    /**
     * Remove an answer from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#removeAnswer
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} name      Answer's name.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the answers.
     */
    self.removeAnswer = function(component, attemptId, name, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmQuestionAnswersStore, [component, attemptId, name]);
        });
    };

    /**
     * Remove a question from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#removeQuestion
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {Number} slot      Question slot.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the questions.
     */
    self.removeQuestion = function(component, attemptId, slot, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmQuestionStore, [component, attemptId, slot]);
        });
    };

    /**
     * Remove a question answers from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#removeQuestionAnswers
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {Number} slot      Question slot.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the questions.
     */
    self.removeQuestionAnswers = function(component, attemptId, slot, siteId) {
        return self.getQuestionAnswers(component, attemptId, slot, false, siteId).then(function(answers) {
            var promises = [];
            angular.forEach(answers, function(answer) {
                promises.push(self.removeAnswer(component, attemptId, answer.name, siteId));
            });

            return $q.all(promises);
        });
    };

    /**
     * Remove the prefix from a question answer name.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#removeQuestionPrefix
     * @param  {String} name Question name.
     * @return {String}      Name without prefix.
     */
    self.removeQuestionPrefix = function(name) {
        if (name) {
            return name.replace(questionPrefixRegex, '');
        }
        return '';
    };

    /**
     * Save answers in local DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#saveAnswers
     * @param  {String} component   Component the answers belong to. E.g. 'mmaModQuiz'.
     * @param  {Number} componentId ID of the component the answers belong to.
     * @param  {Number} attemptId   Attempt ID.
     * @param  {Number} userId      User ID.
     * @param  {Object} answers     Answers to save.
     * @param  {Number} [timemod]   Time modified to set in the questions. If not defined, current time.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved in success, rejected otherwise.
     */
    self.saveAnswers = function(component, componentId, attemptId, userId, answers, timemod, siteId) {
        siteId = siteId || $mmSite.getId();
        timemod = timemod || $mmUtil.timestamp();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                promises = [];

            angular.forEach(answers, function(value, name) {
                var entry = {
                    component: component,
                    componentId: componentId,
                    attemptid: attemptId,
                    userid: userId,
                    questionslot: self.getQuestionSlotFromName(name),
                    name: name,
                    value: value,
                    timemodified: timemod
                };
                promises.push(db.insert(mmQuestionAnswersStore, entry));
            });

            return $q.all(promises);
        });
    };

    /**
     * Save a question in local DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#saveQuestion
     * @param  {String} component   Component the question belongs to. E.g. 'mmaModQuiz'.
     * @param  {Number} componentId ID of the component the question belongs to.
     * @param  {Number} attemptId   Attempt ID.
     * @param  {Number} userId      User ID.
     * @param  {Object} question    Question.
     * @param  {String} state       Question state.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved in success, rejected otherwise.
     */
    self.saveQuestion = function(component, componentId, attemptId, userId, question, state, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var entry = {
                component: component,
                componentId: componentId,
                attemptid: attemptId,
                userid: userId,
                number: question.number,
                slot: question.slot,
                state: state
            };
            return site.getDb().insert(mmQuestionStore, entry);
        });
    };

    return self;
});
