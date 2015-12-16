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

.constant('mmFilepoolQueueProcessInterval', 0)
.constant('mmFilepoolFolder', 'filepool')
.constant('mmFilepoolStore', 'filepool')
.constant('mmFilepoolQueueStore', 'files_queue')
.constant('mmFilepoolLinksStore', 'files_links')
.constant('mmFilepoolPackagesStore', 'filepool_packages')

.config(function($mmAppProvider, $mmSitesFactoryProvider, mmFilepoolStore, mmFilepoolLinksStore, mmFilepoolQueueStore,
            mmFilepoolPackagesStore) {
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
        {
            // Packages store.
            //
            // Each entry should contain:
            // - id: The package ID. See {@link $mmFilepool#getPackageId}
            // - component: Package's component.
            // - componentId: Package's componentId.
            // - status: The package status: mmCoreDownloaded, mmCoreDownloading, etc.
            // - previous: (optional) The package previous status.
            // - revision: The package revision.
            // - timemodified: The package timemodified.
            // - updated: When was the entry updated for the last time.
            name: mmFilepoolPackagesStore,
            keyPath: 'id',
            indexes: [
                {
                    name: 'component',
                },
                {
                    name: 'componentId',
                },
                {
                    name: 'status',
                }
            ]
        }
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
        mmFilepoolLinksStore, mmFilepoolQueueStore, mmFilepoolFolder, mmFilepoolQueueProcessInterval, mmCoreEventQueueEmpty,
        mmCoreDownloaded, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, mmCoreNotDownloadable, mmFilepoolPackagesStore,
        mmCoreEventPackageStatusChanged) {

    $log = $log.getInstance('$mmFilepool');

    var self = {},
        extensionRegex = new RegExp('^[a-z0-9]+$'),
        tokenRegex = new RegExp('(\\?|&)token=([A-Za-z0-9]+)'),
        queueState,
        urlAttributes = [
            tokenRegex,
            new RegExp('(\\?|&)forcedownload=[0-1]')
        ],
        revisionRegex = new RegExp('/content/([0-9]+)/'),
        queueDeferreds = {}, // To handle file downloads using the queue.
        packagesPromises = {}, // To prevent downloading packages twice at the same time.
        filePromises = {}; // To prevent downloading files twice at the same time.

    // Queue status codes.
    var QUEUE_RUNNING = 'mmFilepool:QUEUE_RUNNING',
        QUEUE_PAUSED = 'mmFilepool:QUEUE_PAUSED';

    // Error codes.
    var ERR_QUEUE_IS_EMPTY = 'mmFilepoolError:ERR_QUEUE_IS_EMPTY',
        ERR_FS_OR_NETWORK_UNAVAILABLE = 'mmFilepoolError:ERR_FS_OR_NETWORK_UNAVAILABLE',
        ERR_QUEUE_ON_PAUSE = 'mmFilepoolError:ERR_QUEUE_ON_PAUSE';

    /**
     * Files states. Deprecated, please use core constants instead: mmCoreDownloaded, mmCoreDownloading, ...
     * @deprecated since version 2.6
     */
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
        if (!component) {
            return $q.reject();
        }

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
            revision,
            queueDeferred;

        if (!$mmFS.isAvailable()) {
            return $q.reject();
        }

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

            // Retrieve the queue deferred now if it exists to prevent errors if file is removed from queue
            // while we're checking if the file is in queue.
            queueDeferred = self._getQueueDeferred(siteId, fileId, false);

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
                        return db.insert(mmFilepoolQueueStore, fileObject).then(function() {
                            return self._getQueuePromise(siteId, fileId);
                        });
                    }

                    $log.debug('File ' + fileId + ' already in queue and does not require update');
                    if (queueDeferred) {
                        // If we were able to retrieve the queue deferred before we use that one, since the file download
                        // might have finished now and the deferred wouldn't be in the array anymore.
                        return queueDeferred.promise;
                    } else {
                        return self._getQueuePromise(siteId, fileId);
                    }
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
                }).then(function() {
                    // Check if the queue is running.
                    self.checkQueueProcessing();
                    return self._getQueuePromise(siteId, fileId);
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
     * Clear all packages status in a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#clearAllPackagesStatus
     * @param {String} siteId Site ID.
     * @return {Promise}      Promise resolved when all status are cleared.
     */
    self.clearAllPackagesStatus = function(siteId) {
        var promises = [];
        $log.debug('Clear all packages status for site ' + siteId);
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb();
            return db.getAll(mmFilepoolPackagesStore).then(function(entries) {
                angular.forEach(entries, function(entry) {
                    promises.push(db.remove(mmFilepoolPackagesStore, entry.id).then(function() {
                        // Trigger module status changed, setting it as not downloaded.
                        self._triggerPackageStatusChanged(siteId, entry.component, entry.componentId, mmCoreNotDownloaded);
                    }));
                });
                return $q.all(promises);
            });
        });
    };

    /**
     * Clears the filepool. Use it only when all the files from a site are deleted.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#clearFilepool
     * @param  {String} siteId ID of the site to clear.
     * @return {Promise}       Promise resolved when the filepool is cleared.
     */
    self.clearFilepool = function(siteId) {
        return getSiteDb(siteId).then(function(db) {
            return db.removeAll(mmFilepoolStore);
        });
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
     * Given the current status of a list of packages and the status of one of the packages,
     * determine the new status for the list of packages. The status of a list of packages is:
     *     - mmCoreNotDownloadable if there are no downloadable packages.
     *     - mmCoreNotDownloaded if at least 1 package has status mmCoreNotDownloaded.
     *     - mmCoreDownloaded if ALL the downloadable packages have status mmCoreDownloaded.
     *     - mmCoreDownloading if ALL the downloadable packages have status mmCoreDownloading or mmCoreDownloaded,
     *                                     with at least 1 package with mmCoreDownloading.
     *     - mmCoreOutdated if ALL the downloadable packages have status mmCoreOutdated or mmCoreDownloaded or
     *                                     mmCoreDownloading, with at least 1 package with mmCoreOutdated.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#determinePackagesStatus
     * @param {String} current       Current status of the list of packages.
     * @param {String} packagestatus Status of one of the packages.
     * @return {String}              New status for the list of packages;
     */
    self.determinePackagesStatus = function(current, packagestatus) {
        if (!current) {
            current = mmCoreNotDownloadable;
        }

        if (packagestatus === mmCoreNotDownloaded) {
            // If 1 package is not downloaded the status of the whole list will always be not downloaded.
            return mmCoreNotDownloaded;
        } else if (packagestatus === mmCoreDownloaded && current === mmCoreNotDownloadable) {
            // If all packages are downloaded or not downloadable with at least 1 downloaded, status will be downloaded.
            return mmCoreDownloaded;
        } else if (packagestatus === mmCoreDownloading && (current === mmCoreNotDownloadable || current === mmCoreDownloaded)) {
            // If all packages are downloading/downloaded/notdownloadable with at least 1 downloading, status will be downloading.
            return mmCoreDownloading;
        } else if (packagestatus === mmCoreOutdated && current !== mmCoreNotDownloaded) {
            // If there are no packages notdownloaded and there is at least 1 outdated, status will be outdated.
            return mmCoreOutdated;
        }

        // Status remains the same.
        return current;
    };

    /**
     * Downloads or prefetches a list of files.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_downloadOrPrefetchPackage
     * @param {String} siteId        The site ID.
     * @param  {Object[]} fileList   List of files to download.
     * @param  {Boolean} prefetch    True if should prefetch the contents (queue), false if they should be downloaded right now.
     * @param {String} component     The component to link the file to.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @param {Number} [revision]    Package's revision. If not defined, it will be calculated using the list of files.
     * @param {Number} [timemod]     Package's timemodified. If not defined, it will be calculated using the list of files.
     * @param {String} [dirPath]     Name of the directory where to store the files (inside filepool dir). If not defined, store
     *                               the files directly inside the filepool folder.
     * @return {Promise}             Promise resolved when all files are downloaded.
     * @protected
     */
    self._downloadOrPrefetchPackage = function(siteId, fileList, prefetch, component, componentId, revision, timemod, dirPath) {

        var packageId = self.getPackageId(component, componentId);

        if (packagesPromises[siteId] && packagesPromises[siteId][packageId]) {
            // There's already a download ongoing for this package, return the promise.
            return packagesPromises[siteId][packageId];
        } else if (!packagesPromises[siteId]) {
            packagesPromises[siteId] = {};
        }

        revision = revision || self.getRevisionFromFileList(fileList);
        timemod = timemod || self.getTimemodifiedFromFileList(fileList);

        var dwnPromise,
            deleted = false;

        // Set package as downloading.
        dwnPromise = self.storePackageStatus(siteId, component, componentId, mmCoreDownloading, revision, timemod).then(function() {
            var promises = [],
                deferred = $q.defer(),
                packageLoaded = 0; // Use a deferred to be able to use notify.

            angular.forEach(fileList, function(file) {
                var path,
                    promise,
                    fileLoaded = 0;

                if (dirPath) {
                    // Calculate the path to the file.
                    path = file.filename;
                    if (file.filepath !== '/') {
                        path = file.filepath.substr(1) + path;
                    }
                    path = $mmFS.concatenatePaths(dirPath, path);
                }

                if (prefetch) {
                    promise = self.addToQueueByUrl(siteId, file.fileurl, component, componentId, file.timemodified, path);
                } else {
                    promise = self.downloadUrl(siteId, file.fileurl, false, component, componentId, file.timemodified, path);
                }

                // Using undefined for success & fail will pass the success/failure to the parent promise.
                promises.push(promise.then(undefined, undefined, function(progress) {
                    if (progress && progress.loaded) {
                        // Add the new size loaded to the package loaded.
                        packageLoaded = packageLoaded + (progress.loaded - fileLoaded);
                        fileLoaded = progress.loaded;
                        deferred.notify({
                            packageDownload: true,
                            loaded: packageLoaded,
                            fileProgress: progress
                        });
                    }
                }));
            });

            $q.all(promises).then(function() {
                // Success prefetching, store package as downloaded.
                return self.storePackageStatus(siteId, component, componentId, mmCoreDownloaded, revision, timemod);
            }).catch(function() {
                // Error downloading, go back to previous status and reject the promise.
                return self.setPackagePreviousStatus(siteId, component, componentId).then(function() {
                    return $q.reject();
                });
            }).then(deferred.resolve, deferred.reject);

            return deferred.promise;
        }).finally(function() {
            // Download finished, delete the promise.
            delete packagesPromises[siteId][packageId];
            deleted = true;
        });

        if (!deleted) { // In case promise was finished immediately.
            packagesPromises[siteId][packageId] = dwnPromise;
        }
        return dwnPromise;
    };

    /**
     * Downloads a list of files.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#downloadPackage
     * @param {String} siteId         The site ID.
     * @param  {Object[]} fileList    List of files to download.
     * @param {String} component      The component to link the file to.
     * @param {Number} componentId    An ID to identify the download. Must be unique.
     * @param {Number} [revision]     Package's revision. If not defined, it will be calculated using the list of files.
     * @param {Number} [timemodified] Package's timemodified. If not defined, it will be calculated using the list of files.
     * @param {String} [dirPath]      Name of the directory where to store the files (inside filepool dir). If not defined, store
     *                                the files directly inside the filepool folder.
     * @return {Promise}              Promise resolved when all files are downloaded.
     */
    self.downloadPackage = function(siteId, fileList, component, componentId, revision, timemodified, dirPath) {
        return self._downloadOrPrefetchPackage(siteId, fileList, false, component, componentId, revision, timemodified, dirPath);
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

        var downloadId = self.getFileDownloadId(fileUrl, filePath),
            deleted = false,
            promise;

        if (filePromises[siteId] && filePromises[siteId][downloadId]) {
            // There's already a download ongoing for this file in this location, return the promise.
            return filePromises[siteId][downloadId];
        } else if (!filePromises[siteId]) {
            filePromises[siteId] = {};
        }

        promise = $mmSitesManager.getSite(siteId).then(function(site) {

            if (!site.canDownloadFiles()) {
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
        }).finally(function() {
            // Download finished, delete the promise.
            delete filePromises[siteId][downloadId];
            deleted = true;
        });

        if (!deleted) { // In case promise was finished immediately.
            filePromises[siteId][downloadId] = promise;
        }
        return promise;
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
        var id = parseInt(componentId, 10);
        if (isNaN(id)) {
            return -1;
        }
        return id;
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
     * Get the ID of a file download. Used to keep track of filePromises.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getFileDownloadId
     * @param {String} fileUrl  The file URL.
     * @param {String} filePath The file destination path.
     * @return {String}         File download ID.
     * @protected
     */
    self.getFileDownloadId = function(fileUrl, filePath) {
        return md5.createHash(fileUrl + '###' + filePath);
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
     * Get a download promise. If the promise is not set, return undefined.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getPackageDownloadPromise
     * @param {String} siteId        Site ID.
     * @param {String} component     The component of the package.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {String}             Download promise or undefined.
     */
    self.getPackageDownloadPromise = function(siteId, component, componentId) {
        var packageId = self.getPackageId(component, componentId);
        if (packagesPromises[siteId] && packagesPromises[siteId][packageId]) {
            return packagesPromises[siteId][packageId];
        }
    };

    /**
     * Get the ID of a package.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getPackageId
     * @param {String} component     Package's component.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {String}              Package ID.
     */
    self.getPackageId = function(component, componentId) {
        return md5.createHash(component + '#' + self._fixComponentId(componentId));
    };

    /**
     * Get a package previous status.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getPackagePreviousStatus
     * @param {String} siteId           Site ID.
     * @param {String} component        Package's component.
     * @param {Number} [componentId]    An ID to use in conjunction with the component.
     * @return {Promise}                Promise resolved with the status.
     */
    self.getPackagePreviousStatus = function(siteId, component, componentId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                packageId = self.getPackageId(component, componentId);
            return db.get(mmFilepoolPackagesStore, packageId).then(function(entry) {
                return entry.previous || mmCoreNotDownloaded;
            }, function() {
                return mmCoreNotDownloaded;
            });
        });
    };

    /**
     * Get a package status.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getPackageStatus
     * @param {String} siteId              Site ID.
     * @param {String} component           Package's component.
     * @param {Number} [componentId]       An ID to use in conjunction with the component.
     * @param {Number|String} [revision=0] Package's revision.
     * @param {Number} [timemodified=0]    Package's timemodified.
     * @return {Promise}                   Promise resolved with the status.
     */
    self.getPackageStatus = function(siteId, component, componentId, revision, timemodified) {
        revision = revision || 0;
        timemodified = timemodified || 0;
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                packageId = self.getPackageId(component, componentId);

            // Get status.
            return db.get(mmFilepoolPackagesStore, packageId).then(function(entry) {
                if (entry.status === mmCoreDownloaded) {
                    if (revision != entry.revision || timemodified > entry.timemodified) {
                        // File is outdated. Let's change its status.
                        entry.status = mmCoreOutdated;
                        entry.updated = new Date().getTime();
                        db.insert(mmFilepoolPackagesStore, entry).then(function() {
                            // Success inserting, trigger event.
                            self._triggerPackageStatusChanged(siteId, component, componentId, mmCoreOutdated);
                        });
                    }
                } else if (entry.status === mmCoreOutdated) {
                    if (revision === entry.revision && timemodified === entry.timemodified) {
                        // File isn't outdated anymore. Let's change its status.
                        entry.status = mmCoreDownloaded;
                        entry.updated = new Date().getTime();
                        db.insert(mmFilepoolPackagesStore, entry).then(function() {
                            // Success inserting, trigger event.
                            self._triggerPackageStatusChanged(siteId, component, componentId, mmCoreDownloaded);
                        });
                    }
                }
                return entry.status;
            }, function() {
                return mmCoreNotDownloaded;
            });
        });
    };

    /**
     * Get the deferred object for a file in the queue.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getQueueDeferred
     * @param {String} siteId         The site ID.
     * @param {String} fileId         The file ID.
     * @param {Boolean} [create=true] True if it should create a new deferred if it doesn't exist.
     * @return {Object}               Deferred.
     * @protected
     */
    self._getQueueDeferred = function(siteId, fileId, create) {
        if (typeof create == 'undefined') {
            create = true;
        }

        if (!queueDeferreds[siteId]) {
            if (!create) {
                return;
            }
            queueDeferreds[siteId] = {};
        }
        if (!queueDeferreds[siteId][fileId]) {
            if (!create) {
                return;
            }
            queueDeferreds[siteId][fileId] = $q.defer();
        }
        return queueDeferreds[siteId][fileId];
    };

    /**
     * Get the promise for a file in the queue.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_getQueuePromise
     * @param {String} siteId         The site ID.
     * @param {String} fileId         The file ID.
     * @param {Boolean} [create=true] True if it should create a new promise if it doesn't exist.
     * @return {Promise}              Promise.
     * @protected
     */
    self._getQueuePromise = function(siteId, fileId, create) {
        return self._getQueueDeferred(siteId, fileId, create).promise;
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
     * Returns the file state: mmCoreDownloaded, mmCoreDownloading, mmCoreNotDownloaded or mmCoreOutdated.
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
                return mmCoreDownloading;
            }, function() {
                return self._hasFileInPool(siteId, fileId).then(function(fileObject) {
                    if (self._isFileOutdated(fileObject, revision, timemodified)) {
                        return mmCoreOutdated;
                    } else {
                        return mmCoreDownloaded;
                    }
                }, function() {
                    return mmCoreNotDownloaded;
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
                return $mmFS.getInternalURL(fileEntry);
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
     * Get package revision number from a list of files.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getRevisionFromFileList
     * @param {Object[]} files Package files.
     * @return {Number}        Package revision.
     */
    self.getRevisionFromFileList = function(files) {
        var revision = 0;

        angular.forEach(files, function(file) {
            if (file.fileurl) {
                var r = self.getRevisionFromUrl(file.fileurl);
                if (r > revision) {
                    revision = r;
                }
            }
        });

        return revision;
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
     * Get package timemodified from a list of files.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#getTimemodifiedFromFileList
     * @param {Object[]} files Package files.
     * @return {Number}        Package time modified.
     */
    self.getTimemodifiedFromFileList = function(files) {
        var timemod = 0;

        angular.forEach(files, function(file) {
            if (file.timemodified > timemod) {
                timemod = file.timemodified;
            }
        });

        return timemod;
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
     * Prefetches a list of files.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#prefetchPackage
     * @param {String} siteId         The site ID.
     * @param  {Object[]} fileList    List of files to download.
     * @param {String} component      The component to link the file to.
     * @param {Number} componentId    An ID to identify the download. Must be unique.
     * @param {Number} [revision]     Package's revision. If not defined, it will be calculated using the list of files.
     * @param {Number} [timemodified] Package's timemodified. If not defined, it will be calculated using the list of files.
     * @param {String} [dirPath]      Name of the directory where to store the files (inside filepool dir). If not defined, store
     *                                the files directly inside the filepool folder.
     * @return {Promise}              Promise resolved when all files are downloaded.
     */
    self.prefetchPackage = function(siteId, fileList, component, componentId, revision, timemodified, dirPath) {
        return self._downloadOrPrefetchPackage(siteId, fileList, true, component, componentId, revision, timemodified, dirPath);
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
                    $log.debug('Queued file already in store, ignoring...');
                    self._addFileLinks(siteId, fileId, links);
                    self._removeFromQueue(siteId, fileId).finally(function() {
                        self._treatQueueDeferred(siteId, fileId, true);
                    });
                    self._notifyFileDownloaded(siteId, fileId);
                    return;
                }
                // The file does not exist, or is stale, ... download it.
                return download(siteId, fileUrl, fileObject, links);
            }, function() {
                // The file does not exist, download it.
                return download(siteId, fileUrl, undefined, links);
            });
        }, function() {
            // Couldn't get site DB, site was probably deleted.
            $log.debug('Item dropped from queue due to site DB not retrieved: ' + fileUrl);
            return self._removeFromQueue(siteId, fileId).catch(function() {}).finally(function() {
                self._treatQueueDeferred(siteId, fileId, false);
                self._notifyFileDownloadError(siteId, fileId);
            });
        });

        /**
         * Download helper to avoid code duplication.
         */
        function download(siteId, fileUrl, fileObject, links) {
            return self._downloadForPoolByUrl(siteId, fileUrl, revision, timemodified, filePath, fileObject).then(function() {
                var promise;

                // Success, we add links and remove from queue.
                self._addFileLinks(siteId, fileId, links);
                promise = self._removeFromQueue(siteId, fileId);

                self._treatQueueDeferred(siteId, fileId, true);
                self._notifyFileDownloaded(siteId, fileId);

                // Wait for the item to be removed from queue before resolving the promise.
                // If the item could not be removed from queue we still resolve the promise.
                return promise.catch(function() {});

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
                        // If there was an HTTP status, then let's remove from the queue.
                        dropFromQueue = true;
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
                } else {
                    dropFromQueue = true;
                }

                if (dropFromQueue) {
                    var promise;

                    $log.debug('Item dropped from queue due to error: ' + fileUrl);
                    promise = self._removeFromQueue(siteId, fileId);

                    // Consider this as a silent error, never reject the promise here.
                    return promise.catch(function() {}).finally(function() {
                        self._treatQueueDeferred(siteId, fileId, false);
                        self._notifyFileDownloadError(siteId, fileId);
                    });
                } else {
                    // We considered the file as legit but did not get it, failure.
                    self._treatQueueDeferred(siteId, fileId, false);
                    self._notifyFileDownloadError(siteId, fileId);
                    return $q.reject();
                }

            }, function(progress) {
                // Send the progress object to the queue deferred.
                if (queueDeferreds[siteId] && queueDeferreds[siteId][fileId]) {
                    queueDeferreds[siteId][fileId].notify(progress);
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
     * Remove a file from the pool.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#removeFileByUrl
     * @param {String} siteId  The site ID.
     * @param {String} fileUrl The file URL.
     * @return {Promise}       Resolved on success, rejected on failure. It is advised to silently ignore failures.
     */
    self.removeFileByUrl = function(siteId, fileUrl) {
        return self._fixPluginfileURL(siteId, fileUrl).then(function(fileUrl) {
            var fileId = self._getFileIdByUrl(fileUrl);
            return self._removeFileById(siteId, fileId);
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

    /**
     * Change the package status, setting it to the previous status.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#setPackagePreviousStatus
     * @param {String} siteId        Site ID.
     * @param {String} component     Package's component.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @return {Promise}             Promise resolved when the status is changed. Resolve param: new status.
     */
    self.setPackagePreviousStatus = function(siteId, component, componentId) {
        $log.debug('Set previous status for package ' + component + ' ' + componentId);
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                packageId = self.getPackageId(component, componentId);

            // Get current stored data, we'll only update 'status' and 'updated' fields.
            return db.get(mmFilepoolPackagesStore, packageId).then(function(entry) {
                entry.status = entry.previous || mmCoreNotDownloaded;
                entry.updated = new Date().getTime();
                $log.debug('Set status \'' + entry.status + '\' for package ' + component + ' ' + componentId);

                return db.insert(mmFilepoolPackagesStore, entry).then(function() {
                    // Success updating, trigger event.
                    self._triggerPackageStatusChanged(siteId, component, componentId, entry.status);
                    return entry.status;
                });
            });
        });
    };

    /**
     * Store package status.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#storePackageStatus
     * @param {String} siteId           Site ID.
     * @param {String} component        Package's component.
     * @param {Number} [componentId]    An ID to use in conjunction with the component.
     * @param {String} status           New package status.
     * @param {Number} [revision=0]     Package's revision.
     * @param {Number} [timemodified=0] Package's timemodified.
     * @return {Promise}                Promise resolved when status is stored.
     */
    self.storePackageStatus = function(siteId, component, componentId, status, revision, timemodified) {
        $log.debug('Set status \'' + status + '\' for package ' + component + ' ' + componentId);
        revision = revision || 0;
        timemodified = timemodified || 0;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                packageId = self.getPackageId(component, componentId);

            // Search current status to set it as previous status.
            return db.get(mmFilepoolPackagesStore, packageId).then(function(entry) {
                return entry.status;
            }, function() {
                return undefined; // No previous status.
            }).then(function(previousStatus) {
                var promise;
                if (previousStatus === status) {
                    // The package already has this status, no need to change it.
                    promise = $q.when();
                } else {
                    promise = db.insert(mmFilepoolPackagesStore, {
                        id: packageId,
                        component: component,
                        componentId: componentId,
                        status: status,
                        previous: previousStatus,
                        revision: revision,
                        timemodified: timemodified,
                        updated: new Date().getTime()
                    });
                }

                return promise.then(function() {
                    // Success inserting, trigger event.
                    self._triggerPackageStatusChanged(siteId, component, componentId, status);
                });
            });
        });
    };

    /**
     * Resolves or rejects a queue deferred and removes it from the list.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_treatQueueDeferred
     * @param {String} siteId   The site ID.
     * @param {String} fileId   The file ID.
     * @param {Boolean} resolve True if promise should be resolved, false if it should be rejected.
     * @return {Object}         Deferred.
     * @protected
     */
    self._treatQueueDeferred = function(siteId, fileId, resolve) {
        if (queueDeferreds[siteId] && queueDeferreds[siteId][fileId]) {
            if (resolve) {
                queueDeferreds[siteId][fileId].resolve();
            } else {
                queueDeferreds[siteId][fileId].reject();
            }
            delete queueDeferreds[siteId][fileId];
        }
    };

    /**
     * Trigger mmCoreEventPackageStatusChanged with the right data.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFilepool#_triggerPackageStatusChanged
     * @param {String} siteId        Site ID.
     * @param {String} component     Package's component.
     * @param {Number} [componentId] An ID to use in conjunction with the component.
     * @param {String} status        New package status.
     * @return {Void}
     * @protected
     */
    self._triggerPackageStatusChanged = function(siteId, component, componentId, status) {
        var data = {
            siteid: siteId,
            component: component,
            componentId: componentId,
            status: status
        };
        $mmEvents.trigger(mmCoreEventPackageStatusChanged, data);
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
