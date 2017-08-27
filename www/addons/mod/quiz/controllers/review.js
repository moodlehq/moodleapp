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
            $ionicScrollDelegate, $translate, $q, mmaModQuizComponent, $mmQuestionHelper, $mmSideMenu, $timeout) {
    $log = $log.getInstance('mmaModQuizReviewCtrl');

    var quizId = $stateParams.quizid,
        courseId = $stateParams.courseid,
        attemptId = $stateParams.attemptid,
        currentPage = $stateParams.page,
        quiz,
        options,
        attempt,
        errorPasing = false,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModQuizReviewScroll');

    $scope.isReview = true;
    $scope.component = mmaModQuizComponent;
    $scope.showAll = currentPage == -1;

    // Convenience function to get the quiz data.
    function fetchData() {
        return $mmaModQuiz.getQuizById(courseId, quizId).then(function(quizData) {
            quiz = quizData;
            $scope.componentId = quiz.coursemodule;

            return $mmaModQuiz.getCombinedReviewOptions(quiz.id).then(function(result) {
                options = result;

                // Load the TOC.
                return loadToc().then(function() {
                    // Load questions.
                    return loadPage(currentPage);
                });
            });
        }).catch(function(message) {
            return $mmaModQuizHelper.showError(message);
        });
    }

    // Load TOC to navigate to questions.
    function loadToc() {
        return $mmaModQuiz.getAttemptReview(attemptId, -1).then(function(reviewData) {
            var lastQuestion = reviewData.questions[reviewData.questions.length - 1];
            angular.forEach(reviewData.questions, function(question) {
                question.stateClass = $mmQuestionHelper.getQuestionStateClass(question.state);
            });
            $scope.toc = reviewData.questions;
            $scope.numPages = lastQuestion ? lastQuestion.page + 1 : 0;
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
            $scope.nextPage = page == -1 ? undefined : page + 1;
            $scope.previousPage = page - 1;
            attempt.currentpage = page;

            angular.forEach($scope.questions, function(question) {
                // Get the readable mark for each question.
                question.readableMark = $mmaModQuizHelper.getQuestionMarkFromHtml(question.html);
                // Extract the question info box.
                $mmQuestionHelper.extractQuestionInfoBox(question, '.info');
                // Set the preferred behaviour.
                question.preferredBehaviour = quiz.preferredbehaviour;
            });
        });
    }

    // Calculate review summary data.
    function setSummaryCalculatedData(reviewData) {
        var timeTaken,
            grade = reviewData.grade,
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

            // Treat additional data.
            angular.forEach($scope.additionalData, function(data) {
                // Remove help links from additional data.
                data.content = $mmUtil.removeElementFromHtml(data.content, '.helptooltip');
            });
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

    // Scroll to a certain question.
    function scrollToQuestion(slot) {
        $mmUtil.scrollToElement(document, '#mma-mod_quiz-question-' + slot, scrollView);
    }

    // Fetch data.
    fetchData().then(function() {
        $mmaModQuiz.logViewAttemptReview(attemptId);
    }).finally(function() {
        $scope.dataLoaded = true;
    });

    // Load a certain page.
    $scope.loadPage = function(page, fromToc, slot) {
        if (typeof slot != 'undefined' && (attempt.currentpage == -1 || page == currentPage)) {
            scrollToQuestion(slot);
            return;
        } else if (page == currentPage) {
            // If the user is navigating to the current page and no question specified, we do nothing.
            return;
        }

        $scope.dataLoaded = false;
        scrollView.scrollTop();

        return loadPage(page).catch(function(message) {
            return $mmaModQuizHelper.showError(message);
        }).finally(function() {
            $scope.dataLoaded = true;
            scrollView.resize(); // Call resize to recalculate scroll area.

            if (typeof slot != 'undefined') {
                // Scroll to the question. Give some time to the questions to render.
                $timeout(function() {
                    scrollToQuestion(slot);
                }, 2000);
            }
        });
    };

    // Switch mode: all questions in same page OR one page at a time.
    $scope.switchMode = function() {
        $scope.showAll = !$scope.showAll;
        // Load all questions or first page, depending on the mode.
        $scope.loadPage($scope.showAll ? -1 : 0);
    };

    // Pull to refresh.
    $scope.refreshData = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Function to call when an error parsing the questions occur.
    $scope.abortQuiz = function() {
        if (!errorPasing) {
            errorPasing = true;
            $mmUtil.showErrorModal('mma.mod_quiz.errorparsequestions', true);
        }
    };

    // Setup TOC right side menu.
    $mmSideMenu.showRightSideMenu('addons/mod/quiz/templates/toc.html', $scope);
});
