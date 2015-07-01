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

angular.module('mm.addons.mod_page')

/**
 * Page factory.
 *
 * @module mm.addons.mod_page
 * @ngdoc service
 * @name $mmaModPage
 */
.factory('$mmaModPage', function($mmFilepool, $mmSite, $mmFS, $http, $log, $q, mmaModPageComponent) {
    $log = $log.getInstance('$mmaModPage');
    var self = {};

    /**
     * Fixes the URL before use.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#_fixUrl
     * @param  {String} url The URL to be fixed.
     * @return {String}     The fixed URL.
     * @protected
     */
    self._fixUrl = function(url) {
        url = $mmSite.fixPluginfileURL(url);
        return url;
    };

    /**
     * Returns a list of file event names.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#getFileEventNames
     * @param {Object} module The module object returned by WS.
     * @return {String[]} Array of $mmEvent names.
     */
    self.getFileEventNames = function(module) {
        var eventNames = [];
        angular.forEach(module.contents, function(content) {
            var url;
            if (content.type !== 'file') {
                return;
            }
            url = self._fixUrl(content.fileurl);
            eventNames.push($mmFilepool.getFileEventNameByUrl($mmSite.getId(), url));
        });
        return eventNames;
    };

    /**
     * Check the status of the files.
     *
     * Return those status in order of priority:
     * - $mmFilepool.FILENOTDOWNLOADED
     * - $mmFilepool.FILEDOWNLOADING
     * - $mmFilepool.FILEOUTDATED
     * - $mmFilepool.FILEDOWNLOADED
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#getFilesStatus
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Resolved with an object containing the status and a list of event to observe.
     */
    self.getFilesStatus = function(module) {
        var promises = [],
            eventNames = [],
            notDownloaded = 0,
            downloading = 0,
            outdated = 0,
            downloaded = 0,
            fileCount = 0;

        angular.forEach(module.contents, function(content) {
            var url;
            if (content.type !== 'file') {
                return;
            }
            fileCount++;
            url = self._fixUrl(content.fileurl);
            promises.push($mmFilepool.getFileStateByUrl($mmSite.getId(), url).then(function(state) {
                if (state == $mmFilepool.FILENOTDOWNLOADED) {
                    notDownloaded++;
                } else if (state == $mmFilepool.FILEDOWNLOADING) {
                    downloading++;
                    eventNames.push($mmFilepool.getFileEventNameByUrl($mmSite.getId(), url));
                } else if (state == $mmFilepool.FILEDOWNLOADED) {
                    downloaded++;
                } else if (state == $mmFilepool.FILEOUTDATED) {
                    outdated++;
                }
            }));
        });

        function prepareResult() {
            var status = $mmFilepool.FILENOTDOWNLOADED;
            if (notDownloaded > 0) {
                status = $mmFilepool.FILENOTDOWNLOADED;
            } else if (downloading > 0) {
                status = $mmFilepool.FILEDOWNLOADING;
            } else if (outdated > 0) {
                status = $mmFilepool.FILEOUTDATED;
            } else if (downloaded == fileCount) {
                status = $mmFilepool.FILEDOWNLOADED;
            }
            return {status: status, eventNames: eventNames};
        }

        return $q.all(promises).then(function() {
            return prepareResult();
        }, function() {
            return prepareResult();
        });
    };

    /**
     * Gets the page HTML.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#getPageHtml
     * @param {Object} contents The module contents.
     * @param {Object} moduleId The module ID.
     * @return {Promise}
     */
    self.getPageHtml = function(contents, moduleId) {
        var deferred = $q.defer(),
            indexUrl,
            paths = {},
            promise;

        // Extract the information about paths from the module contents.
        angular.forEach(contents, function(content) {
            var key,
                url = self._fixUrl(content.fileurl);

            if (self._isMainPage(content)) {
                // This seems to be the most reliable way to spot the index page.
                indexUrl = url;
            } else {
                key = content.filename;
                if (content.filepath !== '/') {
                    // Add the folders without the leading slash.
                    key = content.filepath.substr(1) + key;
                }
                paths[key] = url;
            }
        });

        // Promise handling when we are in a browser.
        promise = (function() {
            var deferred;
            if (!indexUrl) {
                // If ever that happens.
                $log.debug('Could not locate the index page');
                return $q.reject();
            } else if ($mmFS.isAvailable()) {
                // The file system is available.
                return $mmFilepool.downloadUrl($mmSite.getId(), indexUrl, false, mmaModPageComponent, moduleId);
            } else {
                // We return the live URL.
                deferred = $q.defer();
                deferred.resolve(indexUrl);
                return deferred.promise;
            }
        })();

        return promise.then(function(url) {
            // Fetch the URL content.
            return $http.get(url).then(function(response) {
                if (typeof response.data !== 'string') {
                    return $q.reject();
                } else {
                    // Now that we have the content, we update the SRC to point back to
                    // the external resource. That will be caught by mm-format-text.
                    var html = angular.element('<div>');
                    html.html(response.data);
                    angular.forEach(html.find('img'), function(img) {
                        var src = paths[decodeURIComponent(img.getAttribute('src'))];
                        if (typeof src !== 'undefined') {
                            img.setAttribute('src', src);
                        }
                    });
                    // We do the same for links.
                    angular.forEach(html.find('a'), function(anchor) {
                        var href = paths[decodeURIComponent(anchor.getAttribute('href'))];
                        if (typeof href !== 'undefined') {
                            anchor.setAttribute('href', href);
                        }
                    });
                    return html.html();
                }
            });
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#invalidateContent
     * @param {Object} moduleId The module ID.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId) {
        return $mmFilepool.invalidateFilesByComponent($mmSite.getId(), mmaModPageComponent, moduleId);
    };

    /**
     * Returns whether the file is the main page of the module.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#_isMainPage
     * @param {Object} file An object returned from WS containing file info.
     * @return {Boolean}
     * @protected
     */
    self._isMainPage = function(file) {
        var filename = file.filename || undefined,
            fileurl = file.fileurl || '',
            url = '/mod_page/content/index.html',
            encodedUrl = encodeURIComponent(url);

        return (filename === 'index.html' && (fileurl.indexOf(url) > 0 || fileurl.indexOf(encodedUrl) > 0 ));
    };

    /**
     * Prefetch the content.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#prefetchContent
     * @param {Object} module The module object returned by WS.
     * @return {Void}
     */
    self.prefetchContent = function(module) {
        angular.forEach(module.contents, function(content) {
            var url;
            if (content.type !== 'file') {
                return;
            }
            url = self._fixUrl(content.fileurl);
            $mmFilepool.addToQueueByUrl($mmSite.getId(), url, mmaModPageComponent, module.id);
        });
    };

    return self;
});
