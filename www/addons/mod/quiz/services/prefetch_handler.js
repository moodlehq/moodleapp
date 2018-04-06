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
 * Mod quiz prefetch handler.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizPrefetchHandler
 */
.factory('$mmaModQuizPrefetchHandler', function($mmaModQuiz, $q, $mmPrefetchFactory, mmaModQuizComponent, $mmText, $injector,
    $mmSite, $mmaModQuizAccessRulesDelegate, $mmQuestionHelper, $mmFilepool, mmCoreDownloaded, mmCoreNotDownloaded, $rootScope,
    $timeout) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModQuizComponent, false),
        $mmaModQuizSync; // We'll inject it using $injector to prevent circular dependencies.

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^grades$|^gradeitems$|^questions$|^attempts$/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Quizzes cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Gather some preflight data for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#gatherPreflightData
     * @param  {Object} quiz           Quiz.
     * @param  {Object} quizAccessInfo Quiz access info returned by $mmaModQuiz#getQuizAccessInformation.
     * @param  {Object} [attempt]      Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param  {Object} preflightData  Object where to store the preflight data.
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @param  {Boolean} askPreflight  True if we should ask for preflight data if needed, false otherwise.
     * @param  {String} [modalTitle]   Lang key of the title to set to preflight modal (e.g. 'mma.mod_quiz.startattempt').
     * @return {Promise}               Promise resolved when gathered. Resolve param is a scope if it was needed to create one.
     *                                 Please make sure to destroy the scope once you're done.
     */
    self.gatherPreflightData = function(quiz, quizAccessInfo, attempt, preflightData, siteId, askPreflight, modalTitle) {
        if (askPreflight) {
            // Check if the quiz requires preflight data.
            var scope = $rootScope.$new();
            scope.preflightData = preflightData;
            scope.preflightModalTitle = modalTitle;

            return getPreflightDataForPrefetch(scope, quiz, quizAccessInfo, attempt, false, siteId).then(function() {
                return scope;
            });
        } else {
            // Get some fixed preflight data from access rules (data that doesn't require user interaction).
            var rules = quizAccessInfo.activerulenames;
            return $mmaModQuizAccessRulesDelegate.getFixedPreflightData(rules, quiz, attempt, preflightData, true, siteId)
                    .then(function() {

                if (!attempt) {
                    // We need to create a new attempt.
                    return $mmaModQuiz.startAttempt(quiz.id, preflightData).then(function() {
                        // Don't return anything.
                    });
                }
            });
        }
    };

    /**
     * Convenience function to get preflight data for prefetch.
     *
     * @param  {Object} scope          Scope.
     * @param  {Object} quiz           Quiz.
     * @param  {Object} quizAccessInfo Quiz access info returned by $mmaModQuiz#getQuizAccessInformation.
     * @param  {Object} [attempt]      Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param  {Boolean} fromModal     True if sending data using preflight modal, false otherwise.
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved when the preflight data is validated.
     */
    function getPreflightDataForPrefetch(scope, quiz, quizAccessInfo, attempt, fromModal, siteId) {
        // Check if preflight data is valid or not required.
        return $mmaModQuiz.checkPreflightData(scope, quiz, quizAccessInfo, attempt, false, fromModal, true, siteId).catch(function(error) {
            if (error) {
                // Something went wrong, reject.
                return $q.reject(error);
            } else {
                // No preflight data provided and it's required. We need to wait for user input.
                var deferred = $q.defer(),
                    resolved = false;

                scope.start = function() {
                    resolved = true;
                    // Try to validate new preflightData (chain promises).
                    deferred.resolve(getPreflightDataForPrefetch(scope, quiz, quizAccessInfo, attempt, true, siteId));
                };
                scope.$on('modal.hidden', function() {
                    if (!resolved) {
                        // Wait a bit to reject to prevent Ionic bug: https://github.com/driftyco/ionic/issues/9069
                        $timeout(deferred.reject, 400);
                    }
                });
                scope.$on('modal.removed', function() {
                    if (!resolved) {
                        deferred.reject();
                    }
                });
                return deferred.promise;
            }
        });
    }

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getDownloadSize
     * @param  {Object} module   Module to get the size.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Object}          With the file size and a boolean to indicate if it is the total size or only partial.
     */
    self.getDownloadSize = function(module, courseId, single) {
        return {size: -1, total: false};
    };

    /**
     * Get the downloaded size of a module.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getDownloadedSize
     * @param {Object} module   Module to get the downloaded size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadedSize = function(module, courseId) {
        return $mmFilepool.getFilesSizeByComponent($mmSite.getId(), self.component, module.id);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getFiles
     * @param {Object} module    Module to get the files.
     * @param {Number} courseId  Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Object[]}        List of files.
     */
    self.getFiles = function(module, courseId, siteId) {
        return [];
    };

    /**
     * Get revision of a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Promise resolved with revision.
     */
    self.getRevision = function(module, courseId) {
        return $mmaModQuiz.getQuizIdFromModule(module, courseId).then(function(quizId) {
            return $mmaModQuiz.getUserAttempts(quizId).then(function(attempts) {
                return self.getRevisionFromAttempts(attempts);
            });
        });
    };

    /**
     * Given a list of attempts, returns the quiz revision.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getRevisionFromAttempts
     * @param {Object[]} attempts Quiz attempts.
     * @return {Number}           Quiz revision.
     */
    self.getRevisionFromAttempts = function(attempts) {
        if (attempts.length) {
            // Return last attempt ID.
            return attempts[attempts.length - 1].id;
        } else {
            return 0;
        }
    };

    /**
     * Get timemodified of a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getTimemodified
     * @param {Object} module    Module to get the timemodified.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        return $mmaModQuiz.getQuizIdFromModule(module, courseId).then(function(quizId) {
            return $mmaModQuiz.getUserAttempts(quizId).then(function(attempts) {
                return self.getTimemodifiedFromAttempts(attempts);
            });
        });
    };

    /**
     * Given a list of attempts, returns the quiz time modified.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getTimemodifiedFromAttempts
     * @param {Object[]} attempts Quiz attempts.
     * @return {Number}           Quiz timemodified.
     */
    self.getTimemodifiedFromAttempts = function(attempts) {
        if (attempts.length) {
            // Return last attempt timemodified.
            return attempts[attempts.length - 1].timemodified;
        } else {
            return 0;
        }
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModQuiz.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        // Always invalidate all the data since it's needed to check if the quiz is downloadable.
        return $mmaModQuiz.getQuizIdFromModule(module, courseId).then(function(quizId) {
            var promises = [];

            promises.push($mmaModQuiz.invalidateQuizData(courseId));
            promises.push($mmaModQuiz.invalidateUserAttemptsForUser(quizId));

            return $q.all(promises);
        });
    };

    /**
     * Check if a quiz is downloadable.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        var siteId = $mmSite.getId();
        return $mmaModQuiz.getQuiz(courseId, module.id, siteId).then(function(quiz) {
            if (quiz.allowofflineattempts !== 1 || quiz.hasquestions === 0) {
                return false;
            }

            // Not downloadable if we reached max attempts.
            return $mmaModQuiz.getUserAttempts(quiz.id, false, true, false, false, siteId).then(function(attempts) {
                var isLastFinished = !attempts.length || $mmaModQuiz.isAttemptFinished(attempts[attempts.length - 1].state);
                return quiz.attempts === 0 || quiz.attempts > attempts.length || !isLastFinished;
            });
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#isEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isEnabled = function() {
        return $mmaModQuiz.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#prefetch
     * @param { Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when the prefetch is finished. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchQuiz, $mmSite.getId());
    };

    /**
     * Prefetch a quiz.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchQuiz(module, courseId, single, siteId) {
        var attempts,
            startAttempt,
            quiz,
            quizAccessInfo,
            attemptAccessInfo,
            preflightData = {},
            scope;

        // Get quiz.
        return $mmaModQuiz.getQuiz(courseId, module.id, siteId).then(function(q) {
            quiz = q;

            var promises = [],
                introFiles = self.getIntroFilesFromInstance(module, quiz);

            // Get some quiz data.
            promises.push($mmaModQuiz.getQuizAccessInformation(quiz.id, false, true, siteId).then(function(info) {
                quizAccessInfo = info;
            }));
            promises.push($mmaModQuiz.getQuizRequiredQtypes(quiz.id, true, siteId));
            promises.push($mmaModQuiz.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then(function(atts) {
                attempts = atts;
            }));
            promises.push($mmaModQuiz.getAttemptAccessInformation(quiz.id, 0, false, true, siteId).then(function(info) {
                attemptAccessInfo = info;
            }));

            promises.push($mmFilepool.addFilesToQueueByUrl(siteId, introFiles, self.component, module.id));

            return $q.all(promises);
        }).then(function() {
            var attempt = attempts[attempts.length - 1];
            if (!attempt || $mmaModQuiz.isAttemptFinished(attempt.state)) {
                // Check if the user can attempt the quiz.
                if (attemptAccessInfo.preventnewattemptreasons.length) {
                    return $q.reject($mmText.buildMessage(attemptAccessInfo.preventnewattemptreasons));
                }

                startAttempt = true;
                attempt = undefined;
            }

            // Get the preflight data.
            return self.gatherPreflightData(quiz, quizAccessInfo, attempt, preflightData, siteId, single, 'mm.core.download');

        }).then(function(scp) {
            scope = scp;

            promises = [];

            if (startAttempt) {
                // Re-fetch user attempts since we created a new one.
                promises.push($mmaModQuiz.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then(function(atts) {
                    attempts = atts;
                }));

                // Update the download time to prevent detecting the new attempt as an update.
                promises.push($mmFilepool.updatePackageDownloadTime(siteId, self.component, module.id).catch(function() {
                    // Ignore errors.
                }));
            }

            // Fetch attempt related data.
            promises.push($mmaModQuiz.getCombinedReviewOptions(quiz.id, true, siteId));
            promises.push($mmaModQuiz.getUserBestGrade(quiz.id, true, siteId));
            promises.push($mmaModQuiz.getGradeFromGradebook(courseId, module.id, true, siteId).then(function(gradebookData) {
                if (typeof gradebookData.graderaw != 'undefined') {
                    return $mmaModQuiz.getFeedbackForGrade(quiz.id, gradebookData.graderaw, true, siteId);
                }
            }).catch(function() {
                // Ignore failures.
            }));
            promises.push($mmaModQuiz.getAttemptAccessInformation(quiz.id, 0, false, true, siteId)); // Last attempt.

            return $q.all(promises);
        }).then(function() {
            // We have quiz data, now we'll get specific data for each attempt.
            promises = [];
            angular.forEach(attempts, function(attempt) {
                promises.push(self.prefetchAttempt(quiz, attempt, preflightData, siteId));
            });

            return $q.all(promises);
        }).then(function() {
            // If there's nothing to send, mark the quiz as synchronized.
            // We don't return the promises because it should be fast and we don't want to block the user for this.
            if (!$mmaModQuizSync) {
                $mmaModQuizSync = $injector.get('$mmaModQuizSync');
            }
            $mmaModQuizSync.hasDataToSync(quiz.id, siteId).then(function(hasData) {
                if (!hasData) {
                    $mmaModQuizSync.setSyncTime(quiz.id, siteId);
                }
            });
        }).then(function() {
            // Return revision and timemodified.
            return {
                revision: self.getRevisionFromAttempts(attempts),
                timemod: self.getTimemodifiedFromAttempts(attempts)
            };
        }).finally(function() {
            if (scope) {
                scope.$destroy();
            }
        });
    }

    /**
     * Prefetch all WS data for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#prefetchAttempt
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved when the prefetch is finished. Data returned is not reliable.
     */
    self.prefetchAttempt = function(quiz, attempt, preflightData, siteId) {
        var pages = $mmaModQuiz.getPagesFromLayout(attempt.layout),
            promises = [],
            isSequential = $mmaModQuiz.isNavigationSequential(quiz),
            attemptGrade;

        if ($mmaModQuiz.isAttemptFinished(attempt.state)) {
            // Attempt is finished, get feedback and review data.
            attemptGrade = $mmaModQuiz.rescaleGrade(attempt.sumgrades, quiz, false);
            if (typeof attemptGrade != 'undefined') {
                promises.push($mmaModQuiz.getFeedbackForGrade(quiz.id, attemptGrade, true, siteId));
            }

            angular.forEach(pages, function(page) {
                promises.push($mmaModQuiz.getAttemptReview(attempt.id, page, true, siteId).catch(function() {
                    // Ignore failures, maybe the user can't review the attempt.
                }));
            });
             // All questions in same page.
            promises.push($mmaModQuiz.getAttemptReview(attempt.id, -1, true, siteId).then(function(data) {
                // Download the files inside the questions.
                var questionPromises = [];
                angular.forEach(data.questions, function(question) {
                    questionPromises.push($mmQuestionHelper.prefetchQuestionFiles(
                                question, siteId, self.component, quiz.coursemodule));
                });
                return $q.all(questionPromises);
            }, function() {
                // Ignore failures, maybe the user can't review the attempt.
            }));
        } else {

            // Attempt not finished, get data needed to continue the attempt.
            promises.push($mmaModQuiz.getAttemptAccessInformation(quiz.id, attempt.id, false, true, siteId));
            promises.push($mmaModQuiz.getAttemptSummary(attempt.id, preflightData, false, true, false, siteId));

            if (attempt.state == $mmaModQuiz.ATTEMPT_IN_PROGRESS) {
                // Get data for each page.
                angular.forEach(pages, function(page) {
                    if (isSequential && page < attempt.currentpage) {
                        // Sequential quiz, cannot get pages before the current one.
                        return;
                    }

                    promises.push($mmaModQuiz.getAttemptData(attempt.id, page, preflightData, false, true, siteId).then(function(data) {
                        // Download the files inside the questions.
                        var questionPromises = [];
                        angular.forEach(data.questions, function(question) {
                            questionPromises.push($mmQuestionHelper.prefetchQuestionFiles(
                                        question, siteId, self.component, quiz.coursemodule));
                        });
                        return $q.all(questionPromises);
                    }));
                });
            }
        }

        return $q.all(promises);
    };

    /**
     * Prefetches some data for a quiz and its last attempt.
     * This function will NOT start a new attempt, it only reads data for the quiz and the last attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#prefetchQuizAndLastAttempt
     * @param  {Object} quiz         Quiz.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @param {Boolean} askPreflight True if we should ask for preflight data if needed, false otherwise.
     * @return {Promise}             Promise resolved when done.
     */
    self.prefetchQuizAndLastAttempt = function(quiz, siteId, askPreflight) {
        siteId = siteId || $mmSite.getId();

        var attempts,
            promises = [],
            revision,
            timemod,
            quizAccessInfo,
            preflightData = {},
            scope;

        // Get quiz data.
        promises.push($mmaModQuiz.getQuizAccessInformation(quiz.id, false, true, siteId).then(function(info) {
            quizAccessInfo = info;
        }));
        promises.push($mmaModQuiz.getQuizRequiredQtypes(quiz.id, true, siteId));
        promises.push($mmaModQuiz.getCombinedReviewOptions(quiz.id, true, siteId));
        promises.push($mmaModQuiz.getUserBestGrade(quiz.id, true, siteId));
        promises.push($mmaModQuiz.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then(function(atts) {
            attempts = atts;
        }));
        promises.push($mmaModQuiz.getGradeFromGradebook(quiz.course, quiz.coursemodule, true, siteId).then(function(gradebookData) {
            if (typeof gradebookData.graderaw != 'undefined') {
                return $mmaModQuiz.getFeedbackForGrade(quiz.id, gradebookData.graderaw, true, siteId);
            }
        }));
        promises.push($mmaModQuiz.getAttemptAccessInformation(quiz.id, 0, false, true, siteId)); // Last attempt.

        return $q.all(promises).then(function() {
            var attempt = attempts[attempts.length - 1];
            if (!attempt) {
                // No need to get attempt data, we don't need preflight data.
                return;
            }

            // Get the preflight data.
            return self.gatherPreflightData(quiz, quizAccessInfo, attempt, preflightData, siteId, askPreflight, 'mm.core.download');

        }).then(function(scp) {
            scope = scp;

            if (attempts && attempts.length) {
                // Get data for last attempt.
                return self.prefetchAttempt(quiz, attempts[attempts.length - 1], preflightData, siteId);
            }
        }).then(function() {
            // Prefetch finished, get current status to determine if we need to change it.
            revision = self.getRevisionFromAttempts(attempts);
            timemod = self.getTimemodifiedFromAttempts(attempts);

            return $mmFilepool.getPackageStatus(siteId, self.component, quiz.coursemodule, revision, timemod);
        }).then(function(status) {
            if (status !== mmCoreNotDownloaded) {
                // Quiz was downloaded, set the new status.
                // If no attempts or last is finished we'll mark it as not downloaded to show download icon.
                var isLastFinished = !attempts.length || $mmaModQuiz.isAttemptFinished(attempts[attempts.length - 1].state),
                    newStatus = isLastFinished ? mmCoreNotDownloaded : mmCoreDownloaded;
                return $mmFilepool.storePackageStatus(siteId, self.component, quiz.coursemodule, newStatus, revision, timemod);
            }
        }).finally(function() {
            if (scope) {
                scope.$destroy();
            }
        });
    };

    return self;
});
