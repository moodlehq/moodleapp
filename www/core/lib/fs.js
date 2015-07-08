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

.constant('mmFsSitesFolder', 'sites')
.constant('mmFsTmpFolder', 'tmp')

/**
 * @ngdoc service
 * @name $mmFS
 * @module mm.core
 * @description
 * This service handles the interaction with the FileSystem.
 */
.factory('$mmFS', function($ionicPlatform, $cordovaFile, $log, $q, mmFsSitesFolder, mmFsTmpFolder) {

    $log = $log.getInstance('$mmFS');

    var self = {},
        initialized = false,
        basePath = '';

    // Formats to read a file.
    self.FORMATTEXT         = 0;
    self.FORMATDATAURL      = 1;
    self.FORMATBINARYSTRING = 2;
    self.FORMATARRAYBUFFER  = 3;

    /**
     * Initialize basePath based on the OS if it's not initialized already.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#init
     * @return {Promise} Promise to be resolved when the initialization is finished.
     */
    self.init = function() {

        var deferred = $q.defer();

        if (initialized) {
            deferred.resolve();
            return deferred.promise;
        }

        $ionicPlatform.ready(function() {

            if (ionic.Platform.isAndroid()) {
                basePath = cordova.file.externalApplicationStorageDirectory;
            } else if (ionic.Platform.isIOS()) {
                basePath = cordova.file.documentsDirectory;
            } else {
                $log.error('Error getting device OS.');
                deferred.reject();
                return;
            }

            initialized = true;
            $log.debug('FS initialized: '+basePath);
            deferred.resolve();
        });

        return deferred.promise;
    };

    /**
     * Check if the plugin is available.
     *
     * @return {Boolean} True when cordova is initialised.
     */
    self.isAvailable = function() {
        return (typeof cordova !== 'undefined' && typeof cordova.file !== 'undefined');
    };

    /**
     * Get a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getFile
     * @param  {String}  path Relative path to the file.
     * @return {Promise}      Promise to be resolved when the file is retrieved.
     */
    self.getFile = function(path) {
        return self.init().then(function() {
            $log.debug('Get file: '+path);
            return $cordovaFile.checkFile(basePath, path);
        });
    };

    /**
     * Get a directory.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getDir
     * @param  {String}  path Relative path to the directory.
     * @return {Promise}      Promise to be resolved when the directory is retrieved.
     */
    self.getDir = function(path) {
        return self.init().then(function() {
            $log.debug('Get directory: '+path);
            return $cordovaFile.checkDir(basePath, path);
        });
    };

    /**
     * Get site folder path.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getSiteFolder
     * @param  {String} siteId Site ID.
     * @return {String}        Site folder path.
     */
    self.getSiteFolder = function(siteId) {
        return mmFsSitesFolder + '/' + siteId;
    };

    /**
     * Create a directory or a file.
     *
     * @param  {Boolean} isDirectory  True if a directory should be created, false if it should create a file.
     * @param  {String}  path         Relative path to the dir/file.
     * @param  {Boolean} failIfExists True if it should fail if the dir/file exists, false otherwise.
     * @param  {String}  base         Base path to create the dir/file in. If not set, use basePath.
     * @return {Promise}              Promise to be resolved when the dir/file is created.
     */
    function create(isDirectory, path, failIfExists, base) {
        return self.init().then(function() {
            base = base || basePath;

            if (path.indexOf('/') == -1) {
                if (isDirectory) {
                    $log.debug('Create dir ' + path + ' in ' + base);
                    return $cordovaFile.createDir(base, path, !failIfExists);
                } else {
                    $log.debug('Create file ' + path + ' in ' + base);
                    return $cordovaFile.createFile(base, path, !failIfExists);
                }
            } else {
                // $cordovaFile doesn't allow creating more than 1 level at a time (e.g. tmp/folder).
                // We need to create them 1 by 1.
                var firstDir = path.substr(0, path.indexOf('/'));
                var restOfPath = path.substr(path.indexOf('/') + 1);

                $log.debug('Create dir ' + firstDir + ' in ' + base);

                return $cordovaFile.createDir(base, firstDir, true).then(function(newDirEntry) {
                    return create(isDirectory, restOfPath, failIfExists, newDirEntry.toURL());
                }, function(error) {
                    $log.error('Error creating directory ' + firstDir + ' in ' + base);
                    return $q.reject(error);
                });
            }
        });
    }

    /**
     * Create a directory.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#createDir
     * @param  {String}  path         Relative path to the directory.
     * @param  {Boolean} failIfExists True if it should fail if the directory exists, false otherwise.
     * @return {Promise}              Promise to be resolved when the directory is created.
     */
    self.createDir = function(path, failIfExists) {
        failIfExists = failIfExists || false; // Default value false.
        return create(true, path, failIfExists);
    };

    /**
     * Create a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#createFile
     * @param  {String}  path         Relative path to the file.
     * @param  {Boolean} failIfExists True if it should fail if the file exists, false otherwise..
     * @return {Promise}              Promise to be resolved when the file is created.
     */
    self.createFile = function(path, failIfExists) {
        failIfExists = failIfExists || false; // Default value false.
        return create(false, path, failIfExists);
    };

    /**
     * Removes a directory and all its contents.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#removeDir
     * @param  {String}  path    Relative path to the directory.
     * @return {Promise}         Promise to be resolved when the directory is deleted.
     */
    self.removeDir = function(path) {
        return self.init().then(function() {
            $log.debug('Remove directory: ' + path);
            return $cordovaFile.removeRecursively(basePath, path);
        });
    };

    /**
     * Removes a file and all its contents.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#removeFile
     * @param  {String}  path    Relative path to the file.
     * @return {Promise}         Promise to be resolved when the file is deleted.
     */
    self.removeFile = function(path) {
        return self.init().then(function() {
            $log.debug('Remove file: ' + path);
            return $cordovaFile.removeFile(basePath, path);
        });
    };

    /**
     * Retrieve the contents of a directory (not subdirectories).
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getDirectoryContents
     * @param  {String} path Relative path to the directory.
     * @return {Promise}     Promise to be resolved when the contents are retrieved.
     */
    self.getDirectoryContents = function(path) {
        $log.debug('Get contents of dir: ' + path);
        return self.getDir(path).then(function(dirEntry) {

            var deferred = $q.defer();

            var directoryReader = dirEntry.createReader();
            directoryReader.readEntries(deferred.resolve, deferred.reject);

            return deferred.promise;
        });
    };

    /**
     * Calculate the size of a directory or a file.
     *
     * @param  {String} path Relative path to the directory or file.
     * @return {Promise}     Promise to be resolved when the size is calculated.
     */
    function getSize(entry) {

        var deferred = $q.defer();

        if (entry.isDirectory) {

            var directoryReader = entry.createReader();
            directoryReader.readEntries(function(entries) {

                var promises = [];
                for (var i = 0; i < entries.length; i++) {
                    promises.push(getSize(entries[i]));
                }

                $q.all(promises).then(function(sizes) {

                    var directorySize = 0;
                    for (var i = 0; i < sizes.length; i++) {
                        var fileSize = parseInt(sizes[i]);
                        if (isNaN(fileSize)) {
                            deferred.reject();
                            return;
                        }
                        directorySize += fileSize;
                    }
                    deferred.resolve(directorySize);

                }, deferred.reject);

            }, deferred.reject);

        } else if (entry.isFile) {
            entry.file(function(file) {
                deferred.resolve(file.size);
            }, deferred.reject);
        }

        return deferred.promise;
    }

    /**
     * Calculate the size of a directory.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getDirectorySize
     * @param  {String} path Relative path to the directory.
     * @return {Promise}     Promise to be resolved when the size is calculated.
     */
    self.getDirectorySize = function(path) {
        $log.debug('Get size of dir: ' + path);
        return self.getDir(path).then(function(dirEntry) {
           return getSize(dirEntry);
        });
    };

    /**
     * Calculate the size of a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getFileSize
     * @param  {String} path Relative path to the file.
     * @return {Promise}     Promise to be resolved when the size is calculated.
     */
    self.getFileSize = function(path) {
        $log.debug('Get size of file: ' + path);
        return self.getFile(path).then(function(fileEntry) {
           return getSize(fileEntry);
        });
    };

    /**
     * Get file object from a FileEntry.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getFileSizeFromFileEntry
     * @param  {String} path Relative path to the file.
     * @return {Promise}     Promise to be resolved when the size is calculated.
     */
    self.getFileObjectFromFileEntry = function(entry) {
        $log.debug('Get file object of: ' + entry.fullPath);
        var deferred = $q.defer();
        entry.file(function(file) {
            deferred.resolve(file);
        }, deferred.reject);
        return deferred.promise;
    };

    /**
     * Calculate the free space in the disk.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#calculateFreeSpace
     * @return {Promise} Promise resolved with the estimated free space in bytes.
     */
    self.calculateFreeSpace = function() {
        if (ionic.Platform.isIOS()) {
            // getFreeDiskSpace doesn't work on iOS. See https://tracker.moodle.org/browse/MOBILE-956.
            // Ugly fix: request a file system instance with a minimum size until we get an error.

            if (window.requestFileSystem) {

                var iterations = 0,
                    maxIterations = 50,
                    deferred = $q.defer();

                function calculateByRequest(size, ratio) {
                    var deferred = $q.defer();

                    window.requestFileSystem(LocalFileSystem.PERSISTENT, size, function() {
                        iterations++;
                        if (iterations > maxIterations) {
                            deferred.resolve(size);
                            return;
                        }
                        calculateByRequest(size * ratio, ratio).then(deferred.resolve);
                    }, function() {
                        deferred.resolve(size / ratio);
                    });

                    return deferred.promise;
                };

                // General calculation, base 1MB and increasing factor 1.3.
                calculateByRequest(1048576, 1.3).then(function(size) {
                    iterations = 0;
                    maxIterations = 10;
                    // More accurate. Factor is 1.1.
                    calculateByRequest(size, 1.1).then(deferred.resolve);
                });

                return deferred.promise;
            } else {
                return $q.reject();
            }

        } else {
            return $cordovaFile.getFreeDiskSpace().then(function(size) {
                return size * 1024; // GetFreeDiskSpace returns KB.
            });
        }
    };

    /**
     * Normalize a filename that usually comes URL encoded.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#normalizeFileName
     * @param  {String} filename The file name.
     * @return {String}          The file name normalized.
     */
    self.normalizeFileName = function(filename) {
        filename = decodeURIComponent(filename);
        return filename;
    };

    /**
     * Read a file from local file system.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#readFile
     * @param  {String}  path   Relative path to the file.
     * @param  {Number}  format Format to read the file. By default, FORMATTEXT. Must be one of:
     *                                  $mmFS.FORMATTEXT
     *                                  $mmFS.FORMATDATAURL
     *                                  $mmFS.FORMATBINARYSTRING
     *                                  $mmFS.FORMATARRAYBUFFER
     * @return {Promise}        Promise to be resolved when the file is read.
     */
    self.readFile = function(path, format) {
        format = format || self.FORMATTEXT;
        $log.debug('Read file ' + path + ' with format '+format);
        switch (format) {
            case self.FORMATDATAURL:
                return $cordovaFile.readAsDataURL(basePath, path);
            case self.FORMATBINARYSTRING:
                return $cordovaFile.readAsBinaryString(basePath, path);
            case self.FORMATARRAYBUFFER:
                return $cordovaFile.readAsArrayBuffer(basePath, path);
            default:
                return $cordovaFile.readAsText(basePath, path);
        }
    };

    /**
     * Read file contents from a file data object.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#readFileData
     * @param  {Object}  fileData File's data.
     * @param  {Number}  format   Format to read the file. By default, FORMATTEXT. Must be one of:
     *                                  $mmFS.FORMATTEXT
     *                                  $mmFS.FORMATDATAURL
     *                                  $mmFS.FORMATBINARYSTRING
     *                                  $mmFS.FORMATARRAYBUFFER
     * @return {Promise}          Promise to be resolved when the file is read.
     */
    self.readFileData = function(fileData, format) {
        format = format || self.FORMATTEXT;
        $log.debug('Read file from file data with format '+format);

        var deferred = $q.defer();

        var reader = new FileReader();
        reader.onloadend = function(evt) {
            if (evt.target.result !== undefined || evt.target.result !== null) {
                deferred.resolve(evt.target.result);
            } else if (evt.target.error !== undefined || evt.target.error !== null) {
                deferred.reject(evt.target.error);
            } else {
                deferred.reject({code: null, message: 'READER_ONLOADEND_ERR'});
            }
        };

        switch (format) {
            case self.FORMATDATAURL:
                reader.readAsDataURL(fileData);
                break;
            case self.FORMATBINARYSTRING:
                reader.readAsBinaryString(fileData);
                break;
            case self.FORMATARRAYBUFFER:
                reader.readAsArrayBuffer(fileData);
                break;
            default:
                reader.readAsText(fileData);
        }

        return deferred.promise;
    };

    /**
     * Writes some data in a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#writeFile
     * @param  {String}  path Relative path to the file.
     * @param  {String}  data Data to write.
     * @return {Promise}      Promise to be resolved when the file is written.
     */
    self.writeFile = function(path, data) {
        $log.debug('Write file: ' + path);
        return self.init().then(function() {
            // Create file (and parent folders) to prevent errors.
            return self.createFile(path).then(function(fileEntry) {
                return $cordovaFile.writeFile(basePath, path, data, true).then(function() {
                    return fileEntry;
                });
            });
        });
    };

    /**
     * Gets a file that might be outside the app's folder.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getExternalFile
     * @param  {String}  fullPath Absolute path to the file.
     * @return {Promise}          Promise to be resolved when the file is retrieved.
     */
    self.getExternalFile = function(fullPath) {
        return $cordovaFile.checkFile(fullPath, '');
    };

    /**
     * Removes a file that might be outside the app's folder.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#removeExternalFile
     * @param  {String}  fullPath Absolute path to the file.
     * @return {Promise}          Promise to be resolved when the file is removed.
     */
    self.removeExternalFile = function(fullPath) {
        // removeFile(fullPath, '') does not work, we need to pass two valid parameters.
        var directory = fullPath.substring(0, fullPath.lastIndexOf('/') );
        var filename = fullPath.substr(fullPath.lastIndexOf('/') + 1);
        return $cordovaFile.removeFile(directory, filename);
    };

    /**
     * Get the base path where the application files are stored.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getBasePath
     * @return {Promise} Promise to be resolved when the base path is retrieved.
     */
    self.getBasePath = function() {
        return self.init().then(function() {
            if (basePath.slice(-1) == '/') {
                return basePath;
            } else {
                return basePath + '/';
            }
        });
    };

    /**
     * Get temporary directory path.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getTmpFolder
     * @return {String} Tmp directory path.
     */
    self.getTmpFolder = function() {
        return mmFsTmpFolder;
    };

    /**
     * Move a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#moveEntry
     * @param {String} originalPath Path to the file to move.
     * @param {String} newPath      New path of the file.
     * @return {Promise}            Promise resolved when the entry is moved.
     */
    self.moveFile = function(originalPath, newPath) {
        return self.init().then(function() {
            return $cordovaFile.moveFile(basePath, originalPath, basePath, newPath);
        });
    };

    /**
     * Copy a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#copyFile
     * @param {String} from   Path to the file to move.
     * @param {String} to     New path of the file.
     * @return {Promise}      Promise resolved when the entry is copied.
     */
    self.copyFile = function(from, to) {
        return self.init().then(function() {
            // Check if to contains a directory.
            var toFile = self.getFileAndDirectoryFromPath(to);
            if (toFile.directory == '') {
                return $cordovaFile.copyFile(basePath, from, basePath, to);
            } else {
                // Ensure directory is created.
                return self.createDir(toFile.directory).then(function() {
                    return $cordovaFile.copyFile(basePath, from, basePath, to);
                });
            }
        });
    };

    /**
     * Extract the file name and directory from a given path.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#getFileAndDirectoryFromPath
     * @param {String} path   Path to be extracted.
     * @return {Object}       Plain object containing the file name and directory.
     * @description
     * file.pdf         -> directory: '', name: 'file.pdf'
     * /file.pdf        -> directory: '', name: 'file.pdf'
     * path/file.pdf    -> directory: 'path', name: 'file.pdf'
     * path/            -> directory: 'path', name: ''
     * path             -> directory: '', name: 'path'
     */
    self.getFileAndDirectoryFromPath = function(path) {
        var file = {
            directory: '',
            name: ''
        };

        file.directory = path.substring(0, path.lastIndexOf('/') );
        file.name = path.substr(path.lastIndexOf('/') + 1);

        return file;
    };

    /**
     * Concatenate two paths, adding a slash between them if needed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFS#concatenatePaths
     * @param {String} leftPath  Left path.
     * @param {String} rightPath Right path.
     * @return {String}          Concatenated path.
     */
    self.concatenatePaths = function(leftPath, rightPath) {
        var lastCharLeft = leftPath.slice(-1),
            firstCharRight = rightPath.charAt(0);

        if (lastCharLeft === '/' && firstCharRight === '/') {
            return leftPath + rightPath.substr(1);
        } else if(lastCharLeft !== '/' && firstCharRight !== '/') {
            return leftPath + '/' + rightPath;
        } else {
            return leftPath + rightPath;
        }
    };

    return self;
});
