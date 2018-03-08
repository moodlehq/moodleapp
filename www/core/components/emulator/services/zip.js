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
 * This service handles the emulation of the Cordova Zip plugin in desktop apps and in browser.
 *
 * @ngdoc service
 * @name $mmEmulatorZip
 * @module mm.core.emulator
 */
.factory('$mmEmulatorZip', function($log, $q, $mmFS, $window) {

    $log = $log.getInstance('$mmEmulatorZip');

    var self = {};

    /**
     * Load the emulation of the Cordova plugin.
     * Only support the unzip function, the rest of functions won't be supported for now.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorZip#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        $window.zip = {
            unzip: function(source, destination, callback, progressCallback) {
                // Remove basePath from the source and destination. Also, replace all %20 with spaces.
                var basePath = $mmFS.getBasePathInstant();
                source = source.replace(basePath, '').replace(/%20/g, ' ');
                destination = destination.replace(basePath, '').replace(/%20/g, ' ');

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

        return $q.when();
    };

    return self;
});
