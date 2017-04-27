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
 * Delegate to register prefetch handlers.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmCoursePrefetchDelegate
 * @description
 *
 * To register a prefetch handler:
 *
 * .config(function($mmCoursePrefetchDelegateProvider) {
 *     $mmCoursePrefetchDelegateProvider.registerPrefetchHandler('mmaYourAddon', 'moduleName', 'handlerName');
 * })
 *
 * To see the methods that must provide the prefetch handler see {@link $mmCoursePrefetchDelegateProvider#registerPrefetchHandler}.
 */
.provider('$mmCoursePrefetchDelegate', function() {
    var prefetchHandlers = {},
        self = {};

    /**
     * Register a prefetch handler.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCoursePrefetchDelegateProvider#registerPrefetchHandler
     * @param {String} addon The addon's name (mmaLabel, mmaForum, ...)
     * @param {String} handles The module this handler handles, e.g. forum, label.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - component (String) Handler's component.
     *                             - (Optional) updatesNames (RegExp) RegExp of update names to check. If getCourseUpdates returns
     *                                                                 an update whose names matches this, the module will be marked
     *                                                                 as outdated. Ignored if hasUpdates function is defined.
     *                             - getDownloadSize(module, courseid) (Object|Promise) Get the download size of a module.
     *                                                                 The returning object should have size field with file size
     *                                                                 in bytes and and total field which indicates if it's been
     *                                                                 able to calculate the total size (true) or only partial size
     *                                                                 (false).
     *                             - isEnabled() (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                             - prefetch(module, courseid, single) (Promise) Prefetches a module.
     *                             - (Optional) getFiles(module, courseid) (Object[]|Promise) Get list of files. If not defined,
     *                                                                 we'll assume they're in module.contents.
     *                             - (Optional) determineStatus(status, canCheck) (String) Returns status to show based on
     *                                                                 current. E.g. for books we'll show "outdated" even if state
     *                                                                 is "downloaded" if canCheck=false.
     *                             - (Optional) getRevision(module, courseid) (String|Number|Promise) Returns the module revision.
     *                                                                 If not defined we'll calculate it using module files.
     *                             - (Optional) getTimemodified(module, courseid) (Number|Promise) Returns the module timemodified.
     *                                                                 If not defined we'll calculate it using module files.
     *                             - (Optional) isDownloadable(module, courseid) (Boolean|Promise) Check if a module can be
     *                                                                 downloaded. If function is not defined, we assume that all
     *                                                                 modules will be downloadable.
     *                             - (Optional) invalidateModule(module, courseId) (Promise) Invalidates WS calls needed to
     *                                                                 determine module status. This should NOT invalidate files
     *                                                                 nor all the prefetched data.
     *                             - (Optional) getDownloadedSize(module, courseId) (Number|Promise) Get downloaded size. If not
     *                                                                 defined, we'll use getFiles to calculate it (slow).
     *                             - (Optional) removeFiles(module, courseId) (Promise) Remove module downloaded files. If not
     *                                                                 defined, we'll use getFiles to remove them (slow).
     *                             - (Optional) loadContents(module, courseId) (Promise) Load module contents in module.contents if
     *                                                                 needed. Only needed if getFiles isn't implemeneted.
     *                             - (Optional) hasUpdates(module, courseId, moduleUpdates) (Promise|Boolean) Check if the module
     *                                                                 has updates to download based on getCourseUpdates result.
     *                                                                 Should return a boolean or a promise resolved with a boolean.
     *                             - (Optional) canUseCheckUpdates(module, courseId) (Promise|Boolean) Check if a certain module can
     *                                                                 use core_course_check_updates to check if it has updates. If
     *                                                                 not defined, it will assume all modules can be checked.
     *                                                                 Should return a boolean or a promise resolved with a boolean.
     */
    self.registerPrefetchHandler = function(addon, handles, handler) {
        if (typeof prefetchHandlers[handles] !== 'undefined') {
            console.log("$mmCoursePrefetchDelegateProvider: Addon '" + prefetchHandlers[handles].addon +
                            "' already registered as handler for '" + handles + "'");
            return false;
        }
        console.log("$mmCoursePrefetchDelegateProvider: Registered addon '" + addon + "' as prefetch handler.");
        prefetchHandlers[handles] = {
            addon: addon,
            handler: handler,
            instance: undefined
        };
        return true;
    };

    self.$get = function($q, $log, $mmSite, $mmUtil, $mmFilepool, $mmEvents, $mmCourse, mmCoreDownloaded, mmCoreDownloading,
                mmCoreNotDownloaded, mmCoreOutdated, mmCoreNotDownloadable, mmCoreEventSectionStatusChanged, $mmFS, md5) {
        var enabledHandlers = {},
            self = {},
            deferreds = {},
            lastUpdateHandlersStart,
            courseUpdatesPromises = {}; // To prevent checking updates of a course twice at the same time.

        $log = $log.getInstance('$mmCoursePrefetchDelegate');

        /**
         * Check if current site can check updates using core_course_check_updates.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#canCheckUpdates
         * @return {Boolean} True if can check updates, false otherwise.
         */
        self.canCheckUpdates = function() {
            return $mmSite.wsAvailable('core_course_check_updates');
        };

         /**
         * Check if a certain module can use core_course_check_updates.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#canModuleUseCheckUpdates
         * @param {Object} module   Module.
         * @param {Number} courseId Course ID the module belongs to.
         * @return {Promise}        Promise resolved with boolean: whether the module can use check updates WS.
         */
        self.canModuleUseCheckUpdates = function(module, courseId) {
            var handler = enabledHandlers[module.modname];

            if (!handler) {
                // Module not supported, cannot use check updates.
                return $q.when(false);
            }

            if (handler.canUseCheckUpdates) {
                return $q.when(handler.canUseCheckUpdates(module, courseId));
            }

            // By default, modules can use check updates.
            return $q.when(true);
        };

        /**
         * Clear the status cache (memory object).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#clearStatusCache
         * @return {Void}
         */
        self.clearStatusCache = function() {
            statusCache.clear();
        };

        /**
         * Invalidates the status cache for a given module.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#invalidateModuleStatusCache
         * @param  {Object} module      Module to be invalidated.
         * @return {Void}
         */
        self.invalidateModuleStatusCache = function(module) {
            var handler = enabledHandlers[module.modname];
            if (handler) {
                // Invalidate Status of the module.
                statusCache.invalidate(handler.component, module.id);
            }
        };

        // To speed up the getModulesStatus function.
        var statusCache = new function() {
            var cacheStore = {};

            this.clear = function() {
                cacheStore = {};
            };

            /**
             * Get the status of a module from the "cache".
             *
             * @param {String} component     Package's component.
             * @param {Mixed} [componentId]  An ID to use in conjunction with the component.
             * @return {Object} Cached status
             */
            this.get = function(component, componentId) {
                var packageId = $mmFilepool.getPackageId(component, componentId);

                if (!cacheStore[packageId]) {
                    cacheStore[packageId] = {};
                }

                return cacheStore[packageId];
            };

            /**
             * Get the status of a module from the "cache".
             *
             * @param {String}  component           Package's component.
             * @param {Mixed}   [componentId]       An ID to use in conjunction with the component.
             * @param {String}  name                Name of the value to be set.
             * @param {Boolean} [ignoreInvalidate]  If ignore or not the lastupdate value that invalidates data.
             * @return {Mixed}  Cached value. Undefined if not cached.
             */
            this.getValue = function(component, componentId, name, ignoreInvalidate) {
                var cache = this.get(component, componentId);

                if (cache[name] && typeof cache[name].value != "undefined") {
                    var now = new Date().getTime();
                    // Invalidate after 5 minutes.
                    if (ignoreInvalidate || cache[name].lastupdate + 300000 >= now) {
                        return cache[name].value;
                    }
                }

                return undefined;
            };

            /**
             * Update the status of a module in the "cache".
             *
             * @param {String}  component       Package's component.
             * @param {Mixed}   [componentId]   An ID to use in conjunction with the component.
             * @param {String}  name            Name of the value to be set.
             * @param {Mixed}   value           Value to be set.
             * @return {Mixed}  The value set.
             */
            this.setValue = function(component, componentId, name, value) {
                var cache = this.get(component, componentId);

                cache[name] = {
                    value: value,
                    lastupdate: new Date().getTime()
                };

                return value;
            };

            /**
             * Invalidate the cache.
             *
             * @param {String}  component       Package's component.
             * @param {Mixed}   [componentId]   An ID to use in conjunction with the component.
             */
            this.invalidate = function(component, componentId) {
                var cache = this.get(component, componentId);
                angular.forEach(cache, function(entry) {
                    entry.lastupdate = 0;
                });
            };
        };

        /**
         * Determines a module status based on current status, restoring downloads if needed.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#determineModuleStatus
         * @param  {Object} module            Module.
         * @param  {String} status            Current status.
         * @param  {Boolean} restoreDownloads True if it should restore downloads if needed.
         * @param  {Boolean} canCheck         True if updates can be checked using core_course_check_updates.
         * @return {String}                  Module status.
         */
        self.determineModuleStatus = function(module, status, restoreDownloads, canCheck) {
            var handler = enabledHandlers[module.modname];

            if (handler) {
                if (status == mmCoreDownloading && restoreDownloads) {
                    // Check if the download is being handled.
                    if (!$mmFilepool.getPackageDownloadPromise($mmSite.getId(), handler.component, module.id)) {
                        // Not handled, the app was probably restarted or something weird happened.
                        // Re-start download (files already on queue or already downloaded will be skipped).
                        handler.prefetch(module);
                    }
                } else if (handler.determineStatus) {
                    // The handler implements a determineStatus function. Apply it.
                    return handler.determineStatus(status, canCheck);
                }
            }
            return status;
        };

        /**
         * Get cache key for course updates WS calls.
         *
         * @param  {Number} courseId Course ID.
         * @return {String}          Cache key.
         */
        function getCourseUpdatesCacheKey(courseId) {
            return 'mmCourse:courseUpdates:' + courseId;
        }

        /**
         * Creates the list of modules to check for get course updates.
         *
         * @param  {Object[]} modules List of modules.
         * @param  {Number} courseId  Course ID the modules belong to.
         * @return {Promise}          Promise resolved with the list.
         */
        function createToCheckList(modules, courseId) {
            var result = {
                    toCheck: [],
                    cannotUse: []
                },
                promises = [];

            angular.forEach(modules, function(module) {
                promises.push(getModuleStatusAndDownloadTime(module, courseId).then(function(data) {
                    if (data.status == mmCoreDownloaded) {
                        // Module is downloaded and not outdated. Check if it can check updates.
                        return self.canModuleUseCheckUpdates(module, courseId).then(function(canUse) {
                            if (canUse) {
                                // Can use check updates, add it to the tocheck list.
                                result.toCheck.push({
                                    contextlevel: 'module',
                                    id: module.id,
                                    since: data.downloadtime || 0
                                });
                            } else {
                                // Cannot use check updates, add it to the cannotUse array.
                                result.cannotUse.push(module);
                            }
                        });
                    }
                }).catch(function() {
                    // Ignore errors.
                }));
            });

            return $q.all(promises).then(function() {
                // Sort toCheck list.
                result.toCheck.sort(function (a, b) {
                    return a.id > b.id;
                });

                return result;
            });
        }

        /**
         * Get a module status and download time. It will only return the download time if the module is mmCoreDownloaded.
         *
         * @param {Object} module   Module.
         * @param {Number} courseId Course ID the module belongs to.
         * @return {Promise}        Promise resolved with the data.
         */
        function getModuleStatusAndDownloadTime(module, courseId) {
            var handler = enabledHandlers[module.modname],
                siteId = $mmSite.getId();

            if (handler) {
                // Check if the module is downloadable.
                return self.isModuleDownloadable(module, courseId).then(function(downloadable) {
                    if (!downloadable) {
                        return {
                            status: mmCoreNotDownloadable
                        };
                    }

                    var status = statusCache.getValue(handler.component, module.id, 'status');

                    if (typeof status != 'undefined' && status != mmCoreDownloaded) {
                        // Status is different than mmCoreDownloaded, just return the status.
                        return {
                            status: status
                        };
                    }

                    // Get the stored data to get the status and downloadtime.
                    return $mmFilepool.getPackageData(siteId, handler.component, module.id).then(function(data) {
                        // If downloadtime isn't set, use timemodified. This is to prevent showing all modules as
                        // outdated when updating the app from a version that didn't store download time.
                        var time = typeof data.downloadtime != 'undefined' ? data.downloadtime : data.timemodified;
                        return {
                            status: data.status,
                            downloadtime: time
                        };
                    });
                });
            }

            // No handler found, module not downloadable.
            return $q.when({
                status: mmCoreNotDownloadable
            });
        }

        /**
         * Check for updates in a course.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getCourseUpdates
         * @param  {Object[]} modules List of modules.
         * @param  {Number} courseId  Course ID the modules belong to.
         * @return {Promise}          Promise resolved with the updates. If a module is set to false, it means updates cannot be
         *                            checked for that module in the current site.
         */
        self.getCourseUpdates = function(modules, courseId) {
            if (!self.canCheckUpdates()) {
                return $q.reject();
            }

            // Check if there's already a getCourseUpdates in progress.
            var id = md5.createHash(courseId + '#' + JSON.stringify(modules)),
                siteId = $mmSite.getId(),
                promise;

            if (courseUpdatesPromises[siteId] && courseUpdatesPromises[siteId][id]) {
                // There's already a get updates ongoing, return the promise.
                return courseUpdatesPromises[siteId][id];
            } else if (!courseUpdatesPromises[siteId]) {
                courseUpdatesPromises[siteId] = {};
            }

            promise = createToCheckList(modules, courseId).then(function(data) {
                var result = {},
                    params,
                    preSets;

                // Mark as false the modules that cannot use check updates WS.
                angular.forEach(data.cannotUse, function(module) {
                    result[module.id] = false;
                });

                if (!data.toCheck.length) {
                    // Nothing to check, no need to call the WS.
                    return result;
                }

                params = {
                    courseid: courseId,
                    tocheck: data.toCheck
                };
                preSets = {
                    cacheKey: getCourseUpdatesCacheKey(courseId),
                    getEmergencyCacheUsingCacheKey: true,
                    uniqueCacheKey: true
                };

                return $mmSite.read('core_course_check_updates', params, preSets).then(function(response) {
                    if (!response || typeof response.instances == 'undefined') {
                        return $q.reject();
                    }

                    // Format the response to index it by module ID.
                    angular.forEach(response.instances, function(instance) {
                        result[instance.id] = instance;
                    });

                    // Treat warnings, adding the not supported modules.
                    angular.forEach(response.warnings, function(warning) {
                        if (warning.warningcode == 'missingcallback') {
                            result[warning.itemid] = false;
                        }
                    });

                    return result;
                });
            }).finally(function() {
                // Get updates finished, delete the promise.
                delete courseUpdatesPromises[siteId][id];
            });

            courseUpdatesPromises[siteId][id] = promise;
            return promise;
        };

        /**
         * Check for updates in a course.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getCourseUpdatesByCourseId
         * @param  {Number} courseId  Course ID the modules belong to.
         * @return {Promise}          Promise resolved with the updates.
         */
        self.getCourseUpdatesByCourseId = function(courseId) {
            if (!self.canCheckUpdates()) {
                return $q.reject();
            }

            // Get course sections.
            return $mmCourse.getSections(courseId, false, true, {omitExpires: true}).then(function(sections) {
                // Get modules. Cannot use $mmCourseHelper#getSectionsModules because of circular dependencies.
                var modules = [];
                angular.forEach(sections, function(section) {
                    if (section.modules) {
                        modules = modules.concat(section.modules);
                    }
                });

                return self.getCourseUpdates(modules, courseId);
            });
        };

        /**
         * Invalidate check updates WS call.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#invalidateCourseUpdates
         * @param {Number} courseId  Course ID.
         * @return {Promise}         Promise resolved when data is invalidated.
         */
        self.invalidateCourseUpdates = function(courseId) {
            return $mmSite.invalidateWsCacheForKey(getCourseUpdatesCacheKey(courseId));
        };

        /**
         * Get modules download size. Only treat the modules with status not downloaded or outdated.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getDownloadSize
         * @param  {Object[]} modules List of modules.
         * @param  {Number} courseid  Course ID the modules belong to.
         * @return {Promise}          Promise resolved with the download size.
         */
        self.getDownloadSize = function(modules, courseid) {
            var promises = [],
                results = {
                    size: 0,
                    total: true
                };

            angular.forEach(modules, function(module) {
                promises.push(self.getModuleStatus(module, courseid).then(function(modstatus) {
                    // Add the size of the downloadable files if need to be downloaded.
                    if (modstatus === mmCoreNotDownloaded || modstatus === mmCoreOutdated) {
                        return self.getModuleDownloadSize(module, courseid).then(function(modulesize) {
                            results.total = results.total && modulesize.total;
                            results.size += modulesize.size;
                        });
                    }
                    return $q.when();
                }));
            });

            return $q.all(promises).then(function() {
                return results;
            });
        };

        /**
         * Prefetch module using prefetch handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#prefetchModule
         * @param  {Object} module      Module to be prefetch.
         * @param  {Number} courseid    Course ID the module belongs to.
         * @return {Promise}            Promise resolved when finished.
         */
        self.prefetchModule = function(module, courseid) {
            var handler = enabledHandlers[module.modname];

            // Check if the module has a prefetch handler.
            if (handler) {
                return handler.prefetch(module, courseid);
            }
            return $q.when();
        };

        /**
         * Get Module Download Size from handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModuleDownloadSize
         * @param  {Object} module      Module to be get info from.
         * @param  {Number} courseid    Course ID the module belongs to.
         * @return {Promise}            Promise with the size.
         */
        self.getModuleDownloadSize = function(module, courseid) {
            var downloadSize,
                handler = enabledHandlers[module.modname];

            // Check if the module has a prefetch handler.
            if (handler) {
                return self.isModuleDownloadable(module, courseid).then(function(downloadable) {
                    if (!downloadable) {
                        return;
                    }

                    downloadSize = statusCache.getValue(handler.component, module.id, 'downloadSize');
                    if (typeof downloadSize != 'undefined') {
                        return downloadSize;
                    }

                    return $q.when(handler.getDownloadSize(module, courseid)).then(function(size) {
                        return statusCache.setValue(handler.component, module.id, 'downloadSize', size);
                    }).catch(function() {
                        return statusCache.getValue(handler.component, module.id, 'downloadSize', true);
                    });
                });
            }

            return $q.when(0);
        };

        /**
         * Get Module Downloaded Size from handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModuleDownloadedSize
         * @param  {Object} module      Module to be get info from.
         * @param  {Number} courseid    Course ID the module belongs to.
         * @return {Promise}            Promise with the size.
         */
        self.getModuleDownloadedSize = function(module, courseid) {
            var downloadedSize,
                handler = enabledHandlers[module.modname];

            // Check if the module has a prefetch handler.
            if (handler) {
                return self.isModuleDownloadable(module, courseid).then(function(downloadable) {
                    var promise;

                    if (!downloadable) {
                        return 0;
                    }

                    downloadedSize = statusCache.getValue(handler.component, module.id, 'downloadedSize');
                    if (typeof downloadedSize != 'undefined') {
                        return downloadedSize;
                    }

                    if (handler.getDownloadedSize) {
                        // Handler implements a method to calculate the downloaded size, use it.
                        promise = $q.when(handler.getDownloadedSize(module, courseid));
                    } else {
                        // Handler doesn't implement it, get the module files and check if they're downloaded.
                        promise = self.getModuleFiles(module, courseid).then(function(files) {
                            var siteId = $mmSite.getId(),
                                promises = [],
                                size = 0;

                            // Retrieve file size if it's downloaded.
                            angular.forEach(files, function(file) {
                                promises.push($mmFilepool.getFilePathByUrl(siteId, file.fileurl).then(function(path) {
                                    return $mmFS.getFileSize(path).catch(function () {
                                        return $mmFilepool.isFileDownloadingByUrl(siteId, file.fileurl).then(function() {
                                            // If downloading, count as downloaded.
                                            return file.filesize;
                                        }).catch(function() {
                                            // Not downloading and not found files count like 0 used space.
                                            return 0;
                                        });
                                    }).then(function(fs) {
                                        size += fs;
                                    });
                                }));
                            });

                            return $q.all(promises).then(function() {
                                return size;
                            });
                        });
                    }

                    return promise.then(function(size) {
                        return statusCache.setValue(handler.component, module.id, 'downloadedSize', size);
                    }).catch(function() {
                        return statusCache.getValue(handler.component, module.id, 'downloadedSize', true);
                    });
                });
            }

            return $q.when(0);
        };

        /**
         * Get Module Lastest Timemodified from handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModuleTimemodified
         * @param  {Object} module      Module to be get info from.
         * @param  {Number} courseid    Course ID the module belongs to.
         * @param  {Array}  [files]     Files of the module.
         * @return {Promise}            Promise with the lastest timemodified.
         */
        self.getModuleTimemodified = function(module, courseid, files) {
            var handler = enabledHandlers[module.modname],
                promise, timemodified;

            if (handler) {
                timemodified = statusCache.getValue(handler.component, module.id, 'timemodified');
                if (typeof timemodified != 'undefined') {
                    return $q.when(timemodified);
                }

                if (handler.getTimemodified) {
                    promise = handler.getTimemodified(module, courseid);
                } else {
                    // Get files if not sent.
                    promise = files ? $q.when(files) : self.getModuleFiles(module, courseid);
                    return promise.then(function(files) {
                        return $mmFilepool.getTimemodifiedFromFileList(files);
                    });
                }

                return $q.when(promise).then(function(timemodified) {
                    return statusCache.setValue(handler.component, module.id, 'timemodified', timemodified);
                }).catch(function() {
                    return statusCache.getValue(handler.component, module.id, 'timemodified', true);
                });
            }

            return $q.reject();
        };

        /**
         * Get Module Lastest Revision number from handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModuleRevision
         * @param  {Object} module      Module to be get info from.
         * @param  {Number} courseid    Course ID the module belongs to.
         * @param  {Array}  [files]     Files of the module.
         * @return {Promise}            Promise with the lastest revision.
         */
        self.getModuleRevision = function(module, courseid, files) {
            var handler = enabledHandlers[module.modname],
                promise, revision;

            if (handler) {
                revision = statusCache.getValue(handler.component, module.id, 'revision');
                if (typeof revision != 'undefined') {
                    return $q.when(revision);
                }

                if (handler.getRevision) {
                    promise = handler.getRevision(module, courseid);
                } else {
                    // Get files if not sent.
                    promise = files ? $q.when(files) : self.getModuleFiles(module, courseid);
                    promise = promise.then(function(files) {
                        return $mmFilepool.getRevisionFromFileList(files);
                    });
                }
                return $q.when(promise).then(function(revision) {
                    return statusCache.setValue(handler.component, module.id, 'revision', revision);
                }).catch(function() {
                    return statusCache.getValue(handler.component, module.id, 'revision', true);
                });
            }

            return $q.reject();
        };

        /**
         * Get Module Files from handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModuleFiles
         * @param  {Object} module      Module to be get info from.
         * @param  {Number} courseId    Course ID the module belongs to.
         * @return {Promise}            Promise with the lastest revision.
         */
        self.getModuleFiles = function(module, courseId) {
            var handler = enabledHandlers[module.modname];

            // Prevent null contents.
            module.contents = module.contents || [];

            if (handler.getFiles) {
                // The handler defines a function to getFiles, use it.
                return $q.when(handler.getFiles(module, courseId));
            } else if (handler.loadContents) {
                // The handler defines a function to load contents, use it before returning module contents.
                return handler.loadContents(module, courseId).then(function() {
                    return module.contents;
                });
            } else {
                return $q.when(module.contents);
            }
        };

        /**
         * Remove module Files from handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#removeModuleFiles
         * @param  {Object} module      Module to be get info from.
         * @param  {Number} courseid    Course ID the module belongs to.
         * @return {Promise}            Promise resolved when done.
         */
        self.removeModuleFiles = function(module, courseid) {
            var handler = enabledHandlers[module.modname],
                siteId = $mmSite.getId(),
                promise;

            if (handler && handler.removeFiles) {
                // Handler implements a method to remove the files, use it.
                promise = handler.removeFiles(module, courseid);
            } else {
                // No method to remove files, use get files to try to remove the files.
                promise = self.getModuleFiles(module, courseid).then(function(files) {
                    var promises = [];
                    angular.forEach(files, function(file) {
                        promises.push($mmFilepool.removeFileByUrl(siteId, file.fileurl).catch(function() {
                            // Ignore errors.
                        }));
                    });
                    return $q.all(promises);
                });
            }

            return promise.then(function() {
                if (handler) {
                    // Update Status of the module.
                    statusCache.setValue(handler.component, module.id, 'downloadedSize', 0);
                    $mmFilepool.storePackageStatus(siteId, handler.component, module.id, mmCoreNotDownloaded);
                }
            });
        };

        /**
         * Get the module status.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModuleStatus
         * @param {Object} module         Module.
         * @param {Number} courseid       Course ID the module belongs to.
         * @param {Number} [revision]     Module's revision. If not defined, it will be calculated using module data.
         * @param {Number} [timemodified] Module's timemodified. If not defined, it will be calculated using module data.
         * @param {Object} [updates]      Result of getCourseUpdates for all modules in the course. If not provided, it will be
         *                                calculated (slower). If it's false it means the site doesn't support check updates.
         * @return {Promise}              Promise resolved with the status.
         */
        self.getModuleStatus = function(module, courseid, revision, timemodified, updates) {
            var handler = enabledHandlers[module.modname],
                siteid = $mmSite.getId(),
                canCheck = self.canCheckUpdates();

            if (handler) {
                // Check if the module is downloadable.
                return self.isModuleDownloadable(module, courseid).then(function(downloadable) {
                    if (!downloadable) {
                        return mmCoreNotDownloadable;
                    }

                    var status = statusCache.getValue(handler.component, module.id, 'status'),
                        promise;
                    if (typeof status != 'undefined') {
                        return self.determineModuleStatus(module, status, true, canCheck);
                    }

                    // Get the saved package status.
                    return $mmFilepool.getPackageCurrentStatus(siteid, handler.component, module.id).then(function(status) {
                        status = handler.determineStatus ? handler.determineStatus(status, canCheck) : status;
                        if (status == mmCoreNotDownloaded || status == mmCoreOutdated || status == mmCoreDownloading) {
                            self.updateStatusCache(handler.component, module.id, status);
                            return self.determineModuleStatus(module, status, true, canCheck);
                        }

                        // Check if we already have course updates or calculate them.
                        if (typeof updates == 'undefined') {
                            promise = self.getCourseUpdatesByCourseId(courseid).then(function(updates) {
                                if (!updates || updates[module.id] === false) {
                                    // Cannot check updates for the module.
                                    return $q.reject();
                                }
                                return updates;
                            });
                        } else if (updates === false) {
                            promise = $q.reject(); // Cannot get updates.
                        } else {
                            promise = $q.when(updates);
                        }

                        return promise.then(function(updates) {
                            // Check if the module has any update.
                            var hasUpdPrms = self.moduleHasUpdates(module, courseid, updates).then(function(hasUpdates) {
                                if (hasUpdates) {
                                    // Has updates, mark the module as outdated.
                                    status = mmCoreOutdated;
                                    return $mmFilepool.storePackageStatus(siteid, handler.component, module.id, status)
                                            .catch(function() {
                                        // Ignore errors.
                                    }).then(function() {
                                        return status;
                                    });
                                } else {
                                    // No updates, keep current status.
                                    return status;
                                }
                            });
                            return getStatus(hasUpdPrms, true);
                        }, function() {
                            // Cannot check updates, use revision and timemodified to check it.
                            // Call getModuleFiles only if it's needed.
                            var revisionNeedsFiles = typeof revision == 'undefined' && !handler.getRevision &&
                                            typeof statusCache.getValue(handler.component, module.id, 'revision') == 'undefined',
                                timemodifiedNeedsFiles = typeof timemodified == 'undefined' && !handler.getTimemodified &&
                                            typeof statusCache.getValue(handler.component, module.id, 'timemodified') == 'undefined';

                            if (revisionNeedsFiles || timemodifiedNeedsFiles) {
                                promise = self.getModuleFiles(module, courseid);
                            } else {
                                promise = $q.when();
                            }

                            return promise.then(function(files) {

                                // Get revision and timemodified if they aren't defined.
                                // If handler doesn't define a function to get them, get them from file list.
                                var promises = [];

                                if (typeof revision == 'undefined') {
                                    promises.push(self.getModuleRevision(module, courseid, files).then(function(rev) {
                                        revision = rev;
                                    }));
                                }

                                if (typeof timemodified == 'undefined') {
                                    promises.push(self.getModuleTimemodified(module, courseid, files).then(function(timemod) {
                                        timemodified = timemod;
                                    }));
                                }

                                return $q.all(promises).then(function() {
                                    // Now get the status.
                                    var getStatusPromise = $mmFilepool.getPackageStatus(
                                            siteid, handler.component, module.id, revision, timemodified);
                                    return getStatus(getStatusPromise, false);
                                });
                            });
                        });
                    });
                });
            }

            // No handler found, module not downloadable.
            return $q.when(mmCoreNotDownloadable);

            // Get module status based on the result of a promise.
            function getStatus(promise, canCheck) {
                return promise.then(function(status) {
                    self.updateStatusCache(handler.component, module.id, status);
                    return self.determineModuleStatus(module, status, true, canCheck);
                }).catch(function() {
                    var status = statusCache.getValue(handler.component, module.id, 'status', true);
                    return self.determineModuleStatus(module, status, true, canCheck);
                });
            }
        };

        /**
         * Get the status of a list of modules, along with the lists of modules for each status.
         * @see {@link $mmFilepool#determinePackagesStatus}
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModulesStatus
         * @param  {String} sectionid         ID of the section the modules belong to.
         * @param  {Object[]} modules         List of modules to prefetch.
         * @param  {Number} courseid          Course ID the modules belong to.
         * @param  {Boolean} refresh          True if it should always check the DB (slower).
         * @param {Boolean} restoreDownloads  True if it should restore downloads. It's only used if refresh=false,
         *                                    if refresh=true then it always tries to restore downloads.
         * @return {Promise}                  Promise resolved with an object with the following properties:
         *                                            - status (String) Status of the module.
         *                                            - total (Number) Number of modules.
         *                                            - mmCoreNotDownloaded (Object[]) Modules with state mmCoreNotDownloaded.
         *                                            - mmCoreDownloaded (Object[]) Modules with state mmCoreDownloaded.
         *                                            - mmCoreDownloading (Object[]) Modules with state mmCoreDownloading.
         *                                            - mmCoreOutdated (Object[]) Modules with state mmCoreOutdated.
         */
        self.getModulesStatus = function(sectionid, modules, courseid, refresh, restoreDownloads) {

            var promises = [],
                status = mmCoreNotDownloadable,
                result = {};

            // Init result.
            result[mmCoreNotDownloaded] = [];
            result[mmCoreDownloaded] = [];
            result[mmCoreDownloading] = [];
            result[mmCoreOutdated] = [];
            result.total = 0;

            // Check updates in course. Don't use getCourseUpdates because the list of modules might not be the whole course list.
            return self.getCourseUpdatesByCourseId(courseid).catch(function() {
                // Cannot get updates.
                return false;
            }).then(function(updates) {

                angular.forEach(modules, function(module) {
                    // Check if the module has a prefetch handler.
                    var handler = enabledHandlers[module.modname],
                        promise,
                        canCheck = updates && updates[module.id] !== false;

                    // Prevent null contents.
                    module.contents = module.contents || [];

                    if (handler) {
                        var cacheStatus = statusCache.getValue(handler.component, module.id, 'status');
                        if (!refresh && typeof cacheStatus != 'undefined') {
                            promise = $q.when(self.determineModuleStatus(module, cacheStatus, restoreDownloads, canCheck));
                        } else {
                            promise = self.getModuleStatus(module, courseid, undefined, undefined, updates);
                        }

                        promises.push(
                            promise.then(function(modstatus) {
                                if (modstatus != mmCoreNotDownloadable) {
                                    // Update status cache.
                                    statusCache.setValue(handler.component, module.id, 'sectionid', sectionid);
                                    self.updateStatusCache(handler.component, module.id, modstatus);

                                    status = $mmFilepool.determinePackagesStatus(status, modstatus);
                                    result[modstatus].push(module);
                                    result.total++;
                                }
                            }).catch(function() {
                                modstatus = statusCache.getValue(handler.component, module.id, 'status', true);
                                if (typeof modstatus == 'undefined') {
                                    return $q.reject();
                                }
                                if (modstatus != mmCoreNotDownloadable) {
                                    status = $mmFilepool.determinePackagesStatus(status, modstatus);
                                    result[modstatus].push(module);
                                    result.total++;
                                }
                            })
                        );
                    }
                });

                return $q.all(promises).then(function() {
                    result.status = status;
                    return result;
                });
            });

        };

        /**
         * Get a prefetch handler.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getPrefetchHandlerFor
         * @param {String} handles The module to work on.
         * @return {Object}        Prefetch handler.
         */
        self.getPrefetchHandlerFor = function(handles) {
            return enabledHandlers[handles];
        };

        /**
         * Invalidate a list of modules in a course. This should only invalidate WS calls, not downloaded files.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#invalidateModules
         * @param  {Object[]} modules List of modules.
         * @param  {Number} courseId  Course ID.
         * @return {Promise}          Promise resolved when modules are invalidated.
         */
        self.invalidateModules = function(modules, courseId) {
            var promises = [];

            angular.forEach(modules, function(module) {
                var handler = enabledHandlers[module.modname];
                if (handler) {
                    if (handler.invalidateModule) {
                        promises.push(handler.invalidateModule(module, courseId).catch(function() {
                            // Ignore errors.
                        }));
                    }

                    // Invalidate cache.
                    statusCache.invalidate(handler.component, module.id);
                }
            });

            promises.push(self.invalidateCourseUpdates(courseId));

            return $q.all(promises);
        };

        /**
         * Check if a list of modules is being downloaded.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#isBeingDownloaded
         * @param  {String} id An ID to identify the download.
         * @return {Boolean}   True if it's being downloaded, false otherwise.
         */
        self.isBeingDownloaded = function(id) {
            return deferreds[$mmSite.getId()] && deferreds[$mmSite.getId()][id];
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updatePrefetchHandlers don't finish in the same order as they're called.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#isLastUpdateCall
         * @param  {Number}  time Time to check.
         * @return {Boolean}      True if equal, false otherwise.
         */
        self.isLastUpdateCall = function(time) {
            if (!lastUpdateHandlersStart) {
                return true;
            }
            return time == lastUpdateHandlersStart;
        };

        /**
         * Check if a module is downloadable.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#isModuleDownloadable
         * @param {Object} module   Module.
         * @param {Number} courseid Course ID the module belongs to.
         * @return {Promise}        Promise resolved with true if downloadable, false otherwise.
         */
        self.isModuleDownloadable = function(module, courseid) {
            var handler = enabledHandlers[module.modname],
                promise;

            if (handler) {
                if (typeof handler.isDownloadable == 'function') {
                    var downloadable = statusCache.getValue(handler.component, module.id, 'downloadable');
                    if (typeof downloadable != 'undefined') {
                        promise = $q.when(downloadable);
                    } else {
                        promise = $q.when(handler.isDownloadable(module, courseid)).then(function(downloadable) {
                            statusCache.setValue(handler.component, module.id, 'downloadable', downloadable);
                            return downloadable;
                        });
                    }
                } else {
                    promise = $q.when(true); // Function not defined, assume all modules are downloadable.
                }

                return promise.catch(function() {
                    // Something went wrong, assume not downloadable.
                    return false;
                });
            } else {
                // No handler for module, so it's not downloadable.
                return $q.when(false);
            }
        };

        /**
         * Check if a module has updates based on the result of getCourseUpdates.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#moduleHasUpdates
         * @param  {Object} module   Module.
         * @param  {Number} courseId Course ID the module belongs to.
         * @param  {Object} updates  Result of getCourseUpdates.
         * @return {Promise}         Promise resolved with boolean: whether the module has updates.
         */
        self.moduleHasUpdates = function(module, courseId, updates) {
            var handler = enabledHandlers[module.modname],
                moduleUpdates = updates[module.id];

            if (handler && handler.hasUpdates) {
                // Handler implements its own function to check the updates, use it.
                return $q.when(handler.hasUpdates(module, courseId, moduleUpdates));
            } else if (!moduleUpdates || !moduleUpdates.updates || !moduleUpdates.updates.length) {
                // Module doesn't have any update.
                return $q.when(false);
            } else if (handler && handler.updatesNames && handler.updatesNames.test) {
                // Check the update names defined by the handler.
                for (var i = 0, len = moduleUpdates.updates.length; i < len; i++) {
                    if (handler.updatesNames.test(moduleUpdates.updates[i].name)) {
                        return $q.when(true);
                    }
                }

                return $q.when(false);
            }

            // Handler doesn't define hasUpdates or updatesNames and there is at least 1 update. Assume it has updates.
            return $q.when(true);
        };

        /**
         * Prefetches a list of modules using their prefetch handlers.
         * If a prefetch already exists for this site and id, returns the current promise.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getPrefetchHandlerFor
         * @param  {String} id        An ID to identify the download. It can be used to retrieve the download promise.
         * @param  {Object[]} modules List of modules to prefetch.
         * @param  {Number} courseid  Course ID the modules belong to.
         * @return {Promise}          Promise resolved when all modules have been prefetched. Notify is called everytime
         *                            a module is prefetched, passing the module id as param.
         */
        self.prefetchAll = function(id, modules, courseid) {

            var siteid = $mmSite.getId();

            if (deferreds[siteid] && deferreds[siteid][id]) {
                // There's a prefetch ongoing, return the current promise.
                return deferreds[siteid][id].promise;
            }

            var deferred = $q.defer(),
                promises = [];

            // Store the deferred.
            if (!deferreds[siteid]) {
                deferreds[siteid] = {};
            }
            deferreds[siteid][id] = deferred;

            angular.forEach(modules, function(module) {
                // Prevent null contents.
                module.contents = module.contents || [];

                // Check if the module has a prefetch handler.
                var handler = enabledHandlers[module.modname];
                if (handler) {
                    promises.push(self.isModuleDownloadable(module, courseid).then(function(downloadable) {
                        if (!downloadable) {
                            return;
                        }

                        return handler.prefetch(module, courseid).then(function() {
                            deferred.notify(module.id);
                        });
                    }));
                }
            });

            $q.all(promises).then(function() {
                delete deferreds[siteid][id]; // Remove from array before resolving.
                deferred.resolve();
            }, function() {
                delete deferreds[siteid][id]; // Remove from array before rejecting.
                deferred.reject();
            });

            return deferred.promise;
        };

        /**
         * Update the enabled handlers for the current site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#updatePrefetchHandler
         * @param {String} handles The module this handler handles, e.g. forum, label.
         * @param {Object} handlerInfo The handler details.
         * @param  {Number} time Time this update process started.
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updatePrefetchHandler = function(handles, handlerInfo, time) {
            var promise,
                siteId = $mmSite.getId();

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            if (!$mmSite.isLoggedIn()) {
                promise = $q.reject();
            } else {
                promise = $q.when(handlerInfo.instance.isEnabled());
            }

            // Checks if the prefetch is enabled.
            return promise.catch(function() {
                return false;
            }).then(function(enabled) {
                // Verify that this call is the last one that was started.
                // Check that site hasn't changed since the check started.
                if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                    if (enabled) {
                        enabledHandlers[handles] = handlerInfo.instance;
                    } else {
                        delete enabledHandlers[handles];
                    }
                }
            });
        };

        /**
         * Update the handlers for the current site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#updatePrefetchHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updatePrefetchHandlers = function() {
            var promises = [],
                now = new Date().getTime();

            $log.debug('Updating prefetch handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the prefetch handlers.
            angular.forEach(prefetchHandlers, function(handlerInfo, handles) {
                promises.push(self.updatePrefetchHandler(handles, handlerInfo, now));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            });
        };

        /**
         * Update the status of a module in the "cache".
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#updateStatusCache
         * @param {String} component     Package's component.
         * @param {Mixed} [componentId]  An ID to use in conjunction with the component.
         * @return {Void}
         */
        self.updateStatusCache = function(component, componentId, status) {
            var notify,
                cachedStatus = statusCache.getValue(component, componentId, 'status', true);

            // If the status has changed, notify that the section has changed.
            notify = typeof cachedStatus != 'undefined' && cachedStatus !== status;

            if (notify) {
                var sectionId = statusCache.getValue(component, componentId, 'sectionid', true);

                // Invalidate and set again.
                statusCache.invalidate(component, componentId);
                statusCache.setValue(component, componentId, 'status', status);
                statusCache.setValue(component, componentId, 'sectionid', sectionId);

                $mmEvents.trigger(mmCoreEventSectionStatusChanged, {
                    sectionid: sectionId,
                    siteid: $mmSite.getId()
                });
            } else {
                statusCache.setValue(component, componentId, 'status', status);
            }
        };

        return self;
    };


    return self;
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, mmCoreEventLogout, $mmCoursePrefetchDelegate, $mmSite,
            mmCoreEventPackageStatusChanged, mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmCoursePrefetchDelegate.updatePrefetchHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmCoursePrefetchDelegate.updatePrefetchHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmCoursePrefetchDelegate.updatePrefetchHandlers);
    $mmEvents.on(mmCoreEventLogout, $mmCoursePrefetchDelegate.clearStatusCache);
    $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
        if (data.siteid === $mmSite.getId()) {
            $mmCoursePrefetchDelegate.updateStatusCache(data.component, data.componentId, data.status);
        }
    });
});
