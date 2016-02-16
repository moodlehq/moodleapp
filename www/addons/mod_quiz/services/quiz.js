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
.factory('$mmaModQuiz', function($log, $mmSite, $mmSitesManager, $q, $translate, $mmUtil, $mmText, $mmaModQuizQuestionsDelegate) {

    $log = $log.getInstance('$mmaModQuiz');

    var self = {},
        supportedRules = ['quizaccess_delaybetweenattempts', 'quizaccess_ipaddress', 'quizaccess_numattempts',
                            'quizaccess_openclosedate', 'quizaccess_password', 'quizaccess_safebrowser',
                            'quizaccess_securewindow', 'quizaccess_timelimit'];

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
        if (typeof grade == 'undefined' || grade == -1 || grade == null) {
            return $translate.instant('mma.mod_quiz.notyetgraded');
        }
        return $mmUtil.roundToDecimals(grade, decimals);
    };

    /**
     * Get cache key for get access information WS calls.
     *
     * @param {Number} quizId    Quiz ID.
     * @param {Number} attemptId Attempt ID.
     * @return {String}          Cache key.
     */
    function getAccessInformationCacheKey(quizId, attemptId) {
        return getAccessInformationCommonCacheKey(quizId) + ':' + attemptId;
    }

    /**
     * Get common cache key for get access information WS calls.
     *
     * @param {Number} quizId Quiz ID.
     * @return {String}       Cache key.
     */
    function getAccessInformationCommonCacheKey(quizId) {
        return 'mmaModQuiz:accessInformation:' + quizId;
    }

    /**
     * Get access information for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAccessInformation
     * @param {Number} quizId       Quiz ID.
     * @param {Number} attemptId    Attempt ID. 0 for user's last attempt.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the access information.
     */
    self.getAccessInformation = function(quizId, attemptId, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    quizid: quizId,
                    attemptid: attemptId
                },
                preSets = {
                    cacheKey: getAccessInformationCacheKey(quizId, attemptId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_quiz_get_access_information', params, preSets);
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
     * @param {Boolean} ignoreCache  True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the attempt data.
     */
    self.getAttemptData = function(attemptId, page, preflightData, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    attemptid: attemptId,
                    page: page,
                    preflightdata: treatPreflightData(preflightData)
                },
                preSets = {
                    cacheKey: getAttemptDataCacheKey(attemptId, page)
                };

            if (ignoreCache) {
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
     * Turn attempt's state into a readable state.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#getAttemptReadableState
     * @param  {Number} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {String[]}       List of state sentences.
     */
    self.getAttemptReadableState = function(quiz, attempt) {
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
     * @param {Number} attemptId Attempt ID.
     * @param {Number} page      Page number, -1 for all the questions in all the pages.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt review.
     */
    self.getAttemptReview = function(attemptId, page, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    attemptid: attemptId,
                    page: page
                },
                preSets = {
                    cacheKey: getAttemptReviewCacheKey(attemptId, page)
                };

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
     * @param {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the attempt summary.
     */
    self.getAttemptSummary = function(attemptId, preflightData, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    attemptid: attemptId,
                    preflightdata: treatPreflightData(preflightData)
                },
                preSets = {
                    cacheKey: getAttemptSummaryCacheKey(attemptId)
                };

            return site.read('mod_quiz_get_attempt_summary', params, preSets).then(function(response) {
                if (response && response.questions) {
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
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved with the combined review options.
     */
    self.getCombinedReviewOptions = function(quizId, siteId, userId) {
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
     * @param {Number} quizId   Quiz ID.
     * @param {Number} grade    Grade.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the feedback.
     */
    self.getFeedbackForGrade = function(quizId, grade, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {

            var params = {
                    quizid: quizId,
                    grade: grade
                },
                preSets = {
                    cacheKey: getFeedbackForGradeCacheKey(quizId, grade)
                };

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
     * @param  {Number} courseId Course ID.
     * @param  {Number} moduleId Quiz module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}         Promise resolved with an object containing the grade and the feedback.
     */
    self.getGradeFromGradebook = function(courseId, moduleId, siteId, userId) {
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
            if (type != 'random' && !$mmaModQuizQuestionsDelegate.isQuestionSupported('qtype_'+type)) {
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
            if (supportedRules.indexOf(name) == -1 && notSupported.indexOf(name) == -1) {
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
     * @param {Boolean} ignoreCache       True if it should ignore cached data (it will always fail in offline or server down).
     * @param {String} [siteId]           Site ID. If not defined, current site.
     * @param {Number} [userId]           User ID. If not defined use site's current user.
     * @return {Promise}                  Promise resolved with the attempts.
     */
    self.getUserAttempts = function(quizId, status, includePreviews, ignoreCache, siteId, userId) {
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

            if (ignoreCache) {
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
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved with the attempts.
     */
    self.getUserBestGrade = function(quizId, siteId, userId) {
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

            return site.read('mod_quiz_get_user_best_grade', params, preSets);
        });
    };

    /**
     * Invalidates access information for all attempts in a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAccessInformation
     * @param {Number} quizId   Quiz ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAccessInformation = function(quizId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getAccessInformationCommonCacheKey(quizId));
        });
    };

    /**
     * Invalidates access information for an attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#invalidateAccessInformationForAttempt
     * @param {Number} quizId    Quiz ID.
     * @param {Number} attemptId Attempt ID.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAccessInformationForAttempt = function(quizId, attemptId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAccessInformationCacheKey(quizId, attemptId));
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
     * Report an attempt as being viewed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuiz#logViewAttempt
     * @param {String} attemptId Attempt ID.
     * @param {Number} [page=0]  Page number.
     * @return {Promise}         Promise resolved when the WS call is successful.
     */
    self.logViewAttempt = function(attemptId, page) {
        if (typeof page == 'undefined') {
            page = 0;
        }

        var params = {
            attemptid: attemptId,
            page: page
        };
        return $mmSite.write('mod_quiz_view_attempt', params);
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

        rawGrade = parseInt(rawGrade, 10);
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
                    preflightdata: treatPreflightData(preflightData),
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
     * Treat preflight data to be sent to a WS.
     * Converts an object of type key => value into an array of type 0 => {name: key, value: value}.
     *
     * @param  {Object} data Data to treat.
     * @return {Object[]}    Treated data.
     */
    function treatPreflightData(data) {
        var treated = [];
        angular.forEach(data, function(value, key) {
            treated.push({
                name: key,
                value: value
            });
        });
        return treated;
    }

    return self;
});
