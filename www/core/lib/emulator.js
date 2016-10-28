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
 * @name $xhrFactory
 * @module mm.core
 * @description 
 * XHR Factory to enable progress events on HTTP requests.
 * This can be removed when Angular is updated to 1.5.4 or higher where the onProgress is exposed through the $http service.
 */
.decorator('$xhrFactory', ['$delegate', '$injector', function($delegate, $injector) {
        return function(method, url) {
            var xhr = $delegate(method, url);
            var $http = $injector.get('$http');
            var callConfig = $http.pendingRequests[$http.pendingRequests.length - 1];
            if (angular.isFunction(callConfig.onProgress)) {
                xhr.addEventListener('progress', callConfig.onProgress);
            }
            return xhr;
        };
    }
])

/**
 * @ngdoc service
 * @name $mmEmulatorManager
 * @module mm.core
 * @description
 * This service handles the emulation of Cordova plugins in other environments like browser.
 */
.factory('$mmEmulatorManager', function($log, $q, $http, $mmFS, $window) {

    $log = $log.getInstance('$mmEmulatorManager');

    var self = {};

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
            basePath;

        $log.debug('Loading HTML API.');

        // File API.
        $window.requestFileSystem  = $window.requestFileSystem || $window.webkitRequestFileSystem;
        $window.resolveLocalFileSystemURL = $window.resolveLocalFileSystemURL || $window.webkitResolveLocalFileSystemURL;

        $window.LocalFileSystem = {
            PERSISTENT: 1
        };

        // FileTransfer API.
        $window.FileTransfer = function() {
            this.onprogress = null;
        };

        $window.FileTransfer.prototype.download = function(url, filePath, successCallback, errorCallback) {
            var progressCallback = this.onprogress;
            $http({method: 'GET', url: url, options: {responseType: 'blob'}, onProgress: progressCallback}).then(function(data) {
                if (!data || !data.data) {
                    errorCallback();
                } else {
                    filePath = filePath.replace(basePath, ''); // Remove basePath from the filePath.
                    filePath = filePath.replace(/%20/g, ' '); // Replace all %20 with spaces.
                    $mmFS.writeFile(filePath, data.data).then(function(e) {
                        successCallback(e);
                    }).catch(function(error) {
                        errorCallback(error);
                    });
                }
            }).catch(function(error) {
                errorCallback(error);
            });
        };

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

        // @todo: Implement FileTransfer.upload.

        // Request 500MB.
        $window.webkitStorageInfo.requestQuota(PERSISTENT, 500 * 1024 * 1024, function(granted) {
            $window.requestFileSystem(PERSISTENT, granted, function(entry) {
                basePath = entry.root.toURL();
                $mmFS.setHTMLBasePath(basePath);
                deferred.resolve();
            }, deferred.reject);
        }, deferred.reject);

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
