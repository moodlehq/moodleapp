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
            $mmEvents, $mmText, $mmUtil, $mmCourseHelper, mmaModLessonComponent, $mmApp, $state, mmCoreEventOnlineStatusChanged,
            $ionicHistory) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        lesson,
        accessInfo,
        scrollView,
        onlineObserver,
        password;

    $scope.title = module.name;
    $scope.moduleUrl = module.url;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModLessonComponent;
    $scope.componentId = module.id;
    $scope.data = {
        password: ''
    };

    // Convenience function to get Lesson data.
    function fetchLessonData(refresh) {
        $scope.isOnline = $mmApp.isOnline();

        return $mmaModLesson.getLesson(courseId, module.id).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;

            $scope.title = lesson.name || $scope.title;
            $scope.description = lesson.intro; // Show description only if intro is present.

            return $mmaModLesson.getAccessInformation(lesson.id);
        }).then(function(info) {
            var promise;

            accessInfo = info;
            $scope.preventMessages = info.preventaccessreasons;

            if ($scope.preventMessages && $scope.preventMessages.length) {
                $scope.askPassword = $scope.preventMessages.length == 1 && $mmaModLesson.isPasswordProtected(info);
                if ($scope.askPassword) {
                    // The lesson requires a password. Check if there is one in memory or DB.
                    promise = password ? $q.when(password) : $mmaModLesson.getStoredPassword(lesson.id);

                    return promise.then(function(pwd) {
                        return validatePassword(pwd);
                    }).catch(function() {
                        // No password or the validation failed. The password form will be shown.
                    });
                } else  {
                    // Lesson cannot be attempted, stop.
                    return;
                }
            }

            // Lesson can be attempted, don't ask the password and don't show prevent messages.
            fetchDataFinished();
        }).then(function() {
            // All data obtained, now fill the context menu.
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModLessonComponent);
        }).catch(function(message) {
            if (!refresh && !lesson) {
                // Get lesson failed, retry without using cache since it might be a new activity.
                return refreshData();
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        });
    }

    // Function called when all the data has been fetched.
    function fetchDataFinished(pwd) {
        password = pwd;
        $scope.data.password = '';
        $scope.askPassword = false;
        $scope.preventMessages = [];
        $scope.leftDuringTimed = $mmaModLesson.leftDuringTimed(accessInfo);

        if (pwd) {
            // Store the password in DB.
            $mmaModLesson.storePassword(lesson.id, password);
        }
    }

    // Validate a password and retrieve extra data.
    function validatePassword(pwd) {
        return $mmaModLesson.validatePassword(lesson.id, pwd).then(function() {
            // Password validated, remove the form and the prevent message.
            fetchDataFinished(pwd);

            // Log view now that we have the password.
            logView();
        }).catch(function(error) {
            password = '';
            return $q.reject(error);
        });
    }

    // Refreshes data.
    function refreshData() {
        var promises = [];

        promises.push($mmaModLesson.invalidateLessonData(courseId));
        if (lesson) {
            promises.push($mmaModLesson.invalidateAccessInformation(lesson.id));
        }

        return $q.all(promises).finally(function() {
            return fetchLessonData(true);
        });
    }

    function showSpinnerAndRefresh() {
        scrollTop();
        $scope.lessonLoaded = false;
        $scope.refreshIcon = 'spinner';

        refreshData().finally(function() {
            $scope.lessonLoaded = true;
            $scope.refreshIcon = 'ion-refresh';
        });
    }

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModLessonIndexScroll');
        }

        scrollView.scrollTop();
    }

    // Log viewing the lesson.
    function logView() {
        $mmaModLesson.logViewLesson(lesson.id, password).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }

    // Fetch the Lesson data.
    fetchLessonData().then(function() {
        if (!$scope.preventMessages || !$scope.preventMessages.length) {
            // Lesson can be attempted, log viewing it.
            logView();
        }
    }).finally(function() {
        $scope.lessonLoaded = true;
        $scope.refreshIcon = 'ion-refresh';
    });

    // Start the lesson.
    $scope.start = function(continueLast) {
        var pageId = $scope.leftDuringTimed ? (continueLast ? accessInfo.lastpageseen : accessInfo.firstpageid) : false;
        $state.go('site.mod_lesson-player', {
            courseid: courseId,
            lessonid: lesson.id,
            pageid: pageId,
            password: password
        });
    };

    // Submit password for password protected lessons.
    $scope.submitPassword = function(pwd) {
        if (!pwd) {
            $mmUtil.showErrorModal('mma.mod_lesson.emptypassword');
            return;
        }

        scrollTop();
        $scope.lessonLoaded = false;
        $scope.refreshIcon = 'spinner';

        validatePassword(pwd).catch(function(error) {
            $mmUtil.showErrorModal(error);
        }).finally(function() {
            $scope.lessonLoaded = true;
            $scope.refreshIcon = 'ion-refresh';
        });
    };

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

    // Update data when we come back from the player since the status could have changed.
    // We want to skip the first $ionicView.enter event because it's when the view is created.
    var skip = true;
    $scope.$on('$ionicView.enter', function() {
        if (skip) {
            skip = false;
            return;
        }

        var forwardView = $ionicHistory.forwardView();
        if (forwardView && forwardView.stateName === 'site.mod_lesson-player') {
            // Refresh data.
            showSpinnerAndRefresh();
        }
    });

    // Update online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });

});
