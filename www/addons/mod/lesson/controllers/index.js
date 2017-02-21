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
 * Lesson index controller.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc controller
 * @name mmaModLessonIndexCtrl
 */
.controller('mmaModLessonIndexCtrl', function($scope, $stateParams, $mmaModLesson, $mmCourse, $q, $translate, $ionicScrollDelegate,
            $mmEvents, $mmText, $mmUtil, $mmCourseHelper, mmaModLessonComponent, $mmApp, mmCoreEventOnlineStatusChanged) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        lesson,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaModLessonIndexScroll'),
        onlineObserver;

    $scope.title = module.name;
    $scope.moduleUrl = module.url;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModLessonComponent;
    $scope.componentId = module.id;

    // Convenience function to get Lesson data.
    function fetchLessonData(refresh) {
        $scope.isOnline = $mmApp.isOnline();

        return $mmaModLesson.getLesson(courseId, module.id).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;

            $scope.now = Date.now();
            $scope.title = lesson.name || $scope.title;
            $scope.description = lesson.intro; // Show description only if intro is present.

            return $mmaModLesson.getAccessInformation(lesson.id);
        }).then(function(info) {
            $scope.preventMessages = info.preventaccessreasons;
        }).then(function() {
            // All data obtained, now fill the context menu.
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModLessonComponent);
        }).catch(function(message) {
            if (!refresh && !lesson) {
                // Get lesson failed, retry without using cache since it might be a new activity.
                return refreshData();
            }
            return $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
        });
    }

    // Refreshes data.
    function refreshData() {
        var promises = [];

        promises.push($mmaModLesson.invalidateLessonData(courseId));

        return $q.all(promises).finally(function() {
            return fetchLessonData(true);
        });
    }

    // Fetch the Lesson data.
    fetchLessonData().then(function() {
        $mmaModLesson.logViewLesson(lesson.id).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }).finally(function() {
        $scope.lessonLoaded = true;
        $scope.refreshIcon = 'ion-refresh';
    });

    // Pull to refresh.
    $scope.refreshLesson = function() {
        if ($scope.lessonLoaded) {
            $scope.refreshIcon = 'spinner';
            return refreshData().finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModLessonComponent, module.id);
    };

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });

});
