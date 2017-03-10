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
            mmaModLessonComponent, $mmSyncBlock, $mmaModLessonHelper, $mmSideMenu) {

    var lessonId = $stateParams.lessonid,
        courseId = $stateParams.courseid,
        lesson,
        accessInfo,
        offline = false,
        scrollView;

    // Block the lesson so it cannot be synced.
    $mmSyncBlock.blockOperation(mmaModLessonComponent, lessonId);

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    $scope.component = mmaModLessonComponent;
    $scope.currentPage = $stateParams.pageid;

    // Convenience function to get Lesson data.
    function fetchLessonData() {
        return $mmaModLesson.getLessonById(courseId, lessonId).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;
            $scope.title = lesson.name; // Temporary title.
            $scope.mediaFile = lesson.mediafiles && lesson.mediafiles[0];

            $scope.lessonWidth = lesson.slideshow ?  $mmUtil.formatPixelsSize(lesson.mediawidth) : '';
            $scope.lessonHeight = lesson.slideshow ?  $mmUtil.formatPixelsSize(lesson.mediaheight) : '';

            return $mmaModLesson.getAccessInformation(lesson.id, offline, true);
        }).then(function(info) {
            accessInfo = info;
            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                // Lesson cannot be attempted, show message and go back.
                $mmUtil.showErrorModal(info.preventaccessreasons[0]);
                blockData && blockData.back();
                return;
            }

            return launchAttempt($scope.currentPage);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        });
    }

    // Start or continue an attempt.
    function launchAttempt(pageId) {
        return $mmaModLesson.launchAttempt(lesson.id, undefined, pageId).then(function() {
            $scope.currentPage = pageId || accessInfo.firstpageid;

            return loadPage($scope.currentPage);
        });
    }

    // Load a certain page.
    function loadPage(pageId) {
        return $mmaModLesson.getPageData(lesson.id, pageId, undefined, false, true, offline, true).then(function(data) {
            $scope.title = data.page.title;
            $scope.pageContent = data.page.contents;
            $scope.pageLoaded = true;
            $scope.pageButtons = $mmaModLessonHelper.getPageButtonsFromHtml(data.pagecontent);
            $scope.currentPage = pageId;

            if (data.displaymenu && !$scope.displayMenu) {
                // Load the menu.
                loadMenu();
            }
            $scope.displayMenu = !!data.displaymenu;
        });
    }

    // Finish the attempt.
    function finishAttempt() {
        return $mmaModLesson.finishAttempt(lesson.id).then(function(data) {
            $scope.eolData = data.data;
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
        // @todo
        return $q.when();
    }

    // Load the lesson menu.
    function loadMenu() {
        if ($scope.loadingMenu) {
            // Already loading.
            return;
        }

        $scope.loadingMenu = true;
        return $mmaModLesson.getPages(lesson.id).then(function(pages) {
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

    // Fetch the Lesson data.
    fetchLessonData().finally(function() {
        $scope.pageLoaded = true;
    });

    // A button was clicked.
    $scope.buttonClicked = function(button) {
        showLoading();

        return $mmaModLesson.processPage(lessonId, $scope.currentPage, button.data).then(function(result) {
            if (result.newpageid === 0) {
                // Not a valid page, return to entry view.
                // This happens, for example, when the user clicks to go to previous page and there is no previous page.
                blockData && blockData.back();
                return;
            } else if (result.newpageid == $mmaModLesson.LESSON_EOL) {
                // End of lesson reached.
                // @todo Show grade, progress bar, min questions, etc. in final page.
                $scope.title = lesson.name;
                return finishAttempt();
            }

            // Load new page.
            $scope.eolData = false;
            return loadPage(result.newpageid);
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error processing page');
            return $q.reject();
        }).finally(function() {
            $scope.pageLoaded = true;
        });
    };

    // Menu page was clicked, load the page.
    $scope.loadPage = function(pageId) {
        if (!$scope.eolData && $scope.currentPage == pageId) {
            // Page already loaded, stop.
            return;
        }

        showLoading();

        return loadPage(pageId).then(function() {
            // Page loaded, hide the EOL page if shown.
            $scope.eolData = false;
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error loading page');
            return $q.reject();
        }).finally(function() {
            $scope.pageLoaded = true;
        });
    };

    // Setup right side menu.
    $mmSideMenu.showRightSideMenu('addons/mod/lesson/templates/menu.html', $scope);

});
