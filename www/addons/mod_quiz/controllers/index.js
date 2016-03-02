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
 * Quiz index controller.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc controller
 * @name mmaModQuizIndexCtrl
 */
.controller('mmaModQuizIndexCtrl', function($scope, $stateParams, $mmaModQuiz, $mmCourse, $ionicPlatform, $q, $translate,
            $mmaModQuizHelper, $ionicHistory, $ionicScrollDelegate) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        quiz,
        overallStats,
        attempts,
        options,
        bestGrade,
        gradebookData,
        accessInfo,
        moreAttempts,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModQuizIndexScroll');

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.isTablet = $ionicPlatform.isTablet();
    $scope.courseId = courseId;

    // Convenience function to get Quiz data.
    function fetchQuizData(refresh) {
        return $mmaModQuiz.getQuiz(courseId, module.id).then(function(quizData) {
            quiz = quizData;
            quiz.gradeMethodReadable = $mmaModQuiz.getQuizGradeMethod(quiz.grademethod);

            $scope.now = new Date().getTime();
            $scope.title = quiz.name || $scope.title;
            $scope.description = quiz.intro || $scope.description;
            $scope.quiz = quiz;

            return getAttempts().catch(function(message) {
                return $mmaModQuizHelper.showError(message);
            });

        }, function(message) {
            if (!refresh) {
                // Get quiz failed, retry without using cache since it might be a new activity.
                return refreshData();
            }
            return $mmaModQuizHelper.showError(message);
        });
    }

    // Convenience function to get Quiz attempts.
    function getAttempts() {

        // Get access information of last attempt (it also works if no attempts made).
        return $mmaModQuiz.getAccessInformation(quiz.id, 0).then(function(info) {
            accessInfo = info;
            $scope.accessRules = accessInfo.accessrules;
            quiz.showReviewColumn = accessInfo.canreviewmyattempts;
            $scope.unsupportedQuestions = $mmaModQuiz.getUnsupportedQuestions(accessInfo.questiontypes);
            $scope.unsupportedRules = $mmaModQuiz.getUnsupportedRules(accessInfo.activerulenames);

            // Get attempts.
            return $mmaModQuiz.getUserAttempts(quiz.id).then(function(atts) {
                attempts = atts;

                return treatAttempts().then(function() {
                    // Check if user can create/continue attempts.
                    if (attempts.length) {
                        var lastAttempt = attempts[attempts.length - 1];
                        moreAttempts = !$mmaModQuiz.isAttemptFinished(lastAttempt.state) || !accessInfo.isfinished;
                    } else {
                        moreAttempts = !accessInfo.isfinished;
                    }

                    $scope.attempts = attempts;

                    getButtonText();
                    return getResultInfo();
                });
            });
        });
    }

    // Treat user attempts.
    function treatAttempts() {
        if (!attempts || !attempts.length) {
            return $q.when();
        }

        var lastFinished = $mmaModQuiz.getLastFinishedAttemptFromList(attempts),
            promises = [];

        // Get combined review options.
        promises.push($mmaModQuiz.getCombinedReviewOptions(quiz.id).then(function(result) {
            options = result;
        }));

        // Get best grade.
        promises.push($mmaModQuiz.getUserBestGrade(quiz.id).then(function(best) {
            bestGrade = best;
        }));

        // Get gradebook grade.
        promises.push($mmaModQuiz.getGradeFromGradebook(courseId, module.id).then(function(data) {
            gradebookData = data;
        }));

        return $q.all(promises).then(function() {
            var quizGrade = typeof gradebookData.grade != 'undefined' ? gradebookData.grade : bestGrade.grade;
            quizGrade = $mmaModQuiz.formatGrade(quizGrade, quiz.decimalpoints);

            // Calculate data to construct the header of the attempts table.
            $mmaModQuizHelper.setQuizCalculatedData(quiz, options);

            overallStats = lastFinished && options.alloptions.marks >= $mmaModQuiz.QUESTION_OPTIONS_MARK_AND_MAX;

            // Calculate data to show for each attempt.
            angular.forEach(attempts, function(attempt) {
                // Highlight the highest grade if appropriate.
                var shouldHighlight = overallStats && quiz.grademethod == $mmaModQuiz.GRADEHIGHEST && attempts.length > 1;
                $mmaModQuizHelper.setAttemptCalculatedData(quiz, attempt, shouldHighlight, quizGrade);
            });
        });
    }

    // Get result info to show.
    function getResultInfo() {
        if (attempts.length && quiz.showGradeColumn && bestGrade.hasgrade && typeof gradebookData.grade != 'undefined') {

            var formattedGradebookGrade = $mmaModQuiz.formatGrade(gradebookData.grade, quiz.decimalpoints),
                formattedBestGrade = $mmaModQuiz.formatGrade(bestGrade.grade, quiz.decimalpoints);

            $scope.showResults = true;
            $scope.gradeOverridden = formattedGradebookGrade != formattedBestGrade;
            $scope.gradebookFeedback = gradebookData.feedback;

            if (overallStats) {
                // Show the quiz grade. The message shown is different if the quiz is finished.
                if (moreAttempts) {
                    $scope.gradeResult = $translate.instant('mma.mod_quiz.gradesofar', {$a: {
                        method: quiz.gradeMethodReadable,
                        mygrade: formattedGradebookGrade,
                        quizgrade: quiz.gradeFormatted
                    }});
                } else {
                    var outOfShort = $translate.instant('mma.mod_quiz.outofshort', {$a: {
                        grade: formattedGradebookGrade,
                        maxgrade: quiz.gradeFormatted
                    }});
                    $scope.gradeResult = $translate.instant('mma.mod_quiz.yourfinalgradeis', {$a: outOfShort});
                }
            }

            if (quiz.showFeedbackColumn) {
                // Get the quiz overall feedback.
                return $mmaModQuiz.getFeedbackForGrade(quiz.id, gradebookData.grade).then(function(response) {
                    $scope.overallFeedback = response.feedbacktext;
                });
            }
        } else {
            $scope.showResults = false;
        }
        return $q.when();
    }

    // Get the text to show in the button. It also sets restriction messages if needed.
    function getButtonText() {
        $scope.buttonText = '';

        if (quiz.hasquestions !== 0) {
            if (attempts.length && !$mmaModQuiz.isAttemptFinished(attempts[attempts.length - 1].state)) {
                // Last attempt is unfinished.
                if (accessInfo.canattempt) {
                    $scope.buttonText = 'mma.mod_quiz.continueattemptquiz';
                } else if (accessInfo.canpreview) {
                    $scope.buttonText = 'mma.mod_quiz.continuepreview';
                }
            } else {
                // Last attempt is finished or no attempts.
                if (accessInfo.canattempt) {
                    $scope.preventMessages = accessInfo.preventnewattemptreasons;
                    if (!$scope.preventMessages.length) {
                        if (!attempts.length) {
                            $scope.buttonText = 'mma.mod_quiz.attemptquiznow';
                        } else {
                            $scope.buttonText = 'mma.mod_quiz.reattemptquiz';
                        }
                    }
                } else if (accessInfo.canpreview) {
                    $scope.buttonText = 'mma.mod_quiz.previewquiznow';
                }
            }
        }

        if ($scope.buttonText) {
            // So far we think a button should be printed, check if they will be allowed to access it.
            $scope.preventMessages = accessInfo.preventaccessreasons;
            if (!moreAttempts) {
                $scope.buttonText = '';
            } else if (accessInfo.canattempt && $scope.preventMessages.length) {
                $scope.buttonText = '';
            } else if ($scope.unsupportedQuestions.length || $scope.unsupportedRules.length) {
                $scope.buttonText = '';
            }
        }
    }

    // Refreshes data.
    function refreshData() {
        var promises = [];
        promises.push($mmaModQuiz.invalidateQuizData(courseId));
        if (quiz) {
            promises.push($mmaModQuiz.invalidateUserAttemptsForUser(quiz.id));
            promises.push($mmaModQuiz.invalidateAccessInformationForAttempt(quiz.id, 0));
            promises.push($mmaModQuiz.invalidateCombinedReviewOptionsForUser(quiz.id));
            promises.push($mmaModQuiz.invalidateUserBestGradeForUser(quiz.id));
            promises.push($mmaModQuiz.invalidateGradeFromGradebook(courseId));
        }

        return $q.all(promises).finally(function() {
            return fetchQuizData(true);
        });
    }

    // Fetch the Quiz data.
    fetchQuizData().then(function() {
        $mmaModQuiz.logViewQuiz(quiz.id).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }).finally(function() {
        $scope.quizLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshQuiz = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Update data when we come back from the player since the attempt status could have changed.
    // We want to skip the first $ionicView.enter event because it's when the view is created.
    var skip = true;
    $scope.$on('$ionicView.enter', function() {
        if (skip) {
            skip = false;
            return;
        }

        var forwardView = $ionicHistory.forwardView();
        if (forwardView && forwardView.stateName === 'site.mod_quiz-player') {
            // Refresh data.
            $scope.quizLoaded = false;
            scrollView.scrollTop();
            refreshData().finally(function() {
                $scope.quizLoaded = true;
            });
        }
    });

});
