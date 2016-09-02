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
 * - Left pane buttons will be overridden. If the left pane of a split view defines some header buttons and the right pane view
 *   has this directive, the left view buttons won't be shown. If you need to show buttons from both views you cannot use this
 *   directive, you'll have to add the right buttons to both views and communicate the views using events. This is how it was done
 *   before this directive was implemented. You can see an example in old messages implementation:
 *       https://github.com/moodlehq/moodlemobile2/tree/4ca16896c5511451b06123f288184cd4ffeeed76/www/addons/messages
 * - The buttons added to the header bar will have access to the scopes of BOTH views, the left one and the right one. This means
 *   that, if you add a button with ng-click="myFunction" and both views have myFunction in the scope, then BOTH functions will
 *   be called. We recommend using unique named variables in these buttons.
 *
 */
.directive('mmNavButtons', function($document, $mmUtil, $compile) {
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
                        unregisterViewListener;

                    // Search the ion-view to apply the buttons.
                    if (splitView) {
                        // There's a split view, we want the ion-view outside the split view.
                        ionView = $mmUtil.closest(splitView, 'ion-view');
                    } else {
                        ionView = $mmUtil.closest($element[0], 'ion-view');
                    }

                    if (!ionView) {
                        // Error.
                        return;
                    }

                    // Get the ion view controller.
                    var parentViewCtrl = angular.element(ionView).data('$ionViewController');
                    if (parentViewCtrl) {
                        // The buttons are for JUST this ion-view.
                        // In splitView we compile the buttons HTML so they have access to this scope.
                        var element = splitView ? $compile(spanEle.outerHTML)($scope) : spanEle.outerHTML;
                        parentViewCtrl.navElement(navElementType, element);

                        if (splitView) {
                            // Call beforeEnter manually since the scope event has been fired already.
                            var svController = angular.element(splitView).controller('mmSplitView'),
                                eventData = svController.getIonicViewEventData();
                            parentViewCtrl.beforeEnter(undefined, {
                                navBarTransition: eventData.navBarTransition,
                                transitionId: eventData.transitionId
                            });

                            // Listen for view events, maybe we're using an old transition because event hasn't been fired yet.
                            unregisterViewListener = svController.onViewEvent(function(eventData) {
                                // Transition ID has changed, call beforeEvent again with the right transition ID.
                                parentViewCtrl.beforeEnter(undefined, {
                                    navBarTransition: eventData.navBarTransition,
                                    transitionId: eventData.transitionId
                                });
                            });
                        }
                    } else {
                        // These are buttons for all views that do not have their own ion-nav-buttons.
                        navBarCtrl.navElement(navElementType, spanEle.outerHTML);
                    }

                    spanEle = null;

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
