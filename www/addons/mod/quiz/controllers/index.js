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
            $mmaModQuizHelper, $ionicHistory, $ionicScrollDelegate, $mmEvents, mmaModQuizEventAttemptFinished, $state,
            $mmQuestionBehaviourDelegate, $mmaModQuizSync, $mmText, $mmUtil, mmaModQuizEventAutomSynced, $mmSite,
            $mmCoursePrefetchDelegate, mmCoreDownloaded, mmCoreDownloading, mmCoreEventPackageStatusChanged,
            mmaModQuizComponent, $mmaModQuizPrefetchHandler, $mmApp, $mmEvents, mmCoreEventOnlineStatusChanged) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        quiz,
        overallStats,
        attempts,
        options,
        bestGrade,
        gradebookData,
        quizAccessInfo,
        attemptAccessInfo,
        moreAttempts,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModQuizIndexScroll'),
        autoReview,
        currentStatus,
        statusObserver, obsFinished, syncObserver, onlineObserver;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('quiz');
    $scope.isTablet = $ionicPlatform.isTablet();
    $scope.courseId = courseId;
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModQuizComponent;
    $scope.componentId = module.id;

    // Convenience function to get Quiz data.
    function fetchQuizData(refresh, showErrors) {
        $scope.isOnline = $mmApp.isOnline();
        return $mmaModQuiz.getQuiz(courseId, module.id).then(function(quizData) {
            quiz = quizData;
            quiz.gradeMethodReadable = $mmaModQuiz.getQuizGradeMethod(quiz.grademethod);

            $scope.now = new Date().getTime();
            $scope.title = quiz.name || $scope.title;
            $scope.description = quiz.intro || $scope.description;

            // Try to get warnings from automatic sync.
            return $mmaModQuizSync.getSyncWarnings(quiz.id).then(function(warnings) {
                if (warnings && warnings.length) {
                    // Show warnings and delete them so they aren't shown again.
                    $mmUtil.showErrorModal($mmText.buildMessage(warnings));
                    return $mmaModQuizSync.setSyncWarnings(quiz.id, []);
                }
            });
        }).then(function() {
            if ($mmaModQuiz.isQuizOffline(quiz)) {
                // Try to sync the quiz.
                return syncQuiz(showErrors).catch(function() {
                    // Ignore errors, keep getting data even if sync fails.
                    autoReview = undefined;
                });
            } else {
                autoReview = undefined;
            }
        }).then(function() {

            if ($mmaModQuiz.isQuizOffline(quiz)) {
                // Get last synchronization time and check if sync button should be seen.
                // No need to return these promises, they should be faster than the rest.
                $mmaModQuizHelper.getQuizReadableSyncTime(quiz.id).then(function(syncTime) {
                    $scope.syncTime = syncTime;
                });

                $mmaModQuizSync.hasDataToSync(quiz.id).then(function(hasOffline) {
                    $scope.hasOffline = hasOffline;
                });
            }

            // Get quiz access info.
            return $mmaModQuiz.getQuizAccessInformation(quiz.id).then(function(info) {
                quizAccessInfo = info;
                $scope.accessRules = quizAccessInfo.accessrules;
                quiz.showReviewColumn = quizAccessInfo.canreviewmyattempts;
                $scope.unsupportedRules = $mmaModQuiz.getUnsupportedRules(quizAccessInfo.activerulenames);
                if (quiz.preferredbehaviour) {
                    $scope.behaviourSupported = $mmQuestionBehaviourDelegate.isBehaviourSupported(quiz.preferredbehaviour);
                }

                // Get question types in the quiz.
                return $mmaModQuiz.getQuizRequiredQtypes(quiz.id).then(function(types) {
                    $scope.unsupportedQuestions = $mmaModQuiz.getUnsupportedQuestions(types);
                    return getAttempts();
                });
            });

        }).then(function() {
            $scope.quiz = quiz;
        }).catch(function(message) {
            if (!refresh && !quiz) {
                // Get quiz failed, retry without using cache since it might be a new activity.
                return refreshData();
            }
            return $mmaModQuizHelper.showError(message);
        });
    }

    // Convenience function to get Quiz attempts.
    function getAttempts() {

        // Get access information of last attempt (it also works if no attempts made).
        return $mmaModQuiz.getAttemptAccessInformation(quiz.id, 0).then(function(info) {
            attemptAccessInfo = info;

            // Get attempts.
            return $mmaModQuiz.getUserAttempts(quiz.id).then(function(atts) {
                attempts = atts;

                if ($mmaModQuiz.isQuizOffline(quiz)) {
                    // Handle status. We don't add getStatus to promises because it should be fast.
                    setStatusListener();
                    getStatus().then(showStatus);
                }

                return treatAttempts().then(function() {
                    // Check if user can create/continue attempts.
                    if (attempts.length) {
                        var lastAttempt = attempts[attempts.length - 1];
                        moreAttempts = !$mmaModQuiz.isAttemptFinished(lastAttempt.state) || !attemptAccessInfo.isfinished;
                    } else {
                        moreAttempts = !attemptAccessInfo.isfinished;
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

        if (autoReview && lastFinished && lastFinished.id >= autoReview.attemptId) {
            // User just finished an attempt in offline and it seems it's been synced, since it's finished in online.
            // Go to the review of this attempt if the user hasn't left this view.
            if (!$scope.$$destroyed && $state.current.name == 'site.mod_quiz') {
                promises.push(goToAutoReview());
            }
            autoReview = undefined;
        }

        // Load flag to show if attempts are finished but not synced.
        promises.push($mmaModQuiz.loadFinishedOfflineData(attempts));

        // Get combined review options.
        promises.push($mmaModQuiz.getCombinedReviewOptions(quiz.id).then(function(result) {
            options = result;
        }));

        // Get best grade.
        promises.push($mmaModQuiz.getUserBestGrade(quiz.id).then(function(best) {
            bestGrade = best;

            // Get gradebook grade.
            return $mmaModQuiz.getGradeFromGradebook(courseId, module.id).then(function(data) {
                gradebookData = data;
            }).catch(function() {
                // Fallback to quiz best grade if failure or not found.
                gradebookData = {
                    grade: bestGrade.grade
                };
            });
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
                formattedBestGrade = $mmaModQuiz.formatGrade(bestGrade.grade, quiz.decimalpoints),
                gradeToShow = formattedGradebookGrade; // By default we show the grade in the gradebook.

            $scope.showResults = true;
            $scope.gradeOverridden = formattedGradebookGrade != formattedBestGrade;
            $scope.gradebookFeedback = gradebookData.feedback;
            if (formattedBestGrade > formattedGradebookGrade && formattedGradebookGrade == quiz.grade) {
                // The best grade is higher than the max grade for the quiz. We'll do like Moodle web and
                // show the best grade instead of the gradebook grade.
                $scope.gradeOverridden = false;
                gradeToShow = formattedBestGrade;
            }

            if (overallStats) {
                // Show the quiz grade. The message shown is different if the quiz is finished.
                if (moreAttempts) {
                    $scope.gradeResult = $translate.instant('mma.mod_quiz.gradesofar', {$a: {
                        method: quiz.gradeMethodReadable,
                        mygrade: gradeToShow,
                        quizgrade: quiz.gradeFormatted
                    }});
                } else {
                    var outOfShort = $translate.instant('mma.mod_quiz.outofshort', {$a: {
                        grade: gradeToShow,
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
                if (quizAccessInfo.canattempt) {
                    $scope.buttonText = 'mma.mod_quiz.continueattemptquiz';
                } else if (quizAccessInfo.canpreview) {
                    $scope.buttonText = 'mma.mod_quiz.continuepreview';
                }
            } else {
                // Last attempt is finished or no attempts.
                if (quizAccessInfo.canattempt) {
                    $scope.preventMessages = attemptAccessInfo.preventnewattemptreasons;
                    if (!$scope.preventMessages.length) {
                        if (!attempts.length) {
                            $scope.buttonText = 'mma.mod_quiz.attemptquiznow';
                        } else {
                            $scope.buttonText = 'mma.mod_quiz.reattemptquiz';
                        }
                    }
                } else if (quizAccessInfo.canpreview) {
                    $scope.buttonText = 'mma.mod_quiz.previewquiznow';
                }
            }
        }

        if ($scope.buttonText) {
            // So far we think a button should be printed, check if they will be allowed to access it.
            $scope.preventMessages = quizAccessInfo.preventaccessreasons;
            if (!moreAttempts) {
                $scope.buttonText = '';
            } else if (quizAccessInfo.canattempt && $scope.preventMessages.length) {
                $scope.buttonText = '';
            } else if ($scope.unsupportedQuestions.length || $scope.unsupportedRules.length || !$scope.behaviourSupported) {
                $scope.buttonText = '';
            }
        }
    }

    // Refreshes data.
    function refreshData(dontForceSync) {
        var promises = [];
        promises.push($mmaModQuiz.invalidateQuizData(courseId));
        if (quiz) {
            promises.push($mmaModQuiz.invalidateUserAttemptsForUser(quiz.id));
            promises.push($mmaModQuiz.invalidateQuizAccessInformation(quiz.id));
            promises.push($mmaModQuiz.invalidateQuizRequiredQtypes(quiz.id));
            promises.push($mmaModQuiz.invalidateAttemptAccessInformation(quiz.id));
            promises.push($mmaModQuiz.invalidateCombinedReviewOptionsForUser(quiz.id));
            promises.push($mmaModQuiz.invalidateUserBestGradeForUser(quiz.id));
            promises.push($mmaModQuiz.invalidateGradeFromGradebook(courseId));
        }

        return $q.all(promises).finally(function() {
            return fetchQuizData(!dontForceSync);
        });
    }

    // Tries to synchronize the current quiz.
    function syncQuiz(showErrors) {
        return $mmaModQuizSync.syncQuiz(quiz, true).then(function(data) {
            if (data) {
                var message = $mmText.buildMessage(data.warnings);
                if (message) {
                    $mmUtil.showErrorModal(message);
                }

                if (data.attemptFinished) {
                    // An attempt was finished, check completion status.
                    $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
                }
            }
        }).catch(function(err) {
            if (showErrors) {
                return $mmaModQuizHelper.showError(err, 'mma.mod_quiz.errorsyncquiz');
            }
            return $q.reject();
        });
    }

    // Go to review an attempt that has just been finished.
    function goToAutoReview() {
        // If we go to auto review it means an attempt was finished. Check completion status.
        $mmCourse.checkModuleCompletion(courseId, module.completionstatus);

        // Verify that user can see the review.
        var attemptId = autoReview.attemptId;
        if (quizAccessInfo.canreviewmyattempts) {
            return $mmaModQuiz.getAttemptReview(attemptId, -1).then(function() {
                return $state.go('site.mod_quiz-review', {courseid: courseId, quizid: quiz.id, attemptid: attemptId});
            }).catch(function() {
                // Ignore errors.
            });
        }

        return $q.when();
    }

    // Open a quiz to attempt it.
    function openQuiz() {
        $state.go('site.mod_quiz-player', {
            courseid: courseId,
            quizid: quiz.id,
            moduleurl: module.url
        });
    }

    // Get status of the quiz.
    function getStatus() {
        var revision = $mmaModQuizPrefetchHandler.getRevisionFromAttempts(attempts),
            timemodified = $mmaModQuizPrefetchHandler.getTimemodifiedFromAttempts(attempts);

        return $mmCoursePrefetchDelegate.getModuleStatus(module, courseId, revision, timemodified);
    }

    // Set a listener to monitor changes on this SCORM status to show a message to the user.
    function setStatusListener() {
        if (typeof statusObserver !== 'undefined') {
            return; // Already set.
        }

        // Listen for changes on this module status to show a message to the user.
        statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
            if (data.siteid === $mmSite.getId() && data.componentId === module.id &&
                    data.component === mmaModQuizComponent) {
                showStatus(data.status);
            }
        });
    }

    // Showing or hide a status message depending on the SCORM status.
    function showStatus(status) {
        currentStatus = status;

        if (status == mmCoreDownloading) {
            $scope.showSpinner = true;
        }
    }

    // Fetch the Quiz data.
    fetchQuizData().then(function() {
        $mmaModQuiz.logViewQuiz(quiz.id).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }).finally(function() {
        $scope.quizLoaded = true;
        $scope.refreshIcon = 'ion-refresh';
        $scope.syncIcon = 'ion-loop';
    });

    // Pull to refresh.
    $scope.refreshQuiz = function(showErrors) {
        if ($scope.quizLoaded) {
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            return refreshData(false, showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Attempt the quiz.
    $scope.attemptQuiz = function() {
        if ($scope.showSpinner) {
            // Scope is being or synchronized, abort.
            return;
        }

        if ($mmaModQuiz.isQuizOffline(quiz)) {
            // Quiz supports offline, check if it needs to be downloaded.
            if (currentStatus != mmCoreDownloaded) {
                // Prefetch the quiz.
                $scope.showSpinner = true;
                return $mmaModQuizPrefetchHandler.prefetch(module, courseId, true).then(function() {
                    // Success downloading, open quiz.
                    openQuiz();
                }).catch(function(error) {
                    $mmaModQuizHelper.showError(error, 'mma.mod_quiz.errordownloading');
                }).finally(function() {
                    $scope.showSpinner = false;
                });
            } else {
                // Already downloaded, open it.
                openQuiz();
            }
        } else {
            openQuiz();
        }
    };

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModQuizComponent, module.id);
    };


    // Update data when we come back from the player since the attempt status could have changed.
    // We want to skip the first $ionicView.enter event because it's when the view is created.
    var skip = true;
    $scope.$on('$ionicView.enter', function() {
        if (skip) {
            skip = false;
            return;
        }

        var forwardView = $ionicHistory.forwardView(),
            promise;
        if (forwardView && forwardView.stateName === 'site.mod_quiz-player') {
            if (autoReview && autoReview.synced) {
                promise = goToAutoReview();
                autoReview = undefined;
            } else {
                promise = $q.when();
            }

            // Refresh data.
            $scope.quizLoaded = false;
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            scrollView.scrollTop();
            promise.then(function() {
                refreshData().finally(function() {
                    $scope.quizLoaded = true;
                    $scope.refreshIcon = 'ion-refresh';
                    $scope.syncIcon = 'ion-loop';
                });
            });
        } else {
            autoReview = undefined;
        }
    });

    $scope.$on('$ionicView.leave', function() {
        autoReview = undefined;
    });

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Listen for attempt finished events.
    obsFinished = $mmEvents.on(mmaModQuizEventAttemptFinished, function(data) {
        // Go to review attempt if an attempt in this quiz was finished and synced.
        if (data.quizId === quiz.id) {
            autoReview = data;
        }
    });

    // Refresh data if this quiz is synchronized automatically.
    syncObserver = $mmEvents.on(mmaModQuizEventAutomSynced, function(data) {
        if (data && data.siteid == $mmSite.getId() && data.quizid == quiz.id) {
            $scope.quizLoaded = false;
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            scrollView.scrollTop();
            fetchQuizData().finally(function() {
                $scope.quizLoaded = true;
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
            });

            if (data.attemptFinished) {
                // An attempt was finished, check completion status.
                $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
            }
        }
    });

    $scope.$on('$destroy', function() {
        obsFinished && obsFinished.off && obsFinished.off();
        syncObserver && syncObserver.off && syncObserver.off();
        statusObserver && statusObserver.off && statusObserver.off();
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });

});
