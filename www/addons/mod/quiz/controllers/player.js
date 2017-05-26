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
.controller('mmaModQuizPlayerCtrl', function($log, $scope, $stateParams, $mmaModQuiz, $mmaModQuizHelper, $q, $mmUtil, $mmSyncBlock,
            $ionicPopover, $ionicScrollDelegate, $translate, $timeout, $mmQuestionHelper, $mmaModQuizAutoSave, $mmEvents,
            mmaModQuizEventAttemptFinished, $mmSideMenu, mmaModQuizComponent, $mmaModQuizSync) {
    $log = $log.getInstance('mmaModQuizPlayerCtrl');

    var quizId = $stateParams.quizid,
        courseId = $stateParams.courseid,
        moduleUrl = $stateParams.moduleurl,
        quiz,
        quizAccessInfo,
        attemptAccessInfo,
        attempt,
        newAttempt,
        timeUpCalled = false,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModQuizPlayerScroll'),
        offline,
        blockData;

    // Block the quiz so it cannot be synced.
    $mmSyncBlock.blockOperation(mmaModQuizComponent, quizId);

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    $scope.moduleUrl = moduleUrl;
    $scope.component = mmaModQuizComponent;
    $scope.quizAborted = false;
    $scope.preflightData = {};
    $scope.preflightModalTitle = 'mma.mod_quiz.startattempt';

    // Convenience function to start the player.
    function start(fromModal) {
        var promise;
        $scope.dataLoaded = false;

        if (typeof password != 'undefined') {
            // Password submitted, get attempt data.
            promise = startOrContinueAttempt(fromModal);
        } else {
            // Fetch data.
            promise = fetchData().then(function() {
                return startOrContinueAttempt(fromModal);
            });
        }

        promise.finally(function() {
            $scope.dataLoaded = true;
        });
    }

    // Convenience function to get the quiz data.
    function fetchData() {
        // Wait for any ongoing sync to finish. We won't sync a quiz while it's being played.
        return $mmaModQuizSync.waitForSync(quizId).then(function() {
            return $mmaModQuiz.getQuizById(courseId, quizId);
        }).then(function(quizData) {
            quiz = quizData;
            quiz.isSequential = $mmaModQuiz.isNavigationSequential(quiz);

            if ($mmaModQuiz.isQuizOffline(quiz)) {
                // Quiz supports offline.
                return true;
            } else {
                // Quiz doesn't support offline right now, but maybe it did and then the setting was changed.
                // If we have an unfinished offline attempt then we'll use offline mode.
                return $mmaModQuiz.isLastAttemptOfflineUnfinished(quiz);
            }
        }).then(function(offlineMode) {
            offline = offlineMode;
            $scope.offline = offline;

            if (quiz.timelimit > 0) {
                $scope.isTimed = true;
                quiz.readableTimeLimit = $mmUtil.formatTimeInstant(quiz.timelimit);
            }

            $scope.quiz = quiz;

            // Get access information for the quiz.
            return $mmaModQuiz.getQuizAccessInformation(quiz.id, offline, true);
        }).then(function(info) {
            quizAccessInfo = info;

            // Get user attempts to determine last attempt.
            return $mmaModQuiz.getUserAttempts(quiz.id, 'all', true, offline, true);
        }).then(function(attempts) {
            if (!attempts.length) {
                newAttempt = true;
            } else {
                var promises = [];
                attempt = attempts[attempts.length - 1];
                newAttempt = $mmaModQuiz.isAttemptFinished(attempt.state);

                // Load quiz last sync time. We set it to the attempt so it's accessible in access rules handlers.
                promises.push($mmaModQuizSync.getSyncTime(quiz.id).then(function(time) {
                    attempt.quizSyncTime = time;
                    quiz.syncTimeReadable = $mmaModQuizHelper.getReadableTimeFromTimestamp(time);
                }));

                // Load flag to show if attempts are finished but not synced.
                promises.push($mmaModQuiz.loadFinishedOfflineData(attempts));

                return $q.all(promises);
            }
        }).catch(function(message) {
            return $mmaModQuizHelper.showError(message);
        });
    }

    // Convenience function to start/continue the attempt.
    function startOrContinueAttempt(fromModal) {
        // Check preflight data and start attempt if needed.
        var att = newAttempt ? undefined : attempt;
        return $mmaModQuiz.checkPreflightData($scope, quiz, quizAccessInfo, att, offline, fromModal).then(function(att) {

            // Re-fetch attempt access information with the right attempt (might have changed because a new attempt was created).
            return $mmaModQuiz.getAttemptAccessInformation(quiz.id, att.id, offline, true).then(function(info) {
                attemptAccessInfo = info;

                attempt = att;
                $scope.attempt = attempt;
                return loadToc();
            }).catch(function(message) {
                return $mmaModQuizHelper.showError(message, 'mm.core.error');
            }).then(function() {
                if (attempt.state != $mmaModQuiz.ATTEMPT_OVERDUE && !attempt.finishedOffline) {
                    // Attempt not overdue and not finished in offline, load page.
                    return loadPage(attempt.currentpage).then(function() {
                        initTimer();
                    }).catch(function(message) {
                        return $mmaModQuizHelper.showError(message, 'mm.core.error');
                    });
                } else {
                    // Attempt is overdue or finished in offline, we can only load the summary.
                    return loadSummary();
                }
            });
        }).catch(function(error) {
            if (error) {
                return $mmaModQuizHelper.showError(error, 'mm.core.error');
            }
        });
    }

    // Load TOC to navigate to questions.
    function loadToc() {
        // We use the attempt summary to build the TOC because it contains all the questions.
        return $mmaModQuiz.getAttemptSummary(attempt.id, $scope.preflightData, offline).then(function(questions) {
            $scope.toc = questions;
        });
    }

    // Load a page questions.
    function loadPage(page) {
        return $mmaModQuiz.getAttemptData(attempt.id, page, $scope.preflightData, offline, true).then(function(data) {
            // Update attempt, status could change during the execution.
            attempt = data.attempt;
            attempt.currentpage = page;
            $scope.attempt = attempt;

            $scope.questions = data.questions;
            $scope.nextPage = data.nextpage;
            $scope.previousPage = quiz.isSequential ? -1 : page - 1;
            $scope.showSummary = false;

            angular.forEach($scope.questions, function(question) {
                // Get the readable mark for each question.
                question.readableMark = $mmaModQuizHelper.getQuestionMarkFromHtml(question.html);
                // Extract the question info box.
                $mmQuestionHelper.extractQuestionInfoBox(question, '.info');
                // Set the preferred behaviour.
                question.preferredBehaviour = quiz.preferredbehaviour;
                // Check if the question is blocked. If it is, treat it as a description question.
                if ($mmaModQuiz.isQuestionBlocked(question)) {
                    question.type = 'description';
                }
            });

            // Mark the page as viewed. We'll ignore errors in this call.
            $mmaModQuiz.logViewAttempt(attempt.id, page, $scope.preflightData, offline);

            // Start looking for changes.
            $mmaModQuizAutoSave.startCheckChangesProcess($scope, quiz, attempt);
        });
    }

    // Load attempt summary.
    function loadSummary() {
        $scope.showSummary = true;
        $scope.summaryQuestions = [];

        return $mmaModQuiz.getAttemptSummary(attempt.id, $scope.preflightData, offline, true, true).then(function(questions) {
            $scope.summaryQuestions = questions;
            $scope.canReturn = attempt.state == $mmaModQuiz.ATTEMPT_IN_PROGRESS && !attempt.finishedOffline;
            $scope.preventSubmitMessages = $mmaModQuiz.getPreventSubmitMessages(questions);

            attempt.dueDateWarning = $mmaModQuiz.getAttemptDueDateWarning(quiz, attempt);

            // Log summary as viewed.
            $mmaModQuiz.logViewAttemptSummary(attempt.id, $scope.preflightData);
        }).catch(function(message) {
            $scope.showSummary = false;
            return $mmaModQuizHelper.showError(message, 'mma.mod_quiz.errorgetquestions');
        });
    }

    // Get the input answers.
    function getAnswers() {
        return $mmQuestionHelper.getAnswersFromForm(document.forms['mma-mod_quiz-player-form']);
    }

    // Prepare the answers to be sent for the attempt.
    function prepareAnswers() {
        var answers = getAnswers();
        return $mmQuestionHelper.prepareAnswers($scope.questions, answers, offline).then(function() {
            return answers;
        });
    }

    // Process attempt.
    function processAttempt(finish, timeup) {
        return prepareAnswers().then(function(answers) {
             return $mmaModQuiz.processAttempt(quiz, attempt, answers, $scope.preflightData, finish, timeup, offline);
        }).then(function() {
            // Answers saved, cancel auto save.
            $mmaModQuizAutoSave.cancelAutoSave();
            $mmaModQuizAutoSave.hideAutoSaveError($scope);
        });
    }

    // Function called when the user wants to leave the player. Save the attempt before leaving.
    function leavePlayer() {
        var promise,
            modal;

        if ($scope.questions && $scope.questions.length && !$scope.showSummary) {
            // Save answers.
            modal = $mmUtil.showModalLoading('mm.core.sending', true);
            promise = processAttempt(false, false);
        } else {
            // Nothing to save.
            promise = $q.when();
        }

        return promise.catch(function() {
            // Save attempt failed. Show confirmation.
            modal && modal.dismiss();
            return $mmUtil.showConfirm($translate('mma.mod_quiz.confirmleavequizonerror'));
        }).finally(function() {
            modal && modal.dismiss();
        });
    }

    // Finish an attempt, either by timeup or because the user clicked to finish it.
    function finishAttempt(finish, timeup) {
        var promise;

        // Show confirm if the user clicked the finish button and the quiz is in progress.
        if (!timeup && attempt.state == $mmaModQuiz.ATTEMPT_IN_PROGRESS) {
            promise = $mmUtil.showConfirm($translate('mma.mod_quiz.confirmclose'));
        } else {
            promise = $q.when();
        }

        return promise.then(function() {
            var modal = $mmUtil.showModalLoading('mm.core.sending', true);

            return processAttempt(finish, timeup).then(function() {
                // Trigger an event to notify the attempt was finished.
                $mmEvents.trigger(mmaModQuizEventAttemptFinished, {quizId: quiz.id, attemptId: attempt.id, synced: !offline});
                // Leave the player.
                blockData && blockData.back();
            }).catch(function(message) {
                return $mmaModQuizHelper.showError(message, 'mma.mod_quiz.errorsaveattempt');
            }).finally(function() {
                modal.dismiss();
            });
        });
    }

    // Initializes the timer if enabled.
    function initTimer() {
        if (attemptAccessInfo.endtime > 0) {
            if ($mmaModQuiz.shouldShowTimeLeft(quizAccessInfo.activerulenames, attempt, attemptAccessInfo.endtime)) {
                $scope.endTime = attemptAccessInfo.endtime;
            } else {
                delete $scope.endTime;
            }
        }
    }

    // Scroll to a certain question.
    function scrollToQuestion(slot) {
        $mmUtil.scrollToElement(document, '#mma-mod_quiz-question-' + slot, scrollView);
    }

    // Init the auto save.
    $mmaModQuizAutoSave.init($scope, 'mma-mod_quiz-player-form', 'conErrPopover', '#mma-mod_quiz-connectionerror-button');

    // Start the player when the controller is loaded.
    start();

    // Start the player.
    $scope.start = function(fromModal) {
        start(fromModal);
    };

    // Function to call to abort the quiz.
    $scope.abortQuiz = function() {
        $scope.quizAborted = true;
    };

    // A behaviour button in a question was clicked (Check, Redo, ...).
    $scope.behaviourButtonClicked = function(name, value) {
        $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
            var modal = $mmUtil.showModalLoading('mm.core.sending', true),
                answers = getAnswers();

            // Add the clicked button data.
            answers[name] = value;

            // Behaviour checks are always in online.
            $mmaModQuiz.processAttempt(quiz, attempt, answers, $scope.preflightData, false, false, false).then(function() {
                // Reload the current page.
                var scrollPos = scrollView.getScrollPosition();
                $scope.dataLoaded = false;
                scrollView.scrollTop();

                return loadPage(attempt.currentpage).finally(function() {
                    $scope.dataLoaded = true;
                    scrollView.resize(); // Call resize to recalculate scroll area.
                    if (scrollPos) {
                        // Go back to the previous position.
                        scrollView.scrollTo(scrollPos.left, scrollPos.top);
                    }
                });
            }).catch(function(message) {
                return $mmaModQuizHelper.showError(message, 'Error performing action.');
            }).finally(function() {
                modal.dismiss();
            });
        });
    };

    // Load a certain page. If slot is supplied, try to scroll to that question.
    $scope.loadPage = function(page, fromToc, slot) {
        if (page != -1 && (attempt.state == $mmaModQuiz.ATTEMPT_OVERDUE || attempt.finishedOffline)) {
            // We can't load a page if overdue of the local attempt is finished.
            return;
        } else if (page == attempt.currentpage && !$scope.showSummary && typeof slot != 'undefined') {
            // Navigating to a question in the current page.
            scrollToQuestion(slot);
            return;
        } else if ((page == attempt.currentpage && !$scope.showSummary) || (fromToc && quiz.isSequential && page != -1)) {
            // If the user is navigating to the current page we do nothing.
            // Also, in sequential quizzes we don't allow navigating using the TOC except for finishing the quiz (summary).
            return;
        } else if (page === -1 && $scope.showSummary) {
            // Summary already shown.
            return;
        }

        var promise;

        $scope.dataLoaded = false;
        scrollView.scrollTop();

        // First try to save the attempt data. We only save it if we're not seeing the summary.
        promise = $scope.showSummary ? $q.when() : processAttempt(false, false);
        promise.catch(function(message) {
            return $mmaModQuizHelper.showError(message, 'mma.mod_quiz.errorsaveattempt');
        }).then(function() {
            // Attempt data successfully saved, load the page or summary.

            if (page === -1) {
                return loadSummary();
            } else {
                $mmaModQuizAutoSave.stopCheckChangesProcess(); // Stop checking for changes during page change.
                return loadPage(page).catch(function(message) {
                    $mmaModQuizAutoSave.startCheckChangesProcess($scope, quiz, attempt); // Start the check again.
                    return $mmaModQuizHelper.showError(message, 'mma.mod_quiz.errorgetquestions');
                });
            }
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

    // User clicked to finish the attempt.
    $scope.finishAttempt = function() {
        finishAttempt(true);
    };

    // Quiz time has finished.
    $scope.timeUp = function() {
        if (timeUpCalled) {
            return;
        }

        timeUpCalled = true;
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        finishAttempt(false, true).finally(function() {
            modal.dismiss();
        });
    };

    // Setup TOC right side menu.
    $mmSideMenu.showRightSideMenu('addons/mod/quiz/templates/toc.html', $scope);

    // Setup connection error popover.
    $ionicPopover.fromTemplateUrl('addons/mod/quiz/templates/connectionerror.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.conErrPopover = popover;
    });

    $scope.$on('$destroy', function() {
        // Stop auto save.
        $mmaModQuizAutoSave.stopAutoSaving();
        $mmaModQuizAutoSave.stopCheckChangesProcess();
        // Unblock the quiz so it can be synced.
        $mmSyncBlock.unblockOperation(mmaModQuizComponent, quizId);
    });
});
