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
 * Directive to render user profile field.
 *
 * @module mm.core.user
 * @ngdoc directive
 * @name mmUserProfileField
 * @description
 * Directive to render user profile field.
 *
 * Parameters received by this directive and shared with the directive to render the plugin (if any).
 *
 * @param {Object} field The profile field to be rendered.
 */
.directive('mmUserProfileField', function($mmUserProfileFieldsDelegate, $compile) {
    return {
        restrict: 'E',
        scope: {
            field: '='
        },
        templateUrl: 'core/components/user/templates/userprofilefield.html',
        link: function(scope, element) {
            var field = scope.field,
                fieldContainer = element[0].querySelector('.mm-userprofilefield-container');

            if (field && fieldContainer) {
                // Search the right directive to render the field.
                var directive = $mmUserProfileFieldsDelegate.getDirectiveForField(field);
                if (directive) {
                    // Add the directive to the element.
                    fieldContainer.setAttribute(directive, '');
                    // Compile the new directive.
                    $compile(fieldContainer)(scope);
                }
            }
        }
    };
});
