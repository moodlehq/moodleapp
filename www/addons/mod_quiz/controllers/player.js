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
.controller('mmaModQuizPlayerCtrl', function($scope, $stateParams, $mmaModQuiz, $mmaModQuizHelper, $q, $mmUtil) {
    var quizId = $stateParams.quizid,
        courseId = $stateParams.courseid,
        moduleUrl = $stateParams.moduleurl,
        quiz,
        accessInfo,
        attempt,
        preflightData = {}, // Preflight data to send to WS (like password).
        newAttempt;

    $scope.moduleUrl = moduleUrl;
    $scope.quizAborted = false;
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
            return $mmaModQuiz.getAttemptData(attempt.id, 0, preflightData, true).then(function(data) {
                $scope.closeModal && $scope.closeModal(); // Close modal if needed.
                $scope.attempt = attempt;
                $scope.questions = data.questions;

                angular.forEach($scope.questions, function(question) {
                    question.readableMark = $mmaModQuizHelper.getQuestionMarkFromHtml(question.html);
                });
            });
        }).catch(function(message) {
            $mmaModQuizHelper.showError(message, 'mm.core.error');
        });
    }

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

});
