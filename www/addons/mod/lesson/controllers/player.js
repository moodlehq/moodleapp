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
.controller('mmaModLessonPlayerCtrl', function($scope, $stateParams, $mmaModLesson, $q, $ionicScrollDelegate, $mmUtil,
            mmaModLessonComponent, $mmSyncBlock, $mmaModLessonHelper, $mmSideMenu, $translate) {

    var lessonId = $stateParams.lessonid,
        courseId = $stateParams.courseid,
        password = $stateParams.password,
        lesson,
        accessInfo,
        offline = false,
        scrollView,
        originalData,
        blockData;

    // Block the lesson so it cannot be synced.
    $mmSyncBlock.blockOperation(mmaModLessonComponent, lessonId);

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    $scope.review = false;
    $scope.LESSON_EOL = $mmaModLesson.LESSON_EOL;
    $scope.component = mmaModLessonComponent;
    $scope.currentPage = $stateParams.pageid;
    $scope.messages = [];

    // Convenience function to get Lesson data.
    function fetchLessonData() {
        return $mmaModLesson.getLessonById(courseId, lessonId).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;
            $scope.title = lesson.name; // Temporary title.

            return $mmaModLesson.getAccessInformation(lesson.id, offline, true);
        }).then(function(info) {
            accessInfo = info;
            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                // If it's a password protected lesson and we have the password, allow attempting it.
                if (!password || info.preventaccessreasons.length > 1 || !$mmaModLesson.isPasswordProtected(info)) {
                    // Lesson cannot be attempted, show message and go back.
                    return $q.reject(info.preventaccessreasons[0]);
                }
            }

            if (password) {
                // Lesson uses password, get the whole lesson object.
                return $mmaModLesson.getLessonWithPassword(lesson.id, password, true, offline, true).then(function(lessonData) {
                    lesson = lessonData;
                    $scope.lesson = lesson;
                });
            }
        }).then(function() {
            $scope.mediaFile = lesson.mediafiles && lesson.mediafiles[0];

            $scope.lessonWidth = lesson.slideshow ?  $mmUtil.formatPixelsSize(lesson.mediawidth) : '';
            $scope.lessonHeight = lesson.slideshow ?  $mmUtil.formatPixelsSize(lesson.mediaheight) : '';

            return launchAttempt($scope.currentPage);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            blockData && blockData.back();
            return $q.reject();
        });
    }

    // Start or continue an attempt.
    function launchAttempt(pageId) {
        return $mmaModLesson.launchAttempt(lesson.id, password, pageId).then(function(data) {
            $scope.currentPage = pageId || accessInfo.firstpageid;
            $scope.messages = data.messages || [];

            if (lesson.timelimit) {
                // Get the last lesson timer.
                return $mmaModLesson.getTimers(lesson.id, false, true).then(function(timers) {
                    var lastTimer = timers[timers.length - 1];
                    $scope.endTime = lastTimer.starttime + lesson.timelimit;
                });
            }
        }).then(function() {
            return loadPage($scope.currentPage);
        });
    }

    // Load a certain page.
    function loadPage(pageId) {
        return $mmaModLesson.getPageData(lesson.id, pageId, password, $scope.review, true, offline, true).then(function(data) {
            if (data.newpageid == $mmaModLesson.LESSON_EOL) {
                // End of lesson reached.
                return finishAttempt();
            }

            $scope.pageData = data;
            $scope.title = data.page.title;
            $scope.pageContent = data.page.contents;
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
        });
    }

    // Finish the attempt.
    function finishAttempt(outOfTime) {
        $scope.messages = [];
        return $mmaModLesson.finishAttempt(lesson.id, password, outOfTime, $scope.review).then(function(data) {
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

    // Function called when the user wants to leave the player. Save the attempt before leaving.
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
        return $mmaModLesson.getPages(lesson.id, password).then(function(pages) {
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

        return $mmaModLesson.processPage(lessonId, $scope.currentPage, data, password, $scope.review).then(function(result) {
            if (result.nodefaultresponse || result.inmediatejump) {
                // Don't display feedback or force a redirect to a new page. Load the new page.
                return jumpToPage(result.newpageid);
            } else{
                // Not inmediate jump, show the feedback.
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
            return finishAttempt();
        }

        // Load new page.
        $scope.messages = [];
        return loadPage(pageId);
    }

    // Fetch the Lesson data.
    fetchLessonData().finally(function() {
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

        return finishAttempt(true).catch(function(error) {
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

        loadPage(pageId).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error loading page');
            $scope.pageLoaded = true;
        });
    };

    // Setup right side menu.
    $mmSideMenu.showRightSideMenu('addons/mod/lesson/templates/menu.html', $scope);

});
