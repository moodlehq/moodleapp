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

angular.module('mm.core.courses')

/**
 * Controller to handle view a course that was searched.
 *
 * @module mm.core.courses
 * @ngdoc controller
 * @name mmCoursesViewResultCtrl
 */
.controller('mmCoursesViewResultCtrl', function($scope, $stateParams, $mmCourses, $mmCoursesDelegate, $mmUtil, $translate, $q,
            $ionicModal, $mmEvents, $mmSite, mmCoursesSearchComponent, mmCoursesEnrolInvalidKey, mmCoursesEventMyCoursesUpdated) {

    var course = $stateParams.course || {},
        selfEnrolWSAvailable = $mmCourses.isSelfEnrolmentEnabled();

    $scope.course = course;
    $scope.title = course.fullname;
    $scope.component = mmCoursesSearchComponent;

    if (selfEnrolWSAvailable) {
        // Self enrol WS is available, check if the course supports self enrolment.
        angular.forEach(course.enrollmentmethods, function(method) {
            if (method === 'self') {
                $scope.selfEnrolEnabled = true;
                $scope.enroldata = {
                    password: ''
                };
            }
        });
    }

    // Convenience function to get course. We use this to determine if a user can see the course or not.
    function getCourse(refresh) {
        // Check if user is enrolled in the course.
        return $mmCourses.getUserCourse(course.id).then(function(c) {
            $scope.isEnrolled = true;
            return c;
        }).catch(function() {
            // The user is not enrolled in the course. Use getCourses to see if it's an admin/manager and can see the course.
            $scope.isEnrolled = false;
            return $mmCourses.getCourse(course.id);
        }).then(function(c) {
            // Success retrieving the course, we can assume the user has permissions to view it.
            course.fullname = c.fullname || course.fullname;
            course.summary = c.summary || course.summary;
            course._handlers = $mmCoursesDelegate.getNavHandlersFor(course.id, refresh);
        });
    }

    function refreshData() {
        var p1 = $mmCourses.invalidateUserCourses(),
            p2 = $mmCourses.invalidateCourse(course.id);

        return $q.all([p1, p2]).finally(function() {
            return getCourse(true);
        });
    }

    getCourse().finally(function() {
        $scope.courseLoaded = true;
    });

    $scope.doRefresh = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    if ($scope.selfEnrolEnabled) {
        // Setup password modal for self-enrolment.
        $ionicModal.fromTemplateUrl('core/components/courses/templates/password-modal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.modal = modal;

            $scope.closeModal = function() {
                $scope.enroldata.password = '';
                modal.hide();
            };
            $scope.$on('$destroy', function() {
                modal.remove();
            });
        });

        // Convenience function to self-enrol a user in a course.
        $scope.enrol = function(password) {
            var promise;

            if ($scope.modal.isShown()) {
                // Don't show confirm if password is shown, we already showed it before.
                promise = $q.when();
            } else {
                promise = $mmUtil.showConfirm($translate('mm.courses.confirmselfenrol'));
            }

            promise.then(function() {
                var modal = $mmUtil.showModalLoading('mm.core.loading', true);

                $mmCourses.selfEnrol(course.id, password).then(function() {
                    // Close modal and refresh data.
                    $scope.closeModal();
                    $scope.isEnrolled = true;
                    refreshData().finally(function() {
                        // My courses have been updated, trigger event.
                        $mmEvents.trigger(mmCoursesEventMyCoursesUpdated, $mmSite.getId());
                    });
                }).catch(function(error) {
                    if (error) {
                        if (error.code === mmCoursesEnrolInvalidKey) {
                            // Invalid password. If password was already shown, show error message.
                            if ($scope.modal.isShown()) {
                                $mmUtil.showErrorModal(error.message);
                            } else {
                                $scope.modal.show();
                            }
                        } else if (typeof error == 'string') {
                            $mmUtil.showErrorModal(error);
                        }
                    } else {
                        $mmUtil.showErrorModal('mm.courses.errorselfenrol', true);
                    }
                }).finally(function() {
                    modal.dismiss();
                });
            });
        };
    }
});
