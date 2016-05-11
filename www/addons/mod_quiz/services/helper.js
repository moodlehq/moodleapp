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
 * Helper to gather some common quiz functions.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizHelper
 */
.factory('$mmaModQuizHelper', function($mmaModQuiz, $mmUtil, $q, $ionicModal, $mmaModQuizAccessRulesDelegate, $translate,
            $mmaModQuizOffline, $mmaModQuizSync, $timeout) {

    var self = {};

    /**
     * Validate a preflight data or show a modal to input the preflight data if required.
     * It calls $mmaModQuiz#startAttempt if a new attempt is needed.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#checkPreflightData
     * @param  {Object} scope             Scope.
     * @param  {Object} quiz              Quiz.
     * @param  {Object} quizAccessInfo    Quiz access info returned by $mmaModQuiz#getQuizAccessInformation.
     * @param  {Object} [attempt]         Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param  {Boolean} offline          True if attempt is offline.
     * @param  {Boolean} fromModal        True if sending data using preflight modal, false otherwise.
     * @return {Promise}                  Promise resolved when the preflight data is validated.
     */
    self.checkPreflightData = function(scope, quiz, quizAccessInfo, attempt, offline, fromModal) {
        var promise,
            preflightRequired = $mmaModQuizAccessRulesDelegate.isPreflightCheckRequired(quizAccessInfo.activerulenames, attempt);

        if (preflightRequired && !fromModal) {
            // Preflight check is required but no preflightData has been sent. Show a modal with the preflight form.
            if (!scope.modal) {
                // Modal hasn't been created yet. Create it and show it.
                return self.initPreflightModal(scope, quizAccessInfo, attempt).catch(function(error) {
                    return self.showError(error, 'Error initializing preflight modal.');
                }).then(function() {
                    scope.modal.show();
                    return $q.reject();
                });
            } else if (!scope.modal.isShown()) {
                // Modal is created but not shown. Show it.
                scope.modal.show();
            }
            return $q.reject();
        }

        // Hide modal if needed.
        scope.modal && scope.modal.hide();

        // Get some fixed preflight data from access rules (data that doesn't require user interaction).
        $mmaModQuizAccessRulesDelegate.getFixedPreflightData(quizAccessInfo.activerulenames, attempt, scope.preflightData);

        if (attempt) {
            if (attempt.state != $mmaModQuiz.ATTEMPT_OVERDUE && !attempt.finishedOffline) {
                // We're continuing an attempt. Call getAttemptData to validate the preflight data.
                var page = attempt.currentpage;
                promise = $mmaModQuiz.getAttemptData(attempt.id, page, scope.preflightData, offline, true).then(function() {
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
                promise = $mmaModQuiz.getAttemptSummary(attempt.id, scope.preflightData, offline, true);
            }
        } else {
            // We're starting a new attempt, call startAttempt.
            promise = $mmaModQuiz.startAttempt(quiz.id, scope.preflightData).then(function(att) {
                attempt = att;
            });
        }

        return promise.then(function() {
            // Preflight data validated. Close modal if needed.
            return attempt;
        }).catch(function(error) {
            // Show modal again. We need to wait a bit because if it's called too close to .hide then it won't be shown.
            $timeout(function() {
                scope.modal && scope.modal.show();
            }, 500);
            return self.showError(error, 'mm.core.error');
        });
    };

    /**
     * Gets the mark string from a question HTML.
     * Example result: "Marked out of 1.00".
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#getQuestionMarkFromHtml
     * @param  {String} html Question's HTML.
     * @return {String}      Question's mark.
     */
    self.getQuestionMarkFromHtml = function(html) {
        return $mmUtil.getContentsOfElement(angular.element(html), '.grade');
    };

    /**
     * Get quiz sync time in a human readable format.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#getQuizReadableSyncTime
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the readable time.
     */
    self.getQuizReadableSyncTime = function(quizId, siteId) {
        return $mmaModQuizSync.getQuizSyncTime(quizId, siteId).then(function(time) {
            return self.getReadableTimeFromTimestamp(time);
        });
    };

    /**
     * Given a timestamp return it in a human readable format.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#getReadableTimeFromTimestamp
     * @param  {Number} timestamp Timestamp
     * @return {String}           Human readable time.
     */
    self.getReadableTimeFromTimestamp = function(timestamp) {
        if (!timestamp) {
            return $translate('mm.core.none');
        } else {
            return moment(timestamp).format('LLL');
        }
    };

    /**
     * Init a preflight modal, adding it to the scope.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#initPreflightModal
     * @param  {Object} scope          Scope.
     * @param  {Object} quizAccessInfo Quiz access info returned by $mmaModQuiz#getQuizAccessInformation.
     * @param  {Object} [attempt]      Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @return {Promise}               Promise resolved when the modal is initialized.
     */
    self.initPreflightModal = function(scope, quizAccessInfo, attempt) {
        var notSupported = [],
            directives = [],
            handlers = [];

        angular.forEach(quizAccessInfo.activerulenames, function(rule) {
            var handler = $mmaModQuizAccessRulesDelegate.getAccessRuleHandler(rule);
            if (handler) {
                if (handler.isPreflightCheckRequired(attempt)) {
                    handlers.push(handler);
                    directives.push(handler.getPreflightDirectiveName());
                }
            } else {
                notSupported.push(rule);
            }
        });

        if (notSupported.length) {
            var error = $translate.instant('mma.mod_quiz.errorrulesnotsupported') + ' ' + JSON.stringify(notSupported);
            return $q.reject(error);
        }

        scope.accessRulesDirectives = directives;

        return $ionicModal.fromTemplateUrl('addons/mod_quiz/templates/preflight-modal.html', {
            scope: scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
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
    };

    /**
     * Add some calculated data to the attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#setAttemptCalculatedData
     * @param  {Object} quiz        Quiz.
     * @param  {Object} attempt     Attempt.
     * @param  {Boolean} highlight  True if we should check if attempt should be highlighted, false otherwise.
     * @param  {Number} [bestGrade] Quiz's best grade (formatted). Required if highlight=true.
     *                              the due date if the attempt's state is "overdue".
     * @return {Void}
     */
    self.setAttemptCalculatedData = function(quiz, attempt, highlight, bestGrade) {

        attempt.rescaledGrade = $mmaModQuiz.rescaleGrade(attempt.sumgrades, quiz, false);
        attempt.finished = $mmaModQuiz.isAttemptFinished(attempt.state);
        attempt.readableState = $mmaModQuiz.getAttemptReadableState(quiz, attempt);

        if (quiz.showMarkColumn && attempt.finished) {
            attempt.readableMark = $mmaModQuiz.formatGrade(attempt.sumgrades, quiz.decimalpoints);
        } else {
            attempt.readableMark = '';
        }

        if (quiz.showGradeColumn && attempt.finished) {
            attempt.readableGrade = $mmaModQuiz.formatGrade(attempt.rescaledGrade, quiz.decimalpoints);
            // Highlight the highest grade if appropriate.
            attempt.highlightGrade = highlight && !attempt.preview && attempt.state == $mmaModQuiz.ATTEMPT_FINISHED &&
                                        attempt.readableGrade == bestGrade;
        } else {
            attempt.readableGrade = '';
        }
    };

    /**
     * Add some calculated data to the quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#setQuizCalculatedData
     * @param  {Object} quiz    Quiz.
     * @param  {Object} options Options returned by $mmaModQuiz#getCombinedReviewOptions.
     * @return {Void}
     */
    self.setQuizCalculatedData = function(quiz, options) {
        quiz.sumGradesFormatted = $mmaModQuiz.formatGrade(quiz.sumgrades, quiz.decimalpoints);
        quiz.gradeFormatted = $mmaModQuiz.formatGrade(quiz.grade, quiz.decimalpoints);

        quiz.showAttemptColumn = quiz.attempts != 1;
        quiz.showGradeColumn = options.someoptions.marks >= $mmaModQuiz.QUESTION_OPTIONS_MARK_AND_MAX &&
                                    $mmaModQuiz.quizHasGrades(quiz);
        quiz.showMarkColumn = quiz.showGradeColumn && quiz.grade != quiz.sumgrades;
        quiz.showFeedbackColumn = quiz.hasfeedback && options.alloptions.overallfeedback;
    };

    /**
     * Show an error message and returns a rejected promise.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#showError
     * @param  {String} [message]        Message to show.
     * @param  {String} [defaultMessage] Code of the message to show if message is not defined or empty.
     * @return {Promise}                 Rejected promise.
     */
    self.showError = function(message, defaultMessage) {
        defaultMessage = defaultMessage || 'mma.mod_quiz.errorgetquiz';
        if (message) {
            $mmUtil.showErrorModal(message);
        } else {
            $mmUtil.showErrorModal(defaultMessage, true);
        }
        return $q.reject();
    };

    return self;
});
