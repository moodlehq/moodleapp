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

.constant('mmaModQuizSynchronizationStore', 'mod_quiz_sync')

.config(function($mmSitesFactoryProvider, mmaModQuizSynchronizationStore) {
    var stores = [
        {
            name: mmaModQuizSynchronizationStore,
            keyPath: 'quizid',
            indexes: []
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Quiz synchronization service.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizSync
 */
.factory('$mmaModQuizSync', function($log, $mmaModQuiz, $mmSite, $mmSitesManager, $q, $mmaModQuizOffline, $mmQuestion,
            mmaModQuizSynchronizationStore) {

    $log = $log.getInstance('$mmaModQuizSync');

    var self = {},
        syncPromises = {}; // Store sync promises.

    /**
     * Get the synchronization time of a quiz. Returns 0 if no time stored.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#getQuizSyncTime
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the time.
     */
    self.getQuizSyncTime = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            return db.get(mmaModQuizSynchronizationStore, quizId).then(function(entry) {
                return entry.time;
            }).catch(function() {
                return 0;
            });
        });
    };

    /**
     * Get the synchronization time of a quiz. Returns 0 if no time stored.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#setQuizSyncTime
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [time]   Time to set. If not defined, current time.
     * @return {Promise}        Promise resolved with the time.
     */
    self.setQuizSyncTime = function(quizId, siteId, time) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            if (typeof time == 'undefined') {
                time = new Date().getTime();
            }
            return db.insert(mmaModQuizSynchronizationStore, {quizid: quizId, time: time});
        });
    };

    /**
     * Try to synchronize a quiz.
     * The promise returned will be resolved with an array with warnings if the synchronization is successful.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#syncQuiz
     * @param  {Object} quiz     Quiz.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         [description]
     */
    self.syncQuiz = function(quiz, siteId) {
        siteId = siteId || $mmSite.getId();

        var warnings = [],
            syncPromise,
            courseId = quiz.course,
            deleted = false,
            offlineAttempt,
            onlineAttempt,
            preflightData = {
                confirmdatasaved: 1
            };

        if (syncPromises[siteId] && syncPromises[siteId][quiz.id]) {
            // There's already a sync ongoing for this quiz, return the promise.
            return syncPromises[siteId][quiz.id];
        } else if (!syncPromises[siteId]) {
            syncPromises[siteId] = {};
        }

        // Verify that quiz isn't blocked.
        if ($mmaModQuiz.isQuizBlocked(siteId, quiz.id)) {
            $log.debug('Cannot sync quiz ' + quiz.id + ' because it is blocked.');
            return $q.reject();
        }

        $log.debug('Try to sync quiz ' + quiz.id + ' in site ' + siteId);

        // Remove offline data if needed, prefetch quiz data, set sync time and return warnings.
        function finishSync(attemptId, removeAttempt) {
            return $mmaModQuiz.invalidateAllQuizData(quiz.id, courseId, attemptId, siteId).catch(function() {}).then(function() {
                if (removeAttempt && offlineAttempt) {
                    return $mmaModQuizOffline.removeAttemptAndAnswers(offlineAttempt.id, siteId);
                }
            }).then(function() {
                return $mmaModQuiz.prefetchQuizAndLastAttempt(quiz, siteId);
            }).then(function() {
                return self.setQuizSyncTime(quiz.id, siteId).catch(function() {
                    // Ignore errors.
                });
            }).then(function() {
                return warnings; // No offline attempts, nothing to sync.
            });
        }

        syncPromise = $mmaModQuizOffline.getQuizAttempts(quiz.id, siteId).then(function(attempts) {
            // Should return 0 or 1 attempt.
            if (!attempts.length) {
                return finishSync();
            }

            offlineAttempt = attempts.pop();

            // Now get the list of online attempts to make sure this attempt exists and isn't finished.
            return $mmaModQuiz.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then(function(attempts) {
                var lastAttemptId = attempts.length ? attempts[attempts.length - 1].id : undefined;

                // Search the attempt we retrieved from offline.
                angular.forEach(attempts, function(attempt) {
                    if (attempt.id == offlineAttempt.id) {
                        onlineAttempt = attempt;
                    }
                });

                if (!onlineAttempt || $mmaModQuiz.isAttemptFinished(onlineAttempt)) {
                    // Attempt not found or it's finished in online. Discard it.
                    return finishSync(lastAttemptId, true);
                }

                // Get the data stored in offline.
                return $mmaModQuizOffline.getAttemptAnswers(offlineAttempt.id, siteId).then(function(answers) {
                    var offlineQuestions,
                        pages;

                    if (!answers.length) {
                        // No answers stored, finish..
                        return finishSync(lastAttemptId, true);
                    }

                    answers = $mmQuestion.convertAnswersArrayToObject(answers);
                    offlineQuestions = $mmaModQuizOffline.classifyAnswersInQuestions(answers);

                    // Now get the online questions data.
                    pages = $mmaModQuiz.getPagesFromLayoutAndQuestions(onlineAttempt.layout, offlineQuestions);

                    return $mmaModQuiz.getAllQuestionsData(onlineAttempt, preflightData, pages, false, true, siteId)
                            .then(function(onlineQuestions) {
                        // @todo Compare questions and send the offline data if can send.
                    });
                });
            });
        }).finally(function() {
            deleted = true;
            delete syncPromises[siteId][quiz.id];
        });

        if (!deleted) {
            syncPromises[siteId][quiz.id] = syncPromise;
        }
        return syncPromise;
    };

    return self;
});
