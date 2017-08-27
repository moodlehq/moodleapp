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

angular.module('mm.addons.frontpage')

/**
 * Front page handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.frontpage
 * @ngdoc service
 * @name $mmaFrontPageHandlers
 */
.factory('$mmaFrontPageHandlers', function($log, $mmaFrontpage, $mmUtil, $state, $mmSitesManager, $mmSite) {
    $log = $log.getInstance('$mmaFrontPageHandlers');

    var self = {};

    /**
     * Side menu nav handler.
     *
     * @module mm.addons.frontpage
     * @ngdoc method
     * @name $mmaFrontPageHandlers#sideMenuNav
     */
    self.sideMenuNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Promise|Boolean} If handler is enabled returns a resolved promise. If it's not it can return a
         *                           rejected promise or false.
         */
        self.isEnabled = function() {
            if ($mmaFrontpage.isPluginEnabled()) {
                return $mmaFrontpage.isFrontpageAvailable().then(function() {
                    return true;
                });
            }
            return false;
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {

            /**
             * Side menu nav handler controller.
             *
             * @module mm.addons.frontpage
             * @ngdoc controller
             * @name $mmaFrontPageHandlers#sideMenuNav:controller
             */
            return function($scope) {
                $scope.icon = 'ion-home';
                $scope.title = 'mma.frontpage.sitehome';
                $scope.state = 'site.frontpage';
                $scope.class = 'mma-frontpage-handler';
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.frontpage
     * @ngdoc method
     * @name $mmaFrontPageHandlers#sideMenuNav
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds Site IDs the URL belongs to.
         * @param {String} url       URL to treat.
         * @return {Object[]}        List of actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url) {
            // Check if it's a course URL.
            if (typeof self.handles(url) != 'undefined') {
                var params = $mmUtil.extractUrlParams(url),
                    courseId = parseInt(params.id, 10);

                // Get the course id of Site Home for the first site (all the siteIds should belong to the same Moodle).
                return $mmSitesManager.getSiteHomeId(siteIds[0]).then(function(siteHomeId) {
                    if (courseId === siteHomeId) {
                        // Return actions.
                        return [{
                            message: 'mm.core.view',
                            icon: 'ion-eye',
                            sites: siteIds,
                            action: function(siteId) {
                                siteId = siteId || $mmSite.getId();
                                // Use redirect to make the course the new history root (to avoid "loops" in history).
                                $state.go('redirect', {
                                    siteid: siteId,
                                    state: 'site.frontpage'
                                });
                            }
                        }];
                    }

                    return [];
                });
            }
            return [];
        };

        /**
         * Check if the URL is handled by this handler. If so, returns the URL of the site.
         *
         * @param  {String} url URL to check.
         * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
         */
        self.handles = function(url) {
            // Accept any of these patterns.
            var patterns = ['/course/view.php'];
            for (var i = 0; i < patterns.length; i++) {
                var position = url.indexOf(patterns[i]);
                if (position > -1) {
                    return url.substr(0, position);
                }
            }
        };

        return self;
    };

    return self;
});
