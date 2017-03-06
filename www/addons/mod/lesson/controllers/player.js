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
            mmaModLessonComponent, $mmSyncBlock) {

    var lessonId = $stateParams.lessonid,
        courseId = $stateParams.courseid,
        pageId = $stateParams.pageid,
        lesson,
        accessInfo,
        offline = false,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModLessonPlayerScroll');

    // Block the lesson so it cannot be synced.
    $mmSyncBlock.blockOperation(mmaModLessonComponent, lessonId);

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    $scope.component = mmaModLessonComponent;

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
                // Lesson cannot be attempted, show message and go back.
                $mmUtil.showErrorModal(info.preventaccessreasons[0]);
                blockData && blockData.back();
                return;
            }

            return launchAttempt(pageId);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        });
    }

    // Start or continue an attempt.
    function launchAttempt(pageId) {
        return $mmaModLesson.launchAttempt(lesson.id, undefined, pageId).then(function() {
            pageId = pageId || accessInfo.firstpageid;

            return loadPage(pageId);
        });
    }

    // Load a certain page.
    function loadPage(pageId) {
        return $mmaModLesson.getPageData(lesson.id, pageId, undefined, false, offline, true).then(function(data) {
            $scope.title = data.page.title;
            $scope.pageContent = data.page.contents;
            $scope.pageLoaded = true;
        });
    }

    // Function called when the user wants to leave the player. Save the attempt before leaving.
    function leavePlayer() {
        // @todo
        return $q.when();
    }

    // Fetch the Lesson data.
    fetchLessonData().finally(function() {
        $scope.pageLoaded = true;
    });

});
