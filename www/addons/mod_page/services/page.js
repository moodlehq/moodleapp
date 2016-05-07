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
.factory('$mmaModPage', function($mmFilepool, $mmSite, $mmFS, $http, $log, $q, $mmSitesManager, $mmUtil, mmaModPageComponent) {
    $log = $log.getInstance('$mmaModPage');

    var self = {};

    /**
     * Download all the content.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#downloadAllContent
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    self.downloadAllContent = function(module) {
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);
        return $mmFilepool.downloadPackage($mmSite.getId(), files, mmaModPageComponent, module.id, revision, timemod);
    };

    /**
     * Returns a list of files that can be downloaded.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#getDownloadableFiles
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
     * Get event names of files being downloaded.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#getDownloadingFilesEventNames
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Resolved with an array of event names.
     */
    self.getDownloadingFilesEventNames = function(module) {
        var promises = [],
            eventNames = [],
            siteid = $mmSite.getId();

        angular.forEach(module.contents, function(content) {
            var url = content.fileurl;
            if (!self.isFileDownloadable(content)) {
                return;
            }
            promises.push($mmFilepool.isFileDownloadingByUrl(siteid, url).then(function() {
                return $mmFilepool.getFileEventNameByUrl(siteid, url).then(function(eventName) {
                    eventNames.push(eventName);
                });
            }, function() {
                // Ignore fails.
            }));
        });

        return $q.all(promises).then(function() {
            return eventNames;
        });
    };

    /**
     * Returns a list of file event names.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#getFileEventNames
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Promise resolved with array of $mmEvent names.
     */
    self.getFileEventNames = function(module) {
        var promises = [];
        angular.forEach(module.contents, function(content) {
            var url = content.fileurl;
            if (!self.isFileDownloadable(content)) {
                return;
            }
            promises.push($mmFilepool.getFileEventNameByUrl($mmSite.getId(), url));
        });
        return $q.all(promises).then(function(eventNames) {
            return eventNames;
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
        var indexUrl,
            paths = {},
            promise;

        // Extract the information about paths from the module contents.
        angular.forEach(contents, function(content) {
            var key,
                url = content.fileurl;

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
                return $q.when($mmSite.fixPluginfileURL(indexUrl));
            }
        })();

        return promise.then(function(url) {
            // Fetch the URL content.
            return $http.get(url).then(function(response) {
                if (typeof response.data !== 'string') {
                    return $q.reject();
                } else {
                    // Now that we have the content, we update the SRC to point back to
                    // the external resource. That will b caught by mm-format-text.
                    return $mmUtil.restoreSourcesInHtml(response.data, paths);
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
     * Check if a file is downloadable. The file param must have a 'type' attribute like in core_course_get_contents response.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#isFileDownloadable
     * @param {Object} file File to check.
     * @return {Boolean}    True if downloadable, false otherwise.
     */
    self.isFileDownloadable = function(file) {
        return file.type === 'file';
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
     * Check if page plugin is enabled in a certain site.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.canDownloadFiles();
        });
    };

    /**
     * Report a page as being viewed.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                pageid: id
            };
            return $mmSite.write('mod_page_view_page', params);
        }
        return $q.reject();
    };

    /**
     * Prefetch the content.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPage#prefetchContent
     * @param {Object} module The module object returned by WS.
     * @return {Promise}      Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetchContent = function(module) {
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);
        return $mmFilepool.prefetchPackage($mmSite.getId(), files, mmaModPageComponent, module.id, revision, timemod);
    };

    return self;
});
