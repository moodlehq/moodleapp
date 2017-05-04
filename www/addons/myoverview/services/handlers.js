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

angular.module('mm.addons.myoverview')

/**
 * My Overview handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.myoverview
 * @ngdoc service
 * @name $mmaMyOverviewHandlers
 */
.factory('$mmaMyOverviewHandlers', function($mmaMyOverview) {

    var self = {};

    /**
     * Side menu nav handler.
     *
     * @module mm.addons.myoverview
     * @ngdoc method
     * @name $mmaMyOverviewHandlers#sideMenuNav
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
            return $mmaMyOverview.isSideMenuAvailable();
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
             * @module mm.addons.myoverview
             * @ngdoc controller
             * @name $mmaMyOverviewHandlers#sideMenuNav:controller
             */
            return function($scope) {
                $scope.icon = 'ion-ionic';
                $scope.title = 'mma.myoverview.pluginname';
                $scope.state = 'site.myoverview';
                $scope.class = 'mma-myoverview-handler';
            };
        };

        return self;
    };

    return self;
});
