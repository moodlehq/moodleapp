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
 * Quiz attempt review controller.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc controller
 * @name mmaModQuizReviewCtrl
 */
.controller('mmaModQuizReviewCtrl', function($log, $scope, $stateParams, $mmaModQuiz, $mmaModQuizHelper, $mmUtil,
            $ionicPopover, $ionicScrollDelegate, $translate, $q, mmaModQuizAttemptComponent) {
    $log = $log.getInstance('mmaModQuizReviewCtrl');

    var quizId = $stateParams.quizid,
        courseId = $stateParams.courseid,
        attemptId = $stateParams.attemptid,
        quiz,
        options,
        currentPage,
        attempt;

    $scope.isReview = true;
    $scope.component = mmaModQuizAttemptComponent;
    $scope.componentId = attemptId;

    // Convenience function to get the quiz data.
    function fetchData() {
        return $mmaModQuiz.getQuizById(courseId, quizId).then(function(quizData) {
            quiz = quizData;

            return $mmaModQuiz.getCombinedReviewOptions(quiz.id).then(function(result) {
                options = result;

                // Load all questions.
                return loadPage(-1);
            });

        }).catch(function(message) {
            return $mmaModQuizHelper.showError(message);
        });
    }

    // Load a review page.
    function loadPage(page) {
        return $mmaModQuiz.getAttemptReview(attemptId, page).then(function(reviewData) {
            currentPage = page;
            attempt = reviewData.attempt;

            // Set the summary data.
            setSummaryCalculatedData(reviewData);

            $scope.attempt = attempt;
            $scope.questions = reviewData.questions;
            $scope.toc = $mmaModQuiz.getTocFromLayout(attempt.layout);
            $scope.nextPage = page == -1 ? undefined : page + 1;
            $scope.previousPage = page - 1;
            attempt.currentpage = page;

            angular.forEach($scope.questions, function(question) {
                // Get the readable mark for each question.
                question.readableMark = $mmaModQuizHelper.getQuestionMarkFromHtml(question.html);
                // Remove the question info box so it's not in the question HTML anymore.
                question.html = $mmUtil.removeElementFromHtml(question.html, '.info');
            });
        });
    }

    // Calculate review summary data.
    function setSummaryCalculatedData(reviewData) {
        var timeTaken,
            grade = reviewData.rescaledgrade,
            gradeObject;

        attempt.readableState = $mmaModQuiz.getAttemptReadableStateName(attempt.state);
        if (attempt.state == $mmaModQuiz.ATTEMPT_FINISHED) {
            $scope.showCompleted = true;
            $scope.additionalData = reviewData.additionaldata;

            timeTaken = attempt.timefinish - attempt.timestart;
            if (timeTaken) {
                // Format timeTaken.
                $mmUtil.formatTime(timeTaken).then(function(takenTime) {
                    attempt.timeTaken = takenTime;
                });
                // Calculate overdue time.
                if (quiz.timelimit && timeTaken > quiz.timelimit + 60) {
                    $mmUtil.formatTime(timeTaken - quiz.timelimit).then(function(overTime) {
                        attempt.overTime = overTime;
                    });
                }
            }

            // Treat grade.
            if (options.someoptions.marks >= $mmaModQuiz.QUESTION_OPTIONS_MARK_AND_MAX && $mmaModQuiz.quizHasGrades(quiz)) {
                if (grade === null || typeof grade == 'undefined') {
                    attempt.readableGrade = $mmaModQuiz.formatGrade(grade, quiz.decimalpoints);
                } else {
                    // Show raw marks only if they are different from the grade (like on the entry page).
                    if (quiz.grade != quiz.sumgrades) {
                        attempt.readableMark = $translate.instant('mma.mod_quiz.outofshort', {$a: {
                            grade: $mmaModQuiz.formatGrade(attempt.sumgrades, quiz.decimalpoints),
                            maxgrade: $mmaModQuiz.formatGrade(quiz.sumgrades, quiz.decimalpoints)
                        }});
                    }

                    // Now the scaled grade.
                    gradeObject = {
                        grade: $mmaModQuiz.formatGrade(grade, quiz.decimalpoints),
                        maxgrade: $mmaModQuiz.formatGrade(quiz.grade, quiz.decimalpoints)
                    };
                    if (quiz.grade != 100) {
                        gradeObject.percent = $mmUtil.roundToDecimals(attempt.sumgrades * 100 / quiz.sumgrades, 0);
                        attempt.readableGrade = $translate.instant('mma.mod_quiz.outofpercent', {$a: gradeObject});
                    } else {
                        attempt.readableGrade = $translate.instant('mma.mod_quiz.outof', {$a: gradeObject});
                    }
                }
            }
        }
    }

    // Refreshes data.
    function refreshData() {
        var promises = [];
        promises.push($mmaModQuiz.invalidateQuizData(courseId));
        promises.push($mmaModQuiz.invalidateCombinedReviewOptionsForUser(quizId));
        promises.push($mmaModQuiz.invalidateAttemptReview(attemptId));

        return $q.all(promises).finally(function() {
            return fetchData();
        });
    }

    // Fetch data.
    fetchData().then(function() {
        $mmaModQuiz.logViewAttemptSummary(attemptId);
    }).finally(function() {
        $scope.dataLoaded = true;
    });

    // Load a certain page.
    $scope.loadPage = function(page) {
        if (page == currentPage) {
            // If the user is navigating to the current page we do nothing.
            return;
        }

        $scope.dataLoaded = false;
        $ionicScrollDelegate.scrollTop();
        $scope.popover.hide(); // Hide popover if shown.

        return loadPage(page).catch(function(message) {
            return $mmaModQuizHelper.showError(message);
        }).finally(function() {
            $scope.dataLoaded = true;
            $ionicScrollDelegate.resize(); // Call resize to recalculate scroll area.
        });
    };

    // Pull to refresh.
    $scope.refreshData = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Setup TOC popover.
    $ionicPopover.fromTemplateUrl('addons/mod_quiz/templates/toc.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });
});
