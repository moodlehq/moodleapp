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

angular.module('mm.addons.mod_data')

/**
 * Directive to render data field.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataField
 */
.directive('mmaModDataField', function($mmaModDataFieldsDelegate, $compile) {
    return {
        restrict: 'E',
        priority: 100,
        scope: {
            field: '=',
            value: '=?',
            database: '=?',
            error: '=?',
            viewAction: '&?',
            mode: '@'
        },
        templateUrl: 'addons/mod/data/templates/field.html',
        link: function(scope, element) {
            var field = scope.field,
                container = element[0].querySelector('.mma-mod-data-field-container'),
                directive;

            if (!field || !container) {
                return;
            }

            // Check if the plugin has defined its own directive to render itself.
            directive = $mmaModDataFieldsDelegate.getDirectiveForPlugin(field);

            if (directive) {
                // Add the directive to the element.
                container.setAttribute(directive, '');
                // Compile the new directive.
                $compile(container)(scope);
            } else {
                scope.fieldLoaded = true;
            }
        }
    };
});
