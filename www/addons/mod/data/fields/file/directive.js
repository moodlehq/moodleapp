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
 * Directive to render data file field.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataFieldFile
 */
.directive('mmaModDataFieldFile', function($mmFileSession, mmaModDataComponent) {

    /**
     * Get the files from the input value.
     *
     * @param  {Object} value Input value.
     * @return {Object[]}     List of files.
     */
    function getFiles(value) {
        var files = (value && value.files) || [];

        // Reduce to first element.
        if (files.length > 0) {
            files = [files[0]];
        }

        return files;
    }

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/data/fields/file/template.html',
        link: function(scope) {
            scope.mode = scope.mode == 'list' ? 'show' : scope.mode;
            if (scope.mode == 'show' || scope.mode == 'edit') {
                scope.component = mmaModDataComponent;
                scope.componentId = scope.database.coursemodule;

                if (scope.mode == 'show') {
                    // Displaying the list of files, watch the value to update the list if it changes.
                    scope.$watch('value', function(newValue) {
                        scope.files = getFiles(newValue);
                    });
                } else {
                    // Edit mode, the list shouldn't change so there is no need to watch it.
                    scope.files = getFiles(scope.value);

                    scope.maxSizeBytes = parseInt(scope.field.param3, 10);
                    $mmFileSession.setFiles(mmaModDataComponent, scope.database.id + '_' + scope.field.id, scope.files);
                }
            }
        }
    };
});
