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
 * Factory containing side menu related methods.
 *
 * @module mm.core.sidemenu
 * @ngdoc service
 * @name $mmSideMenu
 */
.factory('$mmSideMenu', function($log) {
    $log = $log.getInstance('$mmSideMenu');

    var self = {},
        scope;

    /**
     * Hide the right side menu.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenu#hideRightSideMenu
     * @return {Boolean} True in success, false otherwise.
     */
    self.hideRightSideMenu = function() {
        if (!scope) {
            return false;
        }

        if (!scope.rightSideMenu) {
            scope.rightSideMenu = {};
        }
        scope.rightSideMenu.show = false;

        return true;
    };

    /**
     * Set scope that will determine if right side menu is shown.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenu#setScope
     * @param {Object} scp Scope to set.
     */
    self.setScope = function(scp) {
        scope = scp;
    };

    /**
     * Show the right side menu using a certain template and data.
     * The template should get all the data from the 'rsmScope' property in the scope.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenu#showRightSideMenu
     * @param {String} template URL of the template to load in the side menu.
     * @param {Object} data     Data to add to the right side menu scope. It will be set in a 'rsmScope' property.
     * @return {Boolean}        True in success, false otherwise.
     */
    self.showRightSideMenu = function(template, data) {
        if (!template || !scope) {
            return false;
        }

        if (!scope.rightSideMenu) {
            scope.rightSideMenu = {};
        }

        scope.rightSideMenu.show = true;
        scope.rightSideMenu.template = template;
        scope.rsmScope = data;

        return true;
    };

    return self;

})

.run(function($rootScope, $mmSideMenu) {
    // Hide right side menu everytime we change state.
    $rootScope.$on('$stateChangeStart', function(event, toState) {
        // Check we're not loading split view contents.
        if (toState.name.split('.').length == 2) {
            $mmSideMenu.hideRightSideMenu();
        }
    });
});
