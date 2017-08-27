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
.factory('$mmaModImscp', function($mmFilepool, $mmSite, $mmFS, $log, $q, $sce, $mmApp, $mmSitesManager, $mmUtil, $mmCourse,
            mmaModImscpComponent) {
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
        var position = getItemPosition(items, itemId);
        if (position != -1) {
            for (var i = position - 1; i >= 0; i--) {
                if (items[i] && items[i].href) {
                    return items[i].href;
                }
            }
        }

        return '';
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
        var position = getItemPosition(items, itemId);
        if (position != -1) {
            for (var i = position + 1, len = items.length; i < len; i++) {
                if (items[i] && items[i].href) {
                    return items[i].href;
                }
            }
        }

        return '';
    };

    /**
     * Get the position of a item.
     *
     * @param  {Object[]} items The items list.
     * @param  {String} itemId  The item to search
     * @return {Number}         The item position.
     */
    function getItemPosition(items, itemId) {
        for (var i = 0, len = items.length; i < len; i++) {
            if (items[i].href == itemId) {
                return i;
            }
        }
        return -1;
    }

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
     * Get cache key for imscp data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getImscpDataCacheKey(courseId) {
        return 'mmaModImscp:imscp:' + courseId;
    }

    /**
     * Get a imscp with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String} siteId    Site ID.
     * @param  {Number} courseId  Course ID.
     * @param  {String} key       Name of the property to check.
     * @param  {Mixed}  value     Value to search.
     * @return {Promise}          Promise resolved when the imscp is retrieved.
     */
    function getImscp(siteId, courseId, key, value) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getImscpDataCacheKey(courseId)
                };

            return site.read('mod_imscp_get_imscps_by_courses', params, preSets).then(function(response) {
                if (response && response.imscps) {
                    var currentImscp;
                    angular.forEach(response.imscps, function(imscp) {
                        if (!currentImscp && imscp[key] == value) {
                            currentImscp = imscp;
                        }
                    });
                    if (currentImscp) {
                        return currentImscp;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a imscp by course module ID.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#getImscp
     * @param {Number} courseId Course ID.
     * @param {Number} cmId     Course module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the imscp is retrieved.
     */
    self.getImscp = function(courseId, cmId, siteId) {
        siteId = siteId || $mmSite.getId();
        return getImscp(siteId, courseId, 'coursemodule', cmId);
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
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [];

        promises.push(self.invalidateImscpData(courseId, siteId));
        promises.push($mmFilepool.invalidateFilesByComponent(siteId, mmaModImscpComponent, moduleId));
        promises.push($mmCourse.invalidateModule(moduleId, siteId));

        return $mmUtil.allPromises(promises);
    };


    /**
     * Invalidates imscp data.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#invalidateImscpData
     * @param {Number} courseId Course ID.
     * @param {String} siteId]  Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateImscpData = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getImscpDataCacheKey(courseId));
        });
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

    return self;
});
