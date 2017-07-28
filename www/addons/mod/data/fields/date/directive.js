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

.filter('mmaModDataFieldDateFormat', function() {
    return function(text) {
        return text * 1000;
    };
})

/**
 * Directive to render data date field.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataFieldDate
 */
.directive('mmaModDataFieldDate', function() {
    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/data/fields/date/template.html',
        link: function(scope) {
            scope.mode = scope.mode == 'list' ? 'show' : scope.mode;
            if (scope.mode == 'show') {
                return;
            }

            if (scope.mode == 'edit' && scope.value) {
                scope.enable = true;
            } else {
                scope.value = {
                    content: Math.floor(Date.now() / 1000)
                };
                scope.enable = false;
            }
            scope.val = new Date(scope.value.content * 1000);
        }
    };
});
