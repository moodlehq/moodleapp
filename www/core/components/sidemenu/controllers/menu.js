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

angular.module('mm.core.sidemenu')

/**
 * Controller to handle the side menu.
 *
 * @module mm.core.sidemenu
 * @ngdoc controller
 * @name mmSideMenuCtrl
 */
.controller('mmSideMenuCtrl', function($scope, $state, $mmSideMenuDelegate, $mmSitesManager, $mmSite, $mmEvents,
            $timeout, mmCoreEventLanguageChanged, mmCoreEventSiteUpdated, $mmSideMenu) {

    $mmSideMenu.setScope($scope);
    $scope.handlers = $mmSideMenuDelegate.getNavHandlers();
    $scope.areNavHandlersLoaded = $mmSideMenuDelegate.areNavHandlersLoaded;
    $scope.siteinfo = $mmSite.getInfo();

    $scope.logout = function() {
        $mmSitesManager.logout().finally(function() {
            $state.go('mm_login.sites');
        });
    };

    $mmSite.getDocsUrl().then(function(docsurl) {
        $scope.docsurl = docsurl;
    });

    function updateSiteInfo() {
        // We need to use $timeout to force a $digest and make $watch notice the variable change.
        $scope.siteinfo = undefined;
        $timeout(function() {
            $scope.siteinfo = $mmSite.getInfo();

            // Update docs URL, maybe the Moodle release has changed.
            $mmSite.getDocsUrl().then(function(docsurl) {
                $scope.docsurl = docsurl;
            });
        });
    }

    var langObserver = $mmEvents.on(mmCoreEventLanguageChanged, updateSiteInfo);
    var updateSiteObserver = $mmEvents.on(mmCoreEventSiteUpdated, function(siteid) {
        if ($mmSite.getId() === siteid) {
            updateSiteInfo();
        }
    });

    $scope.$on('$destroy', function() {
        if (langObserver && langObserver.off) {
            langObserver.off();
        }
        if (updateSiteObserver && updateSiteObserver.off) {
            updateSiteObserver.off();
        }
    });

    /**
     * Get the button element for opening the side menu.
     *
     * There are always two menu buttons in the DOM. One is cached, while the other is active.
     * When moving to another page the cached button will become staged and then active, while
     * the active button will become cached.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @param  {String} navBarState        The value of the nav-bar attribute that it should use. Can be 'active', 'cached', 'stage'.
     * @return {angular.element}           The button element, or null if not found.
     */
    function getSideMenuButton(navBarState) {
        var navBarBlock = document.querySelector('.nav-bar-block[nav-bar="' + navBarState + '"]');
        if (navBarBlock) {
            return angular.element(navBarBlock.querySelector('#mm-side-menu-btn-menu'));
        } else {
            return null;
        }
    }

    $scope.$on('$ionicView.beforeEnter', function (e, data) {
        // During the beforeEnter state the nav-bar is in the 'stage' state, about to become 'active'.
        var menuButton = getSideMenuButton('stage');
        if (data.enableBack && menuButton && !menuButton.hasClass('hide')) {
            menuButton.addClass('hide');
        }
    });

    $scope.$on('$ionicView.afterEnter', function (e, data) {
        // During the afterEnter state the nav-bar is already in the 'active' state.
        var menuButton = getSideMenuButton('active');
        if (!data.enableBack && menuButton && menuButton.hasClass('hide')) {
            menuButton.removeClass('hide');
        }
    });
});
