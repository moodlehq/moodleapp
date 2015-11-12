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
     *                           returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled() (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                             - getStatus(module) (Promise) Returns the status of a module.
     *                             - prefetch(module) (Promise) Prefetches a module.
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

    self.$get = function($q, $log, $mmSite, $mmUtil, $mmCourse, $mmEvents, mmCoreDownloaded, mmCoreDownloading,
                mmCoreNotDownloaded, mmCoreOutdated, mmCoreNotDownloadable, mmCoreCourseSectionStatusChanged) {
        var enabledHandlers = {},
            self = {},
            deferreds = {},
            statusCache = {}; // To speed up the getModulesStatus function.

        $log = $log.getInstance('$mmCoursePrefetchDelegate');

        /**
         * Clear the status cache (memory object).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#clearStatusCache
         * @return {Void}
         */
        self.clearStatusCache = function() {
            statusCache = {};
        };

        /**
         * Get modules download size. Only treat the modules with status not downloaded or outdated.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getDownloadSize
         * @param  {Object[]} modules List of modules.
         * @return {Promise}          Promise resolved with the download size.
         */
        self.getDownloadSize = function(modules) {
            var size = 0,
                promises = [];

            angular.forEach(modules, function(module) {
                // Check if the module has a prefetch handler.
                var handler = enabledHandlers[module.modname];
                if (handler) {
                    // Check if the file will be downloaded.
                    promises.push(handler.getStatus(module).then(function(modstatus) {
                        if (modstatus === mmCoreNotDownloaded || modstatus === mmCoreOutdated) {
                            // Add the size of the downloadable files.
                            angular.forEach(module.contents, function(content) {
                                if (handler.isFileDownloadable(content) && content.filesize) {
                                    size = size + content.filesize;
                                }
                            });
                        }
                    }));
                }
            });

            return $q.all(promises).then(function() {
                return size;
            });
        };

        /**
         * Get the status of a list of modules, along with the lists of modules for each status.
         * @see {@link $mmCourse#determineModulesStatus}
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getModulesStatus
         * @param  {String} sectionid         ID of the section the modules belong to.
         * @param  {Object[]} modules         List of modules to prefetch.
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
        self.getModulesStatus = function(sectionid, modules, refresh, restoreDownloads) {

            var promises = [],
                status = mmCoreNotDownloadable,
                result = {};

            // Init result.
            result[mmCoreNotDownloaded] = [];
            result[mmCoreDownloaded] = [];
            result[mmCoreDownloading] = [];
            result[mmCoreOutdated] = [];
            result.total = 0;

            angular.forEach(modules, function(module) {
                // Check if the module has a prefetch handler.
                var handler = enabledHandlers[module.modname],
                    promise;
                if (handler) {
                    if (!refresh && statusCache[module.id] && statusCache[module.id].status) {
                        promise = $q.when(handler.determineStatus(module, statusCache[module.id].status, restoreDownloads));
                    } else {
                        promise = handler.getStatus(module);
                    }

                    promises.push(promise.then(function(modstatus) {
                        // Update status cache.
                        statusCache[module.id] = {
                            status: modstatus,
                            sectionid: sectionid
                        };
                        status = $mmCourse.determineModulesStatus(status, modstatus);
                        result[modstatus].push(module);
                        result.total++;
                    }));
                }
            });

            return $q.all(promises).then(function() {
                result.status = status;
                return result;
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
         * Prefetches a list of modules using their prefetch handlers.
         * If a prefetch already exists for this site and id, returns the current promise.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmCoursePrefetchDelegate#getPrefetchHandlerFor
         * @param  {String} siteid    Site ID.
         * @param  {String} id        An ID to identify the download. It can be used to retrieve the download promise.
         * @param  {Object[]} modules List of modules to prefetch.
         * @return {Promise}          Promise resolved when all modules have been prefetched. Notify is called everytime
         *                            a module is prefetched, passing the module id as param.
         */
        self.prefetchAll = function(id, modules) {

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
                // Check if the module has a prefetch handler.
                var handler = enabledHandlers[module.modname];
                if (handler) {
                    promises.push(handler.prefetch(module).then(function() {
                        deferred.notify(module.id);
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
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updatePrefetchHandler = function(handles, handlerInfo) {
            var promise;

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            if (!$mmSite.isLoggedIn()) {
                promise = $q.reject();
            } else {
                promise = $q.when(handlerInfo.instance.isEnabled());
            }

            // Checks if the prefetch is enabled.
            return promise.then(function(enabled) {
                if (enabled) {
                    enabledHandlers[handles] = handlerInfo.instance;
                } else {
                    return $q.reject();
                }
            }).catch(function() {
                delete enabledHandlers[handles];
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
            var promises = [];

            $log.debug('Updating prefetch handlers for current site.');

            // Loop over all the prefetch handlers.
            angular.forEach(prefetchHandlers, function(handlerInfo, handles) {
                promises.push(self.updatePrefetchHandler(handles, handlerInfo));
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
         * @return {Void}
         */
        self.updateStatusCache = function(moduleid, status) {
            var notify = false;

            if (statusCache[moduleid]) {
                // If the status has changed, notify that the section has changed.
                notify = statusCache[moduleid].status !== status;
            } else {
                statusCache[moduleid] = {};
            }
            statusCache[moduleid].status = status;

            if (notify) {
                $mmEvents.trigger(mmCoreCourseSectionStatusChanged, {
                    sectionid: statusCache[moduleid].sectionid,
                    siteid: $mmSite.getId()
                });
            }
        };

        return self;
    };


    return self;
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, mmCoreEventLogout, $mmCoursePrefetchDelegate, $mmSite,
            mmCoreCourseModuleStatusChanged) {
    $mmEvents.on(mmCoreEventLogin, $mmCoursePrefetchDelegate.updatePrefetchHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmCoursePrefetchDelegate.updatePrefetchHandlers);
    $mmEvents.on(mmCoreEventLogout, $mmCoursePrefetchDelegate.clearStatusCache);
    $mmEvents.on(mmCoreCourseModuleStatusChanged, function(data) {
        if (data.siteid === $mmSite.getId()) {
            $mmCoursePrefetchDelegate.updateStatusCache(data.moduleid, data.status);
        }
    });
});
