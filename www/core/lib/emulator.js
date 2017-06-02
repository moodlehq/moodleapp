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
 * @ngdoc service
 * @name $mmEmulatorManager
 * @module mm.core
 * @description
 * This service handles the emulation of Cordova plugins in other environments like browser.
 */
.factory('$mmEmulatorManager', function($log, $q, $mmFS, $window, $mmApp, mmCoreConfigConstants) {

    $log = $log.getInstance('$mmEmulatorManager');

    var self = {},
        fileTransferIdCounter = 0,
        basePath;

    /**
     * Given a URL, check if it has a credentials in it and, if so, return them in a header object.
     * This code is extracted from Cordova FileTransfer plugin.
     *
     * @param  {String} urlString The URL to get the credentials from.
     * @return {Object}           The header with the credentials, null if no credentials.
     */
    function getBasicAuthHeader(urlString) {
        var header =  null;

        // This is changed due to MS Windows doesn't support credentials in http uris
        // so we detect them by regexp and strip off from result url.
        if (window.btoa) {
            var credentials = getUrlCredentials(urlString);
            if (credentials) {
                var authHeader = "Authorization";
                var authHeaderValue = "Basic " + window.btoa(credentials);

                header = {
                    name : authHeader,
                    value : authHeaderValue
                };
            }
        }

        return header;
    }

    /**
     * Emulate Cordova file plugin using NodeJS functions. This should only be used in NodeJS environments,
     * browser works with the default resolveLocalFileSystemURL.
     *
     * @return {Void}
     */
    function emulateCordovaFile() {
        var fs = require('fs');

        // Create the Entry object, parent of DirectoryEntry and FileEntry.
        // It includes fileSystem and nativeURL as the Cordova object, but they aren't used.
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
            errorCallback('Not supported');
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
                    errorCallback(err);
                } else {
                    successCallback();
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

                        successCallback(entries);
                    } catch(ex) {
                        errorCallback && errorCallback(ex);
                    }
                }
            });
        };

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
            getDirOrFile(this, true, path, options, successCallback, errorCallback);
        };

        $window.DirectoryEntry.prototype.removeRecursively = function(successCallback, errorCallback) {
            // Use a promise to make sure only one callback is called.
            var deferred = $q.defer();

            deferred.promise.then(function() {
                successCallback && successCallback();
            }).catch(function(error) {
                errorCallback && errorCallback(error);
            });

            deleteRecursive(this.fullPath, function() {
                deferred.resolve();
            });

            // Delete a file or folder recursively.
            function deleteRecursive(path, success) {
                // Check if it exists.
                fs.stat(path, function(err, stats) {
                    if (err) {
                        // File not found, reject.
                        deferred.reject(err);
                    } else if (stats.isFile()) {
                        // It's a file, remove it.
                        fs.unlink(path, function(err) {
                            if (err) {
                                // Error removing file, reject.
                                deferred.reject(err);
                            } else {
                                success && success();
                            }
                        });
                    } else {
                        // It's a directory, read the contents.
                        fs.readdir(path, function(err, files) {
                            if (err) {
                                // Error reading directory contents, reject.
                                deferred.reject(err);
                            } else if (!files.length) {
                                // No files to delete, delete the folder.
                                deleteEmptyFolder(path, success);
                            } else {
                                // Remove all the files and directories.
                                var removed = 0;
                                files.forEach(function(filename) {
                                    deleteRecursive($mmFS.concatenatePaths(path, filename), function() {
                                        // Success deleting the file/dir.
                                        removed++;
                                        if (removed == files.length) {
                                            // All files deleted, delete the folder.
                                            deleteEmptyFolder(path, success);
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            }

            // Delete an empty folder.
            function deleteEmptyFolder(path, success) {
                fs.rmdir(path, function(err) {
                    if (err) {
                        // Error removing directory, reject.
                        deferred.reject(err);
                    } else {
                        success && success();
                    }
                });
            }
        };

        $window.DirectoryEntry.prototype.getFile = function(path, options, successCallback, errorCallback) {
            getDirOrFile(this, false, path, options, successCallback, errorCallback);
        };

        // Helper function for getDirectory and getFile.
        function getDirOrFile(file, isDir, path, options, successCallback, errorCallback) {
            var filename = $mmFS.getFileAndDirectoryFromPath(path).name,
                fileDirPath = $mmFS.concatenatePaths(file.fullPath, path);

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
                                    file.getDirectory(parent, options, function() {
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
                successCallback(new constructorFn(filename, fileDirPath));
            }

            // Create the file/dir.
            function create(done) {
                if (isDir) {
                    fs.mkdir(fileDirPath, done);
                } else {
                    fs.writeFile(fileDirPath, "", done);
                }
            }
        }

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
     * Emulate Cordova FileTransfer plugin for browser or NodeJS.
     *
     * @return {Void}
     */
    function emulateCordovaFileTransfer() {
        // Create the FileTransferError object.
        $window.FileTransferError = function(code, source, target, status, body, exception) {
            this.code = code || null;
            this.source = source || null;
            this.target = target || null;
            this.http_status = status || null;
            this.body = body || null;
            this.exception = exception || null;
        };

        $window.FileTransferError.FILE_NOT_FOUND_ERR = 1;
        $window.FileTransferError.INVALID_URL_ERR = 2;
        $window.FileTransferError.CONNECTION_ERR = 3;
        $window.FileTransferError.ABORT_ERR = 4;
        $window.FileTransferError.NOT_MODIFIED_ERR = 5;

        // Create the FileTransfer object and its functions.
        $window.FileTransfer = function() {
            this._id = ++fileTransferIdCounter;
            this.onprogress = null; // Optional callback.
        };

        $window.FileTransfer.prototype.download = function(source, target, successCallback, errorCallback, trustAllHosts, options) {
            // Use XMLHttpRequest instead of $http to support onprogress and abort.
            var basicAuthHeader = getBasicAuthHeader(source),
                xhr = new XMLHttpRequest(),
                isDesktop = $mmApp.isDesktop(),
                deferred = $q.defer(), // Use a promise to make sure only one callback is called.
                headers = null;

            deferred.promise.then(function(entry) {
                successCallback && successCallback(entry);
            }).catch(function(error) {
                errorCallback && errorCallback(error);
            });

            this.xhr = xhr;
            this.deferred = deferred;
            this.source = source;
            this.target = target;

            if (basicAuthHeader) {
                source = source.replace(getUrlCredentials(source) + '@', '');

                options = options || {};
                options.headers = options.headers || {};
                options.headers[basicAuthHeader.name] = basicAuthHeader.value;
            }

            if (options) {
                headers = options.headers || null;
            }

            // Prepare the request.
            xhr.open('GET', source, true);
            xhr.responseType = isDesktop ? 'arraybuffer' : 'blob';
            angular.forEach(headers, function(value, name) {
                xhr.setRequestHeader(name, value);
            });

            if (this.onprogress) {
                xhr.onprogress = this.onprogress;
            }

            xhr.onerror = function() {
                deferred.reject(new FileTransferError(-1, source, target, xhr.status, xhr.statusText));
            };

            xhr.onload = function() {
                // Finished dowloading the file.
                var response = xhr.response;
                if (!response) {
                    deferred.reject();
                } else {
                    target = target.replace(basePath, ''); // Remove basePath from the target.
                    target = target.replace(/%20/g, ' '); // Replace all %20 with spaces.
                    if (isDesktop) {
                        // In desktop we need to convert the arraybuffer into a Buffer.
                        response = Buffer.from(new Uint8Array(response));
                    }

                    $mmFS.writeFile(target, response).then(deferred.resolve, deferred.reject);
                }
            };

            xhr.send();
        };

        $window.FileTransfer.prototype.upload = function(filePath, server, successCallback, errorCallback, options, trustAllHosts) {
            var fileKey = null,
                fileName = null,
                mimeType = null,
                params = null,
                headers = null,
                httpMethod = null,
                deferred = $q.defer(), // Use a promise to make sure only one callback is called.
                basicAuthHeader = getBasicAuthHeader(server),
                that = this;

            deferred.promise.then(function(result) {
                successCallback && successCallback(result);
            }).catch(function(error) {
                errorCallback && errorCallback(error);
            });

            if (basicAuthHeader) {
                server = server.replace(getUrlCredentials(server) + '@', '');

                options = options || {};
                options.headers = options.headers || {};
                options.headers[basicAuthHeader.name] = basicAuthHeader.value;
            }

            if (options) {
                fileKey = options.fileKey;
                fileName = options.fileName;
                mimeType = options.mimeType;
                headers = options.headers;
                httpMethod = options.httpMethod || 'POST';

                if (httpMethod.toUpperCase() == "PUT"){
                    httpMethod = 'PUT';
                } else {
                    httpMethod = 'POST';
                }

                if (options.params) {
                    params = options.params;
                } else {
                    params = {};
                }
            }

            // Add fileKey and fileName to the headers.
            headers = headers || {};
            if (!headers['Content-Disposition']) {
                headers['Content-Disposition'] = 'form-data;' + (fileKey ? ' name="' + fileKey + '";' : '') +
                    (fileName ? ' filename="' + fileName + '"' : '')
            }

            // For some reason, adding a Content-Type header with the mimeType makes the request fail (it doesn't detect
            // the token in the params). Don't include this header, and delete it if it's supplied.
            delete headers['Content-Type'];

            // Get the file to upload.
            $mmFS.getFile(filePath).then(function(fileEntry) {
                return $mmFS.getFileObjectFromFileEntry(fileEntry);
            }).then(function(file) {
                // Use XMLHttpRequest instead of $http to support onprogress and abort.
                var xhr = new XMLHttpRequest();
                xhr.open(httpMethod || 'POST', server);
                angular.forEach(headers, function(value, name) {
                    // Filter "unsafe" headers.
                    if (name != 'Connection') {
                        xhr.setRequestHeader(name, value);
                    }
                });

                if (that.onprogress) {
                    xhr.onprogress = that.onprogress;
                }

                that.xhr = xhr;
                that.deferred = deferred;
                this.source = filePath;
                this.target = server;

                xhr.onerror = function() {
                    deferred.reject(new FileTransferError(-1, filePath, server, xhr.status, xhr.statusText));
                };

                xhr.onload = function() {
                    // Finished uploading the file.
                    deferred.resolve({
                        bytesSent: file.size,
                        responseCode: xhr.status,
                        response: xhr.response,
                        objectId: ''
                    });
                };

                // Create a form data to send params and the file.
                var fd = new FormData();
                angular.forEach(params, function(value, name) {
                    fd.append(name, value);
                });
                fd.append('file', file);

                xhr.send(fd);
            }).catch(deferred.reject);
        };

        $window.FileTransfer.prototype.abort = function() {
            if (this.xhr) {
                this.xhr.abort();
                this.deferred.reject(new FileTransferError(FileTransferError.ABORT_ERR, this.source, this.target));
            }
        };
    }

    /**
     * Get the credentials from a URL.
     * This code is extracted from Cordova FileTransfer plugin.
     *
     * @param  {String} urlString The URL to get the credentials from.
     * @return {String}           Retrieved credentials.
     */
    function getUrlCredentials(urlString) {
        var credentialsPattern = /^https?\:\/\/(?:(?:(([^:@\/]*)(?::([^@\/]*))?)?@)?([^:\/?#]*)(?::(\d*))?).*$/,
            credentials = credentialsPattern.exec(urlString);

        return credentials && credentials[1];
    }

    /**
     * Loads HTML API to simulate Cordova APIs. Reserved for core use.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmEmulatorManager#loadHTMLAPI
     * @return {Promise} Promise resolved when the API is loaded.
     * @protected
     */
    self.loadHTMLAPI = function() {

        if ($mmFS.isAvailable()) {
            $log.debug('Stop loading HTML API, it was already loaded or the environment doesn\'t need it.');
            return $q.when();
        }

        var deferred = $q.defer();

        $log.debug('Loading HTML API.');

        // File API.
        $window.requestFileSystem  = $window.requestFileSystem || $window.webkitRequestFileSystem;
        $window.resolveLocalFileSystemURL = $window.resolveLocalFileSystemURL || $window.webkitResolveLocalFileSystemURL;

        $window.LocalFileSystem = {
            PERSISTENT: 1
        };

        emulateCordovaFileTransfer();

        // Cordova ZIP plugin.
        $window.zip = {
            unzip: function(source, destination, callback, progressCallback) {
                // Remove basePath from the source and destination.
                source = source.replace(basePath, '');
                source = source.replace(/%20/g, ' '); // Replace all %20 with spaces.
                destination = destination.replace(basePath, '');
                destination = destination.replace(/%20/g, ' '); // Replace all %20 with spaces.

                $mmFS.readFile(source, $mmFS.FORMATARRAYBUFFER).then(function(data) {
                    var zip = new JSZip(data),
                        promises = [];

                    angular.forEach(zip.files, function(file, name) {
                        var filepath = $mmFS.concatenatePaths(destination, name),
                            type;

                        if (!file.dir) {
                            // It's a file. Get the mimetype and write the file.
                            type = $mmFS.getMimeType($mmFS.getFileExtension(name));
                            promises.push($mmFS.writeFile(filepath, new Blob([file.asArrayBuffer()], {type: type})));
                        } else {
                            // It's a folder, create it if it doesn't exist.
                            promises.push($mmFS.createDir(filepath));
                        }
                    });

                    return $q.all(promises).then(function() {
                        // Success.
                        callback(0);
                    });
                }).catch(function() {
                    // Error.
                    callback(-1);
                });
            }
        };

        if ($mmApp.isDesktop()) {
            var fs = require('fs'),
                app = require('electron').remote.app;

            emulateCordovaFile();

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
})

.config(function($mmInitDelegateProvider, mmInitDelegateMaxAddonPriority) {
    if (!ionic.Platform.isWebView()) {
        $mmInitDelegateProvider.registerProcess('mmEmulator', '$mmEmulatorManager.loadHTMLAPI',
                mmInitDelegateMaxAddonPriority + 500, true);
    }
});
