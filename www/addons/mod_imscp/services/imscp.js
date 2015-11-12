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

angular.module('mm.addons.mod_imscp')

/**
 * IMSCP factory.
 *
 * @module mm.addons.mod_imscp
 * @ngdoc service
 * @name $mmaModImscp
 */
.factory('$mmaModImscp', function($mmFilepool, $mmSite, $mmFS, $log, $q, $sce, $mmApp, $mmCourse, mmaModImscpComponent,
            mmCoreDownloading, mmCoreDownloaded) {
    $log = $log.getInstance('$mmaModImscp');

    var self = {},
        currentDirPath, // Directory path of the current IMSCP.
        downloadPromises = {}; // To handle downloads.

    /**
     * Downloads or prefetches all the content.
     *
     * @param {Object} module    The module object.
     * @param {Boolean} prefetch True if prefetching, false otherwise.
     * @return {Promise}         Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    function downloadOrPrefetch(module, prefetch) {

        var siteid = $mmSite.getId();
        if (downloadPromises[siteid] && downloadPromises[siteid][module.id]) {
            // There's already a download ongoing for this module, return the promise.
            return downloadPromises[siteid][module.id];
        } else if (!downloadPromises[siteid]) {
            downloadPromises[siteid] = {};
        }

        var revision = $mmCourse.getRevisionFromContents(module.contents),
            timemod = $mmCourse.getTimemodifiedFromContents(module.contents),
            dwnPromise,
            deleted = false;

        // Get path of the module folder in filepool.
        dwnPromise = $mmFilepool.getFilePathByUrl(siteid, module.url).then(function(dirPath) {
            // Set module as downloading.
            return $mmCourse.storeModuleStatus(siteid, module.id, mmCoreDownloading, revision, timemod).then(function() {

                var promises = [];
                angular.forEach(module.contents, function(content) {
                    var fullpath = content.filename,
                        url = content.fileurl,
                        modified = content.timemodified;

                    if (!self.isFileDownloadable(content)) {
                        return;
                    }

                    if (content.filepath !== '/') {
                        fullpath = content.filepath.substr(1) + fullpath;
                    }
                    fullpath = $mmFS.concatenatePaths(dirPath, fullpath);

                    if (prefetch) {
                        promises.push($mmFilepool.addToQueueByUrl(siteid, url, mmaModImscpComponent,
                                        module.id, modified, fullpath));
                    } else {
                        promises.push($mmFilepool.downloadUrl(siteid, url, false, mmaModImscpComponent,
                                        module.id, modified, fullpath));
                    }
                });

                 return $q.all(promises).then(function() {
                    // Success prefetching, store module as downloaded.
                    return $mmCourse.storeModuleStatus(siteid, module.id, mmCoreDownloaded, revision, timemod);
                }).catch(function() {
                    // Error downloading, go back to previous status and reject the promise.
                    return $mmCourse.setModulePreviousStatus(siteid, module.id).then(function() {
                        return $q.reject();
                    });
                });
            });
        }).finally(function() {
            // Download finished, delete the promise.
            delete downloadPromises[siteid][module.id];
            deleted = true;
        });

        if (!deleted) { // In case promise was finished immediately.
            downloadPromises[siteid][module.id] = dwnPromise;
        }
        return dwnPromise;
    }

    /**
     * Get a download promise. If the promise is not set, return undefined.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getDownloadPromise
     * @param  {String} siteId   Site ID.
     * @param  {Number} moduleId Module ID.
     * @return {Promise}         Download promise or undefined.
     */
    self.getDownloadPromise = function(siteId, moduleId) {
        if (downloadPromises[siteId] && downloadPromises[siteId][moduleId]) {
            return downloadPromises[siteId][moduleId];
        }
    };

    /**
     * Get the IMSCP toc as an array.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getToc
     * @param  {array} contents The module contents.
     * @return {Array}          The toc.
     * @protected
     */
    self.getToc = function(contents) {
        return JSON.parse(contents[0].content);
    };

    /**
     * Get the imscp toc as an array of items (no nested) to build the navigation tree.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#createItemList
     * @param  {array} contents The module contents.
     * @return {Array}          The toc as a list.
     * @protected
     */
    self.createItemList = function(contents) {
        var items = [];
        var toc = self.getToc(contents);
        angular.forEach(toc, function(el) {
            items.push({href: el.href, title: el.title, level: el.level});
            angular.forEach(el.subitems, function(sel) {
                items.push({href: sel.href, title: sel.title, level: sel.level});
            });
        });
        return items;
    };

    /**
     * Get the previous item to the given one.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getPreviousItem
     * @param  {array} items     The items list.
     * @param  {String} itemId   The current item.
     * @return {String}          The previous item id.
     * @protected
     */
    self.getPreviousItem = function(items, itemId) {
        var previous = '';

        for (var i = 0, len = items.length; i < len; i++) {
            if (items[i].href == itemId) {
                break;
            }
            previous = items[i].href;
        }

        return previous;
    };

    /**
     * Get the next item to the given one.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getNextItem
     * @param  {array} items     The items list.
     * @param  {String} itemId   The current item.
     * @return {String}           The next item id.
     * @protected
     */
    self.getNextItem = function(items, itemId) {
        var next = '';

        for (var i = 0, len = items.length; i < len; i++) {
            if (items[i].href == itemId) {
                if (typeof items[i + 1] != 'undefined') {
                    next = items[i + 1].href;
                    break;
                }
            }
        }
        return next;
    };


    /**
     * Check if we should ommit the file download.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#checkSpecialFiles
     * @param {String} fileName The file name
     * @return {Boolean}        True if we should ommit the file
     * @protected
     */
    self.checkSpecialFiles = function(fileName) {
        return fileName == 'imsmanifest.xml';
    };

    /**
     * Download all the content. All the files are downloaded inside a folder in filepool, keeping their folder structure.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#downloadAllContent
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved when content is downloaded. Data returned is not reliable.
     */
    self.downloadAllContent = function(module) {
        return downloadOrPrefetch(module, false);
    };

    /**
     * Get event names of files being downloaded.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getDownloadingFilesEventNames
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
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getFileEventNames
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
     * Given a filepath, get a certain fileurl from module contents.
     *
     * @param {Object[]} contents     Module contents.
     * @param {String} targetFilepath Filepath of the searched file.
     * @return {String}               Fileurl.
     * @protected
     */
    self._getFileUrlFromContents = function(contents, targetFilepath) {
        var indexUrl;
        angular.forEach(contents, function(content) {
            if (content.type == 'file' && !indexUrl) {
                var filepath = $mmFS.concatenatePaths(content.filepath, content.filename),
                    filepathalt = filepath.charAt(0) === '/' ? filepath.substr(1) : '/' + filepath;
                // Check if it's main file.
                if (filepath === targetFilepath || filepathalt === targetFilepath) {
                    indexUrl = content.fileurl;
                }
            }
        });
        return indexUrl;
    };

    /**
     * Download all the files needed and returns the src of the iframe.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getIframeSrc
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved with the iframe src.
     */
    self.getIframeSrc = function(module) {
        var toc = self.getToc(module.contents);
        var mainFilePath = toc[0].href;

        return $mmFilepool.getDirectoryUrlByUrl($mmSite.getId(), module.url).then(function(dirPath) {
            currentDirPath = dirPath;
            return $mmFS.concatenatePaths(dirPath, mainFilePath);
        }, function() {
            // Error getting directory, there was an error downloading or we're in browser. Return online URL if connected.
            if ($mmApp.isOnline()) {
                var indexUrl = self._getFileUrlFromContents(module.contents, mainFilePath);
                if (indexUrl) {
                    // This URL is going to be injected in an iframe, we need this to make it work.
                    return $sce.trustAsResourceUrl($mmSite.fixPluginfileURL(indexUrl));
                }
            }
            return $q.reject();
        });
    };

    /**
     * Get src of a imscp item.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getFileSrc
     * @param {Object} module    The module object.
     * @param {String} itemId    Item to get the src.
     * @return {String}          Item src.
     */
    self.getFileSrc = function(module, itemId) {
        if (currentDirPath) {
            // IMSCP successfully loaded.
            return $mmFS.concatenatePaths(currentDirPath, itemId);
        } else {
            // Error loading IMSCP. Let's get online URL.
            if ($mmApp.isOnline()) {
                var indexUrl = self._getFileUrlFromContents(module.contents, itemId);
                if (indexUrl) {
                    // This URL is going to be injected in an iframe, we need this to make it work.
                    return $sce.trustAsResourceUrl($mmSite.fixPluginfileURL(indexUrl));
                }
            }
        }
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#invalidateContent
     * @param {Number} moduleId The module ID.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId) {
        return $mmFilepool.invalidateFilesByComponent($mmSite.getId(), mmaModImscpComponent, moduleId);
    };

    /**
     * Check if a file is downloadable. The file param must have 'type' and 'filename' attributes
     * like in core_course_get_contents response.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#isFileDownloadable
     * @param {Object} file File to check.
     * @return {Boolean}    True if downloadable, false otherwise.
     */
    self.isFileDownloadable = function(file) {
        return file.type === 'file' && !self.checkSpecialFiles(file.filename);
    };

    /**
     * Return whether or not the plugin is enabled.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        var version = $mmSite.getInfo().version;
        // Require Moodle 2.9.
        return version && (parseInt(version) >= 2015051100) && $mmSite.canDownloadFiles();
    };

    /**
     * Report a IMSCP as being viewed.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                imscpid: id
            };
            return $mmSite.write('mod_imscp_view_imscp', params);
        }
        return $q.reject();
    };

    /**
     * Prefetch the content. All the files are downloaded inside a folder in filepool, keeping their folder structure.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#prefetchContent
     * @param {Object} module The module object returned by WS.
     * @return {Promise}      Promise resolved when content is downloaded. Data returned is not reliable.
     */
    self.prefetchContent = function(module) {
        return downloadOrPrefetch(module, true);
    };

    return self;
});
