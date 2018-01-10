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
                downloadText = $translate.instant('mm.course.downloadcourse'),
                downloadingText = $translate.instant('mm.core.downloading'),
                downloadButton = {
                    isDownload: true,
                    className: 'mm-download-course',
                    priority: 1000
                };

            // Always show options, since the download course option will always be there.
            scope.actionsLoaded = true;

            // Determine course prefetch icon.
            $mmCourseHelper.getCourseStatusIcon(scope.course.id).then(function(icon) {
                scope.prefetchCourseIcon = icon;

                if (icon == 'spinner') {
                    downloadButton.text = downloadingText;

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
                        $mmCourse.setCoursePreviousStatus(scope.course.id);
                    }
                } else {
                    downloadButton.text = '<i class="icon ' + icon + '"></i>' + downloadText;
                }
            });

            // Listen for status change in course.
            obsStatus = $mmEvents.on(mmCoreEventCourseStatusChanged, function(data) {
                if (data.siteId == $mmSite.getId() && data.courseId == scope.course.id) {
                    var icon = $mmCourseHelper.getCourseStatusIconFromStatus(data.status);
                    scope.prefetchCourseIcon = icon;

                    if (icon == 'spinner') {
                        downloadButton.text = downloadingText;
                    } else {
                        downloadButton.text = '<i class="icon ' + icon + '"></i>' + downloadText;
                    }
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
                    });

                    // Add the download button.
                    buttons.unshift(downloadButton);

                    // Sort the buttons.
                    buttons = buttons.sort(function(a, b) {
                        return b.priority - a.priority;
                    });
                }).then(function() {
                    // We have the list of buttons to show, show the action sheet.
                    $ionicActionSheet.show({
                        titleText: scope.course.fullname,
                        buttons: buttons,
                        cancelText: $translate.instant('mm.core.cancel'),
                        buttonClicked: function(index) {
                            if (buttons[index].isDownload) {
                                // Download button.
                                $mmCourseHelper.confirmAndPrefetchCourse(scope, scope.course);
                                return true;
                            } else if (angular.isFunction(buttons[index].action)) {
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
                    scope.actionsLoaded = true;
                });
            };

            scope.$on('$destroy', function() {
                obsStatus && obsStatus.off && obsStatus.off();
            });
        }
    };
});
