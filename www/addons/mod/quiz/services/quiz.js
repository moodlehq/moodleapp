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
 * Quiz service.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuiz
 */
.factory('$mmaModQuiz', function($log, $mmSite, $mmSitesManager, $q, $translate, $mmUtil, $mmText, $mmQuestionDelegate,
            $mmaModQuizAccessRulesDelegate, $mmQuestionHelper, $mmFilepool, $mmaModQuizOnline, $mmaModQuizOffline, $state,
            mmaModQuizComponent, mmCoreDownloaded, mmCoreDownloading, mmCoreNotDownloaded, $injector, $ionicModal,
            $timeout, $rootScope) {

    $log = $log.getInstance('$mmaModQuiz');

    var self = {},
        blockedQuizzes = {},
        $mmaModQuizSync; // We'll inject it using $injector to prevent circular dependencies.

    // Constants.

    // Grade methods.
    self.GRADEHIGHEST = 1;
    self.GRADEAVERAGE = 2;
    self.ATTEMPTFIRST = 3;
    self.ATTEMPTLAST  = 4;

    // Question options.
    self.QUESTION_OPTIONS_MAX_ONLY = 1;
    self.QUESTION_OPTIONS_MARK_AND_MAX = 2;

    // Attempt state.
    self.ATTEMPT_IN_PROGRESS = 'inprogress';
    self.ATTEMPT_OVERDUE     = 'overdue';
    self.ATTEMPT_FINISHED    = 'finished';
    self.ATTEMPT_ABANDONED   = 'abandoned';

    // Show the countdown timer if there is less than this amount of time left before the the quiz close date.
    self.QUIZ_SHOW_TIME_BEFORE_DEADLINE = 3600;

    /**
     * Block a quiz so it cannot be synced.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#blockQuiz
     * @param  {String} siteId Site ID.
     * @param  {Number} quizId Quiz ID.
     * @return {Void}
     */
    self.blockQuiz = function(siteId, quizId) {
        if (!blockedQuizzes[siteId]) {
            blockedQuizzes[siteId] = {};
        }
        blockedQuizzes[siteId][quizId] = true;
    };

    /**
     * Validate a preflight data or show a modal to input the preflight data if required.
     * It calls $mmaModQuiz#startAttempt if a new attempt is needed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#checkPreflightData
     * @param  {Object} scope             Scope.
     * @param  {Object} quiz              Quiz.
     * @param  {Object} quizAccessInfo    Quiz access info returned by $mmaModQuiz#getQuizAccessInformation.
     * @param  {Object} [attempt]         Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param  {Boolean} offline          True if attempt is offline.
     * @param  {Boolean} fromModal        True if sending data using preflight modal, false otherwise.
     * @param  {Boolean} prefetch         True if prefetching.
     * @param  {String} [siteId]          Site ID. If not defined, current site.
     * @return {Promise}                  Promise resolved when the preflight data is validated.
     */
    self.checkPreflightData = function(scope, quiz, quizAccessInfo, attempt, offline, fromModal, prefetch, siteId) {
        var promise,
            rules = quizAccessInfo.activerulenames;

        return $mmaModQuizAccessRulesDelegate.isPreflightCheckRequired(rules, quiz, attempt, prefetch, siteId)
                .then(function(preflightRequired) {

            if (preflightRequired && !fromModal) {
                // Preflight check is required but no preflightData has been sent. Show a modal with the preflight form.
                return self.initPreflightModal(scope, quiz, quizAccessInfo, attempt, prefetch, siteId).catch(function(error) {
                    return $q.reject(error || 'Error initializing preflight modal.');
                }).then(function() {
                    scope.modal.show();
                    return $q.reject();
                });
            }

            // Hide modal if needed.
            scope.modal && scope.modal.hide();

            // Get some fixed preflight data from access rules (data that doesn't require user interaction).
            return $mmaModQuizAccessRulesDelegate.getFixedPreflightData(rules, quiz, attempt, scope.preflightData, prefetch, siteId);
        }).then(function() {
            if (attempt) {
                if (attempt.state != self.ATTEMPT_OVERDUE && !attempt.finishedOffline) {
                    // We're continuing an attempt. Call getAttemptData to validate the preflight data.
                    var page = attempt.currentpage;
                    promise = self.getAttemptData(attempt.id, page, scope.preflightData, offline, true).then(function() {
                        if (offline) {
                            // Get current page stored in local.
                            return $mmaModQuizOffline.getAttemptById(attempt.id).then(function(localAttempt) {
                                attempt.currentpage = localAttempt.currentpage;
                            }).catch(function() {
                                // No local data.
                            });
                        }
                    });
                } else {
                    // Attempt is overdue or finished in offline, we can only see the summary.
                    // Call getAttemptSummary to validate the preflight data.
                    promise = self.getAttemptSummary(attempt.id, scope.preflightData, offline, true);
                }
            } else {
                // We're starting a new attempt, call startAttempt.
                promise = self.startAttempt(quiz.id, scope.preflightData).then(function(att) {
                    attempt = att;
                });
            }

            return promise.then(function() {
                // Preflight data validated.
                $mmaModQuizAccessRulesDelegate.notifyPreflightCheckPassed(rules, quiz, attempt,
                                                                scope.preflightData, prefetch, siteId);
                return attempt;
            }).catch(function(error) {
                if ($mmUtil.isWebServiceError(error)) {
                    // The WebService returned an error, assume the preflight failed.
                    $mmaModQuizAccessRulesDelegate.notifyPreflightCheckFailed(rules, quiz, attempt,
                                                                scope.preflightData, prefetch, siteId);
                }

                if (prefetch) {
                    return $q.reject(error);
                } else {
                    // Show modal again. We need to wait a bit because if it's called too close to .hide then it won't be shown.
                    $timeout(function() {
                        scope.modal && scope.modal.show();
                    }, 500);

                    if (error) {
                        $mmUtil.showErrorModal(error);
                    } else {
                        $mmUtil.showErrorModal('mm.core.error', true);
                    }
                    return $q.reject();
                }
            });
        });
    };

    /**
     * Clear blocked quizzes.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#clearBlockedQuizzes
     * @param {String} [siteId] If set, clear the blocked quizzes only for this site. Otherwise clear all quizzes.
     * @return {Void}
     */
    self.clearBlockedQuizzes = function(siteId) {
        if (siteId) {
            delete blockedQuizzes[siteId];
        } else {
            blockedQuizzes = {};
        }
    };

    /**
     * Formats a grade to be displayed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#formatGrade
     * @param  {Number} grade    Grade.
     * @param  {Number} decimals Decimals to use.
     * @return {String|Float}    Grade to display.
     */
    self.formatGrade = function(grade, decimals) {
        if (typeof grade == 'undefined' || grade == -1 || grade === null) {
            return $translate.instant('mma.mod_quiz.notyetgraded');
        }
        return $mmUtil.roundToDecimals(grade, decimals);
    };

    /**
     * Get attempt questions. Returns all of them or just the ones in certain pages.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAllQuestionsData
     * @param  {Object} attempt       Attempt.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {Number[]} [pages]     List of pages to get. If not defined, all pages.
     * @param  {Boolean} offline      True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} ignoreCache  True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with the questions.
     */
    self.getAllQuestionsData = function(attempt, preflightData, pages, offline, ignoreCache, siteId) {
        var promises = [],
            questions = {};

        if (!pages) {
            pages = self.getPagesFromLayout(attempt.layout);
        }

        pages.forEach(function(page) {
            promises.push(self.getAttemptData(attempt.id, page, preflightData, offline, ignoreCache, siteId).then(function(data) {
                angular.forEach(data.questions, function(question) {
                    questions[question.slot] = question;
                });
            }));
        });

        return $q.all(promises).then(function() {
            return questions;
        });
    };

    /**
     * Get cache key for get attempt access information WS calls.
     *
     * @param {Number} quizId    Quiz ID.
     * @param {Number} attemptId Attempt ID.
     * @return {String}          Cache key.
     */
    function getAttemptAccessInformationCacheKey(quizId, attemptId) {
        return getAttemptAccessInformationCommonCacheKey(quizId) + ':' + attemptId;
    }

    /**
     * Get common cache key for get attempt access information WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @return {String}       Cache key.
     */
    function getAttemptAccessInformationCommonCacheKey(quizId) {
        return 'mmaModQuiz:attemptAccessInformation:' + quizId;
    }

    /**
     * Get access information for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptAccessInformation
     * @param {Number} quizId       Quiz ID.
     * @param {Number} attemptId    Attempt ID. 0 for user's last attempt.
     * @param {Boolean} offline     True if it should return cached data. Has priority over ignoreCache.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the access information.
     */
    self.getAttemptAccessInformation = function(quizId, attemptId, offline, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    quizid: quizId,
                    attemptid: attemptId
                },
                preSets = {
                    cacheKey: getAttemptAccessInformationCacheKey(quizId, attemptId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_attempt_access_information', params, preSets);
        });
    };

    /**
     * Get cache key for get attempt data WS calls.
     *
     * @param {Number} attemptId Attempt ID.
     * @param {Number} page      Page.
     * @return {String}          Cache key.
     */
    function getAttemptDataCacheKey(attemptId, page) {
        return getAttemptDataCommonCacheKey(attemptId) + ':' + page;
    }

    /**
     * Get common cache key for get attempt data WS calls.
     *
     * @param {Number} attemptId Attempt ID.
     * @return {String}          Cache key.
     */
    function getAttemptDataCommonCacheKey(attemptId) {
        return 'mmaModQuiz:attemptData:' + attemptId;
    }

    /**
     * Get an attempt's data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptData
     * @param {Number} attemptId     Attempt ID.
     * @param {Number} page          Page number.
     * @param {Object} preflightData Preflight required data (like password).
     * @param {Boolean} offline      True if it should return cached data. Has priority over ignoreCache.
     * @param {Boolean} ignoreCache  True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the attempt data.
     */
    self.getAttemptData = function(attemptId, page, preflightData, offline, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    attemptid: attemptId,
                    page: page,
                    preflightdata: $mmUtil.objectToArrayOfObjects(preflightData, 'name', 'value', true)
                },
                preSets = {
                    cacheKey: getAttemptDataCacheKey(attemptId, page)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_attempt_data', params, preSets);
        });
    };

    /**
     * Get an attempt's due date.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptDueDate
     * @param  {Object} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {Number}         Attempt's due date, 0 if no due date or invalid data.
     */
    self.getAttemptDueDate = function(quiz, attempt) {
        var deadlines = [],
            dueDate;

        if (quiz.timelimit) {
            deadlines.push(parseInt(attempt.timestart, 10) + parseInt(quiz.timelimit, 10));
        }
        if (quiz.timeclose) {
            deadlines.push(parseInt(quiz.timeclose, 10));
        }

        if (!deadlines.length) {
            return 0;
        }

        // Get min due date.
        dueDate = Math.min.apply(null, deadlines);
        if (!dueDate) {
            return 0;
        }

        switch (attempt.state) {
            case self.ATTEMPT_IN_PROGRESS:
                return dueDate * 1000;

            case self.ATTEMPT_OVERDUE:
                return (dueDate + parseInt(quiz.graceperiod, 10)) * 1000;

            default:
                $log.warn('Unexpected state when getting due date: ' + attempt.state);
                return 0;
        }
    };

    /**
     * Get an attempt's warning because of due date.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptDueDateWarning
     * @param  {Object} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {String}         Attempt's warning, undefined if no due date.
     */
    self.getAttemptDueDateWarning = function(quiz, attempt) {
        var dueDate = self.getAttemptDueDate(quiz, attempt);
        if (attempt.state === self.ATTEMPT_OVERDUE) {
            return $translate.instant('mma.mod_quiz.overduemustbesubmittedby', {$a: moment(dueDate).format('LLL')});
        } else if (dueDate) {
            return $translate.instant('mma.mod_quiz.mustbesubmittedby', {$a: moment(dueDate).format('LLL')});
        }
    };

    /**
     * Turn attempt's state into a readable state, including some extra data depending on the state.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptReadableState
     * @param  {Number} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {String[]}       List of state sentences.
     */
    self.getAttemptReadableState = function(quiz, attempt) {
        if (attempt.finishedOffline) {
            return [$translate.instant('mma.mod_quiz.finishnotsynced')];
        }

        switch (attempt.state) {
            case self.ATTEMPT_IN_PROGRESS:
                return [$translate.instant('mma.mod_quiz.stateinprogress')];

            case self.ATTEMPT_OVERDUE:
                var sentences = [],
                    dueDate = self.getAttemptDueDate(quiz, attempt);
                sentences.push($translate.instant('mma.mod_quiz.stateoverdue'));
                if (dueDate) {
                    dueDate = moment(dueDate).format('LLL');
                    sentences.push($translate.instant('mma.mod_quiz.stateoverduedetails', {$a: dueDate}));
                }
                return sentences;

            case self.ATTEMPT_FINISHED:
                return [
                    $translate.instant('mma.mod_quiz.statefinished'),
                    $translate.instant('mma.mod_quiz.statefinisheddetails', {$a: moment(attempt.timefinish * 1000).format('LLL')})
                ];

            case self.ATTEMPT_ABANDONED:
                return [$translate.instant('mma.mod_quiz.stateabandoned')];
        }
        return [];
    };

    /**
     * Turn attempt's state into a readable state name, without any more data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptReadableStateName
     * @param  {String} state State.
     * @return {String}       Readable state name.
     */
    self.getAttemptReadableStateName = function(state) {
        switch (state) {
            case self.ATTEMPT_IN_PROGRESS:
                return $translate.instant('mma.mod_quiz.stateinprogress');

            case self.ATTEMPT_OVERDUE:
                return $translate.instant('mma.mod_quiz.stateoverdue');

            case self.ATTEMPT_FINISHED:
                return $translate.instant('mma.mod_quiz.statefinished');

            case self.ATTEMPT_ABANDONED:
                return $translate.instant('mma.mod_quiz.stateabandoned');
        }
        return '';
    };

    /**
     * Get cache key for get attempt review WS calls.
     *
     * @param {Number} attemptId Attempt ID.
     * @param {Number} page      Page.
     * @return {String}          Cache key.
     */
    function getAttemptReviewCacheKey(attemptId, page) {
        return getAttemptReviewCommonCacheKey(attemptId) + ':' + page;
    }

    /**
     * Get common cache key for get attempt review WS calls.
     *
     * @param {Number} attemptId Attempt ID.
     * @return {String}          Cache key.
     */
    function getAttemptReviewCommonCacheKey(attemptId) {
        return 'mmaModQuiz:attemptReview:' + attemptId;
    }

    /**
     * Get an attempt's review.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptReview
     * @param {Number} attemptId    Attempt ID.
     * @param {Number} [page]       Page number. If not defined, return all the questions in all the pages.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the attempt review.
     */
    self.getAttemptReview = function(attemptId, page, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();
        if (typeof page == 'undefined') {
            page = -1;
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    attemptid: attemptId,
                    page: page
                },
                preSets = {
                    cacheKey: getAttemptReviewCacheKey(attemptId, page)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_attempt_review', params, preSets);
        });
    };

    /**
     * Get cache key for get attempt summary WS calls.
     *
     * @param {Number} attemptId Attempt ID.
     * @return {String}          Cache key.
     */
    function getAttemptSummaryCacheKey(attemptId) {
        return 'mmaModQuiz:attemptSummary:' + attemptId;
    }

    /**
     * Get an attempt's summary.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptSummary
     * @param {Number} attemptId     Attempt ID.
     * @param {Object} preflightData Preflight required data (like password).
     * @param {Boolean} offline      True if it should return cached data. Has priority over ignoreCache.
     * @param {Boolean} ignoreCache  True if it should ignore cached data (it will always fail in offline or server down).
     * @param {Boolean} loadLocal    True if it should load local state for each question. Only applicable if offline=true.
     * @param {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the attempt summary.
     */
    self.getAttemptSummary = function(attemptId, preflightData, offline, ignoreCache, loadLocal, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    attemptid: attemptId,
                    preflightdata: $mmUtil.objectToArrayOfObjects(preflightData, 'name', 'value', true)
                },
                preSets = {
                    cacheKey: getAttemptSummaryCacheKey(attemptId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_attempt_summary', params, preSets).then(function(response) {
                if (response && response.questions) {
                    if (offline && loadLocal) {
                        return $mmaModQuizOffline.loadQuestionsLocalStates(attemptId, response.questions, siteId);
                    }
                    return response.questions;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get cache key for get combined review options WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @param {Number} userId User ID.
     * @return {String}       Cache key.
     */
    function getCombinedReviewOptionsCacheKey(quizId, userId) {
        return getCombinedReviewOptionsCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get combined review options WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @return {String}       Cache key.
     */
    function getCombinedReviewOptionsCommonCacheKey(quizId) {
        return 'mmaModQuiz:combinedReviewOptions:' + quizId;
    }

    /**
     * Get a quiz combined review options.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getCombinedReviewOptions
     * @param {Number} quizId       Quiz ID.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @param {Number} [userId]     User ID. If not defined use site's current user.
     * @return {Promise}            Promise resolved with the combined review options.
     */
    self.getCombinedReviewOptions = function(quizId, ignoreCache, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    quizid: quizId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getCombinedReviewOptionsCacheKey(quizId, userId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_combined_review_options', params, preSets).then(function(response) {
                if (response && response.someoptions && response.alloptions) {
                    // Convert the arrays to objects with name -> value.
                    var someOptions = {},
                        allOptions = {};
                    angular.forEach(response.someoptions, function(entry) {
                        someOptions[entry.name] = entry.value;
                    });
                    angular.forEach(response.alloptions, function(entry) {
                        allOptions[entry.name] = entry.value;
                    });
                    response.someoptions = someOptions;
                    response.alloptions = allOptions;
                    return response;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get cache key for get feedback for grade WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @param {Number} grade  Grade.
     * @return {String}       Cache key.
     */
    function getFeedbackForGradeCacheKey(quizId, grade) {
        return getFeedbackForGradeCommonCacheKey(quizId) + ':' + grade;
    }

    /**
     * Get common cache key for get feedback for grade WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @return {String}       Cache key.
     */
    function getFeedbackForGradeCommonCacheKey(quizId) {
        return 'mmaModQuiz:feedbackForGrade:' + quizId;
    }

    /**
     * Get the feedback for a certain grade.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getFeedbackForGrade
     * @param {Number} quizId       Quiz ID.
     * @param {Number} grade        Grade.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the feedback.
     */
    self.getFeedbackForGrade = function(quizId, grade, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {

            var params = {
                    quizid: quizId,
                    grade: grade
                },
                preSets = {
                    cacheKey: getFeedbackForGradeCacheKey(quizId, grade)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_quiz_feedback_for_grade', params, preSets);
        });
    };

    /**
     * Determine the correct number of decimal places required to format a grade.
     * Based on Moodle's quiz_get_grade_format.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getGradeDecimals
     * @param  {Object} quiz Quiz.
     * @return {Number}      Number of decimals.
     */
    self.getGradeDecimals = function(quiz) {
        if (typeof quiz.questiondecimalpoints == 'undefined') {
            quiz.questiondecimalpoints = -1;
        }

        if (quiz.questiondecimalpoints == -1) {
            return quiz.decimalpoints;
        }

        return quiz.questiondecimalpoints;
    };

    /**
     * Get cache key for get grade from gradebook WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @param {Number} grade  Grade.
     * @return {String}       Cache key.
     */
    function getGradeFromGradebookCacheKey(courseId, userId) {
        return 'mmaModQuiz:gradeFromGradebook:' + courseId + ':' + userId;
    }

    /**
     * Gets a quiz grade and feedback from the gradebook.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getGradeFromGradebook
     * @param  {Number} courseId    Course ID.
     * @param  {Number} moduleId    Quiz module ID.
     * @param  {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [userId]    User ID. If not defined use site's current user.
     * @return {Promise}            Promise resolved with an object containing the grade and the feedback.
     */
    self.getGradeFromGradebook = function(courseId, moduleId, ignoreCache, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    courseid: courseId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getGradeFromGradebookCacheKey(courseId, userId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return $mmSite.read('gradereport_user_get_grades_table', params, preSets).then(function(response) {
                // Search the module we're looking for.
                var quizEntry,
                    regex = /href="([^"]*\/mod\/quiz\/[^"|^\.]*\.php[^"]*)/, // Find href containing "/mod/quiz/xxx.php".
                    matches,
                    hrefParams,
                    result = {},
                    grade;

                angular.forEach(response.tables, function(table) {
                    angular.forEach(table.tabledata, function(entry) {
                        if (entry.itemname && entry.itemname.content) {
                            matches = entry.itemname.content.match(regex);
                            if (matches && matches.length) {
                                hrefParams = $mmUtil.extractUrlParams(matches[1]);
                                if (hrefParams && hrefParams.id == moduleId) {
                                    quizEntry = entry;
                                }
                            }
                        }
                    });
                });

                if (quizEntry) {
                    if (quizEntry.feedback.content) {
                        result.feedback = $mmText.decodeHTML(quizEntry.feedback.content).trim();
                    } else {
                        result.feedback = '';
                    }
                    if (quizEntry.grade) {
                        grade = parseFloat(quizEntry.grade.content);
                        if (!isNaN(grade)) {
                            result.grade = grade;
                        }
                    }
                    return result;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Given a list of attempts, returns the last finished attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getLastFinishedAttemptFromList
     * @param  {Object[]} attempts Attempts.
     * @return {Object}            Last finished attempt.
     */
    self.getLastFinishedAttemptFromList = function(attempts) {
        if (attempts && attempts.length) {
            for (var i = attempts.length - 1; i >= 0; i--) {
                var attempt = attempts[i];
                if (self.isAttemptFinished(attempt.state)) {
                    return attempt;
                }
            }
        }
    };

    /**
     * Given a list of questions, check if the quiz can be submitted.
     * Will return an array with the messages to prevent the submit. Empty array if quiz can be submitted.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getPreventSubmitMessages
     * @param  {Object[]} questions Questions.
     * @return {String[]}           List of prevent submit messages. Empty array if quiz can be submitted.
     */
    self.getPreventSubmitMessages = function(questions) {
        var messages = [];
        angular.forEach(questions, function(question) {
            var message = $mmQuestionDelegate.getPreventSubmitMessage(question);
            if (message) {
                message = $translate.instant(message);
                messages.push($translate.instant('mm.question.questionmessage', {$a: question.slot, $b: message}));
            }
        });
        return messages;
    };

    /**
     * Get cache key for Quiz data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getQuizDataCacheKey(courseId) {
        return 'mmaModQuiz:quiz:' + courseId;
    }

    /**
     * Get a Quiz with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String} siteId   Site ID.
     * @param  {Number} courseId Course ID.
     * @param  {String} key      Name of the property to check.
     * @param  {Mixed} value     Value to search.
     * @return {Promise}         Promise resolved when the Quiz is retrieved.
     */
    function getQuiz(siteId, courseId, key, value) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getQuizDataCacheKey(courseId)
                };

            return site.read('mod_quiz_get_quizzes_by_courses', params, preSets).then(function(response) {
                if (response && response.quizzes) {
                    var currentQuiz;
                    angular.forEach(response.quizzes, function(quiz) {
                        if (!currentQuiz && quiz[key] == value) {
                            currentQuiz = quiz;
                        }
                    });
                    if (currentQuiz) {
                        return currentQuiz;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a Quiz by module ID.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuiz
     * @param {Number} courseId Course ID.
     * @param {Number} cmid     Course module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the Quiz is retrieved.
     */
    self.getQuiz = function(courseId, cmid, siteId) {
        siteId = siteId || $mmSite.getId();
        return getQuiz(siteId, courseId, 'coursemodule', cmid);
    };

    /**
     * Get a Quiz by Quiz ID.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuizById
     * @param {Number} courseId Course ID.
     * @param {Number} id       Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the Quiz is retrieved.
     */
    self.getQuizById = function(courseId, id, siteId) {
        siteId = siteId || $mmSite.getId();
        return getQuiz(siteId, courseId, 'id', id);
    };

    /**
     * Get cache key for get quiz access information WS calls.
     *
     * @param {Number} quizId    Quiz ID.
     * @return {String}          Cache key.
     */
    function getQuizAccessInformationCacheKey(quizId) {
        return 'mmaModQuiz:quizAccessInformation:' + quizId;
    }

    /**
     * Get access information for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuizAccessInformation
     * @param {Number} quizId       Quiz ID.
     * @param {Boolean} offline     True if it should return cached data. Has priority over ignoreCache.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the access information.
     */
    self.getQuizAccessInformation = function(quizId, offline, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    quizid: quizId
                },
                preSets = {
                    cacheKey: getQuizAccessInformationCacheKey(quizId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_quiz_access_information', params, preSets);
        });
    };

    /**
     * Get a quiz id given a course module object.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuizIdFromModule
     * @param {Object} module   Course module.
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the Quiz is retrieved.
     */
    self.getQuizIdFromModule = function(module, courseId, siteId) {
        if (module.instance) {
            return $q.when(module.instance);
        } else {
            return self.getQuiz(courseId, module.id, siteId).then(function(quiz) {
                return quiz.id;
            });
        }
    };

    /**
     * Get a readable Quiz grade method.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuizGradeMethod
     * @param {Number} method Grading method.
     * @return {String}       Readable grading method.
     */
    self.getQuizGradeMethod = function(method) {
        switch (parseInt(method, 10)) {
            case self.GRADEHIGHEST:
                return $translate.instant('mma.mod_quiz.gradehighest');
            case self.GRADEAVERAGE:
                return $translate.instant('mma.mod_quiz.gradeaverage');
            case self.ATTEMPTFIRST:
                return $translate.instant('mma.mod_quiz.attemptfirst');
            case self.ATTEMPTLAST:
                return $translate.instant('mma.mod_quiz.attemptlast');
        }
        return '';
    };

    /**
     * Get cache key for get quiz required qtypes WS calls.
     *
     * @param {Number} quizId    Quiz ID.
     * @return {String}          Cache key.
     */
    function getQuizRequiredQtypesCacheKey(quizId) {
        return 'mmaModQuiz:quizRequiredQtypes:' + quizId;
    }

    /**
     * Get the potential question types that would be required for a given quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuizRequiredQtypes
     * @param {Number} quizId       Quiz ID.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the access information.
     */
    self.getQuizRequiredQtypes = function(quizId, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    quizid: quizId
                },
                preSets = {
                    cacheKey: getQuizRequiredQtypesCacheKey(quizId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_quiz_required_qtypes', params, preSets).then(function(response) {
                if (response && response.questiontypes) {
                    return response.questiontypes;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Given a list of attempts, returns the quiz revision.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuizRevisionFromAttempts
     * @param {Object[]} attempts Quiz attempts.
     * @return {Number}           Quiz revision.
     */
    self.getQuizRevisionFromAttempts = function(attempts) {
        if (attempts.length) {
            // Return last attempt ID.
            return attempts[attempts.length - 1].id;
        } else {
            return 0;
        }
    };

    /**
     * Given a list of attempts, returns the quiz time modified.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getQuizTimemodifiedFromAttempts
     * @param {Object[]} attempts Quiz attempts.
     * @return {Number}           Quiz timemodified.
     */
    self.getQuizTimemodifiedFromAttempts = function(attempts) {
        if (attempts.length) {
            // Return last attempt timemodified.
            return attempts[attempts.length - 1].timemodified;
        } else {
            return 0;
        }
    };

    /**
     * Given an attempt's layout, return the list of pages.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getPagesFromLayout
     * @param  {String} layout Attempt's layout.
     * @return {Number[]}      Pages.
     * @description
     * An attempt's layout is a string with the question numbers separated by commas. A 0 indicates a change of page.
     * Example: 1,2,3,0,4,5,6,0
     * In the example above, first page has questions 1, 2 and 3. Second page has questions 4, 5 and 6.
     *
     * This function returns a list of pages.
     */
    self.getPagesFromLayout = function(layout) {
        var split = layout.split(','),
            page = 0,
            pages = [];

        for (var i = 0; i < split.length; i++) {
            if (split[i] == 0) {
                pages.push(page);
                page++;
            }
        }

        return pages;
    };

    /**
     * Given an attempt's layout and a list of questions identified by question slot,
     * return the list of pages that have at least 1 of the questions.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getPagesFromLayoutAndQuestions
     * @param  {String} layout    Attempt's layout.
     * @param  {Object} questions List of questions. It needs to be an object where the keys are question slot.
     * @return {Number[]}         Pages.
     * @description
     * An attempt's layout is a string with the question numbers separated by commas. A 0 indicates a change of page.
     * Example: 1,2,3,0,4,5,6,0
     * In the example above, first page has questions 1, 2 and 3. Second page has questions 4, 5 and 6.
     *
     * This function returns a list of pages.
     */
    self.getPagesFromLayoutAndQuestions = function(layout, questions) {
        var split = layout.split(','),
            page = 0,
            pageAdded = false,
            pages = [];

        for (var i = 0; i < split.length; i++) {
            var value = split[i];
            if (value == 0) {
                page++;
                pageAdded = false;
            } else if (!pageAdded && questions[value]) {
                pages.push(page);
                pageAdded = true;
            }
        }

        return pages;
    };

    /**
     * Given a list of question types, returns the types that aren't supported.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getUnsupportedQuestions
     * @param  {String[]} questionTypes Question types to check.
     * @return {String[]}               Not supported question types.
     */
    self.getUnsupportedQuestions = function(questionTypes) {
        var notSupported = [];
        angular.forEach(questionTypes, function(type) {
            if (type != 'random' && !$mmQuestionDelegate.isQuestionSupported(type)) {
                notSupported.push(type);
            }
        });
        return notSupported;
    };

    /**
     * Given a list of access rules names, returns the rules that aren't supported.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getUnsupportedRules
     * @param  {String[]} rulesNames Rules to check.
     * @return {String[]}            Not supported rules names.
     */
    self.getUnsupportedRules = function(rulesNames) {
        var notSupported = [];
        angular.forEach(rulesNames, function(name) {
            if (!$mmaModQuizAccessRulesDelegate.isAccessRuleSupported(name)) {
                notSupported.push(name);
            }
        });
        return notSupported;
    };

    /**
     * Get cache key for get user attempts WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @param {Number} userId User ID.
     * @return {String}       Cache key.
     */
    function getUserAttemptsCacheKey(quizId, userId) {
        return getUserAttemptsCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get user attempts WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @return {String}       Cache key.
     */
    function getUserAttemptsCommonCacheKey(quizId) {
        return 'mmaModQuiz:userAttempts:' + quizId;
    }

    /**
     * Get quiz attempts for a certain user.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getUserAttempts
     * @param {Number} quizId             Quiz ID.
     * @param {Number} [status]           Status of the attempts to get. By default, 'all'.
     * @param {Boolean} [includePreviews] True to include previews, false otherwise. Defaults to true.
     * @param {Boolean} offline           True if it should return cached data. Has priority over ignoreCache.
     * @param {Boolean} ignoreCache       True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]           Site ID. If not defined, current site.
     * @param {Number} [userId]           User ID. If not defined use site's current user.
     * @return {Promise}                  Promise resolved with the attempts.
     */
    self.getUserAttempts = function(quizId, status, includePreviews, offline, ignoreCache, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        status = status || 'all';
        if (typeof includePreviews == 'undefined') {
            includePreviews = true;
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    quizid: quizId,
                    userid: userId,
                    status: status,
                    includepreviews: includePreviews ? 1 : 0
                },
                preSets = {
                    cacheKey: getUserAttemptsCacheKey(quizId, userId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_user_attempts', params, preSets).then(function(response) {
                if (response && response.attempts) {
                    return response.attempts;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get cache key for get user best grade WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @param {Number} userId User ID.
     * @return {String}       Cache key.
     */
    function getUserBestGradeCacheKey(quizId, userId) {
        return getUserBestGradeCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get user best grade WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @return {String}       Cache key.
     */
    function getUserBestGradeCommonCacheKey(quizId) {
        return 'mmaModQuiz:userBestGrade:' + quizId;
    }

    /**
     * Get best grade in a quiz for a certain user.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getUserBestGrade
     * @param {Number} quizId       Quiz ID.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @param {Number} [userId]     User ID. If not defined use site's current user.
     * @return {Promise}            Promise resolved with the attempts.
     */
    self.getUserBestGrade = function(quizId, ignoreCache, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    quizid: quizId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getUserBestGradeCacheKey(quizId, userId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_user_best_grade', params, preSets);
        });
    };

    /**
     * Init a preflight modal, adding it to the scope.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#initPreflightModal
     * @param  {Object} scope          Scope.
     * @param  {Object} quiz           Quiz.
     * @param  {Object} quizAccessInfo Quiz access info returned by $mmaModQuiz#getQuizAccessInformation.
     * @param  {Object} [attempt]      Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param  {Boolean} prefetch      True if prefetching.
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved when the modal is initialized.
     */
    self.initPreflightModal = function(scope, quiz, quizAccessInfo, attempt, prefetch, siteId) {
        var promises = [],
            notSupported = [],
            directives = [],
            handlers = [];

        angular.forEach(quizAccessInfo.activerulenames, function(rule) {
            var handler = $mmaModQuizAccessRulesDelegate.getAccessRuleHandler(rule);
            if (handler) {
                promises.push($q.when(handler.isPreflightCheckRequired(quiz, attempt, prefetch, siteId)).then(function(required) {
                    if (required) {
                        handlers.push(handler);
                        directives.push(handler.getPreflightDirectiveName());
                    }
                }));
            } else {
                notSupported.push(rule);
            }
        });

        if (notSupported.length) {
            var error = $translate.instant('mma.mod_quiz.errorrulesnotsupported') + ' ' + JSON.stringify(notSupported);
            return $q.reject(error);
        }

        return $mmUtil.allPromises(promises).catch(function() {
            // Ignore errors.
        }).then(function() {
            var promise;

            scope.accessRulesDirectives = directives;

            if (scope.modal) {
                // The modal is already created.
                promise = $q.when(scope.modal);
            } else {
                promise = $ionicModal.fromTemplateUrl('addons/mod/quiz/templates/preflight-modal.html', {
                    scope: scope,
                    animation: 'slide-in-up'
                });
            }

            return promise.then(function(modal) {
                scope.modal = modal;

                scope.closeModal = function() {
                    modal.hide();
                    // Clean the preflight data.
                    handlers.forEach(function(handler) {
                        if (typeof handler.cleanPreflight == 'function') {
                            handler.cleanPreflight(scope.preflightData);
                        }
                    });
                };
                scope.$on('$destroy', function() {
                    modal.remove();
                });
            });
        });
    };

    /**
     * Invalidates all the data related to a certain quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAllQuizData
     * @param {Number} quizId      Quiz ID.
     * @param {Number} [courseId]  Course ID.
     * @param {Number} [attemptId] Attempt ID to invalidate some WS calls.
     * @param {String} [siteId]    Site ID. If not defined, current site.
     * @param {Number} [userId]    User ID. If not defined use site's current user.
     * @return {Promise}           Promise resolved when the data is invalidated.
     */
    self.invalidateAllQuizData = function(quizId, courseId, attemptId, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        var promises = [];

        promises.push(self.invalidateAttemptAccessInformation(quizId, siteId));
        promises.push(self.invalidateCombinedReviewOptionsForUser(quizId, siteId, userId));
        promises.push(self.invalidateFeedback(quizId, siteId));
        promises.push(self.invalidateQuizAccessInformation(quizId, siteId));
        promises.push(self.invalidateQuizRequiredQtypes(quizId, siteId));
        promises.push(self.invalidateUserAttemptsForUser(quizId, siteId, userId));
        promises.push(self.invalidateUserBestGradeForUser(quizId, siteId, userId));

        if (attemptId) {
            promises.push(self.invalidateAttemptData(attemptId, siteId));
            promises.push(self.invalidateAttemptReview(attemptId, siteId));
            promises.push(self.invalidateAttemptSummary(attemptId, siteId));
        }

        if (courseId) {
            promises.push(self.invalidateGradeFromGradebook(courseId, siteId, userId));
        }

        return $q.all(promises);
    };

    /**
     * Invalidates attempt access information for all attempts in a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAttemptAccessInformation
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptAccessInformation = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getAttemptAccessInformationCommonCacheKey(quizId));
        });
    };

    /**
     * Invalidates attempt access information for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAttemptAccessInformationForAttempt
     * @param {Number} quizId    Quiz ID.
     * @param {Number} attemptId Attempt ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptAccessInformationForAttempt = function(quizId, attemptId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAttemptAccessInformationCacheKey(quizId, attemptId));
        });
    };

    /**
     * Invalidates attempt data for all pages.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAttemptData
     * @param {Number} attemptId Attempt ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptData = function(attemptId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getAttemptDataCommonCacheKey(attemptId));
        });
    };

    /**
     * Invalidates attempt data for a certain page.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAttemptDataForPage
     * @param {Number} attemptId Attempt ID.
     * @param {Number} page      Page.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptDataForPage = function(attemptId, page, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAttemptDataCacheKey(attemptId, page));
        });
    };

    /**
     * Invalidates attempt review for all pages.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAttemptReview
     * @param {Number} attemptId Attempt ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptReview = function(attemptId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getAttemptReviewCommonCacheKey(attemptId));
        });
    };

    /**
     * Invalidates attempt review for a certain page.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAttemptReviewForPage
     * @param {Number} attemptId Attempt ID.
     * @param {Number} page      Page.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptReviewForPage = function(attemptId, page, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAttemptReviewCacheKey(attemptId, page));
        });
    };

    /**
     * Invalidates attempt summary.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAttemptSummary
     * @param {Number} attemptId Attempt ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptSummary = function(attemptId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAttemptSummaryCacheKey(attemptId));
        });
    };

    /**
     * Invalidates combined review options for all users.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateCombinedReviewOptions
     * @param {Number} quizId    Quiz ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateCombinedReviewOptions = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getCombinedReviewOptionsCommonCacheKey(quizId));
        });
    };

    /**
     * Invalidates combined review options for a certain user.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateCombinedReviewOptionsForUser
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCombinedReviewOptionsForUser = function(quizId, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getCombinedReviewOptionsCacheKey(quizId, userId));
        });
    };

    /**
     * Invalidates feedback for all grades of a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateFeedback
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateFeedback = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getFeedbackForGradeCommonCacheKey(quizId));
        });
    };

    /**
     * Invalidates feedback for a certain grade.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateFeedbackForGrade
     * @param {Number} quizId   Quiz ID.
     * @param {Number} grade    Grade.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateFeedbackForGrade = function(quizId, grade, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getFeedbackForGradeCacheKey(quizId, grade));
        });
    };

    /**
     * Invalidates grade from gradebook for a certain user.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateGradeFromGradebook
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateGradeFromGradebook = function(courseId, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getGradeFromGradebookCacheKey(courseId, userId));
        });
    };

    /**
     * Invalidates quiz access information for a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateQuizAccessInformation
     * @param {Number} quizId    Quiz ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateQuizAccessInformation = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getQuizAccessInformationCacheKey(quizId));
        });
    };

    /**
     * Invalidates required qtypes for a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateQuizRequiredQtypes
     * @param {Number} quizId    Quiz ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateQuizRequiredQtypes = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getQuizRequiredQtypesCacheKey(quizId));
        });
    };

    /**
     * Invalidates user attempts for all users.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateUserAttempts
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserAttempts = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getUserAttemptsCommonCacheKey(quizId));
        });
    };

    /**
     * Invalidates user attempts for a certain user.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateUserAttemptsForUser
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserAttemptsForUser = function(quizId, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getUserAttemptsCacheKey(quizId, userId));
        });
    };

    /**
     * Invalidates user best grade for all users.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateUserBestGrade
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserBestGrade = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getUserBestGradeCommonCacheKey(quizId));
        });
    };

    /**
     * Invalidates user best grade for a certain user.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateUserBestGradeForUser
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserBestGradeForUser = function(quizId, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getUserBestGradeCacheKey(quizId, userId));
        });
    };

    /**
     * Invalidates Quiz data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateQuizData
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateQuizData = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getQuizDataCacheKey(courseId));
        });
    };

    /**
     * Check if an attempt is finished based on its state.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isAttemptFinished
     * @param  {String}  state Attempt's state.
     * @return {Boolean}       True if finished, false otherwise.
     */
    self.isAttemptFinished = function(state) {
        return state == self.ATTEMPT_FINISHED || state == self.ATTEMPT_ABANDONED;
    };

    /**
     * Check if an attempt is finished in offline but not synced.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isAttemptFinishedOffline
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with boolean: true if finished in offline but not synced, false otherwise.
     */
    self.isAttemptFinishedOffline = function(attemptId, siteId) {
        return $mmaModQuizOffline.getAttemptById(attemptId, siteId).then(function(attempt) {
            return !!attempt.finished;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Check if an attempt is nearly over. We consider an attempt nearly over or over if:
     * - Is not in progress
     * OR
     * - It finished before autosaveperiod passes.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isAttemptTimeNearlyOver
     * @param  {Object} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {Boolean}        True if nearly over or over, false otherwise.
     */
    self.isAttemptTimeNearlyOver = function(quiz, attempt) {
        if (attempt.state != self.ATTEMPT_IN_PROGRESS) {
            // Attempt not in progress, return true.
            return true;
        }

        var dueDate = self.getAttemptDueDate(quiz, attempt),
            autoSavePeriod = quiz.autosaveperiod || 0;
        if (dueDate > 0 && new Date().getTime() + autoSavePeriod >= dueDate) {
            return true;
        }

        return false;
    };

    /**
     * Check if last attempt is offline and unfinished.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isLastAttemptOfflineUnfinished
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @param  {Number} [userId]  User ID. If not defined, user current site's user.
     * @return {Promise}          Promise resolved with boolean: true if last offline attempt is unfinished, false otherwise.
     */
    self.isLastAttemptOfflineUnfinished = function(quiz, siteId, userId) {
        return $mmaModQuizOffline.getQuizAttempts(quiz.id, siteId, userId).then(function(attempts) {
            var last = attempts.pop();
            return last && !last.finished;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Check if a quiz navigation is sequential.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isNavigationSequential
     * @param  {Object}  quiz Quiz.
     * @return {Boolean}      True if navigation is sequential, false otherwise.
     */
    self.isNavigationSequential = function(quiz) {
        return quiz.navmethod == "sequential";
    };

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the quiz WS are available.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            // All WS were introduced at the same time so checking one is enough.
            return site.wsAvailable('mod_quiz_get_attempt_review');
        });
    };

    /**
     * Check if a quiz is being played right now.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isQuizBeingPlayed
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Boolean}         True if it's being played, false otherwise.
     */
    self.isQuizBeingPlayed = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSite.getId() == siteId && $state.current.name == 'site.mod_quiz-player' && $state.params.quizid == quizId;
    };

    /**
     * Check if a quiz is blocked by a writing function.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isQuizBlocked
     * @param  {String} siteId Site ID.
     * @param  {Number} quizId Quiz ID.
     * @return {Boolean}         True if blocked, false otherwise.
     */
    self.isQuizBlocked = function(siteId, quizId) {
        if (!blockedQuizzes[siteId]) {
            return false;
        }
        return !!blockedQuizzes[siteId][quizId];
    };

    /**
     * Check if a quiz is enabled to be used in offline.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#isQuizOffline
     * @param  {Object}  quiz Quiz.
     * @return {Boolean}      True offline is enabled, false otherwise.
     */
    self.isQuizOffline = function(quiz) {
        return !!quiz.allowofflineattempts;
    };

    /**
     * Given a list of attempts, add finishedOffline=true to those attempts that are finished in offline but not synced.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#loadFinishedOfflineData
     * @param  {Object[]} attempts List of attempts.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when done.
     */
    self.loadFinishedOfflineData = function(attempts, siteId) {
        if (attempts.length) {
            // We only need to check the last attempt because you can only have 1 local attempt.
            var lastAttempt = attempts[attempts.length - 1];
            return self.isAttemptFinishedOffline(lastAttempt.id, siteId).then(function(finished) {
                lastAttempt.finishedOffline = finished;
            });
        }
        return $q.when();
    };

    /**
     * Report an attempt as being viewed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#logViewAttempt
     * @param {String} attemptId Attempt ID.
     * @param {Number} [page=0]  Page number.
     * @param {Boolean} offline  True if attempt is offline.
     * @return {Promise}         Promise resolved when the WS call is successful.
     */
    self.logViewAttempt = function(attemptId, page, offline) {
        if (typeof page == 'undefined') {
            page = 0;
        }

        var params = {
                attemptid: attemptId,
                page: page
            },
            promises = [];

        promises.push($mmSite.write('mod_quiz_view_attempt', params));
        if (offline) {
            promises.push($mmaModQuizOffline.setAttemptCurrentPage(attemptId, page));
        }

        return $q.all(promises);
    };

    /**
     * Report an attempt's review as being viewed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#logViewAttemptReview
     * @param {String} attemptId Attempt ID.
     * @return {Promise}         Promise resolved when the WS call is successful.
     */
    self.logViewAttemptReview = function(attemptId) {
        var params = {
            attemptid: attemptId
        };
        return $mmSite.write('mod_quiz_view_attempt_review', params);
    };

    /**
     * Report an attempt's summary as being viewed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#logViewAttemptSummary
     * @param {String} attemptId Attempt ID.
     * @return {Promise}         Promise resolved when the WS call is successful.
     */
    self.logViewAttemptSummary = function(attemptId) {
        var params = {
            attemptid: attemptId
        };
        return $mmSite.write('mod_quiz_view_attempt_summary', params);
    };

    /**
     * Report a quiz as being viewed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#logViewQuiz
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logViewQuiz = function(id) {
        if (id) {
            var params = {
                quizid: id
            };
            return $mmSite.write('mod_quiz_view_quiz', params);
        }
        return $q.reject();
    };

    /**
     * Prefetch all WS data for a quiz.
     * This function will start a new attempt if possible and last attempt is finished or no attempts.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#prefetch
     * @param {Object} module        The module object returned by WS.
     * @param {Number} courseId      Course ID the module belongs to.
     * @param {Boolean} askPreflight True if we should ask for preflight data if needed, false otherwise.
     * @return {Promise}             Promise resolved when the prefetch is finished. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, askPreflight) {
        var siteId = $mmSite.getId(),
            attempts,
            startAttempt,
            quiz,
            quizAccessInfo,
            preflightData = {},
            scope;

        // Mark package as downloading.
        return $mmFilepool.storePackageStatus(siteId, mmaModQuizComponent, module.id, mmCoreDownloading).then(function() {
            // Get quiz.
            return self.getQuiz(courseId, module.id, siteId).then(function(q) {
                quiz = q;
            });
        }).then(function() {
            var promises = [];

            // Get user attempts and data not related with attempts.
            promises.push(self.getQuizAccessInformation(quiz.id, false, true, siteId).then(function(info) {
                quizAccessInfo = info;
            }));
            promises.push(self.getQuizRequiredQtypes(quiz.id, true, siteId));
            promises.push(self.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then(function(atts) {
                attempts = atts;
            }));

            return $q.all(promises);
        }).then(function() {
            var attempt = attempts[attempts.length - 1];
            if (!attempt || self.isAttemptFinished(attempt.state)) {
                startAttempt = true;
                attempt = undefined;
            }

            // Get the preflight data.
            return self.gatherPreflightData(quiz, quizAccessInfo, attempt, preflightData, siteId, askPreflight, 'mm.core.download');

        }).then(function(scp) {
            scope = scp;

            promises = [];

            if (startAttempt) {
                // Re-fetch user attempts since we created a new one.
                promises.push(self.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then(function(atts) {
                    attempts = atts;
                }));
            }

            // Fetch attempt related data.
            promises.push(self.getCombinedReviewOptions(quiz.id, true, siteId));
            promises.push(self.getUserBestGrade(quiz.id, true, siteId));
            promises.push(self.getGradeFromGradebook(courseId, module.id, true, siteId).then(function(gradebookData) {
                if (typeof gradebookData.grade != 'undefined') {
                    return self.getFeedbackForGrade(quiz.id, gradebookData.grade, true, siteId);
                }
            }));
            promises.push(self.getAttemptAccessInformation(quiz.id, 0, false, true, siteId)); // Last attempt.

            return $q.all(promises);
        }).then(function() {
            // We have quiz data, now we'll get specific data for each attempt.
            promises = [];
            angular.forEach(attempts, function(attempt) {
                promises.push(self.prefetchAttempt(quiz, attempt, preflightData, siteId));
            });

            return $q.all(promises);
        }).then(function() {
            // Prefetch finished, mark as downloaded.
            var revision = self.getQuizRevisionFromAttempts(attempts),
                timemod = self.getQuizTimemodifiedFromAttempts(attempts);
            return $mmFilepool.storePackageStatus(siteId, mmaModQuizComponent, module.id, mmCoreDownloaded, revision, timemod);
        }).then(function() {
            // If there's nothing to send, mark the quiz as synchronized.
            // We don't return the promises because it should be fast and we don't want to block the user for this.
            if (!$mmaModQuizSync) {
                $mmaModQuizSync = $injector.get('$mmaModQuizSync');
            }
            $mmaModQuizSync.hasDataToSync(quiz.id, siteId).then(function(hasData) {
                if (!hasData) {
                    $mmaModQuizSync.setQuizSyncTime(quiz.id, siteId);
                }
            });
        }).catch(function(error) {
            // Error prefetching, go back to previous status and reject the promise.
            return $mmFilepool.setPackagePreviousStatus(siteId, mmaModQuizComponent, module.id).then(function() {
                return $q.reject(error);
            });
        }).finally(function() {
            if (scope) {
                scope.$destroy();
            }
        });
    };

    /**
     * Gather some preflight data for an attempt.
     *
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
            scope = $rootScope.$new();
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
                // Don't return anything.
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
        return self.checkPreflightData(scope, quiz, quizAccessInfo, attempt, false, fromModal, true, siteId).catch(function(error) {
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
                        deferred.reject();
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
     * Prefetch all WS data for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#prefetchAttempt
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved when the prefetch is finished. Data returned is not reliable.
     */
    self.prefetchAttempt = function(quiz, attempt, preflightData, siteId) {
        var pages = self.getPagesFromLayout(attempt.layout),
            promises = [],
            attemptGrade;

        if (self.isAttemptFinished(attempt.state)) {
            // Attempt is finished, get feedback and review data.
            attemptGrade = self.rescaleGrade(attempt.sumgrades, quiz, false);
            if (typeof attemptGrade != 'undefined') {
                promises.push(self.getFeedbackForGrade(quiz.id, attemptGrade, true, siteId));
            }

            angular.forEach(pages, function(page) {
                promises.push(self.getAttemptReview(attempt.id, page, true, siteId));
            });
             // All questions in same page.
            promises.push(self.getAttemptReview(attempt.id, -1, true, siteId).then(function(data) {
                // Download the files inside the questions.
                var questionPromises = [];
                angular.forEach(data.questions, function(question) {
                    questionPromises.push($mmQuestionHelper.prefetchQuestionFiles(question, siteId));
                });
                return $q.all(questionPromises);
            }));
        } else {

            // Attempt not finished, get data needed to continue the attempt.
            promises.push(self.getAttemptAccessInformation(quiz.id, attempt.id, false, true, siteId));
            promises.push(self.getAttemptSummary(attempt.id, preflightData, false, true, false, siteId));

            if (attempt.state == self.ATTEMPT_IN_PROGRESS) {
                // Get data for each page.
                angular.forEach(pages, function(page) {
                    promises.push(self.getAttemptData(attempt.id, page, preflightData, false, true, siteId).then(function(data) {
                        // Download the files inside the questions.
                        var questionPromises = [];
                        angular.forEach(data.questions, function(question) {
                            questionPromises.push($mmQuestionHelper.prefetchQuestionFiles(question, siteId));
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
     * @name $mmaModQuiz#prefetchQuizAndLastAttempt
     * @param  {Object} quiz         Quiz.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @param {Boolean} askPreflight True if we should ask for preflight data if needed, false otherwise.
     * @return {Promise}             Promise resolved when done.
     */
    self.prefetchQuizAndLastAttempt = function(quiz, siteId, askPreflight) {
        siteId = siteId || $mmSite.getId();

        var attempts,
            promises = [],
            component = mmaModQuizComponent,
            revision,
            timemod,
            quizAccessInfo,
            preflightData = {},
            scope;

        // Get quiz data.
        promises.push(self.getQuizAccessInformation(quiz.id, false, true, siteId).then(function(info) {
            quizAccessInfo = info;
        }));
        promises.push(self.getQuizRequiredQtypes(quiz.id, true, siteId));
        promises.push(self.getCombinedReviewOptions(quiz.id, true, siteId));
        promises.push(self.getUserBestGrade(quiz.id, true, siteId));
        promises.push(self.getUserAttempts(quiz.id, 'all', true, false, true, siteId).then(function(atts) {
            attempts = atts;
        }));
        promises.push(self.getGradeFromGradebook(quiz.course, quiz.coursemodule, true, siteId).then(function(gradebookData) {
            if (typeof gradebookData.grade != 'undefined') {
                return self.getFeedbackForGrade(quiz.id, gradebookData.grade, true, siteId);
            }
        }));
        promises.push(self.getAttemptAccessInformation(quiz.id, 0, false, true, siteId)); // Last attempt.

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
            revision = self.getQuizRevisionFromAttempts(attempts);
            timemod = self.getQuizTimemodifiedFromAttempts(attempts);

            return $mmFilepool.getPackageStatus(siteId, component, quiz.coursemodule, revision, timemod);
        }).then(function(status) {
            if (status !== mmCoreNotDownloaded) {
                // Quiz was downloaded, set the new status.
                // If no attempts or last is finished we'll mark it as not downloaded to show download icon.
                var isLastFinished = !attempts.length || self.isAttemptFinished(attempts[attempts.length - 1].state),
                    newStatus = isLastFinished ? mmCoreNotDownloaded : mmCoreDownloaded;
                return $mmFilepool.storePackageStatus(siteId, component, quiz.coursemodule, newStatus, revision, timemod);
            }
        }).finally(function() {
            if (scope) {
                scope.$destroy();
            }
        });
    };

    /**
     * Process an attempt, saving its data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#processAttempt
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} data          Data to save.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {Boolean} finish       True to finish the quiz, false otherwise.
     * @param  {Boolean} timeup       True if the quiz time is up, false otherwise.
     * @param  {Boolean} offline      True if attempt is offline.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved in success, rejected otherwise.
     */
    self.processAttempt = function(quiz, attempt, data, preflightData, finish, timeup, offline, siteId) {
        var promise;

        try {
            self.blockQuiz(siteId, quiz.id); // Block quiz so it cannot be synced.

            if (offline) {
                promise = processOfflineAttempt(quiz, attempt, data, preflightData, finish, siteId);
            } else {
                promise = $mmaModQuizOnline.processAttempt(attempt.id, data, preflightData, finish, timeup, siteId);
            }

            return promise.finally(function() {
                self.unblockQuiz(siteId, quiz.id);
            });
        } catch(ex) {
            self.unblockQuiz(siteId, quiz.id);
            console.error(ex);
            return $q.reject();
        }
    };

    /**
     * Process an offline attempt, saving its data.
     *
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} data          Data to save.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {Boolean} finish       True to finish the quiz, false otherwise.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved in success, rejected otherwise.
     */
    function processOfflineAttempt(quiz, attempt, data, preflightData, finish, siteId) {
        // Get attempt summary to have the list of questions.
        return self.getAttemptSummary(attempt.id, preflightData, true, false, siteId).then(function(questionArray) {
            // Convert the question array to an object.
            var questions = {};
            questionArray.forEach(function(question) {
                questions[question.slot] = question;
            });
            return $mmaModQuizOffline.processAttempt(quiz, attempt, questions, data, finish, siteId);
        });
    }

    /**
     * Check if it's a graded quiz. Based on Moodle's quiz_has_grades.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#quizHasGrades
     * @param {Object} quiz Quiz.
     * @return {Boolean}    True if quiz is graded, false otherwise.
     */
    self.quizHasGrades = function(quiz) {
        return quiz.grade >= 0.000005 && quiz.sumgrades >= 0.000005;
    };

    /**
     * Convert the raw grade stored in $attempt into a grade out of the maximum grade for this quiz.
     * Based on Moodle's quiz_rescale_grade.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#rescaleGrade
     * @param  {Number} rawGrade       The unadjusted grade, for example attempt.sumgrades.
     * @param  {Object} quiz           Quiz.
     * @param  {Boolean|String} format True to format the results for display, 'question' to format a question grade
     *                                 (different number of decimal places), false to not format it.
     * @return {String|Float}          Grade to display.
     */
    self.rescaleGrade = function(rawGrade, quiz, format) {
        var grade;
        if (typeof format == 'undefined') {
            format = true;
        }

        rawGrade = parseFloat(rawGrade);
        if (!isNaN(rawGrade)) {
            if (quiz.sumgrades >= 0.000005) {
                grade = rawGrade * quiz.grade / quiz.sumgrades;
            } else {
                grade = 0;
            }
        }

        if (format === 'question') {
            grade = self.formatGrade(grade, self.getGradeDecimals(quiz));
        } else if (format) {
            grade = self.formatGrade(grade, quiz.decimalpoints);
        }
        return grade;
    };

    /**
     * Save an attempt data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#saveAttempt
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} data          Data to save.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {Boolean} offline      True if attempt is offline.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved in success, rejected otherwise.
     */
    self.saveAttempt = function(quiz, attempt, data, preflightData, offline, siteId) {
        var promise;

        try {
            self.blockQuiz(siteId, quiz.id); // Block quiz so it cannot be synced.

            if (offline) {
                promise = processOfflineAttempt(quiz, attempt, data, preflightData, false, siteId);
            } else {
                promise = $mmaModQuizOnline.saveAttempt(attempt.id, data, preflightData, siteId);
            }

            return promise.finally(function() {
                self.unblockQuiz(siteId, quiz.id);
            });
        } catch(ex) {
            self.unblockQuiz(siteId, quiz.id);
            console.error(ex);
            return $q.reject();
        }
    };

    /**
     * Check if time left should be shown.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#shouldShowTimeLeft
     * @param  {String[]} rules  List of active rules names.
     * @param  {Number} timeLeft Seconds left.
     * @return {Boolean}         True if should be displayed, false otherwise.
     */
    self.shouldShowTimeLeft = function(rules, attempt, endTime) {
        var timeNow = $mmUtil.timestamp();
        if (attempt.state != self.ATTEMPT_IN_PROGRESS) {
            return false;
        }
        return $mmaModQuizAccessRulesDelegate.shouldShowTimeLeft(rules, attempt, endTime, timeNow);
    };

    /**
     * Start an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#startAttempt
     * @param  {Number} quizId        Quiz ID.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {Boolean} forceNew     Whether to force a new attempt or not.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with the attempt data.
     */
    self.startAttempt = function(quizId, preflightData, forceNew, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    quizid: quizId,
                    preflightdata: $mmUtil.objectToArrayOfObjects(preflightData, 'name', 'value', true),
                    forcenew: forceNew ? 1 : 0
                };

            return site.write('mod_quiz_start_attempt', params).then(function(response) {
                if (response && response.warnings && response.warnings.length) {
                    // Reject with the first warning.
                    return $q.reject(response.warnings[0].message);
                } else if (response && response.attempt) {
                    return response.attempt;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Unblock a quiz so it can be synced.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#unblockQuiz
     * @param  {String} siteId Site ID.
     * @param  {Number} quizId Quiz ID.
     * @return {Void}
     */
    self.unblockQuiz = function(siteId, quizId) {
        if (blockedQuizzes[siteId]) {
            blockedQuizzes[siteId][quizId] = false;
        }
    };

    return self;
});
