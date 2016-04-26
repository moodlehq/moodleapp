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
.factory('$mmaModQuizOffline', function($log, $mmSite, $mmSitesManager, $mmUtil, $q, $mmQuestion, mmaModQuizAttemptsStore,
            mmaModQuizComponent) {

    $log = $log.getInstance('$mmaModQuizOffline');

    var self = {};

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
     * Process an attempt, saving its data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOffline#processAttempt
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} data          Data to save.
     * @param  {Boolean} finish       True to finish the quiz, false otherwise.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved in success, rejected otherwise.
     */
    self.processAttempt = function(quiz, attempt, data, finish, siteId) {
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
            return $mmQuestion.saveAnswers(mmaModQuizComponent, quiz.id, attempt.id, attempt.userid, data, now, siteId);
        });
    };

    return self;
});
