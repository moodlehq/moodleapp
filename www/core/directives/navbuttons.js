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

angular.module('mm.core')

/**
 * Directive similar to ion-nav-buttons, but meant to be used with split view.
 * Please use ion-nav-buttons if your view will never be in the right pane of a split view.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmNavButtons
 * @description
 *
 * The purpose of this directive is to be able to add buttons to the header bar from the right pane view of a split view.
 * Using ion-nav-buttons in the right pane view will NOT work.
 *
 * This directive accepts the same parameters as ionNavButtons. Its usage is exactly the same as ionNavButtons.
 * Please use ion-nav-buttons if your view will never be in the right pane of a split view.
 *
 * This directive should be used in views that can be in the right pane of a split view. If the view isn't
 * in the right pane of a split view it will behave as ion-nav-buttons.
 *
 * IMPORTANT: This directive has some limitations:
 *
 * - If this directive is used in a right pane view, the left pane view header buttons CANNOT use ng-if. Use ng-show instead.
 *   The reason is that, by default, this directive would override the left view buttons. To prevent doing so, the left view
 *   buttons are copied and merged with the right view ones. If you use ng-if in the left pane view and the button isn't seen
 *   when the copy is done, the hidden button won't be copied and it won't be added to the header bar. ng-show works fine.
 * - The elements defined inside of this directive will have access to the scopes of BOTH views, the left one and the right one.
 *   This means that, if you add a button with ng-click="myFunction" and both views have myFunction in the scope, then BOTH
 *   functions will be called. Please use unique named variables/functions in the buttons.
 *
 */
.directive('mmNavButtons', function($document, $mmUtil, $compile, $timeout) {

    /**
     * Call beforeEnter function of a $ionViewController.
     *
     * @param  {Object} controller Instance of $ionViewController.
     * @param  {Object} eventData  Event data to pass to the function.
     * @param  {Object} $scope     Directive's scope.
     * @return {Void}
     */
    function callBeforeEnter(controller, eventData, $scope) {
        // Copy and format event data.
        var data = angular.copy(eventData);
        delete data.navBarItems;
        data.viewNotified = false;
        data.shouldAnimate = false;

        // Ionic can show the previous title or a default text in the back button. If the default text is shown, the
        // previous title is 'undefined'. Hide these 'undefined' titles to prevent showing them while updating the bar.
        var previousTitles = document.querySelectorAll('ion-header-bar .back-button .back-text .previous-title'),
            modifiedTitles = [];

        angular.forEach(previousTitles, function(title, index) {
            if (title.innerHTML == 'undefined') {
                angular.element(title).css('display', 'none');
                modifiedTitles.push(title);
            }
        });

        // Call beforeEnter.
        controller.beforeEnter(undefined, data);

        // If a watched variable has been set in the right pane before reaching this point, the watcher will receive an invalid
        // value. This is because beforeEnter compiles the buttons with the left pane scope, so the watcher might receive
        // "undefined" as the new value. To fix this, call the watchers with the right value. Use $timeout to force a $digest.
        $timeout(function() {
            angular.forEach($scope.$$watchers, function(watcher) {
                var value = watcher.get($scope);
                if (typeof value != 'undefined') {
                    watcher.last = value;
                    watcher.fn(value, undefined, $scope);
                }
            });
        });

        // Remove styles added to back button text.
        $timeout(function() {
            angular.forEach(modifiedTitles, function(title) {
                angular.element(title).css('display', '');
            });
        }, 1000);
    }

    return {
        restrict: 'E',
        require: '^ionNavBar',
        priority: 100,
        compile: function(tElement, tAttrs) {
            var side = 'left';

            if (/^primary|secondary|right$/i.test(tAttrs.side || '')) {
                side = tAttrs.side.toLowerCase();
            }

            var spanEle = $document[0].createElement('span');
            spanEle.className = side + '-buttons';
            spanEle.innerHTML = tElement.html();

            var navElementType = side + 'Buttons';

            tElement.attr('class', 'hide');
            tElement.empty();

            return {
                pre: function($scope, $element, $attrs, navBarCtrl) {
                    // Check if the element is inside a split-view.
                    var splitView = $mmUtil.closest($element[0], 'mm-split-view'),
                        ionView,
                        unregisterViewListener,
                        parentViewCtrl;

                    // Search the ion-view to apply the buttons.
                    if (splitView) {
                        // There's a split view, get the ion-view outside the split view.
                        ionView = $mmUtil.closest(splitView, 'ion-view');
                    } else {
                        ionView = $mmUtil.closest($element[0], 'ion-view');
                    }

                    if (!ionView) {
                        // Error. Shouldn't happen.
                        return;
                    }

                    // Get the ion view controller.
                    parentViewCtrl = angular.element(ionView).data('$ionViewController');
                    if (parentViewCtrl) {
                        // The buttons are for JUST this ion-view.
                        if (splitView) {
                            var svController = angular.element(splitView).controller('mmSplitView'),
                                eventData,
                                leftPaneButtons,
                                leftPaneButtonsHtml,
                                timeToWait;

                            if (!svController) {
                                // Error. Shouldn't happen.
                                return;
                            }

                            // Wait until the left view is completeley rendered. Max 1 second.
                            timeToWait = 1000 - (new Date().getTime() - svController.getStartTime());

                            $timeout(function() {
                                eventData = svController.getIonicViewEventData();

                                // Get buttons defined by the left pane view to avoid overriding them.
                                leftPaneButtonsHtml = svController.getHeaderBarButtonsHtml(spanEle.className);
                                if (leftPaneButtonsHtml && leftPaneButtonsHtml.trim()) {
                                    leftPaneButtons = angular.element(leftPaneButtonsHtml);
                                }

                                // Compile the right pane buttons HTML so they have access to this scope.
                                spanEle = $compile(spanEle.outerHTML)($scope);

                                // Span has been compiled. Remove context menus (if any) since context menu already adds items
                                // to the left pane context menu. Leaving it in the span will cause errors.
                                var contextMenus = spanEle[0].querySelectorAll('mm-context-menu');
                                if (contextMenus.length) {
                                    angular.element(contextMenus).remove();
                                }

                                // Now add the left pane buttons if any.
                                if (leftPaneButtons && leftPaneButtons.length) {
                                    if (side == 'secondary' || side == 'right') {
                                        spanEle.prepend(leftPaneButtons);
                                    } else {
                                        spanEle.append(leftPaneButtons);
                                    }
                                }

                                // Add them to the $ionViewController.
                                parentViewCtrl.navElement(navElementType, spanEle);

                                // Call beforeEnter manually since the scope event has been fired already.
                                callBeforeEnter(parentViewCtrl, eventData, $scope);

                                // Listen for view events, maybe we're using an old transition because event hasn't been fired yet.
                                unregisterViewListener = svController.onViewEvent(function(eventData) {
                                    // Transition ID has changed, call beforeEvent again with the right transition ID.
                                    callBeforeEnter(parentViewCtrl, eventData, $scope);
                                });

                                spanEle = null;
                            }, timeToWait);
                        } else {
                            // No split view, just add the buttons.
                            parentViewCtrl.navElement(navElementType, spanEle.outerHTML);
                            spanEle = null;
                        }
                    } else {
                        // These are buttons for all views that do not have their own ion-nav-buttons.
                        navBarCtrl.navElement(navElementType, spanEle.outerHTML);
                        spanEle = null;
                    }

                    $scope.$on('$destroy', function() {
                        if (unregisterViewListener) {
                            unregisterViewListener();
                        }
                    });
                }
            };
        }
    };
});
