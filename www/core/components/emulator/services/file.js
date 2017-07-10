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

angular.module('mm.core.emulator')

/**
 * This service handles the emulation of the Cordova File plugin in desktop apps and in browser.
 *
 * @ngdoc service
 * @name $mmEmulatorFile
 * @module mm.core.emulator
 */
.factory('$mmEmulatorFile', function($log, $q, $mmFS, $window, $mmApp, mmCoreConfigConstants) {

    $log = $log.getInstance('$mmEmulatorFile');

    var self = {};

    /**
     * Delete an empty folder.
     *
     * @param  {Object} fs                Node module 'fs'.
     * @param  {String} path              Path of the folder.
     * @param  {Function} successCallback Function to call when success.
     * @param  {Function} errorCallback   Function to call when error.
     * @return {Void}
     */
    function deleteEmptyFolder(fs, path, successCallback, errorCallback) {
        fs.rmdir(path, function(err) {
            if (err) {
                // Error removing directory.
                errorCallback && errorCallback(err);
            } else {
                successCallback && successCallback();
            }
        });
    }

    /**
     * Delete a file or folder recursively.
     *
     * @param  {Object} fs                Node module 'fs'.
     * @param  {String} path              Path of the folder.
     * @param  {Function} successCallback Function to call when success.
     * @param  {Function} errorCallback   Function to call when error.
     * @return {Void}
     */
    function deleteRecursive(fs, path, successCallback, errorCallback) {
        // Check if it exists.
        fs.stat(path, function(err, stats) {
            if (err) {
                // File not found, reject.
                errorCallback && errorCallback(err);
            } else if (stats.isFile()) {
                // It's a file, remove it.
                fs.unlink(path, function(err) {
                    if (err) {
                        // Error removing file, reject.
                        errorCallback && errorCallback(err);
                    } else {
                        successCallback && successCallback();
                    }
                });
            } else {
                // It's a directory, read the contents.
                fs.readdir(path, function(err, files) {
                    if (err) {
                        // Error reading directory contents, reject.
                        errorCallback && errorCallback(err);
                    } else if (!files.length) {
                        // No files to delete, delete the folder.
                        deleteEmptyFolder(fs, path, successCallback, errorCallback);
                    } else {
                        // Remove all the files and directories.
                        var removed = 0;
                        files.forEach(function(filename) {
                            deleteRecursive(fs, $mmFS.concatenatePaths(path, filename), function() {
                                // Success deleting the file/dir.
                                removed++;
                                if (removed == files.length) {
                                    // All files deleted, delete the folder.
                                    deleteEmptyFolder(fs, path, successCallback, errorCallback);
                                }
                            }, errorCallback);
                        });
                    }
                });
            }
        });
    }

    /**
     * Emulate Cordova file plugin using NodeJS functions. This is only for NodeJS environments,
     * browser works with the default resolveLocalFileSystemURL.
     *
     * @param  {Object} fs Node module 'fs'.
     * @return {Void}
     */
    function emulateCordovaFileForDesktop(fs) {
        if (!$mmApp.isDesktop()) {
            return;
        }

        emulateEntry(fs);
        emulateFileWriter(fs);
        emulateDirectoryReader(fs);
        emulateFileEntry(fs);
        emulateDirectoryEntry(fs);

        // Implement resolveLocalFileSystemURL.
        $window.resolveLocalFileSystemURL = function(path, successCallback, errorCallback) {
            // Check that the file/dir exists.
            fs.stat(path, function(err, stats) {
                if (err) {
                    errorCallback && errorCallback(err);
                } else {
                    // The file/dir exists, return an instance.
                    var constructorFn = stats.isDirectory() ? DirectoryEntry : FileEntry,
                        fileAndDir = $mmFS.getFileAndDirectoryFromPath(path);
                    successCallback && successCallback(new constructorFn(fileAndDir.name, path));
                }
            });
        };
    }

    /**
     * Emulate DirectoryEntry object of the Cordova file plugin using NodeJS functions.
     *
     * @param  {Object} fs Node module 'fs'.
     * @return {Void}
     */
    function emulateDirectoryEntry(fs) {
        // Create DirectoryEntry and its functions, inheriting from Entry.
        $window.DirectoryEntry = function(name, fullPath, fileSystem, nativeURL) {
            // Add trailing slash if it is missing.
            if ((fullPath) && !/\/$/.test(fullPath)) {
                fullPath += '/';
            }
            if (nativeURL && !/\/$/.test(nativeURL)) {
                nativeURL += '/';
            }

            $window.Entry.call(this, false, true, name, fullPath, fileSystem, nativeURL);
        };

        $window.DirectoryEntry.prototype = Object.create($window.Entry.prototype); // Inherit Entry prototype.

        $window.DirectoryEntry.prototype.createReader = function() {
            return new DirectoryReader(this.fullPath);
        };

        $window.DirectoryEntry.prototype.getDirectory = function(path, options, successCallback, errorCallback) {
            getDirOrFile(fs, this, true, path, options, successCallback, errorCallback);
        };

        $window.DirectoryEntry.prototype.removeRecursively = function(successCallback, errorCallback) {
            // Use a promise to make sure only one callback is called.
            var deferred = $q.defer();

            deferred.promise.then(function() {
                successCallback && successCallback();
            }).catch(function(error) {
                errorCallback && errorCallback(error);
            });

            deleteRecursive(fs, this.fullPath, deferred.resolve, deferred.reject);
        };

        $window.DirectoryEntry.prototype.getFile = function(path, options, successCallback, errorCallback) {
            getDirOrFile(fs, this, false, path, options, successCallback, errorCallback);
        };
    }

    /**
     * Emulate DirectoryReader object of the Cordova file plugin using NodeJS functions.
     *
     * @param  {Object} fs Node module 'fs'.
     * @return {Void}
     */
    function emulateDirectoryReader(fs) {
        // DirectoryReader to read directory contents.
        $window.DirectoryReader = function(localURL) {
            this.localURL = localURL || null;
        };

        $window.DirectoryReader.prototype.readEntries = function(successCallback, errorCallback) {
            var that = this;

            fs.readdir(this.localURL, function(err, files) {
                if (err) {
                    errorCallback && errorCallback(err);
                } else {
                    // Use try/catch because it includes sync calls.
                    try {
                        var entries = [];
                        for (var i = 0; i < files.length; i++) {
                            var fileName = files[i],
                                filePath = $mmFS.concatenatePaths(that.localURL, fileName),
                                stats = fs.statSync(filePath); // Use sync function to make code simpler.

                            if (stats.isDirectory()) {
                                entries.push(new DirectoryEntry(fileName, filePath));
                            } else if (stats.isFile()) {
                                entries.push(new FileEntry(fileName, filePath));
                            }
                        }

                        successCallback && successCallback(entries);
                    } catch(ex) {
                        errorCallback && errorCallback(ex);
                    }
                }
            });
        };
    }

    /**
     * Emulate Entry object of the Cordova file plugin using NodeJS functions.
     *
     * @param  {Object} fs Node module 'fs'.
     * @return {Void}
     */
    function emulateEntry(fs) {
        // Create the Entry object, parent of DirectoryEntry and FileEntry.
        // It includes fileSystem and nativeURL as the Cordova plugin does, but they aren't used.
        $window.Entry = function(isFile, isDirectory, name, fullPath, fileSystem, nativeURL) {
            this.isFile = !!isFile;
            this.isDirectory = !!isDirectory;
            this.name = name || '';
            this.fullPath = fullPath || '';
            this.filesystem = fileSystem || null;
            this.nativeURL = nativeURL || null;
        };

        // Implement Entry functions.
        $window.Entry.prototype.getMetadata = function(successCallback, errorCallback) {
            fs.stat(this.fullPath, function(err, stats) {
                if (err) {
                    errorCallback && errorCallback(err);
                } else {
                    successCallback && successCallback({
                        size: stats.size,
                        modificationTime: stats.mtime
                    });
                }
            });
        };

        $window.Entry.prototype.setMetadata = function(successCallback, errorCallback, metadataObject) {
            // Not supported.
            errorCallback && errorCallback('Not supported');
        };

        $window.Entry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
            newName = newName || this.name;

            var srcPath = this.fullPath,
                destPath = $mmFS.concatenatePaths(parent.fullPath, newName),
                that = this;

            fs.rename(srcPath, destPath, function(err) {
                if (err) {
                    errorCallback && errorCallback(err);
                } else {
                    var constructorFn = that.isDirectory ? DirectoryEntry : FileEntry;
                    successCallback && successCallback(new constructorFn(newName, destPath));
                }
            });
        };

        $window.Entry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
            newName = newName || this.name;

            // There is no function to copy a file, read the source and write the dest.
            var srcPath = this.fullPath,
                destPath = $mmFS.concatenatePaths(parent.fullPath, newName),
                reader = fs.createReadStream(srcPath),
                writer = fs.createWriteStream(destPath),
                deferred = $q.defer(), // Use a promise to make sure only one callback is called.
                that = this;

            deferred.promise.then(function() {
                var constructorFn = that.isDirectory ? DirectoryEntry : FileEntry;
                successCallback && successCallback(new constructorFn(newName, destPath));
            }).catch(function(error) {
                errorCallback && errorCallback(error);
            });

            reader.on('error', deferred.reject);

            writer.on('error', deferred.reject);

            writer.on('close', deferred.resolve);

            reader.pipe(writer);
        };

        $window.Entry.prototype.toInternalURL = function() {
            return 'file://' + this.fullPath;
        };

        $window.Entry.prototype.toURL = function() {
            return this.fullPath;
        };

        $window.Entry.prototype.remove = function(successCallback, errorCallback) {
            var removeFn = this.isDirectory ? fs.rmdir : fs.unlink;
            removeFn(this.fullPath, function(err) {
                if (err < 0) {
                    errorCallback && errorCallback(err);
                } else {
                    successCallback && successCallback();
                }
            });
        };

        $window.Entry.prototype.getParent = function(successCallback, errorCallback) {
            // Remove last slash if present and get the path of the parent.
            var fullPath = this.fullPath.slice(-1) == '/' ? this.fullPath.slice(0, -1) : this.fullPath,
                parentPath = fullPath.substr(0, fullPath.lastIndexOf('/'));

            // Check that parent exists.
            fs.stat(parentPath, function(err, stats) {
                if (err || !stats.isDirectory()) {
                    errorCallback && errorCallback(err);
                } else {
                    var fileAndDir = $mmFS.getFileAndDirectoryFromPath(parentPath);
                    successCallback && successCallback(new DirectoryEntry(fileAndDir.name, parentPath));
                }
            });
        };
    }

    /**
     * Emulate FileEntry object of the Cordova file plugin using NodeJS functions.
     *
     * @param  {Object} fs Node module 'fs'.
     * @return {Void}
     */
    function emulateFileEntry(fs) {
        // Create FileEntry and its functions, inheriting from Entry.
        $window.FileEntry = function(name, fullPath, fileSystem, nativeURL) {
            // Remove trailing slash if it is present.
            if (fullPath && /\/$/.test(fullPath)) {
                fullPath = fullPath.substring(0, fullPath.length - 1);
            }
            if (nativeURL && /\/$/.test(nativeURL)) {
                nativeURL = nativeURL.substring(0, nativeURL.length - 1);
            }

            $window.Entry.call(this, true, false, name, fullPath, fileSystem, nativeURL);
        };

        $window.FileEntry.prototype = Object.create($window.Entry.prototype); // Inherit Entry prototype.

        $window.FileEntry.prototype.createWriter = function(successCallback, errorCallback) {
            this.file(function(file) {
                successCallback && successCallback(new FileWriter(file));
            }, errorCallback);
        };

        $window.FileEntry.prototype.file = function(successCallback, errorCallback) {
            var that = this;

            // Get the metadata to know the time modified.
            this.getMetadata(function(metadata) {
                // Read the file.
                fs.readFile(that.fullPath, function(err, data) {
                    if (err) {
                        errorCallback && errorCallback(err);
                    } else {
                        // Create a File instance and return it.
                        data = Uint8Array.from(data).buffer; // Convert the NodeJS Buffer to ArrayBuffer.
                        var file = new File([data], that.name || '', {
                            lastModified: metadata.modificationTime || null,
                            type: $mmFS.getMimeType($mmFS.getFileExtension(that.name)) || null
                        });
                        file.localURL = that.fullPath;
                        file.start = 0;
                        file.end = file.size;

                        successCallback && successCallback(file);
                    }
                });
            }, errorCallback);
        };
    }

    /**
     * Emulate FileWriter object of the Cordova file plugin using NodeJS functions.
     *
     * @param  {Object} fs Node module 'fs'.
     * @return {Void}
     */
    function emulateFileWriter(fs) {
        // FileWriter to write data in files. Don't support abort, seek and truncate.
        $window.FileWriter = function(file) {
            this.fileName = '';
            this.length = 0;
            if (file) {
                this.localURL = file.localURL || file;
                this.length = file.size || 0;
            }

            this.position = 0; // Default is to write at the beginning of the file.
            this.readyState = 0; // EMPTY
            this.result = null;
            this.error = null;

            // Event handlers
            this.onwritestart = null;   // When writing starts
            this.onprogress = null;     // While writing the file, and reporting partial file data
            this.onwrite = null;        // When the write has successfully completed.
            this.onwriteend = null;     // When the request has completed (either in success or failure).
            this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
            this.onerror = null;        // When the write has failed (see errors).
        };

        $window.FileWriter.prototype.write = function(data) {
            var that = this;
            if (data && data.toString() == '[object Blob]') {
                // Can't write Blobs, convert it to a Buffer.
                var reader = new FileReader();
                reader.onload = function() {
                    if (reader.readyState == 2) {
                        write(new Buffer(reader.result));
                    }
                };
                reader.readAsArrayBuffer(data);
            } else if (data && data.toString() == '[object ArrayBuffer]') {
                // Convert it to a Buffer.
                write(Buffer.from(new Uint8Array(data)));
            } else {
                write(data);
            }

            function write(data) {
                fs.writeFile(that.localURL, data, function(err) {
                    if (err) {
                        that.onerror && that.onerror(err);
                    } else {
                        that.onwrite && that.onwrite();
                    }
                    that.onwriteend && that.onwriteend();
                });

                that.onwritestart && that.onwritestart();
            }
        };
    }

    /**
     * Helper function for getDirectory and getFile in DirectoryEntry.
     *
     * @param  {Object} fs                Node module 'fs'.
     * @param  {Object}  entry            DirectoryEntry to get the file/dir in.
     * @param  {Boolean} isDir            True if getting a directory, false if getting a file.
     * @param  {String}  path             Path of the file or dir.
     * @param  {Object}  options          Options.
     * @param  {Function} successCallback Function to call in success.
     * @param  {Function} errorCallback   Function to call in error.
     * @return {Void}
     */
    function getDirOrFile(fs, entry, isDir, path, options, successCallback, errorCallback) {
        var filename = $mmFS.getFileAndDirectoryFromPath(path).name,
            fileDirPath = $mmFS.concatenatePaths(entry.fullPath, path);

        // Check if file/dir exists.
        fs.stat(fileDirPath, function(err) {
            if (err) {
                if (options.create) {
                    // File/Dir probably doesn't exist, create it.
                    create(function(error2) {
                        if (!error2) {
                            // File created successfully, return it.
                            success();
                        } else if (error2.code === 'EEXIST') {
                            // File exists, success.
                            success();
                        } else if (error2.code === 'ENOENT') {
                            // Seems like the parent doesn't exist, create it too.
                            var parent = fileDirPath.substring(0, fileDirPath.lastIndexOf('/'));

                            if (parent) {
                                entry.getDirectory(parent, options, function() {
                                    // Parent created, try to create the child again.
                                    create(function(error3) {
                                        if (!error3) {
                                            success();
                                        } else {
                                            errorCallback && errorCallback(error3);
                                        }
                                    });
                                }, errorCallback);
                            } else {
                                errorCallback && errorCallback(error2);
                            }
                        } else {
                            errorCallback && errorCallback(error2);
                        }
                    });
                } else {
                    errorCallback && errorCallback(err);
                }
            } else {
                success();
            }
        });

        // Success, return the DirectoryEntry or FileEntry.
        function success() {
            var constructorFn = isDir ? DirectoryEntry : FileEntry;
            successCallback && successCallback(new constructorFn(filename, fileDirPath));
        }

        // Create the file/dir.
        function create(done) {
            if (isDir) {
                fs.mkdir(fileDirPath, done);
            } else {
                fs.writeFile(fileDirPath, '', done);
            }
        }
    }

    /**
     * Load the emulation of the Cordova plugin.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorFile#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        var deferred = $q.defer(),
            basePath;

        $window.requestFileSystem  = $window.requestFileSystem || $window.webkitRequestFileSystem;
        $window.resolveLocalFileSystemURL = $window.resolveLocalFileSystemURL || $window.webkitResolveLocalFileSystemURL;
        $window.LocalFileSystem = {
            PERSISTENT: 1
        };

        if ($mmApp.isDesktop()) {
            var fs = require('fs'),
                app = require('electron').remote.app;

            emulateCordovaFileForDesktop(fs);

            // Initialize File System. Get the path to use.
            basePath = app.getPath('documents') || app.getPath('home');
            if (!basePath) {
                deferred.reject('Cannot calculate base path for file system.');
                return;
            }

            basePath = $mmFS.concatenatePaths(basePath.replace(/\\/g, '/'), mmCoreConfigConstants.app_id) + '/';

            // Create the folder if needed.
            fs.mkdir(basePath, function(e) {
                if (!e || (e && e.code === 'EEXIST')) {
                    // Create successful or it already exists. Resolve.
                    $mmFS.setHTMLBasePath(basePath);
                    deferred.resolve();
                } else {
                    deferred.reject('Error creating base path.');
                }
            });
        } else {
            // It's browser, request a quota to use. Request 500MB.
            $window.webkitStorageInfo.requestQuota(PERSISTENT, 500 * 1024 * 1024, function(granted) {
                $window.requestFileSystem(PERSISTENT, granted, function(entry) {
                    basePath = entry.root.toURL();
                    $mmFS.setHTMLBasePath(basePath);
                    deferred.resolve();
                }, deferred.reject);
            }, deferred.reject);
        }

        return deferred.promise;
    };

    return self;
});
