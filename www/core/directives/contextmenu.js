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
 * This directive adds a button to the navigation bar that display a context menu pop over.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmContextMenu
 * @description
 * This directive will show a button to the navigation bar that display a context menu pop over when clicked.
 *
 * @param {String}  [icon]  Icon to be shown on the navigation bar. Default: Kebab menu icon.
 * @param {String}  [title] Aria label and text to be shown on the top of the popover.
 *                          Default: Info will be used only in aria. No title will be used.
 */
.directive('mmContextMenu', function($translate, $ionicPopover) {
    return {
        restrict: 'E',
        scope: {
            icon: '@?',
            title: '@?'
        },
        transclude: true,
        templateUrl: 'core/templates/contextmenuicon.html',
        controller: ['$scope', function($scope) {
            var items = $scope.ctxtMenuItems = [],
                refreshObserver;

            this.addContextMenuItem = function(item) {
                items.push(item);

                item.$on('$destroy', function() {
                    var index = items.indexOf(item);
                    items.splice(index, 1);
                });
            };

            $scope.contextMenuItemClicked = function(item) {
                if (typeof item.action == 'function') {
                    if (!item.iconAction || item.iconAction == 'spinner') {
                        return false;
                    }
                    hideContextMenu(item.closeOnClick);
                    return item.action();
                } else if (item.href) {
                    hideContextMenu(item.closeOnClick);
                }
                return true;
            };

            $scope.showContextMenu = function($event) {
                $scope.contextMenuPopover.show($event);
            };

            function hideContextMenu(closeOnClick) {
                if (typeof closeOnClick == 'undefined' || closeOnClick == "true") {
                    $scope.contextMenuPopover.hide();
                }
            }

            $ionicPopover.fromTemplateUrl('core/templates/contextmenu.html', {
                scope: $scope
            }).then(function(popover) {
                $scope.contextMenuPopover = popover;
            });

            refreshObserver = $scope.$on('scroll.refreshComplete', function() {
                $scope.contextMenuPopover.hide();
            });

            $scope.$on('$destroy', function() {
                $scope.contextMenuPopover.remove();
                refreshObserver && refreshObserver.off && refreshObserver.off();
            });
        }],
        link: function(scope) {
            scope.contextMenuIcon = scope.icon || 'ion-android-more-vertical';
            scope.contextMenuAria = scope.title || $translate.instant('mm.core.info');
        }
    };
})

/**
 * This directive adds a item to the Context Menu pop over.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmContextMenuItem
 * @description
 * This directive defines and item to be added to the pop over generated in mmContextMenu.
 * Usage: It is required to place this tag inside a mm-context-menu tag.
 * <mm-context-menu-item priority="900" content="{{content}}"
 *     action="action()" aria-action="Open" icon-action="ion-share"
 *     icon-description="ion-clock" aria-description="Timemodified"
 *     capture-link="false" close-on-click="false">
 * </mm-context-menu-item>
 *
 * @param {String}      content             Content of the item.
 * @param {String}      [iconDescription]   Descripcion icon to be shown on the left side of the item.
 * @param {String}      [iconAction]        Icon to be shown on the right side of the item. It represents the action to be taken on click.
  *                                         If is "spinner" an spinner will be shown
 *                                          If no icon or spinner is selected, no action or link will work.
 *                                          If href but no iconAction is provided ion-arrow-right-c will be used.
 * @param {String}      [ariaDescription]   Aria label to be added to the description icon
 * @param {String}      [ariaAction]        Aria label to be added to the item if there's an action associated.
 * @param {Function}    [action]            Javascript action to be taken on click. Only works if iconAction is set and is not an spinner.
 * @param {String}      [href]              Link to go if no action provided.
 * @param {Boolean}     [captureLink=false] If the link needs to be captured by the app.
 * @param {Boolean}     [closeOnClick=true] If close the popover when clicked. Only works if action or href is provided.
 * @param {Number}      [priority]          Used to sort items. The highest priority, the highest position.
 */
.directive('mmContextMenuItem', function() {

    return {
        require: '^^mmContextMenu',
        restrict: 'E',
        scope: {
            content: '@',
            iconAction: '@?',
            iconDescription: '@?',
            ariaAction: '@?',
            ariaDescription: '@?',
            action: '&?',
            href: '@?',
            captureLink: '@?',
            closeOnClick: '@?',
            priority: '@?'
        },
        link: function(scope, element, attrs, CtxtMenuCtrl) {
            scope.priority = scope.priority || 1;

            if (scope.action) {
                scope.href = false;
            } else if (scope.href) {
                scope.action = false;
            }

            // Navigation help if href provided.
            scope.captureLink = scope.href && scope.captureLink ? scope.captureLink : "false";

            CtxtMenuCtrl.addContextMenuItem(scope);
        }
    };
});