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

.controller('mmContextMenu', function($scope, $ionicPopover, $q, $timeout) {
    var items = $scope.ctxtMenuItems = [];

    /**
     * Add a context menu item.
     *
     * @param {Object} item Scope of the item to add.
     */
    this.addContextMenuItem = function(item) {
        if (!item.$$destroyed) {
            items.push(item);

            item.$on('$destroy', function() {
                var index = items.indexOf(item);
                items.splice(index, 1);
            });
        }
    };

    /**
     * Check if merge scope param is set.
     *
     * @return {Boolean} True if merge scope param is set and isn't false, false otherwise.
     */
    this.shouldMerge = function() {
        return !!($scope.merge && $scope.merge !== 'false');
    };

    /**
     * Function called when a context menu item clicked.
     *
     * @param  {Object} $event Click event.
     * @param  {Object} item   Item clicked.
     * @return {Boolean}       Return true if success, false if error.
     */
    $scope.contextMenuItemClicked = function($event, item) {
        if (typeof item.action == 'function') {
            $event.preventDefault();
            $event.stopPropagation();
            if (!item.iconAction || item.iconAction == 'spinner') {
                return false;
            }
            hideContextMenu(item.closeOnClick);
            return $q.when(item.action()).finally(function() {
                if (!item.closeOnClick) {
                    hideContextMenu(item.closeWhenDone);
                }
            });
        } else if (item.href) {
            hideContextMenu(item.closeOnClick);
        }
        return true;
    };

    /**
     * Show the context menu.
     *
     * @param  {Object} $event Event.
     */
    $scope.showContextMenu = function($event) {
        $scope.contextMenuPopover.show($event);
    };

    /**
     * Hide the context menu.
     *
     * @param  {Boolean} close True to close.
     */
    function hideContextMenu(close) {
        if (close) {
            $scope.contextMenuPopover.hide();
            $timeout(function() {
                if (!document.querySelector('.popover-backdrop.active')) {
                    // No popover open, remove class from body to prevent Ionic bug:
                    // https://github.com/driftyco/ionic-v1/issues/53
                    angular.element(document.body).removeClass('popover-open');
                }
            }, 1); // Using default hide time for popovers.
        }
    }

    $ionicPopover.fromTemplateUrl('core/templates/contextmenu.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.contextMenuPopover = popover;
    });

    $scope.$on('$destroy', function() {
        if ($scope.contextMenuPopover) {
            hideContextMenu(true);
            $scope.contextMenuPopover.remove();
        } else {
            // Directive destroyed before popover was initialized. Wait a bit and try again.
            $timeout(function() {
                if ($scope.contextMenuPopover) {
                    hideContextMenu(true);
                    $scope.contextMenuPopover.remove();
                }
            }, 200);
        }
    });
})

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
 * @param {Boolean} [merge] Set this to true if the context menu is in the right pane view of a split view. If the left pane view
 *                          doesn't have a context-menu you should add an empty one in order to make this work.
 *                          You don't need to check if the device is a phone or tablet, this directive already handles it.
 */
.directive('mmContextMenu', function($translate) {
    return {
        restrict: 'E',
        scope: {
            icon: '@?',
            title: '@?',
            merge: '@?'
        },
        transclude: true,
        templateUrl: 'core/templates/contextmenuicon.html',
        controller: 'mmContextMenu',
        link: function(scope, element) {
            scope.contextMenuIcon = scope.icon || 'ion-android-more-vertical';
            scope.contextMenuAria = scope.title || $translate.instant('mm.core.info');
            scope.filterNgShow = function(value) {
                return value && value.ngShow;
            };

            // The transclude should have been executed already. Remove ng-transclude to prevent errors with mm-nav-buttons.
            var div = element[0].querySelector('div[ng-transclude]');
            if (div && div.removeAttribute) {
                div.removeAttribute('ng-transclude');
            }
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
 * <mm-context-menu-item priority="900" content="content" action="action()" aria-action="mm.core.open | translate"
 *     icon-action="'ion-share'" icon-description="'ion-clock'" aria-description="mm.core.description | translate"
 *     capture-link="false" close-on-click="false">
 * </mm-context-menu-item>
 *
 * @param {String}   content               Content of the item.
 * @param {String}   [iconDescription]     Descripcion icon to be shown on the left side of the item.
 * @param {String}   [iconAction]          Icon to be shown on the right side of the item. It represents the action to be taken on click.
*                                          If is "spinner" an spinner will be shown
 *                                         If no icon or spinner is selected, no action or link will work.
 *                                         If href but no iconAction is provided ion-arrow-right-c will be used.
 * @param {String}   [ariaDescription]     Aria label to be added to the description icon
 * @param {String}   [ariaAction]          Aria label to be added to the item if there's an action associated.
 * @param {Function} [action]              Javascript action to be taken on click. Only works if iconAction is set and is not an spinner.
 * @param {String}   [href]                Link to go if no action provided.
 * @param {Boolean}  [captureLink=false]   If the link needs to be captured by the app.
 * @param {Boolean}  [autoLogin=check]     If the link needs to be opened using auto-login. See mmLink.
 * @param {Boolean}  [closeOnClick=true]   If close the popover when clicked. Only works if action or href is provided.
 * @param {Boolean}  [closeWhenDone=false] Close popover when action is done. Only if action is supplied and closeOnClick=false.
 * @param {Number}   [priority]            Used to sort items. The highest priority, the highest position.
 */
.directive('mmContextMenuItem', function($mmUtil, $timeout, $ionicPlatform) {

    /**
     * Get a boolean value from item.
     *
     * @param  {Mixed} value          Value to check.
     * @param  {Boolean} defaultValue Value to use if undefined.
     * @return {Boolean}              Value.
     */
    function getBooleanValue(value, defaultValue) {
        if (typeof value == 'undefined') {
            return defaultValue;
        }
        return !!(value && value !== "false");
    }

    /**
     * Get the controller of the outer context menu.
     *
     * @return {Object} Controller. Undefined if not found.
     */
    function getOuterContextMenuController() {
        // Menu is added to the header bar, search it in there.
        var menus = document.querySelectorAll('ion-header-bar mm-context-menu'),
            outerContextMenu;

        angular.forEach(menus, function(menu) {
            // Get the menu that isn't hidden (maybe another view has a menu too).
            var div = $mmUtil.closest(menu, '.buttons-left, .buttons-right');
            if (div && angular.element(div).css('opacity') !== '0') {
                outerContextMenu = menu;
            }
        });

        if (outerContextMenu) {
            return angular.element(outerContextMenu).controller('mmContextMenu');
        }
    }

    return {
        require: '^^mmContextMenu',
        restrict: 'E',
        scope: {
            content: '=',
            iconAction: '=?',
            iconDescription: '=?',
            ariaAction: '=?',
            ariaDescription: '=?',
            action: '&?',
            href: '=?',
            captureLink: '=?',
            autoLogin: '=?',
            closeOnClick: '=?',
            closeWhenDone: '=?',
            priority: '=?',
            ngShow: '=?'
        },
        link: function(scope, element, attrs, CtxtMenuCtrl) {
            // Initialize values. Change the name of some of them to prevent being reconverted to string.
            scope.priority = scope.priority || 1;
            scope.closeOnClick = getBooleanValue(scope.closeOnClick, true);
            scope.closeWhenDone = getBooleanValue(scope.closeWhenDone, false);
            if (typeof attrs.ngShow == 'undefined') {
                scope.ngShow = true;
            }

            if (scope.action) {
                scope.href = "";
            } else if (scope.href) {
                scope.action = false;
            }

            // Navigation help if href provided.
            scope.captureLink = scope.href && scope.captureLink ? scope.captureLink : "false";
            scope.autoLogin = scope.autoLogin || 'check';

            if (CtxtMenuCtrl.shouldMerge() && $ionicPlatform.isTablet()) {
                // Item should be merged with an outer context-menu in tablet view.
                // Wait a bit to be sure the active header bar is ready.
                $timeout(function() {
                    if (!scope.$$destroyed) {
                        var ctrl = getOuterContextMenuController();
                        if (ctrl) {
                            CtxtMenuCtrl = ctrl;
                        }
                        CtxtMenuCtrl.addContextMenuItem(scope);
                    }
                });
            } else {
                CtxtMenuCtrl.addContextMenuItem(scope);
            }
        }
    };
});
