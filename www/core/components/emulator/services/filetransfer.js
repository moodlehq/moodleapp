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
 * This service handles the emulation of the Cordova FileTransfer plugin in desktop apps and in browser.
 *
 * @ngdoc service
 * @name $mmEmulatorFileTransfer
 * @module mm.core.emulator
 */
.factory('$mmEmulatorFileTransfer', function($log, $q, $mmFS, $window, $mmApp) {

    $log = $log.getInstance('$mmEmulatorFileTransfer');

    var self = {},
        fileTransferIdCounter = 0;

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
                var authHeader = 'Authorization';
                var authHeaderValue = 'Basic ' + window.btoa(credentials);

                header = {
                    name : authHeader,
                    value : authHeaderValue
                };
            }
        }

        return header;
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
     * Load the emulation of the Cordova plugin.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorFileTransfer#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
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
                    var basePath = $mmFS.getBasePathInstant();
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

        return $q.when();
    };

    return self;
});
