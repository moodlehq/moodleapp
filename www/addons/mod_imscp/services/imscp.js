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
.factory('$mmaModImscp', function($mmFilepool, $mmSite, $mmFS, $log, $q, $sce, $mmApp, $mmSitesManager, mmaModImscpComponent) {
    $log = $log.getInstance('$mmaModImscp');

    var self = {},
        currentDirPath; // Directory path of the current IMSCP.

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
        if (!contents || !contents.length) {
            return [];
        }
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
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);

        return $mmFilepool.getPackageDirPathByUrl($mmSite.getId(), module.url).then(function(dirPath) {
            return $mmFilepool.downloadPackage($mmSite.getId(), files, mmaModImscpComponent, module.id, revision, timemod, dirPath);
        });
    };

    /**
     * Returns a list of files that can be downloaded.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getDownloadableFiles
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
        var toc = self.getToc(module.contents),
            mainFilePath;
        if (!toc.length) {
            return $q.reject();
        }
        mainFilePath = toc[0].href;

        return $mmFilepool.getPackageDirUrlByUrl($mmSite.getId(), module.url).then(function(dirPath) {
            currentDirPath = dirPath;
            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return $sce.trustAsResourceUrl($mmFS.concatenatePaths(dirPath, mainFilePath));
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
            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return $sce.trustAsResourceUrl($mmFS.concatenatePaths(currentDirPath, itemId));
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
     * Return whether or not the plugin is enabled in a certain site.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var version = site.getInfo().version;
            // Require Moodle 2.9.
            return version && (parseInt(version) >= 2015051100) && site.canDownloadFiles();
        });
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
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);

        return $mmFilepool.getPackageDirPathByUrl($mmSite.getId(), module.url).then(function(dirPath) {
            return $mmFilepool.prefetchPackage($mmSite.getId(), files, mmaModImscpComponent, module.id, revision, timemod, dirPath);
        });
    };

    return self;
});
