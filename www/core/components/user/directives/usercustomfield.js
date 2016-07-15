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

angular.module('mm.core.user')

/**
 * Directive to render user custom field.
 *
 * @module mm.core.user
 * @ngdoc directive
 * @name mmUserCustomField
 * @description
 * Directive to render user custom field.
 *
 * Parameters received by this directive and shared with the directive to render the plugin (if any):
 *
 * @param {Object} field      The custom field to be rendered.
 */
.directive('mmUserCustomField', function() {
    return {
        restrict: 'E',
        scope: {
            field: '='
        },
        templateUrl: 'core/components/user/templates/usercustomfield.html',
        link: function(scope, element, attributes) {
            var field = scope.field;

            if (!field || (field.type != "checkbox" && field.type != "datetime" && field.type != "menu" && field.type != "text" &&
                    field.type != "textarea")) {
                return;
            }

            // @todo: Develop delegate to manage remote addons and custom field types.

            scope.name = field.name;
            scope.type = field.type;
            scope.value = field.value;
        }
    };
});
