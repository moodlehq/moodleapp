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
            $ionicModal, $mmEvents, $mmSite, mmCoursesSearchComponent, mmCoursesEnrolInvalidKey, mmCoursesEventMyCoursesUpdated,
            $timeout, $mmFS, $rootScope, $mmApp, $ionicPlatform, $mmCourseHelper, $mmCourse, mmCoreEventCourseStatusChanged) {

    var course = angular.copy($stateParams.course || {}), // Copy the object to prevent modifying the one from the previous view.
        selfEnrolWSAvailable = $mmCourses.isSelfEnrolmentEnabled(),
        guestWSAvailable = $mmCourses.isGuestWSAvailable(),
        isGuestEnabled = false,
        guestInstanceId,
        enrollmentMethods,
        waitStart = 0,
        enrolUrl = $mmFS.concatenatePaths($mmSite.getURL(), 'enrol/index.php?id=' + course.id),
        courseUrl = $mmFS.concatenatePaths($mmSite.getURL(), 'course/view.php?id=' + course.id),
        paypalReturnUrl = $mmFS.concatenatePaths($mmSite.getURL(), 'enrol/paypal/return.php'),
        inAppLoadListener,
        inAppFinishListener,
        inAppExitListener,
        appResumeListener,
        obsStatus;

    $scope.course = course;
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
                return loadCourseNavHandlers(refresh, false);
            }).catch(function() {
                // The user is not an admin/manager. Check if we can provide guest access to the course.
                return canAccessAsGuest().then(function(passwordRequired) {
                    if (!passwordRequired) {
                        return loadCourseNavHandlers(refresh, true);
                    } else {
                        course._handlers = [];
                        $scope.handlersShouldBeShown = false;
                    }
                }).catch(function() {
                    course._handlers = [];
                    $scope.handlersShouldBeShown = false;
                });
            });
        }).finally(function() {
            $scope.courseLoaded = true;
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
    function loadCourseNavHandlers(refresh, guest) {
        // Get the handlers to be shown.
        return $mmCoursesDelegate.getNavHandlersToDisplay(course, refresh, guest, true).then(function(handlers) {
            course._handlers = handlers;
            $scope.handlersShouldBeShown = true;
        });

    }

    function refreshData() {
        var promises = [];

        promises.push($mmCourses.invalidateUserCourses());
        promises.push($mmCourses.invalidateCourse(course.id));
        promises.push($mmCourses.invalidateCourseEnrolmentMethods(course.id));
        promises.push($mmCoursesDelegate.clearAndInvalidateCoursesOptions(course.id));
        if (guestInstanceId) {
            promises.push($mmCourses.invalidateCourseGuestEnrolmentInfo(guestInstanceId));
        }

        return $q.all(promises).finally(function() {
            return getCourse(true);
        });
    }

    getCourse().finally(function() {
        // Determine course prefetch icon.
        $scope.prefetchCourseIcon = 'spinner';
        $mmCourseHelper.getCourseStatusIcon(course.id).then(function(icon) {
            $scope.prefetchCourseIcon = icon;

            if (icon == 'spinner') {
                // Course is being downloaded. Get the download promise.
                var promise = $mmCourseHelper.getCourseDownloadPromise(course.id);
                if (promise) {
                    // There is a download promise. If it fails, show an error.
                    promise.catch(function(error) {
                        if (!scope.$$destroyed) {
                            $mmUtil.showErrorModalDefault(error, 'mm.course.errordownloadingcourse', true);
                        }
                    });
                } else {
                    // No download, this probably means that the app was closed while downloading. Set previous status.
                    $mmCourse.setCoursePreviousStatus(courseId);
                }
            }
        });
    });

    $scope.doRefresh = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.prefetchCourse = function() {
        $mmCourseHelper.confirmAndPrefetchCourse($scope, course, undefined, course._handlers);
    };

    // Listen for status change in course.
    obsStatus = $mmEvents.on(mmCoreEventCourseStatusChanged, function(data) {
        if (data.siteId == $mmSite.getId() && data.courseId == course.id) {
            $scope.prefetchCourseIcon = $mmCourseHelper.getCourseStatusIconFromStatus(data.status);
        }
    });

    if (selfEnrolWSAvailable && course.enrollmentmethods && course.enrollmentmethods.indexOf('self') > -1) {
        // Setup password modal for self-enrolment.
        $ionicModal.fromTemplateUrl('core/components/courses/templates/password-modal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.modal = modal;

            $scope.closeModal = function() {
                $scope.enroldata.password = '';
                delete $scope.currentEnrolInstance;
                return modal.hide();
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
                    $scope.isEnrolled = true;
                    $scope.courseLoaded = false;

                    // Don't refresh until modal is closed. See https://github.com/driftyco/ionic/issues/9069
                    $scope.closeModal().then(function() {
                        // Sometimes the list of enrolled courses takes a while to be updated. Wait for it.
                        return waitForEnrolled(true);
                    }).then(function() {
                        refreshData().finally(function() {
                            // My courses have been updated, trigger event.
                            $mmEvents.trigger(mmCoursesEventMyCoursesUpdated, $mmSite.getId());
                        });
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

        function waitForEnrolled(init) {
            if (init) {
                waitStart = Date.now();
            }

            // Check if user is enrolled in the course.
            return $mmCourses.invalidateUserCourses().catch(function() {
                // Ignore errors.
            }).then(function() {
                return $mmCourses.getUserCourse(course.id);
            }).catch(function() {
                // Not enrolled, wait a bit and try again.
                if ($scope.$$destroyed || (Date.now() - waitStart > 60000)) {
                    // Max time reached or the user left the view, stop.
                    return;
                }

                return $timeout(function() {
                    return waitForEnrolled();
                }, 5000);
            });
        }
    }

    if (course.enrollmentmethods && course.enrollmentmethods.indexOf('paypal') > -1) {
        $scope.paypalEnabled = true;

        $scope.paypalEnrol = function() {
            var hasReturnedFromPaypal = false;

            // Stop previous listeners if any.
            stopListeners();

            // Open the enrolment page in InAppBrowser.
            $mmSite.openInAppWithAutoLogin(enrolUrl);

            // Observe loaded pages in the InAppBrowser to check if the enrol process has ended.
            inAppLoadListener = $rootScope.$on('$cordovaInAppBrowser:loadstart', urlLoaded);

            if (!$mmApp.isDevice()) {
                // In desktop, also observe stop loading since some pages don't throw the loadstart event.
                inAppFinishListener = $rootScope.$on('$cordovaInAppBrowser:loadstop', urlLoaded);

                // Since the user can switch windows, reload the data if he comes back to the app.
                appResumeListener = $ionicPlatform.on('resume', function() {
                    if (!$scope.courseLoaded) {
                        return;
                    }
                    $scope.courseLoaded = false;
                    refreshData();
                });
            }

            // Observe InAppBrowser closed events.
            inAppExitListener = $rootScope.$on('$cordovaInAppBrowser:exit', inAppClosed);

            function stopListeners() {
                inAppLoadListener && inAppLoadListener();
                inAppFinishListener && inAppFinishListener();
                inAppExitListener && inAppExitListener();
                appResumeListener && appResumeListener();
            }

            function urlLoaded(e, event) {
                if (event.url.indexOf(paypalReturnUrl) != -1) {
                    hasReturnedFromPaypal = true;
                } else if (event.url.indexOf(courseUrl) != -1 && hasReturnedFromPaypal) {
                    // User reached the course index page after returning from PayPal, close the InAppBrowser.
                    inAppClosed();
                    $mmUtil.closeInAppBrowser();
                }
            }

            function inAppClosed() {
                // InAppBrowser closed, refresh data.
                stopListeners();

                if (!$scope.courseLoaded) {
                    return;
                }
                $scope.courseLoaded = false;
                refreshData();
            }
        };
    }

    $scope.$on('$destroy', function() {
        obsStatus && obsStatus.off && obsStatus.off();
    });
});
