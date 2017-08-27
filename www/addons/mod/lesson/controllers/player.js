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

angular.module('mm.addons.mod_lesson')

/**
 * Lesson player controller.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc controller
 * @name mmaModLessonPlayerCtrl
 */
.controller('mmaModLessonPlayerCtrl', function($scope, $stateParams, $mmaModLesson, $q, $ionicScrollDelegate, $mmUtil, $mmApp,
            mmaModLessonComponent, $mmSyncBlock, $mmaModLessonHelper, $mmSideMenu, $translate, $mmaModLessonOffline, $mmLang,
            $mmaModLessonSync) {

    var lessonId = $stateParams.lessonid,
        courseId = $stateParams.courseid,
        password = $stateParams.password,
        lesson,
        accessInfo,
        offline = false,
        scrollView,
        originalData,
        blockData,
        jumps,
        firstPageLoaded = false;

    // Block the lesson so it cannot be synced.
    $mmSyncBlock.blockOperation(mmaModLessonComponent, lessonId);

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    $scope.review = $stateParams.review;
    $scope.LESSON_EOL = $mmaModLesson.LESSON_EOL;
    $scope.component = mmaModLessonComponent;
    $scope.currentPage = $stateParams.pageid;
    $scope.messages = [];

    // Convenience function to get Lesson data.
    function fetchLessonData() {
        // Wait for any ongoing sync to finish. We won't sync a lesson while it's being played.
        return $mmaModLessonSync.waitForSync(lessonId).then(function() {
            return $mmaModLesson.getLessonById(courseId, lessonId);
        }).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;
            $scope.title = lesson.name; // Temporary title.

            // If lesson has offline data already, use offline mode.
            return $mmaModLessonOffline.hasOfflineData(lessonId);
        }).then(function(offlineMode) {
            offline = offlineMode;
            if (!offline && !$mmApp.isOnline() && $mmaModLesson.isLessonOffline(lesson) && !$scope.review) {
                // Lesson doesn't have offline data, but it allows offline and the device is offline. Use offline mode.
                offline = true;
            }

            return callFunction($mmaModLesson.getAccessInformation, [lesson.id, offline, true], 1);
        }).then(function(info) {
            var promises = [];

            accessInfo = info;
            $scope.canManage = info.canmanage;
            $scope.retake = accessInfo.attemptscount;
            $scope.showRetake = !$scope.currentPage && $scope.retake > 0;

            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                // If it's a password protected lesson and we have the password, allow playing it.
                if (!password || info.preventaccessreasons.length > 1 || !$mmaModLesson.isPasswordProtected(info)) {
                    // Lesson cannot be played, show message and go back.
                    return $q.reject(info.preventaccessreasons[0].message);
                }
            }

            if ($scope.review && $stateParams.retake != accessInfo.attemptscount - 1) {
                // Reviewing a retake that isn't the last one. Error.
                return $mmLang.translateAndReject('mma.mod_lesson.errorreviewretakenotlast');
            }

            if (password) {
                // Lesson uses password, get the whole lesson object.
                var args = [lesson.id, password, true, offline, true];
                promises.push(callFunction($mmaModLesson.getLessonWithPassword, args, 3).then(function(less) {
                    lesson = less;
                    $scope.lesson = lesson;
                }));
            }

            if (offline) {
                // Offline mode, get the list of possible jumps to allow navigation.
                promises.push($mmaModLesson.getPagesPossibleJumps(lesson.id, offline).then(function(jumpList) {
                    jumps = jumpList;
                }));
            }

            return $q.all(promises);
        }).then(function() {
            $scope.mediaFile = lesson.mediafiles && lesson.mediafiles[0];

            $scope.lessonWidth = lesson.slideshow ?  $mmUtil.formatPixelsSize(lesson.mediawidth) : '';
            $scope.lessonHeight = lesson.slideshow ?  $mmUtil.formatPixelsSize(lesson.mediaheight) : '';

            return launchRetake($scope.currentPage);
        }).catch(function(message) {
            // An error occurred.
            var promise;

            if ($scope.review && $stateParams.retake && $mmUtil.isWebServiceError(message)) {
                // The user cannot review the retake. Unmark the retake as being finished in sync.
                promise = $mmaModLessonSync.deleteRetakeFinishedInSync(lessonId);
            } else {
                promise = $q.when();
            }

            return promise.then(function() {
                $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
                blockData && blockData.back();
                return $q.reject();
            });
        });
    }

    // Start or continue a retake.
    function launchRetake(pageId) {
        var promise;

        if ($scope.review) {
            // Review mode, no need to launch the retake.
            promise = $q.when({});
        } else if (!offline) {
            // Not in offline mode, launch the retake.
            promise = $mmaModLesson.launchRetake(lesson.id, password, pageId);
        } else {
            // Check if there is a finished offline retake.
            promise = $mmaModLessonOffline.hasFinishedRetake(lesson.id).then(function(finished) {
                if (finished) {
                    // Always show EOL page.
                    pageId = $mmaModLesson.LESSON_EOL;
                }
                return {};
            });
        }

        return promise.then(function(data) {
            $scope.currentPage = pageId || accessInfo.firstpageid;
            $scope.messages = data.messages || [];

            if (lesson.timelimit && !accessInfo.canmanage) {
                // Get the last lesson timer.
                return $mmaModLesson.getTimers(lesson.id, false, true).then(function(timers) {
                    var lastTimer = timers[timers.length - 1];
                    $scope.endTime = lastTimer.starttime + lesson.timelimit;
                });
            }
        }).then(function() {
            if ($scope.currentPage == $mmaModLesson.LESSON_EOL) {
                // End of lesson reached.
                return finishRetake();
            }
            return loadPage($scope.currentPage);
        });
    }

    // Load a certain page.
    function loadPage(pageId) {
        if (pageId == $mmaModLesson.LESSON_EOL) {
            // End of lesson reached.
            return finishRetake();
        }

        var args = [lesson, pageId, password, $scope.review, true, offline, true, accessInfo, jumps];
        return callFunction($mmaModLesson.getPageData, args, 5, 8).then(function(data) {
            if (data.newpageid == $mmaModLesson.LESSON_EOL) {
                // End of lesson reached.
                return finishRetake();
            }

            $scope.pageData = data;
            $scope.title = data.page.title;
            $scope.pageContent = $mmaModLessonHelper.getPageContentsFromPageData(data);
            $scope.pageLoaded = true;
            $scope.currentPage = pageId;
            $scope.messages = $scope.messages.concat(data.messages);

            // Page loaded, hide EOL and feedback data if shown.
            $scope.eolData = $scope.processData = false;

            if ($mmaModLesson.isQuestionPage(data.page.type)) {
                $scope.pageButtons = [];
                $scope.question = $mmaModLessonHelper.getQuestionFromPageData(data);
                originalData = angular.copy($scope.question.model);
            } else {
                $scope.pageButtons = $mmaModLessonHelper.getPageButtonsFromHtml(data.pagecontent);
                $scope.question = false;
                originalData = false;
            }

            if (data.displaymenu && !$scope.displayMenu) {
                // Load the menu.
                loadMenu();
            }
            $scope.displayMenu = !!data.displaymenu;

            if (!firstPageLoaded) {
                firstPageLoaded = true;
            } else {
                $scope.showRetake = false;
            }
        });
    }

    // Finish the retake.
    function finishRetake(outOfTime) {
        var promise;

        $scope.messages = [];

        if (offline && $mmApp.isOnline()) {
            // Offline mode but the app is online. Try to sync the data.
            promise = $mmaModLessonSync.syncLesson(lesson.id, true, true).then(function(result) {
                if (result.warnings && result.warnings.length) {
                    var error = result.warnings[0];

                    // Some data was deleted. Check if the retake has changed.
                    return $mmaModLesson.getAccessInformation(lesson.id).then(function(info) {
                        if (info.attemptscount != accessInfo.attemptscount) {
                            // The retake has changed. Leave the view and show the error.
                            blockData && blockData.back();
                            return $q.reject(error);
                        }

                        // Retake hasn't changed, show the warning and finish the retake in online.
                        offline = false;
                        $mmUtil.showErrorModal(error);
                    });
                }

                offline = false;
            }, function() {
                // Ignore errors.
            });
        } else {
            promise = $q.when();
        }

        return promise.then(function() {
            // Now finish the retake.
            var args = [lesson, courseId, password, outOfTime, $scope.review, offline, accessInfo];
            return callFunction($mmaModLesson.finishRetake, args, 5);
        }).then(function(data) {
            $scope.title = lesson.name;
            $scope.eolData = data.data;
            $scope.eolProgress = data.progress;
            $scope.messages = $scope.messages.concat(data.messages);
            $scope.processData = false;

            // Format activity link if present.
            if ($scope.eolData && $scope.eolData.activitylink) {
                $scope.eolData.activitylink.value = $mmaModLessonHelper.formatActivityLink($scope.eolData.activitylink.value);
            }

            // Format review lesson if present.
            if ($scope.eolData && $scope.eolData.reviewlesson) {
                var params = $mmUtil.extractUrlParams($scope.eolData.reviewlesson.value);
                if (!params || !params.pageid) {
                    // No pageid in the URL, the user cannot review (probably didn't answer any question).
                    delete $scope.eolData.reviewlesson;
                } else {
                    $scope.eolData.reviewlesson.pageid = params.pageid;
                }
            }
        });
    }

    // Scroll top and show the spinner.
    function showLoading() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModLessonPlayerScroll');
        }
        scrollView.scrollTop();
        $scope.pageLoaded = false;
    }

    // Function called when the user wants to leave the player. Save the data before leaving.
    function leavePlayer() {
        if ($scope.question && !$scope.eolData && !$scope.processData && originalData) {
            // Question shown. Check if there is any change.
            if (!$mmUtil.basicLeftCompare($scope.question.model, originalData, 3)) {
                 return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
            }
        }
        return $q.when();
    }

    // Load the lesson menu.
    function loadMenu() {
        if ($scope.loadingMenu) {
            // Already loading.
            return;
        }

        $scope.loadingMenu = true;
        return callFunction($mmaModLesson.getPages, [lesson.id, password, offline, true], 2).then(function(pages) {
            $scope.lessonPages = pages.map(function(entry) {
                return entry.page;
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error loading menu.');
            return $q.reject();
        }).finally(function() {
            $scope.loadingMenu = false;
        });
    }

    // Process a page, sending some data.
    function processPage(data) {
        showLoading();

        var args = [lesson, courseId, $scope.pageData, data, password, $scope.review, offline, accessInfo, jumps];
        return callFunction($mmaModLesson.processPage, args, 6, 8).then(function(result) {
            if (!offline && !$scope.review && $mmaModLesson.isLessonOffline(lesson)) {
                // Lesson allows offline and the user changed some data in server. Update cached data.
                if ($mmaModLesson.isQuestionPage($scope.pageData.page.type)) {
                    $mmaModLesson.getQuestionsAttemptsOnline(lesson.id, accessInfo.attemptscount, false, undefined, false, true);
                } else {
                    $mmaModLesson.getContentPagesViewedOnline(lesson.id, accessInfo.attemptscount, false, true);
                }
            }

            if (result.nodefaultresponse || result.inmediatejump) {
                // Don't display feedback or force a redirect to a new page. Load the new page.
                return jumpToPage(result.newpageid);
            } else {

                // Not inmediate jump, show the feedback.
                result.feedback = $mmaModLessonHelper.removeQuestionFromFeedback(result.feedback);
                $scope.messages = result.messages;
                $scope.processData = result;
                $scope.processData.buttons = [];

                if (lesson.review && !result.correctanswer && !result.noanswer && !result.isessayquestion &&
                       !result.maxattemptsreached && !result.reviewmode) {
                    // User can try again, show button to do so.
                    $scope.processData.buttons.push({
                        label: 'mma.mod_lesson.reviewquestionback',
                        pageid: $scope.currentPage
                    });
                }

                // Button to continue.
                if (lesson.review && !result.correctanswer && !result.noanswer && !result.isessayquestion &&
                       !result.maxattemptsreached) {
                    $scope.processData.buttons.push({
                        label: 'mma.mod_lesson.reviewquestioncontinue',
                        pageid: result.newpageid
                    });
                } else {
                    $scope.processData.buttons.push({
                        label: 'mma.mod_lesson.continue',
                        pageid: result.newpageid
                    });
                }
            }
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error processing page');
            return $q.reject();
        }).finally(function() {
            $scope.pageLoaded = true;
        });
    }

    // Jump to a certain page after performing an action.
    function jumpToPage(pageId) {
        if (pageId === 0) {
            // Not a valid page, return to entry view.
            // This happens, for example, when the user clicks to go to previous page and there is no previous page.
            blockData && blockData.back();
            return;
        } else if (pageId == $mmaModLesson.LESSON_EOL) {
            // End of lesson reached.
            return finishRetake();
        }

        // Load new page.
        $scope.messages = [];
        return loadPage(pageId);
    }

    /**
     * Call a function and go offline if allowed and the call fails.
     *
     * @param  {Function} func          Function to call.
     * @param  {Mixed[]} args           Arguments to pass to the function.
     * @param  {Number} offlineParamPos Position of the offline parameter in the args.
     * @param  {Number} [jumpsParamPos] Position of the jumps parameter in the args.
     * @return {Promise}                Promise resolved in success, rejected otherwise.
     */
    function callFunction(func, args, offlineParamPos, jumpsParamPos) {
        return func.apply(this, args).catch(function(error) {
            if (!offline && !$scope.review && $mmaModLesson.isLessonOffline(lesson) && !$mmUtil.isWebServiceError(error)) {
                // If it fails, go offline.
                offline = true;

                // Get the possible jumps now.
                return $mmaModLesson.getPagesPossibleJumps(lesson.id, offline).then(function(jumpList) {
                    jumps = jumpList;

                    // Call the function again with offline set to true and the new jumps.
                    args[offlineParamPos] = true;
                    if (typeof jumpsParamPos != 'undefined') {
                        args[jumpsParamPos] = jumps;
                    }
                    return func.apply(this, args);
                });
            }
            return $q.reject(error);
        });
    }

    // Fetch the Lesson data.
    fetchLessonData().then(function() {
        // Review data loaded or new retake started, remove any retake being finished in sync.
        $mmaModLessonSync.deleteRetakeFinishedInSync(lessonId);
    }).finally(function() {
        $scope.pageLoaded = true;
    });

    // A button was clicked.
    $scope.buttonClicked = function(data) {
        processPage(data);
    };

    // Submit a question.
    $scope.submitQuestion = function() {
        showLoading();
        $mmaModLessonHelper.prepareQuestionModel($scope.question).then(function(model) {
            return processPage(model);
        }).finally(function() {
            $scope.pageLoaded = true;
        });
    };

    // Load a page from menu or when continuing from a feedback page.
    $scope.loadPage = function(pageId, ignoreCurrent) {
        if (!ignoreCurrent && !$scope.eolData && $scope.currentPage == pageId) {
            // Page already loaded, stop.
            return;
        }

        showLoading();
        $scope.messages = [];

        return loadPage(pageId).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error loading page');
            return $q.reject();
        }).finally(function() {
            $scope.pageLoaded = true;
        });
    };

    // Time up.
    $scope.timeUp = function() {
        // Time up called, hide the timer.
        $scope.endTime = false;
        showLoading();

        return finishRetake(true).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error finishing attempt');
            return $q.reject();
        }).finally(function() {
            $scope.pageLoaded = true;
        });
    };

    // First render of rich text editor.
    $scope.firstRender = function() {
        originalData = angular.copy($scope.question.model);
    };

    // Review the lesson.
    $scope.reviewLesson = function(pageId) {
        showLoading();
        $scope.review = true;
        offline = false; // Don't allow offline mode in review.

        loadPage(pageId).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error loading page');
            $scope.pageLoaded = true;
        });
    };

    // Setup right side menu.
    $mmSideMenu.showRightSideMenu('addons/mod/lesson/templates/menu.html', $scope);

    $scope.$on('$destroy', function() {
        // Unblock the lesson so it can be synced.
        $mmSyncBlock.unblockOperation(mmaModLessonComponent, lessonId);
    });

});
