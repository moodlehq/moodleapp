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
 * Course List Item with progress directive.
 *
 * Display a course list item.
 *
 * @module mm.core.courses
 * @ngdoc directive
 * @name mmCourseListItem
 * @description
 *
 * This directive is meant to display an item for a list of courses with progress.
 *
 * @example
 *
 * <mm-course-list-progress course="course" round-progress="true" show-summary="true"></mm-course-list-progress>
 */
.directive('mmCourseListProgress', function($ionicActionSheet, $mmCoursesDelegate, $translate, $controller, $q, $mmCourseHelper,
        $mmUtil, $mmCourse, $mmEvents, $mmSite, mmCoreEventCourseStatusChanged) {

    /**
     * Check if the actions button should be shown.
     *
     * @param  {Object} scope    Directive's scope.
     * @param  {Boolean} refresh Whether to refresh the list of handlers.
     * @return {Promise}         Promise resolved when done.
     */
    function shouldShowActions(scope, refresh) {
        scope.loaded = false;

        return $mmCoursesDelegate.getNavHandlersForCourse(scope.course, refresh, true).then(function(handlers) {
            scope.showActions = !!handlers.length;
        }).catch(function(error) {
            scope.showActions = false;
            return $q.reject(error);
        }).finally(function() {
            scope.actionsLoaded = true;
        });
    }

    return {
        restrict: 'E',
        templateUrl: 'core/components/courses/templates/courselistprogress.html',
        transclude: true,
        scope: {
            course: '=',
            roundProgress: '=?',
            showSummary: "=?"
        },
        link: function(scope) {
            var buttons,
                obsStatus,
                siteId = $mmSite.getId();

            // Check if actions should be shown.
            shouldShowActions(scope, false);

            // Determine course prefetch icon.
            scope.prefetchCourseIcon = 'spinner';
            $mmCourseHelper.getCourseStatusIcon(scope.course.id).then(function(icon) {
                scope.prefetchCourseIcon = icon;

                if (icon == 'spinner') {
                    // Course is being downloaded. Get the download promise.
                    var promise = $mmCourseHelper.getCourseDownloadPromise(scope.course.id);
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

            // Listen for status change in course.
            obsStatus = $mmEvents.on(mmCoreEventCourseStatusChanged, function(data) {
                if (data.siteId == siteId && data.courseId == scope.course.id) {
                    scope.prefetchCourseIcon = $mmCourseHelper.getCourseStatusIconFromStatus(data.status);
                }
            });

            scope.showCourseActions = function($event) {
                $event.preventDefault();
                $event.stopPropagation();

                // Get the list of handlers to display.
                scope.actionsLoaded = false;
                $mmCoursesDelegate.getNavHandlersToDisplay(scope.course, false, false, true).then(function(handlers) {

                    buttons = handlers.map(function(handler) {
                        var newScope = scope.$new();
                        $controller(handler.controller, {$scope: newScope});

                        var title = newScope.title || "",
                            icon = newScope.icon || false,
                            buttonInfo = {
                                text: (icon ? '<i class="icon ' + icon + '"></i>' : '') + $translate.instant(title),
                                action: newScope.action || false,
                                className: newScope.class || false,
                                priority: handler.priority || false
                            };

                        newScope.$destroy();
                        return buttonInfo;
                    }).sort(function(a, b) {
                        return b.priority - a.priority;
                    });
                }).then(function() {
                    // We have the list of buttons to show, show the action sheet.
                    scope.actionsLoaded = true;

                    $ionicActionSheet.show({
                        titleText: scope.course.fullname,
                        buttons: buttons,
                        cancelText: $translate.instant('mm.core.cancel'),
                        buttonClicked: function(index) {
                            if (angular.isFunction(buttons[index].action)) {
                                // Execute the action and close the action sheet.
                                return buttons[index].action($event, scope.course);
                            }

                            // Never close the action sheet. It will automatically be closed if success.
                            return false;
                        },
                        cancel: function() {
                            // User cancelled the action sheet.
                            return true;
                        }
                    });
                }).catch(function(error) {
                    $mmUtil.showErrorModalDefault(error, 'Error loading options');
                }).finally(function() {
                    scope.loaded = true;
                });
            };

            scope.prefetchCourse = function($event) {
                $event.preventDefault();
                $event.stopPropagation();

                var course = scope.course,
                    initialIcon = scope.prefetchCourseIcon;

                scope.prefetchCourseIcon = 'spinner';

                // Get the sections first.
                $mmCourse.getSections(course.id, false, true).then(function(sections) {
                    // Confirm the download.
                    return $mmCourseHelper.confirmDownloadSize(course.id, undefined, sections, true).then(function() {
                        // User confirmed, get the course actions and download.
                        return $mmCoursesDelegate.getNavHandlersToDisplay(course, false, false, true).then(function(handlers) {
                            return $mmCourseHelper.prefetchCourse(course, sections, handlers);
                        });
                    }, function() {
                        // User cancelled.
                        scope.prefetchCourseIcon = initialIcon;
                    });
                }).catch(function(error) {
                    // Don't show error message if scope is destroyed.
                    if (scope.$$destroyed) {
                        return;
                    }

                    $mmUtil.showErrorModalDefault(error, 'mm.course.errordownloadingcourse', true);
                });
            };

            scope.$on('$destroy', function() {
                obsStatus && obsStatus.off && obsStatus.off();
            });
        }
    };
});
