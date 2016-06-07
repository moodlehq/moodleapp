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

angular.module('mm.core')

/**
 * Directive to handle a local file.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmLocalFile
 * @description
 * Directive to handle a local file. Shows the file name, icon (depending on extension), size and time modified.
 * Also, if managing is enabled it will also show buttons to rename and delete the file.
 *
 * Attributes:
 * @param {Object} file            Required. A fileEntry retrieved using $mmFS#getFile or similar.
 * @param {Boolean} [manage]       True if the user can manage the file (edit/delete), false otherwise.
 * @param {Function} [fileDeleted] Function to call when a file is deleted. Required if manage=true.
 */
.directive('mmLocalFile', function($mmFS, $mmText, $mmUtil, $timeout, $translate) {

    // Convenience function to load the basic data for a file.
    function loadFileBasicData(scope, file) {
        scope.fileName = file.name;
        scope.fileIcon = $mmFS.getFileIcon(file.name);
        scope.fileExtension = $mmFS.getFileExtension(file.name);
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/localfile.html',
        scope: {
            file: '=',
            manage: '=?',
            fileDeleted: '&?'
        },
        link: function(scope, element) {
            var file = scope.file;

            loadFileBasicData(scope, file);
            scope.data = {};

            // Get the size and timemodified.
            $mmFS.getMetadata(file).then(function(metadata) {
                if (metadata.size >= 0) {
                    scope.size = $mmText.bytesToSize(metadata.size, 2);
                }

                scope.timeModified = moment(metadata.modificationTime).format('LLL');
            });

            // Open the file.
            scope.open = function(e) {
                e.preventDefault();
                e.stopPropagation();
                $mmUtil.openFile(file.toURL());
            };

            // Toogle edit mode.
            scope.activateEdit = function(e) {
                e.preventDefault();
                e.stopPropagation();
                scope.editMode = true;
                scope.data.filename = file.name;

                // For some reason mm-auto-focus isn't working right. Focus the input manually.
                $timeout(function() {
                    $mmUtil.focusElement(element[0].querySelector('input'));
                });
            };

            // Rename file.
            scope.changeName = function(e, newName) {
                e.preventDefault();
                e.stopPropagation();

                if (newName == file.name) {
                    // Name hasn't changed, stop.
                    scope.editMode = false;
                    return;
                }

                var modal = $mmUtil.showModalLoading(),
                    fileAndDir = $mmFS.getFileAndDirectoryFromPath(file.fullPath),
                    newPath = $mmFS.concatenatePaths(fileAndDir.directory, newName);

                // Check if there's a file with this name.
                $mmFS.getFile(newPath).then(function() {
                    // There's a file with this name, show error and stop.
                    $mmUtil.showErrorModal('mm.core.errorfileexistssamename', true);
                }).catch(function() {
                    // File doesn't exist, move it.
                    return $mmFS.moveFile(file.fullPath, newPath).then(function(fileEntry) {
                        scope.editMode = false;
                        scope.file = file = fileEntry;
                        loadFileBasicData(scope, file);
                    }).catch(function() {
                        $mmUtil.showErrorModal('mm.core.errorrenamefile', true);
                    });
                }).finally(function() {
                    modal.dismiss();
                });
            };

            // Delete the file.
            scope.deleteFile = function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Ask confirmation.
                $mmUtil.showConfirm($translate.instant('mm.core.confirmdeletefile')).then(function() {
                    var modal = $mmUtil.showModalLoading();
                    $mmFS.removeFile(file.fullPath).then(function() {
                        scope.fileDeleted && scope.fileDeleted();
                    }).catch(function() {
                        $mmUtil.showErrorModal('mm.core.errordeletefile', true);
                    }).finally(function() {
                        modal.dismiss();
                    });
                });
            };
        }
    };
});
