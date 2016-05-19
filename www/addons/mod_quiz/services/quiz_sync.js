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
.constant('mmaModQuizSynchronizationWarningsStore', 'mod_quiz_sync_warnings')

.config(function($mmSitesFactoryProvider, mmaModQuizSynchronizationStore, mmaModQuizSynchronizationWarningsStore) {
    var stores = [
        {
            name: mmaModQuizSynchronizationStore,
            keyPath: 'quizid',
            indexes: []
        },
        {
            name: mmaModQuizSynchronizationWarningsStore,
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
.factory('$mmaModQuizSync', function($log, $mmaModQuiz, $mmSite, $mmSitesManager, $q, $mmaModQuizOffline, $mmQuestion, $mmLang,
            $mmQuestionDelegate, $mmApp, $mmConfig, $mmEvents, $translate, mmaModQuizSynchronizationStore, mmaModQuizSyncTime,
            mmaModQuizEventAutomSynced, mmCoreSettingsSyncOnlyOnWifi, mmaModQuizSynchronizationWarningsStore) {

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
     * @return {Promise}         Promise resolved with the time.
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
     * Get the synchronization warnings of a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#getQuizSyncWarnings
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the time.
     */
    self.getQuizSyncWarnings = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            return db.get(mmaModQuizSynchronizationWarningsStore, quizId).then(function(entry) {
                return entry.warnings;
            }).catch(function() {
                return [];
            });
        });
    };

    /**
     * Check if a quiz has data to synchronize.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#hasDataToSync
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    self.hasDataToSync = function(quizId, siteId) {
        return $mmaModQuizOffline.getQuizAttempts(quizId, siteId).then(function(attempts) {
            return !!attempts.length;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Set the synchronization time for a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#setQuizSyncTime
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [time]   Time to set. If not defined, current time.
     * @return {Promise}         Promise resolved when done.
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
     * Set the synchronization warnings for a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#setQuizSyncWarnings
     * @param  {Number} quizId     Quiz ID.
     * @param  {String[]} warnings Warnings to set.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when done.
     */
    self.setQuizSyncWarnings = function(quizId, warnings, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            if (typeof warnings == 'undefined') {
                warnings = [];
            }
            return db.insert(mmaModQuizSynchronizationWarningsStore, {quizid: quizId, warnings: warnings});
        });
    };

    /**
     * Try to synchronize all quizzes from current site that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#syncAllQuizzes
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllQuizzes = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all quizzes because device is offline.');
            return $q.reject();
        }

        // We first check sync settings and current connection to see if we can sync.
        return $mmConfig.get(mmCoreSettingsSyncOnlyOnWifi, true).then(function(syncOnlyOnWifi) {

            if (syncOnlyOnWifi && $mmApp.isNetworkAccessLimited()) {
                $log.debug('Cannot sync all quizzes because device isn\'t using a WiFi network.');
                return $q.reject();
            }

            var promise;
            if (!siteId) {
                // No site ID defined, sync all sites.
                $log.debug('Try to sync quizzes in all sites.');
                promise = $mmSitesManager.getSitesIds();
            } else {
                $log.debug('Try to sync quizzes in site ' + siteId);
                promise = $q.when([siteId]);
            }

            return promise.then(function(siteIds) {
                var sitePromises = [];

                angular.forEach(siteIds, function(siteId) {
                    sitePromises.push($mmaModQuizOffline.getAllAttempts(siteId).then(function(attempts) {
                        var quizzes = [],
                            ids = [], // To prevent duplicates.
                            promises = [];

                        // Get the IDs of all the quizzes that have something to be synced.
                        angular.forEach(attempts, function(attempt) {
                            if (ids.indexOf(attempt.quizid) == -1) {
                                ids.push(attempt.quizid);
                                quizzes.push({
                                    id: attempt.quizid,
                                    courseid: attempt.courseid
                                });
                            }
                        });

                        // Sync all quizzes that haven't been synced for a while and that aren't played right now.
                        angular.forEach(quizzes, function(quiz) {
                            if (!$mmaModQuiz.isQuizBeingPlayed(quiz.id, siteId)) {
                                promises.push($mmaModQuiz.getQuizById(quiz.courseid, quiz.id, siteId).then(function(quiz) {
                                    return self.syncQuizIfNeeded(quiz, false, siteId).then(function(warnings) {
                                        if (warnings && warnings.length) {
                                            // Store the warnings to show them when the user opens the quiz.
                                            return self.setQuizSyncWarnings(quiz.id, warnings, siteId).then(function() {
                                                return warnings;
                                            });
                                        }
                                    }).then(function(warnings) {
                                        if (typeof warnings != 'undefined') {
                                            // We tried to sync. Send event.
                                            $mmEvents.trigger(mmaModQuizEventAutomSynced, {
                                                siteid: siteId,
                                                quizid: quiz.id
                                            });
                                        }
                                    });
                                }));
                            }
                        });

                        return $q.all(promises);
                    }));
                });

                return $q.all(sitePromises);
            });
        });
    };

    /**
     * Sync a quiz only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#syncQuizIfNeeded
     * @param {Object} quiz          Quiz.
     * @param {Boolean} askPreflight True if we should ask for preflight data if needed, false otherwise.
     * @param {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when the quiz is synced or if it doesn't need to be synced.
     */
    self.syncQuizIfNeeded = function(quiz, askPreflight, siteId) {
        siteId = siteId || $mmSite.getId();
        return self.getQuizSyncTime(quiz.id, siteId).then(function(time) {
            if (new Date().getTime() - mmaModQuizSyncTime >= time) {
                return self.syncQuiz(quiz, askPreflight, siteId);
            }
        });
    };

    /**
     * Try to synchronize a quiz.
     * The promise returned will be resolved with an array with warnings if the synchronization is successful.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#syncQuiz
     * @param  {Object} quiz         Quiz.
     * @param {Boolean} askPreflight True if we should ask for preflight data if needed, false otherwise.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}         [description]
     */
    self.syncQuiz = function(quiz, askPreflight, siteId) {
        siteId = siteId || $mmSite.getId();

        var warnings = [],
            syncPromise,
            courseId = quiz.course,
            deleted = false,
            offlineAttempt,
            onlineAttempt,
            preflightData = {};

        if (syncPromises[siteId] && syncPromises[siteId][quiz.id]) {
            // There's already a sync ongoing for this quiz, return the promise.
            return syncPromises[siteId][quiz.id];
        } else if (!syncPromises[siteId]) {
            syncPromises[siteId] = {};
        }

        // Verify that quiz isn't blocked.
        if ($mmaModQuiz.isQuizBlocked(siteId, quiz.id)) {
            $log.debug('Cannot sync quiz ' + quiz.id + ' because it is blocked.');
            return $mmLang.translateAndReject('mma.mod_quiz.errorsyncquizblocked');
        }

        $log.debug('Try to sync quiz ' + quiz.id + ' in site ' + siteId);

        // Remove offline data if needed, prefetch quiz data, set sync time and return warnings.
        function finishSync(attemptId, removeAttempt) {
            return $mmaModQuiz.invalidateAllQuizData(quiz.id, courseId, attemptId, siteId).catch(function() {}).then(function() {
                if (removeAttempt && offlineAttempt) {
                    return $mmaModQuizOffline.removeAttemptAndAnswers(offlineAttempt.id, siteId);
                }
            }).then(function() {
                // Update data.
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
                    warnings.push($translate.instant('mma.mod_quiz.warningattemptfinished'));
                    return finishSync(lastAttemptId, true);
                }

                // Get the data stored in offline.
                return $mmaModQuizOffline.getAttemptAnswers(offlineAttempt.id, siteId).then(function(answers) {
                    var offlineQuestions,
                        pages;

                    if (!answers.length) {
                        // No answers stored, finish.
                        return finishSync(lastAttemptId, true);
                    }

                    answers = $mmQuestion.convertAnswersArrayToObject(answers);
                    offlineQuestions = $mmaModQuizOffline.classifyAnswersInQuestions(answers);

                    // We're going to need preflightData, get it.
                    return $mmaModQuiz.getQuizAccessInformation(quiz.id, false, true, siteId).then(function(info) {
                        return $mmaModQuiz.gatherPreflightData(quiz, info, onlineAttempt,
                                                preflightData, siteId, askPreflight, 'mm.settings.synchronization');
                    }).then(function() {
                        // Now get the online questions data.
                        pages = $mmaModQuiz.getPagesFromLayoutAndQuestions(onlineAttempt.layout, offlineQuestions);

                        return $mmaModQuiz.getAllQuestionsData(onlineAttempt, preflightData, pages, false, true, siteId);
                    }).then(function(onlineQuestions) {
                        // Validate questions, discarding the offline answers that can't be synchronized.
                        return self.validateQuestions(onlineAttempt.id, onlineQuestions, offlineQuestions, siteId);
                    }).then(function(discardedData) {
                        // Get the answers to send.
                        var answers = $mmaModQuizOffline.extractAnswersFromQuestions(offlineQuestions),
                            finish = offlineAttempt.finished && !discardedData;

                        if (discardedData) {
                            if (offlineAttempt.finished) {
                                warnings.push($translate.instant('mma.mod_quiz.warningdatadiscardedfromfinished'));
                            } else {
                                warnings.push($translate.instant('mma.mod_quiz.warningdatadiscarded'));
                            }
                        }

                        return $mmaModQuiz.processAttempt(quiz, onlineAttempt, answers, preflightData, finish, false, false, siteId);
                    }).then(function() {
                        // Data sent. Finish the sync.
                        return finishSync(lastAttemptId, true);
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

    /**
     * Validate questions, discarding the offline answers that can't be synchronized.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#validateQuestions
     * @param  {Number} attemptId        Attempt ID.
     * @param  {Object} onlineQuestions  Online questions
     * @param  {Object} offlineQuestions Offline questions.
     * @param  {String} [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                 Promise resolved with boolean: true if some offline data was discarded, false otherwise.
     *                                   The promise is rejected if an offline question isn't found in online questions.
     */
    self.validateQuestions = function(attemptId, onlineQuestions, offlineQuestions, siteId) {
        var error = false,
            discardedData = false,
            promises = [];

        angular.forEach(offlineQuestions, function(offlineQuestion, slot) {
            var onlineQuestion = onlineQuestions[slot],
                offlineSequenceCheck = offlineQuestion.answers[':sequencecheck'];

            if (onlineQuestion && !error) {
                if (!$mmQuestionDelegate.validateSequenceCheck(onlineQuestion, offlineSequenceCheck)) {
                    discardedData = true;
                    promises.push($mmaModQuizOffline.removeQuestionAndAnswers(attemptId, onlineQuestion.slot, siteId));
                    delete offlineQuestions[slot];
                } else {
                    // Sequence check is valid. Use the online one to prevent synchronization errors.
                    offlineQuestion.answers[':sequencecheck'] = onlineQuestion.sequencecheck;
                }
            } else {
                error = true;
            }
        });

        if (error) {
            return $q.reject();
        }

        return $q.all(promises).then(function() {
            return discardedData;
        });
    };

    /**
     * If there's an ongoing sync for a certain quiz, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizSync#waitForSync
     * @param  {Number} quizId   Quiz to check.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when there's no sync going on for the quiz.
     */
    self.waitForSync = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        if (syncPromises[siteId] && syncPromises[siteId][quizId]) {
            // There's a sync ongoing for this quiz.
            return syncPromises[siteId][quizId].catch(function() {});
        }
        return $q.when();
    };

    return self;
});
