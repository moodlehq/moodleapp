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

angular.module('mm.addons.userprofilefield_checkbox')

/**
 * Directive to render a checkbox user profile field.
 *
 * @module mm.addons.userprofilefield_checkbox
 * @ngdoc directive
 * @name mmaUserProfileFieldCheckbox
 */
.directive('mmaUserProfileFieldCheckbox', function($log) {
    $log = $log.getInstance('mmaUserProfileFieldCheckbox');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/userprofilefield/checkbox/template.html',
        link: function(scope, element) {
            var field = scope.field;

            if (field && scope.edit && scope.model) {
                field.modelName = 'profile_field_' + field.shortname;

                // Initialize the value.
                if (typeof field.defaultdata != 'undefined' && typeof scope.model[field.modelName] == 'undefined') {
                    scope.model[field.modelName] = field.defaultdata && field.defaultdata !== '0' && field.defaultdata !== 'false';
                }
            }
        }
    };
});
