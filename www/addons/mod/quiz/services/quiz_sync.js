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

/**
 * Quiz synchronization service.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizSync
 */
.factory('$mmaModQuizSync', function($log, $mmaModQuiz, $mmSite, $mmSitesManager, $q, $mmaModQuizOffline, $mmQuestion, $mmLang,
            $mmQuestionDelegate, $mmApp, $mmEvents, $translate, mmaModQuizSyncTime, $mmSync, mmaModQuizEventAutomSynced,
            mmaModQuizComponent, $mmaModQuizPrefetchHandler, $mmCourse, $mmSyncBlock) {

    $log = $log.getInstance('$mmaModQuizSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModQuizComponent, mmaModQuizSyncTime);

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
                        if (!$mmSyncBlock.isBlocked(mmaModQuizComponent, quiz.id, siteId)) {
                            promises.push($mmaModQuiz.getQuizById(quiz.courseid, quiz.id, siteId).then(function(quiz) {
                                return self.syncQuizIfNeeded(quiz, false, siteId).then(function(data) {
                                    if (data && data.warnings && data.warnings.length) {
                                        // Store the warnings to show them when the user opens the quiz.
                                        return self.setSyncWarnings(quiz.id, data.warnings, siteId).then(function() {
                                            return data;
                                        });
                                    }
                                    return data;
                                }).then(function(data) {
                                    if (typeof data != 'undefined') {
                                        // We tried to sync. Send event.
                                        $mmEvents.trigger(mmaModQuizEventAutomSynced, {
                                            siteid: siteId,
                                            quizid: quiz.id,
                                            attemptFinished: data.attemptFinished,
                                            warnings: data.warnings
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
        return self.isSyncNeeded(quiz.id, siteId).then(function(needed) {
            if (needed) {
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
     * @return {Promise}             Promise rejected in failure, resolved in success with an object containing:
     *                                       -warnings Array of warnings.
     *                                       -attemptFinished True if an attempt was finished in Moodle due to this sync.
     */
    self.syncQuiz = function(quiz, askPreflight, siteId) {
        siteId = siteId || $mmSite.getId();

        var warnings = [],
            syncPromise,
            courseId = quiz.course,
            offlineAttempt,
            onlineAttempt,
            preflightData = {};

        if (self.isSyncing(quiz.id, siteId)) {
            // There's already a sync ongoing for this quiz, return the promise.
            return self.getOngoingSync(quiz.id, siteId);
        }

        // Verify that quiz isn't blocked.
        if ($mmSyncBlock.isBlocked(mmaModQuizComponent, quiz.id, siteId)) {
            $log.debug('Cannot sync quiz ' + quiz.id + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('quiz');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
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
                return $mmaModQuizPrefetchHandler.prefetchQuizAndLastAttempt(quiz, siteId);
            }).then(function() {
                return self.setSyncTime(quiz.id, siteId).catch(function() {
                    // Ignore errors.
                });
            }).then(function() {
                // Check if online attempt was finished because of the sync.
                if (onlineAttempt && !$mmaModQuiz.isAttemptFinished(onlineAttempt.state)) {
                    // Attempt wasn't finished at start. Check if it's finished now.
                    return $mmaModQuiz.getUserAttempts(quiz.id, 'all', true, false, false, siteId).then(function(attempts) {
                        var isFinishedNow = true;
                        // Search the attempt.
                        angular.forEach(attempts, function(attempt) {
                            if (attempt.id == onlineAttempt.id) {
                                isFinishedNow = $mmaModQuiz.isAttemptFinished(attempt.state);
                            }
                        });
                        return isFinishedNow;
                    });
                }
                return false;
            }).then(function(attemptFinished) {
                return {
                    warnings: warnings,
                    attemptFinished: attemptFinished
                };
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

                if (!onlineAttempt || $mmaModQuiz.isAttemptFinished(onlineAttempt.state)) {
                    // Attempt not found or it's finished in online. Discard it.
                    warnings.push($translate.instant('mma.mod_quiz.warningattemptfinished'));
                    return finishSync(lastAttemptId, true);
                }

                // Get the data stored in offline.
                return $mmaModQuizOffline.getAttemptAnswers(offlineAttempt.id, siteId).then(function(answers) {
                    var offlineQuestions,
                        pages,
                        finish;

                    if (!answers.length) {
                        // No answers stored, finish.
                        return finishSync(lastAttemptId, true);
                    }

                    answers = $mmQuestion.convertAnswersArrayToObject(answers);
                    offlineQuestions = $mmaModQuizOffline.classifyAnswersInQuestions(answers);

                    // We're going to need preflightData, get it.
                    return $mmaModQuiz.getQuizAccessInformation(quiz.id, false, true, siteId).then(function(info) {
                        return $mmaModQuizPrefetchHandler.gatherPreflightData(quiz, info, onlineAttempt,
                                                preflightData, siteId, askPreflight, 'mm.settings.synchronization');
                    }).then(function() {
                        // Now get the online questions data.
                        pages = $mmaModQuiz.getPagesFromLayoutAndQuestions(onlineAttempt.layout, offlineQuestions);

                        return $mmaModQuiz.getAllQuestionsData(quiz, onlineAttempt, preflightData, pages, false, true, siteId);
                    }).then(function(onlineQuestions) {
                        // Validate questions, discarding the offline answers that can't be synchronized.
                        return self.validateQuestions(onlineAttempt.id, onlineQuestions, offlineQuestions, siteId);
                    }).then(function(discardedData) {
                        // Get the answers to send.
                        var answers = $mmaModQuizOffline.extractAnswersFromQuestions(offlineQuestions);
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
                        // Answers sent, now set the current page if the attempt isn't finished.
                        if (!finish) {
                            return $mmaModQuiz.logViewAttempt(onlineAttempt.id, offlineAttempt.currentpage, preflightData, false)
                                    .catch(function() {
                                // Ignore errors.
                            });
                        }
                    }).then(function() {
                        // Data sent. Finish the sync.
                        return finishSync(lastAttemptId, true);
                    });
                });
            });
        });

        return self.addOngoingSync(quiz.id, syncPromise, siteId);
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
        var discardedData = false,
            promises = [];

        angular.forEach(offlineQuestions, function(offlineQuestion, slot) {
            var onlineQuestion = onlineQuestions[slot],
                offlineSequenceCheck = offlineQuestion.answers[':sequencecheck'];

            if (onlineQuestion) {
                if (!$mmQuestionDelegate.validateSequenceCheck(onlineQuestion, offlineSequenceCheck)) {
                    discardedData = true;
                    promises.push($mmaModQuizOffline.removeQuestionAndAnswers(attemptId, slot, siteId));
                    delete offlineQuestions[slot];
                } else {
                    // Sequence check is valid. Use the online one to prevent synchronization errors.
                    offlineQuestion.answers[':sequencecheck'] = onlineQuestion.sequencecheck;
                }
            } else {
                // Online question not found, it can happen for 2 reasons:
                // 1- It's a sequential quiz and the question is in a page already passed.
                // 2- Quiz layout has changed (shouldn't happen since it's blocked if there are attempts).
                discardedData = true;
                promises.push($mmaModQuizOffline.removeQuestionAndAnswers(attemptId, slot, siteId));
                delete offlineQuestions[slot];
            }
        });

        return $q.all(promises).then(function() {
            return discardedData;
        });
    };

    return self;
});
