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

angular.module('mm.addons.mod_label')

/**
 * Mod label handlers.
 *
 * @module mm.addons.mod_label
 * @ngdoc service
 * @name $mmaModLabelHandlers
 */
.factory('$mmaModLabelHandlers', function($mmContentLinksHelper) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_label
     * @ngdoc method
     * @name $mmaModLabelHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return true;
        };

        /**
         * Get the controller.
         *
         * @param {Object} module The module info.
         * @return {Function}
         */
        self.getController = function(module) {
            return function($scope) {
                $scope.title = module.description || module.descriptioncopy;

                // Store the description so it can be retrieved if this controller is instantiated more than once.
                module.descriptioncopy = module.description;
                module.description = "";

                $scope.icon = false;
                $scope.class = 'mma-mod_label-handler';
                $scope.action = false;
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_label
     * @ngdoc method
     * @name $mmaModLabelHandlers#linksHandler
     */
    self.linksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModLabel', 'label', {});

    return self;
});
