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

angular.module('mm.addons.mod_folder')

/**
 * Folder service.
 *
 * @module mm.addons.mod_folder
 * @ngdoc service
 * @name $mmaModFolder
 */
.factory('$mmaModFolder', function($mmSite, $mmUtil, $mmCourse, $q) {
    var self = {};

    /**
     * Format folder contents, creating directory structure.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModFolder#formatContents
     * @param {Object[]} contents Folder contents.
     * @return {Object[]}         Formatted contents.
     * @description
     * Format folder contents, creating directory structure.
     * Folders found in filepaths are added to the array. Each folder has the properties: name, fileicon,
     * type (folder), filepath and contents (array with files and subfolders).
     */
    self.formatContents = function(contents) {
        var files = [],
            folders = [],
            foldericon = $mmCourse.getModuleIconSrc('folder');

        angular.forEach(contents, function(entry) {
            if (entry.filepath !== '/') {
                // It's a file in a subfolder. Lets treat the path to add the subfolders to the array.
                var directories,
                    currentList = folders, // Start at root level.
                    path = entry.filepath,
                    subpath = '';

                // Remove first and last slash if needed.
                if (path.substr(0, 1) === '/') {
                    path = path.substr(1);
                }
                if (path.substr(path.length - 1) === '/') {
                    path = path.slice(0, -1);
                }

                directories = path.split('/');

                angular.forEach(directories, function(directory) {
                    subpath = subpath + '/' + directory;
                    // Search if the directory is already stored in folders array.
                    var found = false;
                    for (var i = 0; i < currentList.length; i++) {
                        if (currentList[i].name === directory) {
                            currentList = currentList[i].contents;
                            found = true;
                            break;
                        }
                    }
                    // Directory not found. Add it to the array.
                    if (!found) {
                        var newFolder = {
                            name: directory,
                            fileicon: foldericon,
                            contents: [],
                            filepath: subpath,
                            type: 'folder'
                        };
                        currentList.push(newFolder);
                        currentList = newFolder.contents;
                    }
                });

                currentList.push(entry);
            } else {
                files.push(entry);
            }
        });

        return folders.concat(files);
    };

    /**
     * Report a folder as being viewed.
     *
     * @module mm.addons.mod_folder
     * @ngdoc method
     * @name $mmaModFolder#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                folderid: id
            };
            return $mmSite.write('mod_folder_view_folder', params);
        }
        return $q.reject();
    };

    return self;
});
