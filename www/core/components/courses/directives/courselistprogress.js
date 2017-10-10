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
.directive('mmCourseListProgress', function($ionicActionSheet, $mmCoursesDelegate, $translate, $controller, $q) {

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
            scope.loaded = true;
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
            var buttons;

            shouldShowActions(scope, false);

            scope.showCourseActions = function($event) {
                $event.preventDefault();
                $event.stopPropagation();

                // Get the list of handlers to display.
                scope.loaded = false;
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
                }).finally(function() {
                    // We have the list of buttons to show, show the action sheet.
                    scope.loaded = true;

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
                });
            };
        }
    };
});
