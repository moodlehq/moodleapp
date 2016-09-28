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

.constant('mmCoreSynchronizationStore', 'sync')
.constant('mmCoreSynchronizationWarningsStore', 'sync_warnings')

.config(function($mmSitesFactoryProvider, mmCoreSynchronizationStore, mmCoreSynchronizationWarningsStore) {
    var stores = [
        {
            name: mmCoreSynchronizationStore,
            keyPath: ['component', 'id'],
            indexes: []
        },
        {
            name: mmCoreSynchronizationWarningsStore,
            keyPath: ['component', 'id'],
            indexes: []
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Common synchronization service.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmSync
 */
.factory('$mmSync', function($q, $log, $mmSitesManager, $mmSite, mmCoreSynchronizationStore, mmCoreSynchronizationWarningsStore) {

    $log = $log.getInstance('$mmSync');

    var self = {},
        mmSync = (function () {
            var syncPromises = {}; // Store sync promises.

            this.component = 'core';
            this.syncInterval = 300000;

            /**
             * Get the synchronization time of an instance. Returns 0 if no time stored.
             *
             * @param  {Number} id          Unique sync identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @return {Promise}            Promise resolved with the time.
             */
            this.getSyncTime = function(id, siteId) {
                siteId = siteId || $mmSite.getId();
                var that = this;

                return $mmSitesManager.getSiteDb(siteId).then(function(db) {
                    return db.get(mmCoreSynchronizationStore, [that.component, id]).then(function(entry) {
                        return entry.time;
                    }).catch(function() {
                        return 0;
                    });
                });
            };

            /**
             * Set the synchronization time of an element.
             *
             * @param  {Number} id          Unique sync identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @param {Number} [time]       Time to set. If not defined, current time.
             * @return {Promise}            Promise resolved when the time is set.
             */
            this.setSyncTime = function(id, siteId, time) {
                siteId = siteId || $mmSite.getId();
                var that = this;

                return $mmSitesManager.getSiteDb(siteId).then(function(db) {
                    var entry = {
                            id: id,
                            component: that.component,
                            time: typeof time != 'undefined' ? time : new Date().getTime()
                        };
                    return db.insert(mmCoreSynchronizationStore, entry);
                });
            };

            /**
             * Check if a sync is needed: if a certain time has passed since the last time.
             *
             * @param  {Number} id          Unique sync identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @return {Promise}        Promise resolved when the survey is synced or if it doesn't need to be synced.
             */
            this.isSyncNeeded = function(id, siteId) {
                siteId = siteId || $mmSite.getId();
                var that = this;

                return this.getSyncTime(id, siteId).then(function(time) {
                    return new Date().getTime() - that.syncInterval >= time;
                });
            };

            /**
             * Check if a there's an ongoing syncronization for the given identifier.
             *
             * @param  {Number} id          Unique sync identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @return {Boolean}            True if synchronizing, false otherwise.
             */
            this.isSyncing = function(id, siteId) {
                siteId = siteId || $mmSite.getId();
                var uniqueId = this.getUniqueSyncId(id);
                return !!(syncPromises[siteId] && syncPromises[siteId][uniqueId]);
            };

            /**
             * If there's an ongoing sync for a certain identifier, wait for it to end.
             * If there's no sync ongoing the promise will be resolved right away.
             *
             * @param  {Number} id          Unique sync identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @return {Promise}            Promise resolved when there's no sync going on for the identifier.
             */
            this.waitForSync = function(id, siteId) {
                siteId = siteId || $mmSite.getId();

                if (this.isSyncing(id, siteId)) {
                    // There's a sync ongoing for this id.
                    var uniqueId = this.getUniqueSyncId(id);

                    return syncPromises[siteId][uniqueId].catch(function() {});
                }
                return $q.when();
            };

            /**
             * If there's an ongoing sync for a certain identifier return it.
             *
             * @param  {Number} id          Unique sync identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @return {Promise}            Promise of the current sync or false if there isn't any.
             */
            this.getOngoingSync = function (id, siteId) {
                siteId = siteId || $mmSite.getId();

                if (this.isSyncing(id, siteId)) {
                    // There's already a sync ongoing for this discussion, return the promise.
                    var uniqueId = this.getUniqueSyncId(id);

                    return syncPromises[siteId][uniqueId];
                }
                return false;
            };

            /**
             * Add an ongoing sync to the syncPromises list. On finish the promise will be removed.
             *
             * @param  {Number} id          Unique sync identifier per component.
             * @param  {String} [siteId]    Site ID. If not defined, current site.
             * @return {Promise}            Promise of the current sync.
             */
            this.addOngoingSync = function (id, promise, siteId) {
                var uniqueId = this.getUniqueSyncId(id);

                siteId = siteId || $mmSite.getId();

                if (!syncPromises[siteId]) {
                    syncPromises[siteId] = {};
                }

                syncPromises[siteId][uniqueId] = promise;

                // Promise will be deleted when finish.
                return promise.finally(function() {
                    delete syncPromises[siteId][uniqueId];
                });
            };

            // Convenience function to create unique identifiers from component and current id.
            this.getUniqueSyncId = function(id) {
                return this.component + '#' + id;
            };

            /**
             * Get the synchronization warnings of an instance.
             *
             * @param  {Number} id       Unique sync identifier per component.
             * @param  {String} [siteId] Site ID. If not defined, current site.
             * @return {Promise}         Promise resolved with the time.
             */
            this.getSyncWarnings = function(id, siteId) {
                siteId = siteId || $mmSite.getId();
                var that = this;

                return $mmSitesManager.getSiteDb(siteId).then(function(db) {
                    return db.get(mmCoreSynchronizationWarningsStore, [that.component, id]).then(function(entry) {
                        return entry.warnings;
                    }).catch(function() {
                        return [];
                    });
                });
            };

            /**
             * Set the synchronization warnings for an instance.
             *
             * @param  {Number}   id       Unique sync identifier per component.
             * @param  {String[]} warnings Warnings to set.
             * @param  {String}   [siteId] Site ID. If not defined, current site.
             * @return {Promise}           Promise resolved when done.
             */
            this.setSyncWarnings = function(id, warnings, siteId) {
                siteId = siteId || $mmSite.getId();
                var that = this;

                return $mmSitesManager.getSiteDb(siteId).then(function(db) {
                    var entry = {
                        id: id,
                        component: that.component,
                        warnings: typeof warnings != 'undefined' ? warnings : []
                    };
                    return db.insert(mmCoreSynchronizationWarningsStore, entry);
                });
            };

            return this;
        }());

    /**
     * Returns the subclass of mmSync object.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSync#createChild
     * @param  {String} component       Component where the syncing belongs.
     * @param  {Number} [syncInterval]  Time to wait between automatic sync processes.
     * @return {Object}                 Child object of mmSync.
     */
    self.createChild = function(component, syncInterval) {
        var child = Object.create(mmSync);
        child.component = component;
        if (typeof syncInterval != 'undefined') {
            child.syncInterval = syncInterval;
        }
        return child;
    };

    return self;
});