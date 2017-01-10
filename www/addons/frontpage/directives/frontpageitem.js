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
 * Directive to render a frontpage item.
 *
 * @module mm.addons.frontpage
 * @ngdoc directive
 * @name mmaFrontpageItem
 * @description
 * Directive to render a frontpage item.
 *
 * It requires to receive an name indicating the item type to render.
 *
 * Parameters received by this directive and shared with the directive to render the plugin:
 *
 * @param {String} name      The item name that describes the type to render.
 */
.directive('mmaFrontpageItem', function($compile) {

    return {
        restrict: 'E',
        scope: {
            name: '@'
        },
        templateUrl: 'addons/frontpage/templates/frontpageitem.html',
        link: function(scope, element) {
            var container = element[0].querySelector('.mma-frontpage-item-container')

            if (typeof scope.name == "undefined" || !container) {
                return;
            }

            // Add the directive to the element.
            container.setAttribute(scope.name, '');

            // Compile the new directive.
            $compile(container)(scope);
        }
    };
});
