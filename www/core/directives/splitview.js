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

.constant('mmCoreSplitViewLoad', 'mmSplitView:load')

.controller('mmSplitView', function($state, $ionicPlatform, $timeout, $interpolate) {
    var self = this,
        element,
        menuState,
        linkToLoad,
        component,
        ionicViewEventData,
        viewEventListeners = [],
        headerBarButtons = {},
        headerButtonTypes = ['primary-buttons', 'secondary-buttons', 'left-buttons', 'right-buttons'];

    /**
     * Trigger click on a DOM element.
     *
     * @param  {Object} link DOM element to trigger click.
     * @return {Boolean}     True if success, false otherwise.
     */
    function triggerClick(link) {
        if (link && link.length && link.triggerHandler) {
            link.triggerHandler('click');
            return true;
        }
        return false;
    }

    /**
     * Clears links marked as selected.
     */
    this.clearMarkedLinks = function() {
        angular.element(element.querySelectorAll('[mm-split-view-link]')).removeClass('mm-split-item-selected');
    };

    /**
     * Get component.
     *
     * @return {String} Component.
     */
    this.getComponent = function() {
        return component;
    };

    /**
     * Get the stored header bar buttons of a certain type.
     *
     * @param  {String} [type] Type to get. Undefined to get all.
     * @return {Object}        Buttons (DOMElement).
     */
    this.getHeaderBarButtons = function(type) {
        if (!type) {
            return headerBarButtons;
        } else {
            return headerBarButtons[type];
        }
    };

    /**
     * Get the inner HTML of stored header bar buttons of a certain type.
     *
     * @param  {String} type Type to get.
     * @return {String}      HTML.
     */
    this.getHeaderBarButtonsHtml = function(type) {
        if (headerBarButtons[type]) {
            return headerBarButtons[type].innerHTML;
        }
    };

    /**
     * Get header bar with a certain state.
     *
     * @param  {String} state State to search.
     * @return {Object}       Header bar (DOMElement).
     */
    this.getHeaderBarWithState = function(state) {
        var bars = document.querySelectorAll('ion-header-bar');
        for (var i = 0; i < bars.length; i++) {
            var bar = bars[i],
                barState = bar.parentElement && bar.parentElement.getAttribute('nav-bar');
            if (barState == state) {
                return bar;
            }
        }
    };

    /**
     * Get data received by afterEvent.
     *
     * @return {Object} data Event data.
     */
    this.getIonicViewEventData = function() {
        return ionicViewEventData || {};
    };

    /**
     * Get split view menu's state name (left pane).
     *
     * @return {String} Menu state name.
     */
    this.getMenuState = function() {
        return menuState || $state.current.name;
    };

    /**
     * Get header bar that's not active. This will only return a header bar if one of them is active.
     *
     * @return {Object} Header bar (DOMElement).
     */
    this.getInactiveHeaderBar = function() {
        var bars = document.querySelectorAll('ion-header-bar'),
            activePosition = -1;

        for (var i = 0; i < bars.length; i++) {
            var bar = bars[i],
                barState = bar.parentElement && bar.parentElement.getAttribute('nav-bar');
            if (barState == 'active') {
                activePosition = i;
            }
        }

        if (activePosition === 0) {
            return bars[1];
        } else if (activePosition > 0) {
            return bars[0];
        }
    };

    /**
     * Load a mm-split-view-link.
     *
     * @param {Object} [scope]           Directive's scope.
     * @param {String|Number} [loadAttr] Number of link to load.
     * @param {Boolean} retrying         True if we're retrying because the function failed (link wasn't ready).
     */
    this.loadLink = function(scope, loadAttr, retrying) {
        if ($ionicPlatform.isTablet()) {
            if (!linkToLoad) {
                // No link set. Let's determine if loadAttr is set and its real value.
                if (typeof loadAttr != 'undefined') {
                    var position = parseInt(loadAttr);
                    if (!position) {
                        // Seems it's not a number. Try to interpolate it.
                        position = parseInt($interpolate(loadAttr)(scope), 10); // "Evaluate" scope variables.
                    }
                    if (position) {
                        var links = element.querySelectorAll('[mm-split-view-link]');
                        position = position > links.length ? 0 : position - 1;
                        linkToLoad = angular.element(links[position]);
                    } else {
                        // Load first link
                        linkToLoad = angular.element(element.querySelector('[mm-split-view-link]'));
                    }
                } else {
                    // Load first link
                    linkToLoad = angular.element(element.querySelector('[mm-split-view-link]'));
                }
            }

            if (!triggerClick(linkToLoad)) {
                // Link not found. Let's retry once in the next digest.
                if (!retrying) {
                    linkToLoad = undefined;
                    $timeout(function() {
                        self.loadLink(scope, loadAttr, true);
                    });
                }
            }
        }
    };

    /**
     * Register a listener to receive view events.
     *
     * @param  {Function} callBack Function to call when an event is received.
     * @return {Function}          Function to unregister the listener.
     */
    self.onViewEvent = function(callBack) {
        if (!angular.isFunction(callBack)) {
            return;
        }

        viewEventListeners.push(callBack);
        return function() {
          var position = viewEventListeners.indexOf(callBack);
          if (position !== -1) {
            viewEventListeners.splice(position, 1);
          }
        };
    };

    /**
     * Save header bar buttons.
     *
     * @return {Void}
     */
    self.saveHeaderBarButtons = function() {
        var headerBar = this.getHeaderBarWithState('entering');
        if (!headerBar) {
            // No header bar with 'entering' state. Get the one that isn't active (bar isn't active until the view is loaded).
            headerBar = this.getInactiveHeaderBar();
            if (!headerBar) {
                // Not found, stop.
                return;
            }
        }

        headerButtonTypes.forEach(function(type) {
            headerBarButtons[type] = headerBar.querySelector('.' + type);
        });
    };

    /**
     * Set component.
     *
     * @param {String} cmp Component.
     */
    this.setComponent = function(cmp) {
        component = cmp;
    };

    /**
     * Set directive's DOM element.
     *
     * @param {Object} el Directive's DOM element.
     */
    this.setElement = function(el) {
        element = el;
    };

    /**
     * Set mm-split-view-link to load. Used to re-load last state if needed.
     *
     * @param {Object} link Link to set (DOM element).
     */
    this.setLink = function(link) {
        linkToLoad = link;
    };

    /**
     * Set split view menu's state name (left pane).
     *
     * @param {String} state State name to set.
     */
    this.setMenuState = function(state) {
        menuState = state;
    };

    /**
     * Set data received by afterEvent and notifies listeners.
     *
     * @param {Object} data Data to set.
     */
    this.setIonicViewEventData = function(data) {
        ionicViewEventData = data;
        angular.forEach(viewEventListeners, function(listener) {
            if (angular.isFunction(listener)) {
                listener(data);
            }
        });
    };
})

/**
 * Directive to create a split view layout. This directive should be used along with mm-split-view-link.
 *
 * IMPORTANT: Due to a limitation in Angular ui-router, the left pane state and the right pane state should NOT have
 * parameters with the same name but different value. It can cause unexpected behaviors.
 * Example: if the left pane loads a state with param 'courseid', then all the states that can be loaded in the right pane
 * should avoid having a parameter named 'courseid'. The right pane state can have a 'courseid' param only if it will always
 * have the same value than in left pane state.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmSplitView
 * @description
 * Usage:
 * <mm-split-view component="mmaCalendarEventsList">
 *     <!-- CONTENT TO SHOW ON THE LEFT PANEL (MENU) -->
 * </mm-split-view>
 *
 * To change the right pane contents (content pane), mmSplitViewLink directive is needed.
 * mmSplitView will automatically try to load a mmSplitViewLink when the view is loaded. This can be configured using
 * the attributes "load" and "loadWhen".
 *
 * If you don't have access to the directive's scope but you still want to configure when should the data be loaded and which
 * element should it load you can use the mmCoreSplitViewLoad event. When the directive receives this event it will try to
 * immediately load the link set (if no link is set it will load the first link found). Example:
 * $rootScope.$broadcast(mmCoreSplitViewLoad, {load: 2});
 *
 * IMPORTANT: Due to a limitation in Angular ui-router, the left pane state and the right pane state should NOT have
 * parameters with the same name but different value. It can cause unexpected behaviors.
 * Example: if the left pane loads a state with param 'courseid', then all the states that can be loaded in the right pane
 * should avoid having a parameter named 'courseid'. The right pane state can have a 'courseid' param only if it will always
 * have the same value than in left pane state.
 *
 * Accepts the following params:
 *
 * @param {String} [menuWidth] Width of the left menu. Can be specified in pixels ('200px') or in percentage ('30%').
 *
 * @param {String} [loadWhen]  Name of a scope variable. When that variable is set to true, a mm-split-view-link will be loaded in
 *                             in the contents pane. If not set, try to load it right at the start. See "load" param.
 *
 * @param {String} component   Component. In tablet, the new view will be named after the component.
 *
 * @param {Number} [load] Link to load. If not set then the first link will be loaded by default. If it's set then it will
 *                        try to load the nth link. E.g. load=2 will load the second link in the page.
 *
 * @param {String} [menuState] Name of the state loaded in the left pane (menu). If not defined it will use $state.$current.name.
 */
.directive('mmSplitView', function($log, $state, $ionicPlatform, $mmUtil, mmCoreSplitViewLoad) {

    $log = $log.getInstance('mmSplitView');

    return {
        restrict: 'E',
        templateUrl: 'core/templates/splitview.html',
        transclude: true,
        controller: 'mmSplitView',
        link: function(scope, element, attrs, controller) {
            var el = element[0],
                menu = angular.element(el.querySelector('.mm-split-pane-menu')),
                menuState = attrs.menuState || $state.$current.name,
                menuParams = $state.params,
                menuWidth = attrs.menuWidth,
                component = attrs.component || 'tablet';

            // Save header bar buttons (needed for mm-nav-buttons).
            controller.saveHeaderBarButtons();

            scope.component = component;

            controller.setComponent(component);
            controller.setElement(el);
            controller.setMenuState(menuState);

            if (menuWidth && $ionicPlatform.isTablet()) {
                menu.css('width', menuWidth);
                menu.css('-webkit-flex-basis', menuWidth);
                menu.css('-moz-flex-basis', menuWidth);
                menu.css('-ms-flex-basis', menuWidth);
                menu.css('flex-basis', menuWidth);
            }

            // We'll set all the listeners even if it's not a tablet, to support change between tablet-smartphone mode.

            if (attrs.loadWhen) {
                // Load link when variable is set to true.
                scope.$watch(attrs.loadWhen, function(newValue) {
                    if (newValue) {
                        controller.loadLink(scope, attrs.load);
                    }
                });
            } else {
                controller.loadLink(scope, attrs.load);
            }

            // Load last opened link when we re-enter the same state. We use $stateChangeSuccess instead of $ionicView.enter
            // because $ionicView.enter is not triggered when going to the same state.
            scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
                // Compare that name and params are similar. We'll only compare 1st level of params, it's not a deep compare.
                if (toState.name === menuState && $mmUtil.basicLeftCompare(toParams, menuParams, 1)) {
                    controller.loadLink(); // No need to pass scope and load, link should be set.
                }
            });

            // Listen for event to load link.
            scope.$on(mmCoreSplitViewLoad, function(e, data) {
                if (data && data.load) {
                    controller.loadLink(scope, data.load);
                } else {
                    controller.loadLink(scope, attrs.load);
                }
            });

            // Listen for beforeEnter and afterEnter and store data. This is required for mm-nav-buttons.
            scope.$on('$ionicView.beforeEnter', eventReceived);
            scope.$on('$ionicView.afterEnter', eventReceived);

            function eventReceived(e, data) {
                // Update data only if transition has changed.
                if (controller.getIonicViewEventData().transitionId != data.transitionId) {
                    controller.setIonicViewEventData(data);
                }
            }
        }
    };
});
