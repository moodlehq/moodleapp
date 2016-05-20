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
 * Quiz attempt controller.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc controller
 * @name mmaModQuizAttemptCtrl
 */
.controller('mmaModQuizAttemptCtrl', function($scope, $stateParams, $mmaModQuiz, $q, $mmaModQuizHelper) {
    var attemptId = $stateParams.attemptid,
        quizId = $stateParams.quizid,
        courseId = $stateParams.courseid,
        quiz,
        attempt;

    $scope.courseId = courseId;

    // Convenience function to get the quiz data.
    function fetchData() {
        return $mmaModQuiz.getQuizById(courseId, quizId).then(function(quizData) {
            quiz = quizData;
            $scope.quiz = quiz;

            return fetchAttempt();
        }).catch(function(message) {
            return $mmaModQuizHelper.showError(message, 'mma.mod_quiz.errorgetattempt');
        });
    }

    // Convenience function to get the attempt.
    function fetchAttempt() {
        var promises = [],
            options,
            accessInfo;

        // Get all the attempts and search the one we want.
        promises.push($mmaModQuiz.getUserAttempts(quiz.id).then(function(attempts) {
            angular.forEach(attempts, function(att) {
                if (att.id == attemptId) {
                    attempt = att;
                }
            });

            if (!attempt) {
                // Attempt not found, error.
                return $q.reject();
            }

            // Load flag to show if attempt is finished but not synced.
            return $mmaModQuiz.loadFinishedOfflineData([attempt]);
        }));

        promises.push($mmaModQuiz.getCombinedReviewOptions(quiz.id).then(function(opts) {
            options = opts;
        }));

        promises.push($mmaModQuiz.getQuizAccessInformation(quiz.id).then(function(aI) {
            accessInfo = aI;
            if (accessInfo.canreviewmyattempts) {
                return $mmaModQuiz.getAttemptReview(attemptId, -1).catch(function() {
                    accessInfo.canreviewmyattempts = false;
                });
            }
        }));

        return $q.all(promises).then(function() {

            // Determine fields to show.
            $mmaModQuizHelper.setQuizCalculatedData(quiz, options);
            quiz.showReviewColumn = accessInfo.canreviewmyattempts;

            // Get readable data for the attempt.
            $mmaModQuizHelper.setAttemptCalculatedData(quiz, attempt, false);

            if (quiz.showFeedbackColumn && $mmaModQuiz.isAttemptFinished(attempt.state) &&
                        options.someoptions.overallfeedback && angular.isNumber(attempt.rescaledGrade)) {
                return $mmaModQuiz.getFeedbackForGrade(quiz.id, attempt.rescaledGrade).then(function(response) {
                    attempt.feedback = response.feedbacktext;
                });
            } else {
                delete attempt.feedback;
            }
        }).then(function() {
            $scope.attempt = attempt;
        });
    }

    // Refreshes data.
    function refreshData() {
        var promises = [];
        promises.push($mmaModQuiz.invalidateQuizData(courseId));
        promises.push($mmaModQuiz.invalidateUserAttemptsForUser(quizId));
        promises.push($mmaModQuiz.invalidateQuizAccessInformation(quizId));
        promises.push($mmaModQuiz.invalidateCombinedReviewOptionsForUser(quizId));
        promises.push($mmaModQuiz.invalidateAttemptReview(attemptId));
        if (typeof attempt.feedback != 'undefined') {
            promises.push($mmaModQuiz.invalidateFeedback(quizId));
        }

        return $q.all(promises).finally(function() {
            return fetchData();
        });
    }

    // Fetch the Quiz data.
    fetchData().finally(function() {
        $scope.attemptLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshAttempt = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

});
