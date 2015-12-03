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
        $window.FileTransfer = function() {};

        $window.FileTransfer.prototype.download = function(url, filePath, successCallback, errorCallback) {
            $http.get(url, {responseType: 'blob'}).then(function(data) {
                if (!data || !data.data) {
                    errorCallback();
                } else {
                    filePath = filePath.replace(basePath, ''); // Remove basePath from the filePath.
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
                destination = destination.replace(basePath, '');

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
