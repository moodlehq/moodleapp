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
 * @todo Adding a new file in a folder updates the revision of all the files, so they're all shown as outdated.
 *       To ignore revision in folders we'll have to modify $mmCoursePrefetchDelegate, mm-file and $mmFilepool.
 */
.factory('$mmaModFolder', function($mmSite, $mmCourse, $q, $mmFilepool, mmaModFolderComponent) {
    var self = {};

    /**
     * Download all the content.
     *
     * @module mm.addons.mod_folder
     * @ngdoc method
     * @name $mmaModFolder#downloadAllContent
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    self.downloadAllContent = function(module) {
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);
        return $mmFilepool.downloadPackage($mmSite.getId(), files, mmaModFolderComponent, module.id, revision, timemod);
    };

    /**
     * Format folder contents, creating directory structure.
     *
     * @module mm.addons.mod_folder
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
     * Returns a list of files that can be downloaded.
     *
     * @module mm.addons.mod_folder
     * @ngdoc method
     * @name $mmaModFolder#getDownloadableFiles
     * @param {Object} module The module object returned by WS.
     * @return {Object[]}     List of files.
     */
    self.getDownloadableFiles = function(module) {
        var files = [];

        angular.forEach(module.contents, function(content) {
            if (self.isFileDownloadable(content)) {
                files.push(content);
            }
        });

        return files;
    };

    /**
     * Check if a file is downloadable. The file param must have a 'type' attribute like in core_course_get_contents response.
     *
     * @module mm.addons.mod_folder
     * @ngdoc method
     * @name $mmaModFolder#isFileDownloadable
     * @param {Object} file File to check.
     * @return {Boolean}    True if downloadable, false otherwise.
     */
    self.isFileDownloadable = function(file) {
        return file.type === 'file';
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

    /**
     * Prefetch the content.
     *
     * @module mm.addons.mod_folder
     * @ngdoc method
     * @name $mmaModFolder#prefetchContent
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    self.prefetchContent = function(module) {
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);
        return $mmFilepool.prefetchPackage($mmSite.getId(), files, mmaModFolderComponent, module.id, revision, timemod);
    };

    return self;
});
