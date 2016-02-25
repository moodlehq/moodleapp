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
 * Quiz player controller.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc controller
 * @name mmaModQuizPlayerCtrl
 */
.controller('mmaModQuizPlayerCtrl', function($log, $scope, $stateParams, $mmaModQuiz, $mmaModQuizHelper, $q, $mmUtil,
            $ionicPopover, $ionicScrollDelegate, $rootScope, $ionicPlatform, $translate) {
    $log = $log.getInstance('mmaModQuizPlayerCtrl');

    var quizId = $stateParams.quizid,
        courseId = $stateParams.courseid,
        moduleUrl = $stateParams.moduleurl,
        quiz,
        accessInfo,
        attempt,
        preflightData = {}, // Preflight data to send to WS (like password).
        newAttempt,
        originalBackFunction = $rootScope.$ionicGoBack,
        unregisterHardwareBack,
        leaving = false;

    $scope.moduleUrl = moduleUrl;
    $scope.quizAborted = false;
    $scope.answers = {};
    $scope.preflightData = {
        password: ''
    };

    // Convenience function to start the player.
    function start(password) {
        var promise;
        $scope.dataLoaded = false;

        if (typeof password != 'undefined') {
            // Password submitted, get attempt data.
            promise = getAttemptData(password);
        } else {
            // Fetch data.
            promise = fetchData().then(function() {
                return getAttemptData();
            });
        }

        promise.finally(function() {
            $scope.dataLoaded = true;
        });
    }

    // Convenience function to get the quiz data.
    function fetchData() {
        return $mmaModQuiz.getQuizById(courseId, quizId).then(function(quizData) {
            quiz = quizData;
            quiz.isSequential = $mmaModQuiz.isNavigationSequential(quiz);

            if (quiz.timelimit > 0) {
                $scope.isTimed = true;
                $mmUtil.formatTime(quiz.timelimit).then(function(time) {
                    quiz.readableTimeLimit = time;
                });
            }

            $scope.quiz = quiz;

            // Get access information for the quiz.
            return $mmaModQuiz.getAccessInformation(quiz.id, 0, true).then(function(info) {
                accessInfo = info;
                $scope.requirePassword = accessInfo.ispreflightcheckrequired;

                // Get attempts to determine last attempt.
                return $mmaModQuiz.getUserAttempts(quiz.id, 'all', true, true).then(function(attempts) {
                    if (!attempts.length) {
                        newAttempt = true;
                    } else {
                        attempt = attempts[attempts.length - 1];
                        newAttempt = $mmaModQuiz.isAttemptFinished(attempt.state);
                    }
                });
            });
        }).catch(function(message) {
            return $mmaModQuizHelper.showError(message);
        });
    }

    // Convenience function to start/continue the attempt.
    function getAttemptData(password) {
        // Check if we need to show a confirm modal (requires password or quiz has time limit).
        // 'password' param will be != undefined even if password is not required, so we can use it to tell
        // if the user clicked the modal button or not.
        if (typeof password == 'undefined' && ($scope.requirePassword || $scope.isTimed)) {
            // We need to show confirm modal and the user hasn't clicked the confirm button. Show the modal.
            if (!$scope.modal) {
                $mmaModQuizHelper.initConfirmStartModal($scope).then(function() {
                    $scope.modal.show();
                });
            } else if (!$scope.modal.isShown()) {
                $scope.modal.show();
            }
            return $q.reject();
        }

        var promise;
        preflightData.quizpassword = password;

        if (newAttempt) {
            promise = $mmaModQuiz.startAttempt(quiz.id, preflightData).then(function(att) {
                attempt = att;
            });
        } else {
            promise = $q.when();
        }

        return promise.then(function() {
            // Get the attempt data.
            return loadPage(attempt.currentpage).then(function() {
                $scope.closeModal && $scope.closeModal(); // Close modal if needed.
                $scope.attempt = attempt;
                $scope.toc = $mmaModQuiz.getTocFromLayout(attempt.layout);
            });
        }).catch(function(message) {
            return $mmaModQuizHelper.showError(message, 'mm.core.error');
        });
    }

    // Load a page questions.
    function loadPage(page) {
        return $mmaModQuiz.getAttemptData(attempt.id, page, preflightData, true).then(function(data) {
            // Remove all answers stored since each page has its own questions.
            $mmUtil.emptyObject($scope.answers);

            $scope.questions = data.questions;
            attempt.currentpage = page;
            $scope.nextPage = data.nextpage;
            $scope.previousPage = quiz.isSequential ? -1 : page - 1;

            angular.forEach($scope.questions, function(question) {
                // Get the readable mark for each question.
                question.readableMark = $mmaModQuizHelper.getQuestionMarkFromHtml(question.html);
                // Remove the question info box so it's not in the question HTML anymore.
                question.html = $mmUtil.removeElementFromHtml(question.html, '.info');
            });

            // Mark the page as viewed. We'll ignore errors in this call.
            $mmaModQuiz.logViewAttempt(attempt.id, page);
        });
    }

    // Function called when the user wants to leave the player. Save the attempt before leaving.
    function leavePlayer() {
        if (leaving) {
            return;
        }

        leaving = true;
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        $mmaModQuiz.processAttempt(attempt.id, $scope.answers, false, false).catch(function() {
            // Save attempt failed. Show confirmation.
            modal.dismiss();
            return $mmUtil.showConfirm($translate('mma.mod_quiz.confirmleavequizonerror'));
        }).then(function() {
            // Attempt data successfully saved or user confirmed to leave. Leave player.
            modal.dismiss();
            originalBackFunction();
        }).finally(function() {
            leaving = false;
        });
    }

    // Override Ionic's back button behavior.
    $rootScope.$ionicGoBack = leavePlayer;

    // Override Android's back button. We set a priority of 101 to override the "Return to previous view" action.
    unregisterHardwareBack = $ionicPlatform.registerBackButtonAction(leavePlayer, 101);

    // Start the player when the controller is loaded.
    start();

    // Start the player.
    $scope.start = function(password) {
        start(password);
    };

    // Function to call to abort the quiz.
    $scope.abortQuiz = function() {
        $scope.quizAborted = true;
    };

    // Load a certain page.
    $scope.loadPage = function(page, fromToc) {
        if (page == attempt.currentpage || (fromToc && quiz.isSequential)) {
            // If the user is navigating to the current page we do nothing.
            // Also, in sequential quizzes we don't allow navigating using the TOC.
            return;
        }

        $scope.dataLoaded = false;
        $ionicScrollDelegate.scrollTop();
        $scope.popover.hide(); // Hide popover if shown.

        // First try to save the attempt data.
        $mmaModQuiz.processAttempt(attempt.id, $scope.answers, false, false).catch(function(message) {
            return $mmaModQuizHelper.showError(message, 'mma.mod_quiz.errorsaveattempt');
        }).then(function() {
            // Attempt data successfully saved, load the page.
            return loadPage(page).catch(function(message) {
                return $mmaModQuizHelper.showError(message, 'mma.mod_quiz.errorgetquestions');
            });
        }).finally(function() {
            $scope.dataLoaded = true;
            $ionicScrollDelegate.resize(); // Call resize to recalculate scroll area.
        });
    };

    // Setup TOC popover.
    $ionicPopover.fromTemplateUrl('addons/mod_quiz/templates/toc.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });

    $scope.$on('$destroy', function() {
        // Restore original back functions.
        unregisterHardwareBack();
        $rootScope.$ionicGoBack = originalBackFunction;
    });
});
