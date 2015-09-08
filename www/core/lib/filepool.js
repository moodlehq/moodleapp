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

.constant('mmFilepoolQueueProcessInterval', 300)
.constant('mmFilepoolFolder', 'filepool')
.constant('mmFilepoolStore', 'filepool')
.constant('mmFilepoolQueueStore', 'files_queue')
.constant('mmFilepoolLinksStore', 'files_links')

.config(function($mmAppProvider, $mmSitesFactoryProvider, mmFilepoolStore, mmFilepoolLinksStore, mmFilepoolQueueStore) {
    var siteStores = [
        {
            // File store.
            //
            // Each entry should contain:
            // - fileId: A hash of the file info.
            // - url: URL to download the file.
            // - modified: The time at which the file was last downloaded.
            // - stale: When true, it means that the file should be redownloaded.
            // - etag: Store the ETAG code of the file.
            name: mmFilepoolStore,
            keyPath: 'fileId',
            indexes: []
        },
        {
            // Associations between files and components.
            //
            // Each entry should contain:
            // - fileId: Hash used in the file store.
            // - component: The component name (e.g. mmaModPage).
            // - componentId: An ID that can be used by the component. -1 when not provided.
            name: mmFilepoolLinksStore,
            keyPath: ['fileId', 'component', 'componentId'],
            indexes: [
                {
                    name: 'fileId',
                },
                {
                    name: 'component',
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'componentAndId',
                    generator: function(obj) {
                        return [obj.component, obj.componentId];
                    }
                }
            ]
        },
    ];
    var appStores = [
        {
            // Files queue.
            //
            // Each entry should contain:
            // - siteId: The site ID.
            // - fileId: A hash of the file info.
            // - url: URL to download the file.
            // - added: Timestamp (in milliseconds) at which the file was added to the queue.
            // - priority: Indicates which files should be treated first. Maximum value is 999.
            // - links: Array of objects containing component and ID to create links once the file has been processed.
            name: mmFilepoolQueueStore,
            keyPath: ['siteId', 'fileId'],
            indexes: [
                {
                    name: 'siteId',
                },
                {
                    name: 'sortorder',
                    generator: function(obj) {
                        // Creates an index to sort the queue items by priority, sort is ascending.
                        // The oldest are considered to be the most important ones.
                        // The additional priority argument allows to bump any queue item on top of the queue.
                        // The index will look as follow:
                        //    [999 - priority] + "-" + timestamp
                        //    "999-1431491086913": item without priority.
                        //    "900-1431491086913": item with priority of 99.
                        //    "000-1431491086913": item with max priority.

                        var sortorder = parseInt(obj.added, 10),
                            priority = 999 - Math.max(0, Math.min(parseInt(obj.priority || 0, 10), 999)),
                            padding = "000";

                        // Convert to strings.
                        sortorder = "" + sortorder;
                        priority = "" + priority;

                        // Final format.
                        priority = padding.substring(0, padding.length - priority.length) + priority;
                        sortorder = priority + '-' + sortorder;

                        return sortorder;
                    }
                }
            ]
        }
    ];
    $mmAppProvider.registerStores(appStores);
    $mmSitesFactoryProvider.registerStores(siteStores);
})

/**
 * Factory for handling the files in the pool.
 *
 * @module mm.core
 * @ngdoc factory
 * @name $mmFilepool
 * @todo Use transactions (e.g. when querying, then updating)
 * @todo Setting files as stale after a certain time
 * @todo Use ETAGs
 * @todo Do not download on limited network
 * @description
 *
 * This factory is responsible for handling external content.
 *
 * It will always try to get a file from the filepool and return it, when the file is not
 * found it will be added to a queue to be downloaded later. The two main goals of this
 * is to keep the content available offline, and improve the user experience by caching
 * the content locally.
 *
 * The filepool has a very limited understanding of pluginfiles, you should always call
 * {@link $mmUtil#fixPluginfileURL} prior to passing the URL. The reason for this is to
 * allow for any type of URL to be handled here. We can download and cache content
 * that is not served by Moodle. The only little handling of pluginfile is located in
 * {@link $mmFilepool#_getFileIdByUrl}.
 */
.factory('$mmFilepool', function($q, $log, $timeout, $mmApp, $mmFS, $mmWS, $mmSitesManager, $mmEvents, md5, mmFilepoolStore,
        mmFilepoolLinksStore, mmFilepoolQueueStore, mmFilepoolFolder, mmFilepoolQueueProcessInterval, mmCoreEventQueueEmpty) {

    $log = $log.getInstance('$mmFilepool');

    var self = {},
        extensionRegex = new RegExp('^[a-z0-9]+$'),
        tokenRegex = new RegExp('(\\?|&)token=([A-Za-z0-9]+)'),
        queueState,
        urlAttributes = [
            tokenRegex,
            new RegExp('(\\?|&)forcedownload=[0-1]')
        ],
        revisionRegex = new RegExp('/content/([0-9]+)/');

    // Queue status codes.
    var QUEUE_RUNNING = 'mmFilepool:QUEUE_RUNNING',
        QUEUE_PAUSED = 'mmFilepool:QUEUE_PAUSED';

    // Error codes.
    var ERR_QUEUE_IS_EMPTY = 'mmFilepoolError:ERR_QUEUE_IS_EMPTY',
        ERR_FS_OR_NETWORK_UNAVAILABLE = 'mmFilepoolError:ERR_FS_OR_NETWORK_UNAVAILABLE',
        ERR_QUEUE_ON_PAUSE = 'mmFilepoolError:ERR_QUEUE_ON_PAUSE';

    // File states and events.
    self.FILEDOWNLOADED = 'downloaded';
    self.FILEDOWNLOADING = 'downloading';
    self.FILENOTDOWNLOADED = 'notdownloaded';
    self.FILEOUTDATED = 'outdated';

    /**
     * Convenient site DB getter.
     */
    function getSiteDb(siteId) {
        return $mmSitesManager.getSiteDb(siteId);
    }

    /**
     * Link a file with a component.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_addFileLink
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to silently ignore failures.
     * @protected
     */
    self._addFileLink = function(siteId, fileId, component, componentId) {
        componentId = self._fixComponentId(componentId);
        return getSiteDb(siteId).then(function(db) {
            return db.insert(mmFilepoolLinksStore, {
                fileId: fileId,
                component: component,
                componentId: componentId
            });
        });
    };

    /**
     * Link a file with a component by URL.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#addFileLinkByUrl
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The file Url.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to silently ignore failures.
     * @description
     * Use this method to create a link between a URL and a component. You usually do not need to call
     * this manually as adding a file to queue allows you to do so. Note that this method
     * does not check if the file exists in the pool, so you probably want to use is after
     * a successful {@link $mmFilepool#downloadUrl}.
     */
    self.addFileLinkByUrl = function(siteId, fileUrl, component, componentId) {
        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            var fileId = self._getFileIdByUrl(fileUrl);
            return self._addFileLink(siteId, fileId, component, componentId);
        });
    };

    /**
     * Link a file with a component.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_addFileLinks
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @param {Object[]} links Array of objects containing the link component and optionally componentId.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to silently ignore failures.
     * @protected
     */
    self._addFileLinks = function(siteId, fileId, links) {
        var promises = [];
        angular.forEach(links, function(link) {
            promises.push(self._addFileLink(siteId, fileId, link.component, link.componentId));
        });
        return $q.all(promises);
    };

    /**
     * Add a file to the pool.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_addFileToPool
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @param {Object} data Additional information to store about the file (timemodified, url, ...). See mmFilepoolStore schema.
     * @return {Promise}
     * @protected
     * @description
     * Note that this method will override any existing entry with the same key.
     * That is the only way to update an entry.
     */
    self._addFileToPool = function(siteId, fileId, data) {
        var values = angular.copy(data) || {};
        values.fileId = fileId;
        return getSiteDb(siteId).then(function(db) {
            return db.insert(mmFilepoolStore, values);
        });
    };

    /**
     * Add an entry to queue using a URL.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#addToQueueByUrl
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The absolute URL to the file.
     * @param {String} [component] The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component (optional).
     * @param {Number} [timemodified=0] The time this file was modified. Can be used to check file state.
     * @param {String} [filePath]       Filepath to download the file to.
     * @param {Number} [priority=0] The priority this file should get in the queue (range 0-999).
     * @return {Promise} Resolved on success. The returned value can be inconsistent, do not use.
     */
    self.addToQueueByUrl = function(siteId, fileUrl, component, componentId, timemodified, filePath, priority) {
        var db = $mmApp.getDB(),
            fileId,
            now = new Date(),
            link,
            revision;

        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {

            timemodified = timemodified || 0;
            revision = self.getRevisionFromUrl(fileUrl);
            fileId = self._getFileIdByUrl(fileUrl);
            priority = priority || 0;

            // Set up the component.
            if (typeof component !== 'undefined') {
                link = {
                    component: component,
                    componentId: componentId
                };
            }

            return db.get(mmFilepoolQueueStore, [siteId, fileId]).then(function(fileObject) {
                var foundLink = false,
                    update = false;

                if (fileObject) {
                    // We already have the file in queue, we update the priority and links.
                    if (fileObject.priority < priority) {
                        update = true;
                        fileObject.priority = priority;
                    }
                    if (revision && fileObject.revision !== revision) {
                        update = true;
                        fileObject.revision = revision;
                    }
                    if (timemodified && fileObject.timemodified !== timemodified) {
                        update = true;
                        fileObject.timemodified = timemodified;
                    }
                    if (filePath && fileObject.path !== filePath) {
                        update = true;
                        fileObject.path = filePath;
                    }

                    if (link) {
                        // We need to add the new link if it does not exist yet.
                        angular.forEach(fileObject.links, function(fileLink) {
                            if (fileLink.component == link.component && fileLink.componentId == link.componentId) {
                                foundLink = true;
                            }
                        });
                        if (!foundLink) {
                            update = true;
                            fileObject.links.push(link);
                        }
                    }

                    if (update) {
                        // Update only when required.
                        $log.debug('Updating file ' + fileId + ' which is already in queue');
                        return db.insert(mmFilepoolQueueStore, fileObject);
                    }

                    var response = (function() {
                        // Return a resolved promise containing the keyPath such as db.insert() does it.
                        var deferred = $q.defer();
                        deferred.resolve([fileObject.siteId, fileObject.fileId]);
                        return deferred.promise;
                    })();

                    $log.debug('File ' + fileId + ' already in queue and does not require update');
                    return response;
                } else {
                    return addToQueue();
                }
            }, function() {
                // Unsure why we could not get the record, let's add to the queue anyway.
                return addToQueue();
            });

            function addToQueue() {
                $log.debug('Adding ' + fileId + ' to the queue');
                return db.insert(mmFilepoolQueueStore, {
                    siteId: siteId,
                    fileId: fileId,
                    added: now.getTime(),
                    priority: priority,
                    url: fileUrl,
                    revision: revision,
                    timemodified: timemodified,
                    path: filePath,
                    links: link ? [link] : []
                }).then(function(result) {
                    // Check if the queue is running.
                    self.checkQueueProcessing();
                    return result;
                });
            }
        });
    };

    /**
     * Check the queue processing.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#checkQueueProcessing
     * @return {Void}
     * @description
     * In mose cases, this will enable the queue processing if it was paused.
     * Though, this will disable the queue if we are missing network or if the file system
     * is not accessible. Also, this will have no effect if the queue is already running.
     *
     * Do not use directly, it is reserved for core use.
     */
    self.checkQueueProcessing = function() {

        if (!$mmFS.isAvailable() || !$mmApp.isOnline()) {
            queueState = QUEUE_PAUSED;
            return;

        } else if (queueState === QUEUE_RUNNING) {
            return;
        }

        queueState = QUEUE_RUNNING;
        self._processQueue();
    };

    /**
     * Returns whether a component has files in the pool.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#componentHasFiles
     * @param {String} siteId The site ID.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {Promise} Resolved means yes, rejected means no.
     */
    self.componentHasFiles = function(siteId, component, componentId) {
        return getSiteDb(siteId).then(function(db) {
            var where;
            if (typeof componentId !== 'undefined') {
                where = ['componentAndId', '=', [component, self._fixComponentId(componentId)]];
            } else {
                where = ['component', '=', component];
            }
            return db.count(mmFilepoolLinksStore, where).then(function(count) {
                if (count > 0) {
                    return true;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Downloads a file on the spot.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#downloadUrl
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The file URL.
     * @param {Boolean} [ignoreStale] True if 'stale' should be ignored.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @param {Number} [timemodified=0] The time this file was modified. Can be used to check file state.
     * @param {String} [filePath]       Filepath to download the file to.
     * @return {Promise} Resolved with internal URL on success, rejected otherwise.
     * @description
     * Downloads a file on the spot.
     *
     * This will also take care of adding the file to the pool if it's missing.
     * However, please note that this will not force a file to be re-downloaded
     * if it is already part of the pool. You should mark a file as stale using
     * {@link $mmFilepool#invalidateFileByUrl} to trigger a download.
     *
     * See {@link $mmFilepool#_getInternalUrlById} for the type of local URL returned.
     */
    self.downloadUrl = function(siteId, fileUrl, ignoreStale, component, componentId, timemodified, filePath) {
        var fileId,
            revision,
            promise;

        if ($mmFS.isAvailable()) {
            return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
                timemodified = timemodified || 0;
                revision = self.getRevisionFromUrl(fileUrl);
                fileId = self._getFileIdByUrl(fileUrl);

                return self._hasFileInPool(siteId, fileId).then(function(fileObject) {

                    if (typeof fileObject === 'undefined') {
                        // We do not have the file, download and add to pool.
                        return self._downloadForPoolByUrl(siteId, fileUrl, revision, timemodified, filePath);

                    } else if (self._isFileOutdated(fileObject, revision, timemodified) && $mmApp.isOnline() && !ignoreStale) {
                        // The file is outdated, force the download and update it.
                        return self._downloadForPoolByUrl(siteId, fileUrl, revision, timemodified, filePath, fileObject);
                    }

                    // Everything is fine, return the file on disk.
                    if (filePath) {
                        promise = self._getInternalUrlByPath(filePath);
                    } else {
                        promise = self._getInternalUrlById(siteId, fileId);
                    }
                    return promise.then(function(response) {
                        return response;
                    }, function() {
                        // The file was not found in the pool, weird.
                        return self._downloadForPoolByUrl(siteId, fileUrl, revision, timemodified, filePath, fileObject);
                    });

                }, function() {
                    // The file is not in the pool just yet.
                    return self._downloadForPoolByUrl(siteId, fileUrl, revision, timemodified, filePath);
                })
                .then(function(response) {
                    if (typeof component !== 'undefined') {
                        self._addFileLink(siteId, fileId, component, componentId);
                    }
                    self._notifyFileDownloaded(siteId, fileId);
                    return response;
                }, function(err) {
                    self._notifyFileDownloadError(siteId, fileId);
                    return $q.reject(err);
                });
            });
        } else {
            return $q.reject();
        }
    };

    /**
     * Downloads a URL and update or add it to the pool.
     *
     * This uses the file system, you should always make sure that it is
     * accessible before calling this method.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_downloadForPoolByUrl
     * @param {String} siteId           The site ID.
     * @param {String} fileUrl          The file URL.
     * @param {Number} [revision]       File revision number.
     * @param {Number} [timemodified]   The time this file was modified. Can be used to check file state.
     * @param {String} [filePath]       Filepath to download the file to.
     * @param {Object} [poolFileObject] When set, the object will be updated, a new entry will not be created.
     * @return {Promise} Resolved with internal URL on success, rejected otherwise.
     * @protected
     */
    self._downloadForPoolByUrl = function(siteId, fileUrl, revision, timemodified, filePath, poolFileObject) {
        var fileId = self._getFileIdByUrl(fileUrl);
        filePath = filePath || self._getFilePath(siteId, fileId);

        if (poolFileObject && poolFileObject.fileId !== fileId) {
            $log.error('Invalid object to update passed');
            return $q.reject();
        }

        return $mmWS.downloadFile(fileUrl, filePath).then(function(fileEntry) {
            var now = new Date(),
                data = poolFileObject || {};

            data.downloaded = now.getTime();
            data.stale = false;
            data.url = fileUrl;
            data.revision = revision;
            data.timemodified = timemodified;
            data.path = filePath;

            return self._addFileToPool(siteId, fileId, data).then(function() {
                return fileEntry.toURL();
            });
        });
    };

    /**
     * Fix a component ID to always be a Number.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_fixComponentId
     * @param {String|Number|undefined} The component ID.
     * @return {Number} The normalised component ID. -1 when undefined was passed.
     * @protected
     */
    self._fixComponentId = function(componentId) {
        if (!componentId) {
            return -1;
        }
        return parseInt(componentId, 10);
    };

    /**
     * Add the wstoken url and points to the correct script.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_fixPluginfileURL
     * @param {String} siteId  The site ID.
     * @param {String} fileUrl The file URL.
     * @return {Promise}       Resolved with fixed URL on success, rejected otherwise.
     * @protected
     */
    self._fixPluginfileURL = function(siteId, fileUrl) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.fixPluginfileURL(fileUrl);
        });
    };

    /**
     * Get the name of the event used to notify download events ($mmEvents).
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getFileEventName
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @return {String}       Event name.
     * @protected
     */
    self._getFileEventName = function(siteId, fileId) {
        return 'mmFilepoolFile:'+siteId+':'+fileId;
    };

    /**
     * Get the name of the event used to notify download events ($mmEvents).
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getFileEventNameByUrl
     * @param {String} siteId  The site ID.
     * @param {String} fileUrl The absolute URL to the file.
     * @return {Promise}       Promise resolved with event name.
     */
    self.getFileEventNameByUrl = function(siteId, fileUrl) {
        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            var fileId = self._getFileIdByUrl(fileUrl);
            return self._getFileEventName(siteId, fileId);
        });
    };

    /**
     * Is the file already in the pool?
     *
     * This does not check if the file is on the disk.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_hasFileInPool
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The file URL.
     * @return {Promise} Resolved with file object from DB on success, rejected otherwise.
     * @protected
     */
    self._hasFileInPool = function(siteId, fileId) {
        return getSiteDb(siteId).then(function(db) {
            return db.get(mmFilepoolStore, fileId).then(function(fileObject) {
                if (typeof fileObject === 'undefined') {
                    return $q.reject();
                }
                return fileObject;
            });
        });
    };

    /**
     * Is the file in queue?
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_hasFileInQueue
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The file URL.
     * @return {Promise} Resolved with file object from DB on success, rejected otherwise.
     * @protected
     */
    self._hasFileInQueue = function(siteId, fileId) {
        return $mmApp.getDB().get(mmFilepoolQueueStore, [siteId, fileId]).then(function(fileObject) {
            if (typeof fileObject === 'undefined') {
                return $q.reject();
            }
            return fileObject;
        });
    };

    /**
     * Returns the local URL of a drectory.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getInternalUrlByUrl
     * @param {String} siteId  The site ID.
     * @param {String} fileUrl The file URL.
     * @return {Promise}       Resolved with the URL. Rejected otherwise.
     * @protected
     */
    self.getDirectoryUrlByUrl = function(siteId, fileUrl) {
        if ($mmFS.isAvailable()) {
            return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
                var fileId = self._getFileIdByUrl(fileUrl);
                return $mmFS.getDir(self._getFilePath(siteId, fileId)).then(function(dirEntry) {
                    return dirEntry.toURL();
                });
            });
        }
        return $q.reject();
    };

    /**
     * Creates a unique ID based on a URL.
     *
     * This has a minimal handling of pluginfiles in order to generate a clean
     * file ID which will not change if pointing to the same pluginfile URL even
     * if the token or extra attributes have changed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getFileIdByUrl
     * @param {String} fileUrl The absolute URL to the file.
     * @return {Promise} The file ID.
     * @protected
     */
    self._getFileIdByUrl = function(fileUrl) {
        var url = self._removeRevisionFromUrl(fileUrl),
            candidate,
            extension = '';

        if (url.indexOf('/webservice/pluginfile') !== -1) {
            // Remove attributes that do not matter.
            angular.forEach(urlAttributes, function(regex) {
                url = url.replace(regex, '');
            });

            // For now only guesses the extension of the plugin files. We need the extension
            // for the inAppBrowser to open the files properly, e.g. the extension needs to be
            // part of the file name. Also, we need the mimetype to open the file with
            // web intents. The easiest way to provide such information is to keep the extension
            // in the file ID. Developers should not care about it, but as we are using the
            // file ID in the file path, devs and system can guess it.
            candidate = self._guessExtensionFromUrl(url);
            if (candidate && candidate !== 'php') {
                extension = '.' + candidate;
            }
        }
        return md5.createHash('url:' + url) + extension;
    };

    /**
     * Returns an absolute URL to access the file URL.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getFileUrlByUrl
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The absolute URL to the file.
     * @param {String} [mode=url] The type of URL to return. Accepts 'url' or 'src'.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @param {Number} [timemodified=0] The time this file was modified.
     * @return {Promise} Resolved with the URL to use. When rejected, nothing could be done.
     * @description
     * This will return a URL pointing to the content of the requested URL.
     *
     * This handles the queue and validity of the file. When we have a local copy of the file
     * we will assess whether or not it is still valid. If it is not valid, or we did not find
     * the file, we will add it to the queue to be downloaded later and we will return the URL
     * we received. When the file is valid we return a local URL to it.
     *
     * When the file cannot be found, and we are offline, then we reject the promise because
     * there was nothing we could do.
     */
    self._getFileUrlByUrl = function(siteId, fileUrl, mode, component, componentId, timemodified) {
        var fileId,
            revision;

        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            timemodified = timemodified || 0;
            revision = self.getRevisionFromUrl(fileUrl);
            var fileId = self._getFileIdByUrl(fileUrl);
            return self._hasFileInPool(siteId, fileId).then(function(fileObject) {
                var response,
                    addToQueue = false,
                    fn;

                if (typeof fileObject === 'undefined') {
                    // We do not have the file, add it to the queue, and return real URL.
                    self.addToQueueByUrl(siteId, fileUrl, component, componentId, timemodified);
                    response = fileUrl;

                } else if (self._isFileOutdated(fileObject, revision, timemodified) && $mmApp.isOnline()) {
                    // The file is outdated, we add to the queue and return real URL.
                    self.addToQueueByUrl(siteId, fileUrl, component, componentId, timemodified);
                    response = fileUrl;

                } else {
                    // We found the file entry, now look for the file on disk.

                    if (mode === 'src') {
                        fn = self._getInternalSrcById;
                    } else {
                        fn = self._getInternalUrlById;
                    }

                    response = fn(siteId, fileId).then(function(internalUrl) {
                        // Perfect, the file is on disk.
                        // For the time being we assume that the component link already exists.
                        return internalUrl;
                    }, function() {
                        // We have a problem here, we could not retrieve the file though we thought
                        // we had it, we will delete the entries associated with that ID.
                        $log.debug('File ' + fileId + ' not found on disk');
                        self._removeFileById(siteId, fileId);
                        self.addToQueueByUrl(siteId, fileUrl, component, componentId, timemodified);

                        if ($mmApp.isOnline()) {
                            // We still have a chance to serve the right content.
                            return fileUrl;
                        }

                        return $q.reject();
                    });
                }

                return response;
            }, function() {
                // We do not have the file in store yet.
                self.addToQueueByUrl(siteId, fileUrl, component, componentId, timemodified);
                return fileUrl;
            });
        });
    };

    /**
     * Get the path to a file.
     *
     * This does not check if the file exists or not.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getFilePath
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @return {String} The path to the file relative to storage root.
     * @protected
     */
    self._getFilePath = function(siteId, fileId) {
        return $mmFS.getSiteFolder(siteId) + '/' + mmFilepoolFolder + '/' + fileId;
    };

    /**
     * Get the path to a file from its URL.
     *
     * This does not check if the file exists or not.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getFilePathByUrl
     * @param {String} siteId  The site ID.
     * @param {String} fileUrl The file URL.
     * @return {Promise} Promise resolved with the path to the file relative to storage root.
     */
    self.getFilePathByUrl = function(siteId, fileUrl) {
        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            var fileId = self._getFileIdByUrl(fileUrl);
            return self._getFilePath(siteId, fileId);
        });
    };

    /**
     * Returns the file state: FILEDOWNLOADED, FILEDOWNLOADING, FILENOTDOWNLOADED or FILEOUTDATED.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getFileStateByUrl
     * @param {String} siteId           The site ID.
     * @param {String} fileUrl          File URL.
     * @param {Number} [timemodified=0] The time this file was modified.
     * @return {Promise}                Promise resolved with the file state.
     */
    self.getFileStateByUrl = function(siteId, fileUrl, timemodified) {
        var fileId,
            revision;

        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            timemodified = timemodified || 0;
            revision = self.getRevisionFromUrl(fileUrl);
            fileId = self._getFileIdByUrl(fileUrl);

            return self._hasFileInQueue(siteId, fileId).then(function() {
                return self.FILEDOWNLOADING;
            }, function() {
                return self._hasFileInPool(siteId, fileId).then(function(fileObject) {
                    if (self._isFileOutdated(fileObject, revision, timemodified)) {
                        return self.FILEOUTDATED;
                    } else {
                        return self.FILEDOWNLOADED;
                    }
                }, function() {
                    return self.FILENOTDOWNLOADED;
                });
            });
        });
    };

    /**
     * Returns the internal SRC of a file.
     *
     * The returned URL from this method is typically used with IMG tags.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getInternalSrcById
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @return {Promise} Resolved with the internal URL. Rejected otherwise.
     * @protected
     */
    self._getInternalSrcById = function(siteId, fileId) {
        if ($mmFS.isAvailable()) {
            return $mmFS.getFile(self._getFilePath(siteId, fileId)).then(function(fileEntry) {
                // We use toInternalURL so images are loaded in iOS8 using img HTML tags,
                // with toURL the OS is unable to find the image files.
                return fileEntry.toInternalURL();
            });
        }
        return $q.reject();
    };

    /**
     * Returns the local URL of a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getInternalUrlById
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @return {Promise} Resolved with the URL. Rejected otherwise.
     * @protected
     */
    self._getInternalUrlById = function(siteId, fileId) {
        if ($mmFS.isAvailable()) {
            return $mmFS.getFile(self._getFilePath(siteId, fileId)).then(function(fileEntry) {
                return fileEntry.toURL();
            });
        }
        return $q.reject();
    };

    /**
     * Returns the local URL of a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getInternalUrlByPath
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @return {Promise} Resolved with the URL. Rejected otherwise.
     * @protected
     */
    self._getInternalUrlByPath = function(filePath) {
        if ($mmFS.isAvailable()) {
            return $mmFS.getFile(filePath).then(function(fileEntry) {
                return fileEntry.toURL();
            });
        }
        return $q.reject();
    };

    /**
     * Get the revision number from a file URL.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getRevisionFromUrl
     * @param {String} url URL to get the revision number.
     * @return {String}    Revision number.
     * @protected
     */
    self.getRevisionFromUrl = function(url) {
        var matches = url.match(revisionRegex);
        if (matches && typeof matches[1] != 'undefined') {
            return parseInt(matches[1]);
        }
    };

    /**
     * Returns an absolute URL to use in IMG tags.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getSrcByUrl
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The absolute URL to the file.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @param {Number} [timemodified] The time this file was modified.
     * @return {Promise} Resolved with the URL to use. When rejected, nothing could be done,
     *                   which means that you should not even use the fileUrl passed.
     * @description
     * This will return a URL pointing to the content of the requested URL.
     * The URL returned is compatible to use with IMG tags.
     * See {@link $mmFilepool#_getFileUrlByUrl} for more details.
     */
    self.getSrcByUrl = function(siteId, fileUrl, component, componentId, timemodified) {
        return self._getFileUrlByUrl(siteId, fileUrl, 'src', component, componentId, timemodified);
    };

    /**
     * Returns an absolute URL to access the file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getUrlByUrl
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The absolute URL to the file.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @param {Number} [timemodified] The time this file was modified.
     * @return {Promise} Resolved with the URL to use. When rejected, nothing could be done,
     *                   which means that you should not even use the fileUrl passed.
     * @description
     * This will return a URL pointing to the content of the requested URL.
     * The URL returned is compatible to use with a local browser.
     * See {@link $mmFilepool#_getFileUrlByUrl} for more details.
     */
    self.getUrlByUrl = function(siteId, fileUrl, component, componentId, timemodified) {
        return self._getFileUrlByUrl(siteId, fileUrl, 'url', component, componentId, timemodified);
    };

    /**
     * Guess the extension of a file from its URL.
     *
     * This is very weak and unreliable.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_guessExtensionFromUrl
     * @param {String} fileUrl The file URL.
     * @return {String} The lowercased extension without the dot, or undefined.
     * @protected
     */
    self._guessExtensionFromUrl = function(fileUrl) {
        var split = fileUrl.split('.'),
            candidate,
            extension;

        if (split.length > 1) {
            candidate = split.pop().toLowerCase();
            if (extensionRegex.test(candidate)) {
                extension = candidate;
            }
        }

        return extension;
    };

    /**
     * Invalidate all the files in a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#invalidateAllFiles
     * @param {String} siteId The site ID.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to ignore a failure.
     * @description
     * Invalidates all files by marking it stale. See {@link $mmFilepool#invalidateFileByUrl} for more details.
     */
    self.invalidateAllFiles = function(siteId) {
        return getSiteDb(siteId).then(function(db) {
            return db.getAll(mmFilepoolStore).then(function(items) {
                var promises = [];
                angular.forEach(items, function(item) {
                    item.stale = true;
                    promises.push(db.insert(mmFilepoolStore, item));
                });
                return $q.all(promises);
            });
        });
    };

    /**
     * Invalidate a file by URL.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#invalidateFileByUrl
     * @param {String} siteId The site ID.
     * @param {String} fileUrl The file URL.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to ignore a failure.
     * @description
     * Invalidates a file by marking it stale. It will not be added to the queue automatically,
     * but the next time this file will be requested it will be added to the queue. This is to allow
     * for cache invalidation without necessarily re-triggering downloads.
     * You can manully call {@link $mmFilepool#addToQueueByUrl} to counter this behaviour.
     * Please note that when a file is marked as stale, the user will be presented the stale file
     * only if they do not have network access.
     */
    self.invalidateFileByUrl = function(siteId, fileUrl) {
        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            var fileId = self._getFileIdByUrl(fileUrl);
            return getSiteDb(siteId).then(function(db) {
                return db.get(mmFilepoolStore, fileId).then(function(fileObject) {
                    if (!fileObject) {
                        // Nothing to do, we do not have the file in store.
                        return;
                    }
                    fileObject.stale = true;
                    return db.insert(mmFilepoolStore, fileObject);
                });
            });
        });
    };

    /**
     * Invalidate all the matching files from a component.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#invalidateFilesByComponent
     * @param {String} siteId The site ID.
     * @param {String} component The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to ignore a failure.
     * @description
     * Invalidates a file by marking it stale. See {@link $mmFilepool#invalidateFileByUrl} for more details.
     */
    self.invalidateFilesByComponent = function(siteId, component, componentId) {
        var values = { stale: true },
            where;
        if (typeof componentId !== 'undefined') {
            where = ['componentAndId', '=', [component, self._fixComponentId(componentId)]];
        } else {
            where = ['component', '=', component];
        }

        return getSiteDb(siteId).then(function(db) {
            return db.query(mmFilepoolLinksStore, where).then(function(items) {
                var promise,
                    promises = [];

                angular.forEach(items, function(item) {
                    promise = db.get(mmFilepoolStore, item.fileId).then(function(fileEntry) {
                        if (!fileEntry) {
                            return;
                        }
                        fileEntry.stale = true;
                        return db.insert(mmFilepoolStore, fileEntry);
                    });
                    promises.push(promise);
                });

                return $q.all(promises);
            });
        });
    };

    /**
     * Check if a file is downloading.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#isFileDownloadingByUrl
     * @param {String} siteId           The site ID.
     * @param {String} fileUrl          File URL.
     * @param {Promise}                 Promise resolved if file is downloading, false otherwise.
     */
    self.isFileDownloadingByUrl = function(siteId, fileUrl) {
        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            fileId = self._getFileIdByUrl(fileUrl);
            return self._hasFileInQueue(siteId, fileId);
        });
    };

    /**
     * Check if a file is outdated.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_isFileOutdated
     * @param {Object} fileObject     File object.
     * @param {Number} [revision]     File revision number.
     * @param {Number} [timemodified] The time this file was modified.
     * @param {Boolean}               True if file is outdated, false otherwise.
     */
    self._isFileOutdated = function(fileObject, revision, timemodified) {
        return fileObject.stale || revision > fileObject.revision || timemodified > fileObject.timemodified;
    };

    /**
     * Notify a file has been downloaded.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_notifyFileDownloaded
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     */
    self._notifyFileDownloaded = function(siteId, fileId) {
        $mmEvents.trigger(self._getFileEventName(siteId, fileId), {success: true});
    };

    /**
     * Notify error occurred while downloading a file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_notifyFileDownloadError
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     */
    self._notifyFileDownloadError = function(siteId, fileId) {
        $mmEvents.trigger(self._getFileEventName(siteId, fileId), {success: false});
    };

    /**
     * Process the queue.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_processQueue
     * @return {Void}
     * @description
     * Processes the queue.
     *
     * This loops over itself to keep on processing the queue in the background.
     * The queue process is site agnostic.
     */
    self._processQueue = function() {
        var deferred = $q.defer(),
            now = new Date(),
            promise;

        if (queueState !== QUEUE_RUNNING) {
            // Silently ignore, the queue is on pause.
            deferred.reject(ERR_QUEUE_ON_PAUSE);
            promise = deferred.promise;

        } else if (!$mmFS.isAvailable() || !$mmApp.isOnline()) {
            deferred.reject(ERR_FS_OR_NETWORK_UNAVAILABLE);
            promise = deferred.promise;

        } else {
            promise = self._processImportantQueueItem();
        }

        promise.then(function() {
            // All good, we schedule next execution.
            $timeout(self._processQueue, mmFilepoolQueueProcessInterval);

        }, function(error) {

            // We had an error, in which case we pause the processing.
            if (error === ERR_FS_OR_NETWORK_UNAVAILABLE) {
                $log.debug('Filesysem or network unavailable, pausing queue processing.');

            } else if (error === ERR_QUEUE_IS_EMPTY) {
                $log.debug('Queue is empty, pausing queue processing.');
                $mmEvents.trigger(mmCoreEventQueueEmpty);
            }

            queueState = QUEUE_PAUSED;
        });
    };

    /**
     * Process the most important queue item.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_processImportantQueueItem
     * @return {Promise} Resolved on success. Rejected on failure.
     */
    self._processImportantQueueItem = function() {
        return $mmApp.getDB().query(mmFilepoolQueueStore, undefined, 'sortorder', undefined, 1)
        .then(function(items) {
            var item = items.pop();
            if (!item) {
                return $q.reject(ERR_QUEUE_IS_EMPTY);
            }
            return self._processQueueItem(item);
        }, function() {
            return $q.reject(ERR_QUEUE_IS_EMPTY);
        });
    };

    /**
     * Process a queue item.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_processQueueItem
     * @param {Object} item The object from the queue store.
     * @return {Promise} Resolved on success. Rejected on failure.
     * @protected
     */
    self._processQueueItem = function(item) {
        var siteId = item.siteId,
            fileId = item.fileId,
            fileUrl = item.url,
            revision = item.revision,
            timemodified = item.timemodified,
            filePath = item.path,
            links = item.links || [];

        $log.debug('Processing queue item: ' + siteId + ', ' + fileId);
        return getSiteDb(siteId).then(function(db) {
            return db.get(mmFilepoolStore, fileId).then(function(fileObject) {
                if (fileObject && !self._isFileOutdated(fileObject, revision, timemodified)) {
                    // We have the file, it is not stale, we can update links and remove from queue.
                    self._addFileLinks(siteId, fileId, links);
                    self._removeFromQueue(siteId, fileId);
                    $log.debug('Queued file already in store, ignoring...');
                    self._notifyFileDownloaded(siteId, fileId);
                    return;
                }
                // The file does not exist, or is stale, ... download it.
                return download(siteId, fileUrl, fileObject, links);
            }, function() {
                // The file does not exist, download it.
                return download(siteId, fileUrl, undefined, links);
            });
        });

        /**
         * Download helper to avoid code duplication.
         */
        function download(siteId, fileUrl, fileObject, links) {
            return self._downloadForPoolByUrl(siteId, fileUrl, revision, timemodified, filePath, fileObject).then(function() {
                var promise,
                    deferred;

                // Success, we add links and remove from queue.
                self._addFileLinks(siteId, fileId, links);
                promise = self._removeFromQueue(siteId, fileId);

                self._notifyFileDownloaded(siteId, fileId);

                // Wait for the item to be removed from queue before resolving the promise.
                // If the item could not be removed from queue we still resolve the promise.
                deferred = $q.defer();
                promise.then(deferred.resolve, deferred.resolve);
                return deferred.promise;

            }, function(errorObject) {
                // Whoops, we have an error...
                var dropFromQueue = false;

                if (typeof errorObject !== 'undefined' && errorObject.source === fileUrl) {
                    // This is most likely a $cordovaFileTransfer error.

                    if (errorObject.code === 1) { // FILE_NOT_FOUND_ERR.
                        // The file was not found, most likely a 404, we remove from queue.
                        dropFromQueue = true;

                    } else if (errorObject.code === 2) { // INVALID_URL_ERR.
                        // The URL is invalid, we drop the file from the queue.
                        dropFromQueue = true;

                    } else if (errorObject.code === 3) { // CONNECTION_ERR.

                        if (errorObject.http_status === 401) {
                            // The URL is not in the white list.
                            dropFromQueue = true;

                        } else if (!errorObject.http_status) {
                            // There was a connection issue, we are going to drop the file from the
                            // queue because it's a strange error, we are supposed to be online but the
                            // site is somehow not accessible.
                            dropFromQueue = true;

                        } else {
                            // If there was an HTTP status, then let's remove from the queue.
                            dropFromQueue = true;
                        }

                    } else if (errorObject.code === 4) { // ABORTED_ERR.
                        // The transfer was aborted, we will keep the file in queue.

                    } else if (errorObject.code === 5) { // NOT_MODIFIED_ERR.
                        // We have the latest version of the file, HTTP 304 status.
                        dropFromQueue = true;

                    } else {
                        // Unknown error, let's remove the file from the queue to avoid
                        // locking down the queue because of one file.
                        dropFromQueue = true;
                    }
                }

                if (dropFromQueue) {
                    var deferred,
                        promise;

                    $log.debug('Item dropped from queue due to error: ' + fileUrl);
                    promise = self._removeFromQueue(siteId, fileId);

                    // Consider this as a silent error, never reject the promise here.
                    deferred = $q.defer();
                    promise.then(deferred.resolve, deferred.resolve).finally(function() {
                        self._notifyFileDownloadError(siteId, fileId);
                    });
                    return deferred.promise;
                } else {
                    // We considered the file as legit but did not get it, failure.
                    self._notifyFileDownloadError(siteId, fileId);
                    return $q.reject();
                }

            });
        }

    };

    /**
     * Remove a file from the queue.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_removeFromQueue
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to silently ignore failures.
     * @protected
     */
    self._removeFromQueue = function(siteId, fileId) {
        return $mmApp.getDB().remove(mmFilepoolQueueStore, [siteId, fileId]);
    };

    /**
     * Remove a file from the pool.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_removeFileById
     * @param {String} siteId The site ID.
     * @param {String} fileId The file ID.
     * @return {Promise} Resolved on success. Rejected on failure. It is advised to silently ignore failures.
     * @protected
     */
    self._removeFileById = function(siteId, fileId) {
        return getSiteDb(siteId).then(function(db) {
            var p1, p2, p3;
            p1 = db.remove(mmFilepoolStore, fileId);
            p2 = db.where(mmFilepoolLinksStore, 'fileId', '=', fileId).then(function(entries) {
                return $q.all(entries.map(function(entry) {
                    return db.remove(mmFilepoolLinksStore, [entry.fileId, entry.component, entry.componentId]);
                }));
            });
            p3 = $mmFS.isAvailable() ? $mmFS.removeFile(self._getFilePath(siteId, fileId)) : $q.when();
            return $q.all([p1, p2, p3]);
        });
    };

    /**
     * Delete all the matching files from a component.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#removeFilesByComponent
     * @param {String} siteId        The site ID.
     * @param {String} component     The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {Promise}             Resolved on success. Rejected on failure.
     */
    self.removeFilesByComponent = function(siteId, component, componentId) {
        var where;
        if (typeof componentId !== 'undefined') {
            where = ['componentAndId', '=', [component, self._fixComponentId(componentId)]];
        } else {
            where = ['component', '=', component];
        }

        return getSiteDb(siteId).then(function(db) {
            return db.query(mmFilepoolLinksStore, where);
        }).then(function(items) {
            return $q.all(items.map(function(item) {
                return self._removeFileById(siteId, item.fileId);
            }));
        });
    };

    /**
     * Removes the revision number from a file URL.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_removeRevisionFromUrl
     * @param {String} url URL to remove the revision number.
     * @return {String}    URL without revision number.
     * @protected
     * @description
     * The revision is used to know if a file has changed. We remove it from the URL to prevent storing a file per revision.
     */
    self._removeRevisionFromUrl = function(url) {
        return url.replace(revisionRegex, '/content/0/');
    };

    return self;
})

.run(function($log, $ionicPlatform, $timeout, $mmFilepool) {
    $log = $log.getInstance('$mmFilepool');

    $ionicPlatform.ready(function() {
        // Waiting for the platform to be ready, and a few more before we start processing the queue.
        $timeout($mmFilepool.checkQueueProcessing, 1000);
    });

});
