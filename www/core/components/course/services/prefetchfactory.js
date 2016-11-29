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

angular.module('mm.core.course')

/**
 * Factory to create module prefetch handlers.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmPrefetchFactory
 */
.factory('$mmPrefetchFactory', function($mmSite, $mmFilepool, $mmUtil, $q, $mmLang, $mmApp, mmCoreDownloading, mmCoreDownloaded,
            $mmCourse) {

    var self = {},
        modulePrefetchHandler = (function () {
            var downloadPromises = {}; // Store download promises.

            this.component = 'core_module';
            this.isResource = false;

            // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
            this.updatesNames = /^.*files$/;

            /**
             * Add an ongoing download to the downloadPromises list. On finish the promise will be removed.
             *
             * @param  {Number} id       Unique identifier per component.
             * @param  {Promise} promise Promise to add.
             * @param  {String} [siteId] Site ID. If not defined, current site.
             * @return {Promise}         Promise of the current download.
             */
            this.addOngoingDownload = function (id, promise, siteId) {
                var uniqueId = this.getUniqueId(id);

                siteId = siteId || $mmSite.getId();

                if (!downloadPromises[siteId]) {
                    downloadPromises[siteId] = {};
                }

                downloadPromises[siteId][uniqueId] = promise;

                // Promise will be deleted when finish.
                return promise.finally(function() {
                    delete downloadPromises[siteId][uniqueId];
                });
            };

            /**
             * Download the module.
             *
             * @param  {Object} module    The module object returned by WS.
             * @param  {Number} courseId  Course ID.
             * @return {Promise}          Promise resolved when all content is downloaded. Data returned is not reliable.
             */
            this.download = function(module, courseId) {
                return this.downloadOrPrefetch(module, courseId, false);
            };

            /**
             * Download or prefetch the content.
             *
             * @param  {Object} module    The module object returned by WS.
             * @param  {Number} courseId  Course ID.
             * @param  {Boolean} prefetch True to prefetch, false to download right away.
             * @param  {String} [dirPath] Path of the directory where to store all the CONTENT files. This is to keep the files
             *                            relative paths and make the package work in an iframe. Undefined to download the files
             *                            in the filepool root folder.
             * @return {Promise}          Promise resolved when all content is downloaded. Data returned is not reliable.
             */
            this.downloadOrPrefetch = function(module, courseId, prefetch, dirPath) {
                if (!$mmApp.isOnline()) {
                    // Cannot download in offline.
                    return $mmLang.translateAndReject('mm.core.networkerrormsg');
                }

                var siteId = $mmSite.getId(),
                    that = this;

                // Load module contents (ignore cache so we always have the latest data).
                return that.loadContents(module, courseId, true).then(function() {
                    // Get the intro files.
                    return that.getIntroFiles(module, courseId);
                }).then(function(introFiles) {
                    // Get revision and timemodified.
                    return that.getRevisionAndTimemodified(module, courseId, introFiles).then(function(data) {
                        var downloadFn = prefetch ? $mmFilepool.prefetchPackage : $mmFilepool.downloadPackage,
                            contentFiles = that.getContentDownloadableFiles(module),
                            promises = [];

                        if (dirPath) {
                            // Download intro files in filepool root folder.
                            angular.forEach(introFiles, function(file) {
                                if (prefetch) {
                                    promises.push($mmFilepool.addToQueueByUrl(siteId, file.fileurl,
                                            that.component, module.id, file.timemodified));
                                } else {
                                    promises.push($mmFilepool.downloadUrl(siteId, file.fileurl, false,
                                            that.component, module.id, file.timemodified));
                                }
                            });

                            // Download content files inside dirPath.
                            promises.push(downloadFn(siteId, contentFiles, that.component,
                                    module.id, data.revision, data.timemod, dirPath));
                        } else {
                            // No dirPath, download everything in filepool root folder.
                            var files = introFiles.concat(contentFiles);
                            promises.push(downloadFn(siteId, files, that.component, module.id, data.revision, data.timemod));
                        }

                        return $q.all(promises);
                    });
                });
            };

            /**
             * Returns a list of content files that can be downloaded.
             *
             * @param {Object} module The module object returned by WS.
             * @return {Object[]}     List of files.
             */
            this.getContentDownloadableFiles = function(module) {
                var files = [],
                    that = this;

                angular.forEach(module.contents, function(content) {
                    if (that.isFileDownloadable(content)) {
                        files.push(content);
                    }
                });

                return files;
            };

            /**
             * Get the download size of a module.
             *
             * @param  {Object} module   Module to get the size.
             * @param  {Number} courseId Course ID.
             * @return {Promise}         Promise resolved with file size and a boolean to indicate if it is the total size or
             *                           only partial.
             */
            this.getDownloadSize = function(module, courseId) {
                return this.getFiles(module, courseId).then(function(files) {
                    return $mmUtil.sumFileSizes(files);
                }).catch(function() {
                    return {size: -1, total: false};
                });
            };

            /**
             * Get the downloaded size of a module.
             *
             * @param {Object} module   Module to get the downloaded size.
             * @param {Number} courseId Course ID the module belongs to.
             * @return {Promise}        Promise resolved with the size.
             */
            this.getDownloadedSize = function(module, courseId) {
                return $mmFilepool.getFilesSizeByComponent($mmSite.getId(), this.component, module.id);
            };

            /**
             * Get event names of content files being downloaded.
             *
             * @param {Object} module    The module object returned by WS.
             * @param  {Number} courseId Course ID.
             * @return {Promise}         Resolved with an array of event names.
             */
            this.getDownloadingFilesEventNames = function(module, courseId) {
                var that = this,
                    siteId = $mmSite.getId();

                // Load module contents if needed.
                return that.loadContents(module, courseId).then(function() {
                    var promises = [],
                        eventNames = [];

                    angular.forEach(module.contents, function(content) {
                        var url = content.fileurl;
                        if (!that.isFileDownloadable(content)) {
                            return;
                        }

                        promises.push($mmFilepool.isFileDownloadingByUrl(siteId, url).then(function() {
                            return $mmFilepool.getFileEventNameByUrl(siteId, url).then(function(eventName) {
                                eventNames.push(eventName);
                            });
                        }).catch(function() {
                            // Ignore fails.
                        }));
                    });

                    return $q.all(promises).then(function() {
                        return eventNames;
                    });
                });
            };

            /**
             * Returns a list of content file event names.
             *
             * @param {Object} module    The module object returned by WS.
             * @param  {Number} courseId Course ID.
             * @return {Promise}         Promise resolved with array of event names.
             */
            this.getFileEventNames = function(module, courseId) {
                var that = this,
                    siteId = $mmSite.getId();

                // Load module contents if needed.
                return that.loadContents(module, courseId).then(function() {
                    var promises = [];

                    angular.forEach(module.contents, function(content) {
                        var url = content.fileurl;
                        if (!that.isFileDownloadable(content)) {
                            return;
                        }

                        promises.push($mmFilepool.getFileEventNameByUrl(siteId, url));
                    });

                    return $q.all(promises);
                });
            };

            /**
             * Get the list of downloadable files.
             *
             * @param {Object} module   Module to get the files.
             * @param {Number} courseId Course ID the module belongs to.
             * @return {Promise}        Promise resolved with the list of files.
             */
            this.getFiles = function(module, courseId) {
                var that = this;

                // Load module contents if needed.
                return that.loadContents(module, courseId).then(function() {
                    return that.getIntroFiles(module, courseId).then(function(files) {
                        return files.concat(that.getContentDownloadableFiles(module));
                    });
                });
            };

            /**
             * Returns module intro files.
             *
             * @param  {Object} module   The module object returned by WS.
             * @param  {Number} courseId Course ID.
             * @return {Promise}         Promise resolved with list of intro files.
             */
            this.getIntroFiles = function(module, courseId) {
                return $q.when(this.getIntroFilesFromInstance(module));
            };

            /**
             * Returns module intro files from instance.
             *
             * @param  {Object} module     The module object returned by WS.
             * @param  {Object} [instance] The instance to get the intro files (book, assign, ...). If not defined,
             *                             module will be used.
             * @return {Object[]}          List of intro files.
             */
            this.getIntroFilesFromInstance = function(module, instance) {
                if (instance) {
                    if (typeof instance.introfiles != 'undefined') {
                        return instance.introfiles;
                    } else if (instance.intro) {
                        return $mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(instance.intro);
                    }
                }

                if (module.description) {
                    return $q.when($mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(module.description));
                }

                return [];
            };

            /**
             * If there's an ongoing download for a certain identifier return it.
             *
             * @param  {Number} id          Unique identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @return {Promise}            Promise of the current download.
             */
            this.getOngoingDownload = function (id, siteId) {
                siteId = siteId || $mmSite.getId();

                if (this.isDownloading(id, siteId)) {
                    // There's already a download ongoing, return the promise.
                    var uniqueId = this.getUniqueId(id);

                    return downloadPromises[siteId][uniqueId];
                }
                return $q.when();
            };

            /**
             * Get revision of a module.
             *
             * @param {Object} module   Module to get the revision.
             * @param {Number} courseId Course ID the module belongs to.
             * @return {Promise}        Promise resolved with revision.
             */
            this.getRevision = function(module, courseId) {
                return this.getRevisionAndTimemodified(module, courseId).then(function(data) {
                    // By default, don't attach a hash of intro files to the revision because, in resources,
                    // updating the module description modifies the revision or timemodified of the content.
                    return data.revision;
                });
            };

            /**
             * Returns module revision and timemodified.
             *
             * @param  {Object} module         The module object returned by WS.
             * @param  {Number} courseId       Course ID.
             * @param  {Object[]} [introFiles] List of intro files. If undefined, they will be calculated.
             * @return {Promise}               Promise resolved with revision and timemodified.
             */
            this.getRevisionAndTimemodified = function(module, courseId, introFiles) {
                var that = this;

                // Load module contents if needed.
                return that.loadContents(module, courseId).then(function() {
                    // Get the intro files if needed.
                    var promise = introFiles ? $q.when(introFiles) : that.getIntroFiles(module, courseId);
                    return promise.then(function(files) {
                        // Add all the module contents since some non-downloadable content can have revision/timemodified.
                        files = files.concat(module.contents || []);

                        return {
                            timemod: $mmFilepool.getTimemodifiedFromFileList(files),
                            revision: $mmFilepool.getRevisionFromFileList(files)
                        };
                    });
                });
            };

            /**
             * Get timemodified of a module.
             *
             * @param {Object} module   Module to get the timemodified.
             * @param {Number} courseId Course ID the module belongs to.
             * @return {Promise}        Promise resolved with timemodified.
             */
            this.getTimemodified = function(module, courseId) {
                return this.getRevisionAndTimemodified(module, courseId).then(function(data) {
                    return data.timemod;
                });
            };

            /**
             * Create unique identifier using component and id.
             *
             * @param  {Mixed} id Unique ID inside component.
             * @return {String}   Unique ID.
             */
            this.getUniqueId = function(id) {
                return this.component + '#' + id;
            };

            /**
             * Invalidate the prefetched content.
             *
             * @param {Number} moduleId The module ID.
             * @return {Promise}
             */
            this.invalidateContent = function(moduleId) {
                var promises = [];

                promises.push($mmCourse.invalidateModule(moduleId));
                promises.push($mmFilepool.invalidateFilesByComponent($mmSite.getId(), this.component, moduleId));

                return $q.all(promises);
            };

            /**
             * Invalidates WS calls needed to determine module status.
             *
             * @param  {Object} module   Module to invalidate.
             * @param  {Number} courseId Course ID the module belongs to.
             * @return {Promise}         Promise resolved when done.
             */
            this.invalidateModule = function(module, courseId) {
                return $mmCourse.invalidateModule(module.id);
            };

            /**
             * Check if a module is downloadable.
             *
             * @param {Object} module    Module to check.
             * @param {Number} courseId  Course ID the module belongs to.
             * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
             */
            this.isDownloadable = function(module, courseId) {
                if (this.isResource) {
                    // Load module contents if needed.
                    return this.loadContents(module, courseId).then(function() {
                        return module.contents && module.contents.length > 0;
                    });
                } else {
                    return $q.when(true);
                }
            };

            /**
             * Check if a there's an ongoing download for the given identifier.
             *
             * @param  {Number} id       Unique identifier per component.
             * @param  {String} [siteId] Site ID. If not defined, current site.
             * @return {Boolean}         True if downloading, false otherwise.
             */
            this.isDownloading = function(id, siteId) {
                siteId = siteId || $mmSite.getId();
                var uniqueId = this.getUniqueId(id);
                return !!(downloadPromises[siteId] && downloadPromises[siteId][uniqueId]);
            };

            /**
             * Whether or not the module is enabled for the site.
             *
             * @return {Boolean} True if enabled, false otherwise.
             */
            this.isEnabled = function() {
                return $mmSite.canDownloadFiles();
            };

            /**
             * Check if a file is downloadable.
             *
             * @param {Object} file File to check.
             * @return {Boolean}    True if downloadable, false otherwise.
             */
            this.isFileDownloadable = function(file) {
                return file.type === 'file';
            };

            /**
             * Load module contents into module.contents if they aren't loaded already.
             *
             * @param  {Object} module     Module to load the contents.
             * @param  {Number} [courseId] The course ID. Recommended to speed up the process and minimize data usage.
             * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
             * @return {Promise}           Promise resolved when loaded.
             */
            this.loadContents = function(module, courseId, ignoreCache) {
                if (this.isResource) {
                    return $mmCourse.loadModuleContents(module, courseId, false, false, ignoreCache);
                }
                return $q.when();
            };

            /**
             * Prefetch the module.
             *
             * @param  {Object} module   The module object returned by WS.
             * @param  {Number} courseId Course ID the module belongs to.
             * @param  {Boolean} single  True if downloading a single module, false if downloading a whole section.
             * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
             */
            this.prefetch = function(module, courseId, single) {
                return this.downloadOrPrefetch(module, courseId, true);
            };

            /**
             * Prefetch the module, setting package status at start and finish.
             * The download function should NOT call storePackageStatus, downloadPackage or prefetchPakage from filepool.
             * The download function will receive the same params as prefetchPackage except downloadFn. This includes all
             * extra parameters sent after siteId.
             *
             * @param  {Object} module       The module object returned by WS.
             * @param  {Number} courseId     Course ID the module belongs to.
             * @param  {Function} downloadFn Function to perform the prefetch. Must return a promise resolved with an object with
             *                               'revision' and 'timemod' to set to the package on success.
             * @param  {String} [siteId]     Site ID. If not defined, current site.
             * @return {Promise}             Promise resolved when all files have been downloaded. Data returned is not reliable.
             * @description
             *
             * Example usage from a child instance:
             *     return self.prefetchPackage(module, courseId, single, prefetchModule, siteId, someParam, anotherParam);
             *
             * Then the function "prefetchModule" will receive params:
             *     prefetchModule(module, courseId, single, siteId, someParam, anotherParam)
             */
            this.prefetchPackage = function(module, courseId, single, downloadFn, siteId) {
                siteId = siteId || $mmSite.getId();

                if (!$mmApp.isOnline()) {
                    // Cannot prefetch in offline.
                    return $mmLang.translateAndReject('mm.core.networkerrormsg');
                }

                var that = this,
                    prefetchPromise,
                    extraParams = Array.prototype.slice.call(arguments, 5);

                if (that.isDownloading(module.id, siteId)) {
                    // There's already a download ongoing for this module, return the promise.
                    return that.getOngoingDownload(module.id, siteId);
                }

                prefetchPromise = this.setDownloading(module.id, siteId).then(function() {
                    // Package marked as downloading, call the download function.
                    // Send all the params except downloadFn. This includes all params passed after siteId.
                    var params = [module, courseId, single, siteId].concat(extraParams);
                    return $q.when(downloadFn.apply(that, params));
                }).then(function(data) {
                    // Prefetch finished, mark as downloaded.
                    return that.setDownloaded(module.id, siteId, data.revision, data.timemod);
                }).catch(function(error) {
                    // Error prefetching, go back to previous status and reject the promise.
                    return that.setPreviousStatusAndReject(module.id, error, siteId);
                });

                return that.addOngoingDownload(module.id, prefetchPromise, siteId);
            };

            /**
             * Mark the module as downloaded.
             *
             * @param  {Number} id        Unique identifier per component.
             * @param  {String} [siteId]  Site ID. If not defined, current site.
             * @param  {Mixed} [revision] Revision to set.
             * @param  {Number} [timemod] Timemodified to set.
             */
            this.setDownloaded = function(id, siteId, revision, timemod) {
                siteId = siteId || $mmSite.getId();
                return $mmFilepool.storePackageStatus(siteId, this.component, id, mmCoreDownloaded, revision, timemod);
            };

            /**
             * Mark the module as downloading.
             *
             * @param  {Number} id       Unique identifier per component.
             * @param  {String} [siteId] Site ID. If not defined, current site.
             */
            this.setDownloading = function(id, siteId) {
                siteId = siteId || $mmSite.getId();
                return $mmFilepool.storePackageStatus(siteId, this.component, id, mmCoreDownloading);
            };

            /**
             * Set previous status and return a rejected promise.
             *
             * @param  {Number} id       Unique identifier per component.
             * @param  {String} [error]  Error to return.
             * @param  {String} [siteId] Site ID. If not defined, current site.
             */
            this.setPreviousStatusAndReject = function(id, error, siteId) {
                siteId = siteId || $mmSite.getId();
                return $mmFilepool.setPackagePreviousStatus(siteId, this.component, id).then(function() {
                    return $q.reject(error);
                });
            };

            /**
             * Remove module downloaded files.
             *
             * @param {Object} module   Module to remove the files.
             * @param {Number} courseId Course ID the module belongs to.
             * @return {Promise}        Promise resolved when done.
             */
            this.removeFiles = function(module, courseId) {
                return $mmFilepool.removeFilesByComponent($mmSite.getId(), this.component, module.id);
            };

            return this;
        }());

    /**
     * Returns the subclass of modulePrefetchHandler object.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmPrefetchFactory#createPrefetchHandler
     * @param  {String} component   Component of the module.
     * @param  {Boolean} isResource True if it's a resource (folder, file, etc.), false if it's an activity (forum, assign, ...).
     * @return {Object}             Child object of modulePrefetchHandler.
     */
    self.createPrefetchHandler = function(component, isResource) {
        var child = Object.create(modulePrefetchHandler);
        child.component = component;
        child.isResource = !!isResource;
        return child;
    };

    return self;
});
