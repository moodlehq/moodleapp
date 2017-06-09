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

.constant('mmDesktopLocalNotificationsStore', 'desktop_local_notifications')

.config(function($mmAppProvider, mmDesktopLocalNotificationsStore) {
    var stores = [
        {
            name: mmDesktopLocalNotificationsStore, // Store to schedule notifications in desktop apps.
            keyPath: 'id',
            indexes: [
                {
                    name: 'triggered'
                }
            ]
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * @ngdoc service
 * @name $mmEmulatorManager
 * @module mm.core
 * @description
 * This service handles the emulation of Cordova plugins in other environments like browser.
 */
.factory('$mmEmulatorManager', function($log, $q, $mmFS, $window, $mmApp, $mmUtil, mmCoreConfigConstants, $cordovaClipboard,
            $cordovaLocalNotification, mmDesktopLocalNotificationsStore, $timeout, $rootScope, $interval,
            mmCoreSecondsYear, mmCoreSecondsDay, mmCoreSecondsHour, mmCoreSecondsMinute) {

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
     * Emulate Cordova clipboard plugin for browser and NodeJS.
     *
     * @return {Void}
     */
    function emulateCordovaClipboard() {
        var isDesktop = $mmApp.isDesktop(),
            clipboard,
            copyTextarea;

        if (isDesktop) {
            clipboard = require('electron').clipboard;
        } else {
            // In browser the text must be selected in order to copy it. Create a hidden textarea to put the text in it.
            copyTextarea = document.createElement('textarea');
            angular.element(copyTextarea).addClass('mm-browser-copy-area');
            copyTextarea.setAttribute('aria-hidden', 'true');
            document.body.append(copyTextarea);
        }

        // We need to redefine $cordovaClipboard methods instead of the core plugin (window.cordova.plugins.clipboard)
        // because creating window.cordova breaks the app (it thinks it's a real device).
        $cordovaClipboard.copy = function(text) {
            var deferred = $q.defer();

            if (isDesktop) {
                clipboard.writeText(text);
                deferred.resolve();
            } else {
                // Put the text in the hidden textarea and select it.
                copyTextarea.innerHTML = text;
                copyTextarea.select();

                try {
                    if (document.execCommand('copy')) {
                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
                } catch (err) {
                    deferred.reject();
                }

                copyTextarea.innerHTML = '';
            }

            return deferred.promise;
        };

        $cordovaClipboard.paste = function() {
            var deferred = $q.defer();

            if (isDesktop) {
                deferred.resolve(clipboard.readText());
            } else {
                // Paste the text in the hidden textarea and get it.
                copyTextarea.innerHTML = '';
                copyTextarea.select();

                try {
                    if (document.execCommand('paste')) {
                        deferred.resolve(copyTextarea.innerHTML);
                    } else {
                        deferred.reject();
                    }
                } catch (err) {
                    deferred.reject();
                }

                copyTextarea.innerHTML = '';
            }

            return deferred.promise;
        };
    }

    /**
     * Emulate Cordova file plugin using NodeJS functions. This is only for NodeJS environments,
     * browser works with the default resolveLocalFileSystemURL.
     *
     * @return {Void}
     */
    function emulateCordovaFile() {
        if (!$mmApp.isDesktop()) {
            return;
        }

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
     * Emulate Cordova Globalization plugin for browser or NodeJS.
     * Only support the functions to get locale, the rest of functions won't be supported for now.
     *
     * @return {Void}
     */
    function emulateCordovaGlobalization() {
        // Create the GlobalizationError object.
        $window.GlobalizationError = function(code, message) {
            this.code = code || null;
            this.message = message || '';
        };

        $window.GlobalizationError.UNKNOWN_ERROR = 0;
        $window.GlobalizationError.FORMATTING_ERROR = 1;
        $window.GlobalizationError.PARSING_ERROR = 2;
        $window.GlobalizationError.PATTERN_ERROR = 3;

        // Create the globalization object and its functions.
        function getLocale() {
            var navLang = navigator.userLanguage || navigator.language;
            try {
                if ($mmApp.isDesktop()) {
                    var locale = require('electron').remote.app.getLocale();
                    return locale || navLang;
                } else {
                    return navLang;
                }
            } catch(ex) {
                // Something went wrong, return browser language.
                return navLang;
            }
        }

        navigator.globalization = {
            getLocaleName: function(successCallback, errorCallback) {
                var locale = getLocale();
                if (locale) {
                    successCallback && successCallback({value: locale});
                } else {
                    var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Cannot get language');
                    errorCallback && errorCallback(error);
                }
            },
            numberToString: function(number, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            isDayLightSavingsTime: function(date, successCallback, errorCallback) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getFirstDayOfWeek: function(successCallback, errorCallback) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getDateNames: function (successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getDatePattern: function(successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getNumberPattern: function(successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getCurrencyPattern: function(currencyCode, successCallback, errorCallback) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            stringToDate: function(dateString, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            stringToNumber: function(numberString, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            dateToString: function(date, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
        };

        navigator.globalization.getPreferredLanguage = navigator.globalization.getLocaleName;
    }

    /**
     * Emulate Cordova ZIP plugin for browser or NodeJS.
     * Only support the unzip function, the rest of functions won't be supported for now.
     *
     * @return {Void}
     */
    function emulateCordovaZip() {
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
                        promises = [],
                        loaded = 0,
                        total = Object.keys(zip.files).length;

                    angular.forEach(zip.files, function(file, name) {
                        var filePath = $mmFS.concatenatePaths(destination, name),
                            type,
                            promise;

                        if (!file.dir) {
                            // It's a file. Get the mimetype and write the file.
                            type = $mmFS.getMimeType($mmFS.getFileExtension(name));
                            promise = $mmFS.writeFile(filePath, new Blob([file.asArrayBuffer()], {type: type}));
                        } else {
                            // It's a folder, create it if it doesn't exist.
                            promise = $mmFS.createDir(filePath);
                        }

                        promises.push(promise.then(function() {
                            // File unzipped, call the progress.
                            loaded++;
                            progressCallback && progressCallback({loaded: loaded, total: total});
                        }));
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
    }

    /**
     * Emulate Custom URL Schemes for NodeJS.
     *
     * @return {Void}
     */
    function emulateCustomURLScheme() {
        if (!$mmApp.isDesktop()) {
            return;
        }

        // Listen for app launched events.
        require('electron').ipcRenderer.on('mmAppLaunched', (event, url) => {
            window.handleOpenURL && window.handleOpenURL(url);
        });
    }

    /**
     * Emulate InAppBrowser for NodeJS.
     *
     * @return {Void}
     */
    function emulateInAppBrowser() {
        if (!$mmApp.isDesktop()) {
            return;
        }

        var BrowserWindow = require('electron').remote.BrowserWindow,
            screen = require('electron').screen;

        // Redefine window open to be able to have full control over the new window.
        $window.open = function(url, frameName, features) {
            var width = 800,
                height = 600,
                display,
                newWindow,
                listeners = {};

            if (screen) {
                display = screen.getPrimaryDisplay();
                if (display && display.workArea) {
                    width = display.workArea.width || width;
                    height = display.workArea.height || height;
                }
            }

            newWindow = new BrowserWindow({
                width: width,
                height: height
            });
            newWindow.loadURL(url);

            // Add the missing functions that InAppBrowser supports but BrowserWindow doesn't.
            newWindow.addEventListener = function(name, callback) {
                var that = this;

                switch (name) {
                    case 'loadstart':
                        that.webContents.addListener('did-start-loading', received);
                        break;

                    case 'loadstop':
                        that.webContents.addListener('did-finish-load', received);
                        break;

                    case 'loaderror':
                        that.webContents.addListener('did-fail-load', received);
                        break;

                    case 'exit':
                        that.addListener('close', received);
                        break;
                }

                // Store the received function instance to be able to remove the listener.
                listeners[callback] = received;

                function received(event) {
                    try {
                        event.url = that.getURL();
                        callback(event);
                    } catch(ex) {}
                }
            };

            newWindow.removeEventListener = function(name, callback) {
                var that = this,
                    listener = listeners[callback];

                switch (name) {
                    case 'loadstart':
                        that.webContents.removeListener('did-start-loading', listener);
                        break;

                    case 'loadstop':
                        that.webContents.removeListener('did-finish-load', listener);
                        break;

                    case 'loaderror':
                        that.webContents.removeListener('did-fail-load', listener);
                        break;

                    case 'exit':
                        that.removeListener('close', listener);
                        break;
                }
            };

            newWindow.executeScript = function(details, callback) {
                var that = this;

                if (details.code) {
                    that.webContents.executeJavaScript(details.code, false, callback);
                } else if (details.file) {
                    $mmFS.readFile(details.file).then(function(code) {
                        that.webContents.executeJavaScript(code, false, callback);
                    }).catch(callback);
                } else {
                    callback('executeScript requires exactly one of code or file to be specified');
                }
            };

            newWindow.insertCSS = function(details, callback) {
                var that = this;

                if (details.code) {
                    that.webContents.insertCSS(details.code);
                    callback();
                } else if (details.file) {
                    $mmFS.readFile(details.file).then(function(code) {
                        that.webContents.insertCSS(code);
                        callback();
                    }).catch(callback);
                } else {
                    callback('insertCSS requires exactly one of code or file to be specified');
                }
            };

            return newWindow;
        };
    }

    /**
     * Emulate local notifications for NodeJS.
     * Some of the code used in here was extracted from the Cordova Local Notification plugin.
     *
     * @return {Promise} Promise resolved when done.
     */
    function emulateLocalNotifications() {
        if (!$mmApp.isDesktop()) {
            return $q.when();
        }

        var scheduled = {},
            triggered = {},
            defaults = {
                text:  '',
                title: '',
                id:    0,
                sound: '',
                data:  undefined,
                every: undefined,
                at:    undefined
            };

        // Redefine $cordovaLocalNotification methods instead of the core plugin (window.cordova.plugins.notification.local)
        // because creating window.cordova breaks the app (it thinks it's a real device).
        $cordovaLocalNotification.schedule = function(notifications, scope, isUpdate) {
            var promises = [];

            notifications = Array.isArray(notifications) ? notifications : [notifications];

            angular.forEach(notifications, function(notification) {
                mergeWithDefaults(notification);
                convertProperties(notification);

                // Cancel current notification if exists.
                $cordovaLocalNotification.cancel(notification.id, null, true);

                // Store the notification in the scheduled list and in the DB.
                scheduled[notification.id] = {
                    notification: notification
                };
                promises.push(storeLocalNotification(notification, false));

                // Schedule the notification.
                var toTrigger = notification.at * 1000 - Date.now();
                scheduled[notification.id].timeout = $timeout(function trigger() {
                    // Trigger the notification.
                    var notifInstance = new Notification(notification.title, {
                        body: notification.text
                    });

                    // Store the notification as triggered. Don't remove it from scheduled, it's how the plugin works.
                    triggered[notification.id] = notification;
                    storeLocalNotification(notification, true);

                    // Launch the trigger event.
                    $rootScope.$broadcast('$cordovaLocalNotification:trigger', notification, 'foreground');

                    // Listen for click events.
                    notifInstance.onclick = function() {
                        $rootScope.$broadcast('$cordovaLocalNotification:click', notification, 'foreground');
                    };

                    if (notification.every && scheduled[notification.id] && !scheduled[notification.id].interval) {
                        var interval = parseInterval(notification.every);
                        if (interval > 0) {
                            scheduled[notification.id].interval = $interval(trigger, interval);
                        }
                    }
                }, toTrigger);

                // Launch the scheduled/update event.
                var eventName = isUpdate ? 'update' : 'schedule';
                $rootScope.$broadcast('$cordovaLocalNotification:' + eventName, notification, 'foreground');
            });

            return $q.when();
        };

        $cordovaLocalNotification.update = function(notifications) {
            // Just schedule them again, since scheduling cancels the existing one.
            return $cordovaLocalNotification.schedule(notifications, null, true);
        };

        $cordovaLocalNotification.clear = function(ids, scope, omitEvent) {
            var promises = [];

            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);

            // Clear the notifications.
            angular.forEach(ids, function(id) {
                // Cancel only the notifications that aren't repeating.
                if (scheduled[id] && scheduled[id].notification && !scheduled[id].notification.every) {
                    promises.push(cancelNotification(id, omitEvent, '$cordovaLocalNotification:clear'));
                }
            });

            return $q.all(promises);
        };

        $cordovaLocalNotification.clearAll = function(scope, omitEvent) {
            var ids = Object.keys(scheduled);
            return $cordovaLocalNotification.clear(ids, scope, omitEvent).then(function() {
                if (!omitEvent) {
                    $rootScope.$broadcast('$cordovaLocalNotification:clearall', 'foreground');
                }
            });
        };

        $cordovaLocalNotification.cancel = function(ids, scope, omitEvent) {
            var promises = [];

            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);

            // Cancel the notifications.
            angular.forEach(ids, function(id) {
                if (scheduled[id]) {
                    promises.push(cancelNotification(id, omitEvent, '$cordovaLocalNotification:cancel'));
                }
            });

            return $q.all(promises);
        };

        $cordovaLocalNotification.cancelAll = function(scope, omitEvent) {
            var ids = Object.keys(scheduled);
            return $cordovaLocalNotification.cancel(ids, scope, omitEvent).then(function() {
                if (!omitEvent) {
                    $rootScope.$broadcast('$cordovaLocalNotification:cancelall', 'foreground');
                }
            });
        };

        $cordovaLocalNotification.isPresent = function(id) {
            return $q.when(!!scheduled[id] || !!triggered[notification.id]);
        };

        $cordovaLocalNotification.isScheduled = function(id) {
            return $q.when(!!scheduled[id]);
        };

        $cordovaLocalNotification.isTriggered = function(id) {
            return $q.when(!!triggered[notification.id]);
        };

        $cordovaLocalNotification.hasPermission = function() {
            return $q.when(true);
        };

        $cordovaLocalNotification.registerPermission = function() {
            return $q.when(true);
        };

        $cordovaLocalNotification.getAllIds = function() {
            return $q.when($mmUtil.mergeArraysWithoutDuplicates(Object.keys(scheduled), Object.keys(triggered)));
        };
        $cordovaLocalNotification.getIds = $cordovaLocalNotification.getAllIds;

        $cordovaLocalNotification.getScheduledIds = function() {
            return $q.when(Object.keys(scheduled));
        };

        $cordovaLocalNotification.getTriggeredIds = function() {
            return $q.when(Object.keys(triggered));
        };

        $cordovaLocalNotification.get = function(ids) {
            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);
            return getNotifications(ids, true, true);
        };

        $cordovaLocalNotification.getAll = function() {
            return getNotifications(null, true, true);
        };

        $cordovaLocalNotification.getScheduled = function(ids) {
            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);
            return getNotifications(ids, true, false);
        };

        $cordovaLocalNotification.getAllScheduled = function() {
            return getNotifications(null, true, false);
        };

        $cordovaLocalNotification.getTriggered = function(ids) {
            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);
            return getNotifications(ids, false, true);
        };

        $cordovaLocalNotification.getAllTriggered = function() {
            return getNotifications(null, false, true);
        };

        $cordovaLocalNotification.getDefaults = function() {
            return defaults;
        };

        $cordovaLocalNotification.setDefaults = function(newDefaults) {
            for (var key in defaults) {
                if (newDefaults.hasOwnProperty(key)) {
                    defaults[key] = newDefaults[key];
                }
            }
        };

        // App is being loaded, re-schedule all the notifications that were scheduled before.
        return getAllLocalNotifications().catch(function() {
            return [];
        }).then(function(notifications) {
            angular.forEach(notifications, function(notification) {
                if (notification.triggered) {
                    // Notification was triggered already, store it in memory but don't schedule it again.
                    delete notification.triggered;
                    scheduled[notification.id] = notification;
                    triggered[notification.id] = notification;
                } else {
                    // Schedule the notification again unless it should have been triggered more than an hour ago.
                    delete notification.triggered;
                    notification.at = notification.at * 1000;
                    if (notification.at - Date.now() > - mmCoreSecondsHour * 1000) {
                        $cordovaLocalNotification.schedule(notification);
                    }
                }
            });
        });

        // Cancel a notification.
        function cancelNotification(id, omitEvent, eventName) {
            var notification = scheduled[id].notification;

            $timeout.cancel(scheduled[id].timeout);
            $interval.cancel(scheduled[id].interval);
            delete scheduled[id];
            delete triggered[id];

            removeLocalNotification(id);

            if (!omitEvent) {
                $rootScope.$broadcast(eventName, notification, 'foreground');
            }
        }

        // Get a set of notifications. If ids isn't specified, return all the notifications.
        function getNotifications(ids, getScheduled, getTriggered) {
            var notifications = [];

            if (getScheduled) {
                angular.forEach(scheduled, function(entry, id) {
                    if (!ids || ids.indexOf(id) != -1) {
                        notifications.push(entry.notification);
                    }
                });
            }

            if (getTriggered) {
                angular.forEach(triggered, function(notification, id) {
                    if ((!getScheduled || !scheduled[id]) && (!ids || ids.indexOf(id) != -1)) {
                        notifications.push(notification);
                    }
                });
            }

            return $q.when(notifications);
        }

        // Merge options with default values.
        function mergeWithDefaults(options) {
            options.at   = getValueFor(options, 'at', 'firstAt', 'date');
            options.text = getValueFor(options, 'text', 'message');
            options.data = getValueFor(options, 'data', 'json');

            if (defaults.hasOwnProperty('autoClear')) {
                options.autoClear = getValueFor(options, 'autoClear', 'autoCancel');
            }

            if (options.autoClear !== true && options.ongoing) {
                options.autoClear = false;
            }

            if (options.at === undefined || options.at === null) {
                options.at = new Date();
            }

            for (var key in defaults) {
                if (options[key] === null || options[key] === undefined) {
                    if (options.hasOwnProperty(key) && ['data','sound'].indexOf(key) > -1) {
                        options[key] = undefined;
                    } else {
                        options[key] = defaults[key];
                    }
                }
            }

            for (key in options) {
                if (!defaults.hasOwnProperty(key)) {
                    delete options[key];
                    console.warn('Unknown property: ' + key);
                }
            }

            return options;
        }

        // First found value for the given keys.
        function getValueFor(options) {
            var keys = Array.apply(null, arguments).slice(1);

            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];

                if (options.hasOwnProperty(key)) {
                    return options[key];
                }
            }
        }

        // Convert the passed values to their required type.
        function convertProperties(options) {
            if (options.id) {
                if (isNaN(options.id)) {
                    options.id = defaults.id;
                    console.warn('Id is not a number: ' + options.id);
                } else {
                    options.id = Number(options.id);
                }
            }

            if (options.title) {
                options.title = options.title.toString();
            }

            if (options.text) {
                options.text  = options.text.toString();
            }

            if (options.badge) {
                if (isNaN(options.badge)) {
                    options.badge = defaults.badge;
                    console.warn('Badge number is not a number: ' + options.id);
                } else {
                    options.badge = Number(options.badge);
                }
            }

            if (options.at) {
                if (typeof options.at == 'object') {
                    options.at = options.at.getTime();
                }

                options.at = Math.round(options.at / 1000);
            }

            if (typeof options.data == 'object') {
                options.data = JSON.stringify(options.data);
            }

            return options;
        }

        // Convert the IDs to numbers.
        function convertIds(ids) {
            var convertedIds = [];

            for (var i = 0; i < ids.length; i++) {
                convertedIds.push(Number(ids[i]));
            }

            return convertedIds;
        }

        // Parse the interval and convert it to a number of milliseconds (0 if not valid).
        function parseInterval(every) {
            var interval;

            every = String(every).toLowerCase();

            if (!every || every == 'undefined') {
                interval = 0;
            } else if (every == 'second') {
                interval = 1000;
            } else if (every == 'minute') {
                interval = mmCoreSecondsMinute * 1000;
            } else if (every == 'hour') {
                interval = mmCoreSecondsHour * 1000;
            } else if (every == 'day') {
                interval = mmCoreSecondsDay * 1000;
            } else if (every == 'week') {
                interval = mmCoreSecondsDay * 7 * 1000;
            } else if (every == 'month') {
                interval = mmCoreSecondsDay * 31 * 1000;
            } else if (every == 'quarter') {
                interval = mmCoreSecondsHour * 2190 * 1000;
            } else if (every == 'year') {
                interval = mmCoreSecondsYear * 1000;
            } else {
                interval = parseInt(every, 10);
                if (isNaN(interval)) {
                    interval = 0;
                } else {
                    interval *= 60000;
                }
            }

            return interval;
        }
    }

    /**
     * Get all the notification stored in local DB.
     *
     * @return {Promise} Promise resolved with the notifications.
     */
    function getAllLocalNotifications() {
        return $mmApp.getDB().getAll(mmDesktopLocalNotificationsStore);
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

        var deferred = $q.defer(),
            promises = [deferred.promise];

        $log.debug('Loading HTML API.');

        // File API.
        $window.requestFileSystem  = $window.requestFileSystem || $window.webkitRequestFileSystem;
        $window.resolveLocalFileSystemURL = $window.resolveLocalFileSystemURL || $window.webkitResolveLocalFileSystemURL;

        $window.LocalFileSystem = {
            PERSISTENT: 1
        };

        emulateCordovaFileTransfer();
        emulateCordovaGlobalization();
        emulateCordovaZip();
        emulateCordovaClipboard();

        if ($mmApp.isDesktop()) {
            var fs = require('fs'),
                app = require('electron').remote.app;

            emulateCordovaFile();
            emulateCustomURLScheme();
            emulateInAppBrowser();
            promises.push(emulateLocalNotifications());

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

        return $q.all(promises);
    };

    /**
     * Remove a notification from local DB.
     *
     * @param  {Number} id ID of the notification.
     * @return {Promise}   Promise resolved when done.
     */
    function removeLocalNotification(id) {
        return $mmApp.getDB().remove(mmDesktopLocalNotificationsStore, id);
    }

    /**
     * Store a notification in local DB.
     *
     * @param  {Object} notification Notification to store.
     * @param  {Boolean} triggered   Whether the notification has been triggered.
     * @return {Promise}             Promise resolved when stored.
     */
    function storeLocalNotification(notification, triggered) {
        notification = angular.copy(notification);
        notification.triggered = !!triggered;
        return $mmApp.getDB().insert(mmDesktopLocalNotificationsStore, notification);
    }

    return self;
})

.config(function($mmInitDelegateProvider, mmInitDelegateMaxAddonPriority) {
    if (!ionic.Platform.isWebView()) {
        $mmInitDelegateProvider.registerProcess('mmEmulator', '$mmEmulatorManager.loadHTMLAPI',
                mmInitDelegateMaxAddonPriority + 500, true);
    }
});
