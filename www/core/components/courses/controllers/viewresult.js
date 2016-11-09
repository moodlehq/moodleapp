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
        selfEnrolWSAvailable = $mmCourses.isSelfEnrolmentEnabled(),
        guestWSAvailable = $mmCourses.isGuestWSAvailable(),
        isGuestEnabled = false,
        guestInstanceId,
        enrollmentMethods;

    $scope.course = course;
    $scope.title = course.fullname;
    $scope.component = mmCoursesSearchComponent;
    $scope.handlersShouldBeShown = true;
    $scope.selfEnrolInstances = [];
    $scope.enroldata = {
        password: ''
    };

    // Function to determine if handlers are being loaded.
    $scope.loadingHandlers = function() {
        return $scope.handlersShouldBeShown && !$mmCoursesDelegate.areNavHandlersLoadedFor(course.id);
    };

    // Convenience function to get course. We use this to determine if a user can see the course or not.
    function getCourse(refresh) {
        var promise;
        if (selfEnrolWSAvailable || guestWSAvailable) {
            // Get course enrolment methods.
            $scope.selfEnrolInstances = [];
            promise = $mmCourses.getCourseEnrolmentMethods(course.id).then(function(methods) {
                enrollmentMethods = methods;

                angular.forEach(enrollmentMethods, function(method) {
                    if (selfEnrolWSAvailable && method.type === 'self') {
                        $scope.selfEnrolInstances.push(method);
                    } else if (guestWSAvailable && method.type === 'guest') {
                        isGuestEnabled = true;
                    }
                });
            }).catch(function(error) {
                if (error) {
                    $mmUtil.showErrorModal(error);
                }
            });
        } else {
            promise = $q.when(); // No need to get enrolment methods.
        }

        return promise.then(function() {
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
                return loadCourseNavHandlers(refresh);
            }).catch(function() {
                // The user is not an admin/manager. Check if we can provide guest access to the course.
                return canAccessAsGuest().then(function(passwordRequired) {
                    if (!passwordRequired) {
                        return loadCourseNavHandlers(refresh);
                    } else {
                        course._handlers = [];
                        $scope.handlersShouldBeShown = false;
                    }
                }).catch(function() {
                    course._handlers = [];
                    $scope.handlersShouldBeShown = false;
                });
            });
        });
    }

    // Convenience function to check if the user can access as guest.
    function canAccessAsGuest() {
        if (!isGuestEnabled) {
            return $q.reject();
        }

            // Search instance ID of guest enrolment method.
        angular.forEach(enrollmentMethods, function(method) {
            if (method.type == 'guest') {
                guestInstanceId = method.id;
            }
        });

        if (guestInstanceId) {
            return $mmCourses.getCourseGuestEnrolmentInfo(guestInstanceId).then(function(info) {
                if (!info.status) {
                    // Not active, reject.
                    return $q.reject();
                }
                return info.passwordrequired;
            });
        }
        return $q.reject();
    }

    // Load course nav handlers.
    function loadCourseNavHandlers(refresh) {
        var promises = [],
            navOptions,
            admOptions;

        // Get user navigation and administration options to speed up handlers loading.
        promises.push($mmCourses.getUserNavigationOptions([course.id]).catch(function() {
            // Couldn't get it, return empty options.
            return {};
        }).then(function(options) {
            navOptions = options;
        }));

        promises.push($mmCourses.getUserAdministrationOptions([course.id]).catch(function() {
            // Couldn't get it, return empty options.
            return {};
        }).then(function(options) {
            admOptions = options;
        }));

        return $q.all(promises).then(function() {
            course._handlers = $mmCoursesDelegate.getNavHandlersFor(
                        course.id, refresh, navOptions[course.id], admOptions[course.id]);
        });

    }

    function refreshData() {
        var promises = [];

        promises.push($mmCourses.invalidateUserCourses());
        promises.push($mmCourses.invalidateCourse(course.id));
        promises.push($mmCourses.invalidateCourseEnrolmentMethods(course.id));
        promises.push($mmCourses.invalidateUserNavigationOptionsForCourses([course.id]));
        promises.push($mmCourses.invalidateUserAdministrationOptionsForCourses([course.id]));
        if (guestInstanceId) {
            promises.push($mmCourses.invalidateCourseGuestEnrolmentInfo(guestInstanceId));
        }

        return $q.all(promises).finally(function() {
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

    if (selfEnrolWSAvailable && course.enrollmentmethods.indexOf('self') > -1) {
        // Setup password modal for self-enrolment.
        $ionicModal.fromTemplateUrl('core/components/courses/templates/password-modal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.modal = modal;

            $scope.closeModal = function() {
                $scope.enroldata.password = '';
                delete $scope.currentEnrolInstance;
                modal.hide();
            };
            $scope.$on('$destroy', function() {
                modal.remove();
            });
        });

        // Convenience function to self-enrol a user in a course.
        $scope.enrol = function(instanceId, password) {
            var promise;

            if ($scope.modal.isShown()) {
                // Don't show confirm if password is shown, we already showed it before.
                promise = $q.when();
            } else {
                promise = $mmUtil.showConfirm($translate('mm.courses.confirmselfenrol'));
            }

            promise.then(function() {
                var modal = $mmUtil.showModalLoading('mm.core.loading', true);

                $mmCourses.selfEnrol(course.id, password, instanceId).then(function() {
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
                                $scope.currentEnrolInstance = instanceId;
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
