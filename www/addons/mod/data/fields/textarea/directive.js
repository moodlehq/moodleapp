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

.filter('mmaModDataFieldTextareaFormat', function($mmText) {
    return function(value) {
        var files = (value && value.files) || [];
        return value ? $mmText.replacePluginfileUrls(value.content, files) : '';
    };
})

/**
 * Directive to render data textarea field.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataFieldTextarea
 */
.directive('mmaModDataFieldTextarea', function($mmText, mmaModDataComponent) {
    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/data/fields/textarea/template.html',
        link: function(scope) {
            scope.mode = scope.mode == 'list' ? 'show' : scope.mode;
            if (scope.mode == 'show') {
                scope.component = mmaModDataComponent;
                scope.componentId = scope.database.coursemodule;
                return;
            }

            // Check if rich text editor is enabled.
            if (scope.mode == 'edit') {
                var files = (scope.value && scope.value.files) || [],
                    text = scope.value ? $mmText.replacePluginfileUrls(scope.value.content, files) : "";

                // Get the text.
                scope.model = {
                    text: text
                };

                scope.firstRender = function() {
                    if (!scope.value) {
                        scope.value = {};
                    }
                    scope.value.content = scope.model.text;
                };
            }
        }
    };
});
