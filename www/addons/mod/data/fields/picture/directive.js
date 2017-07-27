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
 * Directive to render data picture field.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataFieldPicture
 */
.directive('mmaModDataFieldPicture', function(mmaModDataComponent, $mmFileSession) {

    // Find file in a list.
    function findFile(files, filenameSeek) {
        for (var x in files) {
            if (files[x].filename == filenameSeek) {
                return files[x];
            }
        }
        return false;
    }

    /**
     * Given an input value, extract the image files and all the required data.
     *
     * @param  {Object} scope Directive's scope.
     * @param  {Object} value Field value.
     * @return {Void}
     */
    function treatFiles(scope, value) {
        var files = value && value.files || [];

        // Get image or thumb.
        if (files.length > 0) {
            var filenameSeek = scope.mode == 'list' ? 'thumb_' + value.content : value.content;
            scope.image = findFile(files, filenameSeek);

            if (!scope.image && scope.mode == 'list') {
                scope.image = findFile(files, value.content);
            }

            scope.files = [scope.image];
        } else {
            scope.image = false;
            scope.files = [];
        }

        if (scope.mode == 'edit') {
            scope.maxSizeBytes = parseInt(scope.field.param3, 10);
            $mmFileSession.setFiles(mmaModDataComponent, scope.database.id + '_' + scope.field.id, scope.files);
            scope.alttext = (value && value.content1) || "";
        } else {
            scope.entryId = (value && value.recordid) || false;
            scope.title = (value && value.content1) || "";
            scope.imageUrl = false;
            if (scope.image) {
                if (scope.image.offline) {
                    scope.imageUrl = (scope.image && scope.image.toURL()) || false;
                } else {
                    scope.imageUrl = (scope.image && scope.image.fileurl) || false;
                }
            }
            scope.width  = scope.field.param1 || "";
            scope.height = scope.field.param2 || "";
        }
    }

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/data/fields/picture/template.html',
        link: function(scope) {
            if (scope.mode != 'search') {
                scope.component = mmaModDataComponent;
                scope.componentId = scope.database.coursemodule;

                if (scope.mode == 'show') {
                    // Displaying the list of files, watch the value to update the list if it changes.
                    scope.$watch('value', function(newValue) {
                        treatFiles(scope, newValue);
                    });
                } else {
                    // Edit mode, the list shouldn't change so there is no need to watch it.
                    treatFiles(scope, scope.value);
                }
            }
        }
    };
});
