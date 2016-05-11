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

angular.module('mm.addons.mod_quiz')
.constant('mmaModQuizAttemptsStore', 'mod_quiz_attempts')

.config(function($mmSitesFactoryProvider, mmaModQuizAttemptsStore) {
    var stores = [
        {
            name: mmaModQuizAttemptsStore,
            keyPath: 'id',
            indexes: [
                {
                    name: 'attempt' // Attempt number.
                },
                {
                    name: 'userid'
                },
                {
                    name: 'quizid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'timemodified'
                },
                {
                    name: 'finished'
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'quizAndUser',
                    generator: function(obj) {
                        return [obj.quizid, obj.userid];
                    }
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Quiz offline service.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizOffline
 */
.factory('$mmaModQuizOffline', function($log, $mmSite, $mmSitesManager, $mmUtil, $q, $mmQuestion, $mmQuestionBehaviourDelegate,
            $translate, mmaModQuizAttemptsStore, mmaModQuizComponent) {

    $log = $log.getInstance('$mmaModQuizOffline');

    var self = {};

    /**
     * Classify the answers in questions.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#classifyAnswersInQuestions
     * @param  {Object} answers List of answers.
     * @return {Object}         List of questions with answers.
     */
    self.classifyAnswersInQuestions = function(answers) {
        var questionsWithAnswers = {};

        // Classify the answers in each question.
        angular.forEach(answers, function(value, name) {
            var slot = $mmQuestion.getQuestionSlotFromName(name),
                nameWithoutPrefix = $mmQuestion.removeQuestionPrefix(name);

            if (!questionsWithAnswers[slot]) {
                questionsWithAnswers[slot] = {
                    answers: {},
                    prefix: name.substr(0, name.indexOf(nameWithoutPrefix))
                };
            }
            questionsWithAnswers[slot].answers[nameWithoutPrefix] = value;
        });

        return questionsWithAnswers;
    };

    /**
     * Given a list of questions with answers classified in it (@see $mmaModQuizOffline#classifyAnswersInQuestions),
     * returns a list of answers (including prefix in the name).
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#extractAnswersFromQuestions
     * @param  {Object} questions Questions.
     * @return {Object}           Answers.
     */
    self.extractAnswersFromQuestions = function(questions) {
        var answers = {};
        angular.forEach(questions, function(question) {
            angular.forEach(question.answers, function(value, name) {
                answers[question.prefix + name] = value;
            });
        });
        return answers;
    };

    /**
     * Get all the offline attempts in a certain site.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#getAllAttempts
     * @param {String} [siteId] Site ID. If not set, use current site.
     * @return {Promise}        Promise resolved when the offline attempts are retrieved.
     */
    self.getAllAttempts = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            if (!db) {
                return $q.reject();
            }

            return db.getAll(mmaModQuizAttemptsStore);
        });
    };

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#getAttemptAnswers
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the answers.
     */
    self.getAttemptAnswers = function(attemptId, siteId) {
        return $mmQuestion.getAttemptAnswers(mmaModQuizComponent, attemptId, siteId);
    };

    /**
     * Retrieve an attempt from site DB.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#getAttemptById
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the attempt.
     */
    self.getAttemptById = function(attemptId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModQuizAttemptsStore, attemptId);
        });
    };

    /**
     * Retrieve an attempt from site DB.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#getQuizAttempts
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @param  {Number} [userId]  User ID. If not defined, user current site's user.
     * @return {Promise}          Promise resolved with the attempt.
     */
    self.getQuizAttempts = function(quizId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().whereEqual(mmaModQuizAttemptsStore, 'quizAndUser', [quizId, userId]);
        });
    };

    /**
     * Load local state in the questions.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#loadQuestionsLocalStates
     * @param  {Number} attemptId   Attempt ID.
     * @param  {Object[]} questions Questions.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when done.
     */
    self.loadQuestionsLocalStates = function(attemptId, questions, siteId) {
        var promises = [];
        angular.forEach(questions, function(question) {
            promises.push($mmQuestion.getQuestion(mmaModQuizComponent, attemptId, question.slot, siteId).then(function(q) {
                var state = $mmQuestion.getState(q.state);
                question.state = q.state;
                question.status = $translate.instant('mm.question.' + state.status);
            }).catch(function() {
                // Question not found.
            }));
        });
        return $q.all(promises).then(function() {
            return questions;
        });
    };

    /**
     * Process an attempt, saving its data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#processAttempt
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} questions     Questions of the quiz. Keys should be question numbers.
     * @param  {Object} data          Data to save.
     * @param  {Boolean} finish       True to finish the quiz, false otherwise.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved in success, rejected otherwise.
     */
    self.processAttempt = function(quiz, attempt, questions, data, finish, siteId) {
        siteId = siteId || $mmSite.getId();

        var now = $mmUtil.timestamp(),
            db;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            db = site.getDb();

            // Check if an attempt already exists.
            return self.getAttemptById(attempt.id, siteId).catch(function() {
                // Attempt doesn't exist, create a new entry.
                return {
                    quizid: quiz.id,
                    userid: attempt.userid,
                    id: attempt.id,
                    courseid: quiz.course,
                    timecreated: now,
                    attempt: attempt.attempt,
                    currentpage: attempt.currentpage
                };
            });
        }).then(function(entry) {
            // Save attempt in DB.
            entry.timemodified = now;
            entry.finished = !!finish;

            return db.insert(mmaModQuizAttemptsStore, entry);
        }).then(function() {
            // Attempt has been saved, now we need to save the answers.
            return self.saveAnswers(quiz, attempt, questions, data, now, siteId);
        });
    };

    /**
     * Remove an attempt and its answers from local DB.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#removeAttemptAndAnswers
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved when finished.
     */
    self.removeAttemptAndAnswers = function(attemptId, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [];

        // Remove stored answers and questions.
        promises.push($mmQuestion.removeAttemptAnswers(mmaModQuizComponent, attemptId, siteId));
        promises.push($mmQuestion.removeAttemptQuestions(mmaModQuizComponent, attemptId, siteId));

        // Remove the attempt.
        promises.push($mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModQuizAttemptsStore, attemptId);
        }));

        return $q.all(promises);
    };

    /**
     * Remove a question and its answers from local DB.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#removeQuestionAndAnswers
     * @param  {Number} attemptId Attempt ID.
     * @param  {Number} slot      Question slot.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved when finished.
     */
    self.removeQuestionAndAnswers = function(attemptId, slot, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [];

        promises.push($mmQuestion.removeQuestion(mmaModQuizComponent, attemptId, slot, siteId));
        promises.push($mmQuestion.removeQuestionAnswers(mmaModQuizComponent, attemptId, slot, siteId));

        return $q.all(promises);
    };

    /**
     * Save an attempt's answers and calculate state for questions modified.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#saveAnswers
     * @param  {Object} quiz      Quiz.
     * @param  {Object} attempt   Attempt.
     * @param  {Object} questions Questions of the quiz. Keys should be question slots.
     * @param  {Object} answers   Answers to save.
     * @param  {Number} [timemod] Time modified to set in the answers. If not defined, current time.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved when done.
     */
    self.saveAnswers = function(quiz, attempt, questions, answers, timemod, siteId) {
        siteId = siteId || $mmSite.getId();
        timemod = timemod || $mmUtil.timestamp();

        var promises = [],
            questionsWithAnswers = {},
            newStates = {};

        // Classify the answers in each question.
        angular.forEach(answers, function(value, name) {
            var slot = $mmQuestion.getQuestionSlotFromName(name),
                nameWithoutPrefix = $mmQuestion.removeQuestionPrefix(name);

            if (questions[slot]) {
                if (!questionsWithAnswers[slot]) {
                    questionsWithAnswers[slot] = questions[slot];
                    questionsWithAnswers[slot].answers = {};
                }
                questionsWithAnswers[slot].answers[nameWithoutPrefix] = value;
            }
        });

        // First determine the new status of each question. We won't save the new state yet.
        angular.forEach(questionsWithAnswers, function(question) {
            promises.push($mmQuestionBehaviourDelegate.determineQuestionState(
                        quiz.preferredbehaviour, mmaModQuizComponent, attempt.id, question, siteId).then(function(state) {
                if (state) {
                    newStates[question.slot] = state.name;
                }
            }));
        });

        return $q.all(promises).then(function() {
            // Now save the answers.
            return $mmQuestion.saveAnswers(mmaModQuizComponent, quiz.id, attempt.id, attempt.userid, answers, timemod, siteId);
        }).then(function() {
            // Answers have been saved, now we can save the questions with the states.
            promises = [];
            angular.forEach(newStates, function(state, slot) {
                var question = questionsWithAnswers[slot];
                promises.push(
                    $mmQuestion.saveQuestion(mmaModQuizComponent, quiz.id, attempt.id, attempt.userid, question, state, siteId)
                );
            });
            return $mmUtil.allPromises(promises).catch(function() {
                // Ignore errors when saving question state.
                $log.error('Error saveQuestion');
            });
        });
    };

    /**
     * Set attempt's current page.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#setAttemptCurrentPage
     * @param  {Number} attemptId Attempt ID.
     * @param  {Number} page      Page to set.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved in success, rejected otherwise.
     */
    self.setAttemptCurrentPage = function(attemptId, page, siteId) {
        siteId = siteId || $mmSite.getId();
        var entry;

        // Check if an attempt already exists.
        return self.getAttemptById(attemptId, siteId).then(function(e) {
            entry = e;
            return $mmSitesManager.getSite(siteId);
        }).then(function(site) {
            // Save attempt in DB.
            entry.currentpage = page;
            return site.getDb().insert(mmaModQuizAttemptsStore, entry);
        });
    };

    return self;
});
