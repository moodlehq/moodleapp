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
 * Only files inside the app folder can be managed.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmLocalFile
 * @description
 * Directive to handle a local file. Shows the file name, icon (depending on extension), size and time modified.
 * Also, if managing is enabled it will also show buttons to rename and delete the file.
 *
 * Usage example:
 *
 * <mm-local-file file="file" manage="manage" file-deleted="delete($index)" file-renamed="renamed($index, file)"></mm-local-file>
 *
 * The rename function will receive the new fileEntry in a parameter named "file". This parameter MUST be named "file" in the
 * template using this directive. It doesn't matter the position of this parameter, only the name.
 *
 * Attributes:
 * @param {Object} file                 Required. A fileEntry retrieved using $mmFS#getFile or similar.
 * @param {Boolean} [manage]            True if the user can manage the file (edit/delete), false otherwise.
 * @param {Function} [fileDeleted]      Function to call when a file is deleted. Required if manage=true.
 * @param {Function} [fileRenamed]      Function to call when a file is renamed. It will receive a "file" parameter with the new
 *                                      fileEntry. This parameter needs to be named "file".
 * @param {Boolean} [overrideClick]     True if the default item click should be overridden, false otherwise.
 * @param {Function} [fileClicked]      Function to call when a file is clicked. Requires overrideClick=true.
 * @param {Boolean}  [noBorder=false]   True if want to show file entry without borders. Defaults to false.
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
            fileDeleted: '&?',
            fileRenamed: '&?',
            overrideClick: '=?',
            fileClicked: '&?',
            noBorder: '@?'
        },
        link: function(scope, element) {
            var file = scope.file,
                relativePath;

            if (!file || !file.name) {
                // Invalid data received.
                return;
            }

            // Let's calculate the relative path for the file.
            relativePath = $mmFS.removeBasePath(file.toURL());
            if (!relativePath) {
                // Didn't find basePath, use fullPath but if the user tries to manage the file it'll probably fail.
                relativePath = file.fullPath;
            }

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

                if (scope.overrideClick && scope.fileClicked) {
                    scope.fileClicked();
                } else {
                    $mmUtil.openFile(file.toURL());
                }
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
                    fileAndDir = $mmFS.getFileAndDirectoryFromPath(relativePath),
                    newPath = $mmFS.concatenatePaths(fileAndDir.directory, newName);

                // Check if there's a file with this name.
                $mmFS.getFile(newPath).then(function() {
                    // There's a file with this name, show error and stop.
                    $mmUtil.showErrorModal('mm.core.errorfileexistssamename', true);
                }).catch(function() {
                    // File doesn't exist, move it.
                    return $mmFS.moveFile(relativePath, newPath).then(function(fileEntry) {
                        scope.editMode = false;
                        scope.file = file = fileEntry;
                        loadFileBasicData(scope, file);
                        scope.fileRenamed && scope.fileRenamed({file: file});
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
                    $mmFS.removeFile(relativePath).then(function() {
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
