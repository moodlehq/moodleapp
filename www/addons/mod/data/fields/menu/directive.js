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
 * Directive to render data menu field.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataFieldMenu
 */
.directive('mmaModDataFieldMenu', function() {
    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/data/fields/menu/template.html',
        link: function(scope) {
            scope.mode = scope.mode == 'list' ? 'show' : scope.mode;
            if (scope.mode == 'show') {
                return;
            }

            scope.options = scope.field.param1.split("\n");

            if (scope.mode == 'edit' && scope.value) {
                scope.val = scope.value.content;
            }
        }
    };
});
