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

angular.module('mm.addons.mod_assign')

/**
 * Mod assign handlers.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignHandlers
 */
.factory('$mmaModAssignHandlers', function($mmCourse, $mmaModAssign, $state, $mmSite) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the handler is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModAssign.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @param {Object} module The module info.
         * @param {Number} courseid The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseid) {
            return function($scope) {
                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('assign');
                $scope.action = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $state.go('site.mod_assign', {module: module, courseid: courseid});
                };
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Whether or not the handler is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModAssign.isPluginEnabled();
        };

        /**
         * Get actions to perform with the link.
         *
         * @param {String} url        URL to treat.
         * @param {Number} [courseid] Course ID related to the URL.
         * @return {Object[]}         List of actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(url, courseid) {
            // Check it's an assign URL from the current site.
            if (courseid && $mmSite.containsUrl(url) && url.indexOf('/mod/assign/') > -1) {
                var matches = url.match(/view\.php\?id=(\d*)/); // Get assignment ID.
                if (matches && typeof matches[1] != 'undefined') {
                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
                        action: function() {
                            $state.go('site.mod_assign', {
                                courseid: courseid,
                                module: {id: matches[1]}
                            });
                        }
                    }];
                }
            }
            return [];
        };

        return self;
    };

    return self;
});
