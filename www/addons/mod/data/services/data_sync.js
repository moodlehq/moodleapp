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

angular.module('mm.addons.mod_data')

/**
 * Data synchronization service.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataSync
 */
.factory('$mmaModDataSync', function($log, $mmaModData, $mmSite, $mmSitesManager, $q, $mmaModDataOffline, $mmCourse, $mmUtil,
            $mmApp, $mmEvents, $translate, mmaModDataSyncTime, $mmSync, mmaModDataEventAutomSynced, mmaModDataComponent,
            $mmSyncBlock, $mmLang, $mmaModDataHelper) {

    $log = $log.getInstance('$mmaModDataSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModDataComponent, mmaModDataSyncTime);

    /**
     * Check if a database has data to synchronize.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataSync#hasDataToSync
     * @param  {Number} dataId   Database ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    self.hasDataToSync = function(dataId, siteId) {
        return $mmaModDataOffline.hasOfflineData(dataId, siteId);
    };

    /**
     * Try to synchronize all data that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataSync#syncAllDatabases
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllDatabases = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all databases because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync database in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync database in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Sync submissions.
                sitePromises.push($mmaModDataOffline.getAllEntries(siteId).then(function(offlineActions) {
                    var promises = {};

                    // Do not sync same database twice.
                    angular.forEach(offlineActions, function(action) {
                        if (typeof promises[action.dataid] != 'undefined') {
                            return;
                        }

                        promises[action.dataid] = self.syncDatabaseIfNeeded(action.dataid, siteId)
                                .then(function(result) {
                            if (result && result.updated) {
                                // Sync done. Send event.
                                $mmEvents.trigger(mmaModDataEventAutomSynced, {
                                    siteid: siteId,
                                    dataid: action.dataid,
                                    warnings: result.warnings
                                });
                            }
                        });
                    });
                    // Promises will be an object so, convert to an array first;
                    promises = $mmUtil.objectToArray(promises);

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync a database only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataSync#syncDatabaseIfNeeded
     * @param  {Number} dataId      Database ID.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the data is synced or if it doesn't need to be synced.
     */
    self.syncDatabaseIfNeeded = function(dataId, siteId) {
        return self.isSyncNeeded(dataId, siteId).then(function(needed) {
            if (needed) {
                return self.syncDatabase(dataId, siteId);
            }
        });
    };

    /**
     * Try to synchronize a database.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataSync#syncDatabase
     * @param  {Number} dataId      Data ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncDatabase = function(dataId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            data,
            courseId,
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(dataId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return self.getOngoingSync(dataId, siteId);
        }

        // Verify that data isn't blocked.
        if ($mmSyncBlock.isBlocked(mmaModDataComponent, dataId, siteId)) {
            $log.debug('Cannot sync database ' + dataId + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('data');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
        }

        $log.debug('Try to sync database ' + dataId);

        // Get offline actions to be sent.
        syncPromise = $mmaModDataOffline.getDatabaseEntries(dataId, siteId).catch(function() {
            // No offline data found, return empty array.
            return [];
        }).then(function(offlineActions) {
            if (!offlineActions.length) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            courseId = offlineActions[0].courseid;

            return $mmaModData.getDatabaseById(courseId, dataId, siteId).then(function(database) {
                data = database;

                var promises = [],
                    offlineEntries = {};

                angular.forEach(offlineActions, function(entry) {
                    if (typeof offlineEntries[entry.entryid] == "undefined") {
                        offlineEntries[entry.entryid] = [];
                    }
                    offlineEntries[entry.entryid].push(entry);
                });

                angular.forEach(offlineEntries, function(entryActions) {
                    promises.push(syncEntry(data, entryActions, result, siteId));
                });

                return $q.all(promises);
            }).then(function() {
                if (result.updated) {
                    // Data has been sent to server. Now invalidate the WS calls.
                    return $mmaModData.invalidateContent(data.cmid, courseId, siteId).catch(function() {
                        // Ignore errors.
                    });
                }
            });
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(dataId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(dataId, syncPromise, siteId);
    };

    /**
     * Synchronize an entry.
     *
     * @param  {Object} data          Database.
     * @param  {Object} entryActions  Entry actions.
     * @param  {Object} result        Object with the result of the sync.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved if success, rejected otherwise.
     */
    function syncEntry(data, entryActions, result, siteId) {
        var discardError,
            timePromise,
            entryId = 0,
            offlineId,
            deleted = false,
            promises = [];

        // Sort entries by timemodified.
        entryActions = entryActions.sort(function(a, b) {
            return a.timemodified - b.timemodified;
        });

        entryId = entryActions[0].entryid;

        if (entryId > 0) {
            timePromise = $mmaModData.getEntry(data.id, entryId, siteId).then(function(entry) {
                return entry.entry.timemodified;
            }).catch(function() {
                return -1;
            });
        } else {
            offlineId = entryId;
            timePromise = $q.when(0);
        }

        return timePromise.then(function(timemodified) {
            if (timemodified < 0 || timemodified >= entryActions[0].timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = $translate.instant('mma.mod_data.warningsubmissionmodified');
                return $mmaModDataOffline.deleteAllEntryActions(data.id, entryId, siteId);
            }

            angular.forEach(entryActions, function(action) {
                var actionPromise,
                    proms = [];

                entryId = action.entryid > 0 ? action.entryid : entryId;

                if (action.fields) {
                    angular.forEach(action.fields, function(field) {
                        // Upload Files if asked.
                        var value = JSON.parse(field.value);
                        if (value.online || value.offline) {
                            var files = value.online || [],
                                fileProm = value.offline ? $mmaModDataHelper.getStoredFiles(action.dataid, entryId, field.fieldid) :
                                    $q.when([]);

                            proms.push(fileProm.then(function(offlineFiles) {
                                files = files.concat(offlineFiles);
                                return $mmaModDataHelper.uploadOrStoreFiles(action.dataid, 0, entryId, field.fieldid, files, false,
                                        siteId).then(function(filesResult) {
                                    field.value = JSON.stringify(filesResult);
                                });
                            }));
                        }
                    });
                }

                actionPromise = $q.all(proms).then(function() {
                    // Perform the action.
                    switch (action.action) {
                        case 'add':
                            return $mmaModData.addEntryOnline(action.dataid, action.fields, data.groupid, siteId)
                                    .then(function(result) {
                                entryId = result.newentryid;
                            });
                        case 'edit':
                            return $mmaModData.editEntryOnline(entryId, action.fields, siteId);
                        case 'approve':
                            return $mmaModData.approveEntryOnline(entryId, true, siteId);
                        case 'disapprove':
                            return $mmaModData.approveEntryOnline(entryId, false, siteId);
                        case 'delete':
                            return $mmaModData.deleteEntryOnline(entryId, siteId).then(function() {
                                deleted = true;
                            });
                    }
                });

                promises.push(actionPromise.catch(function(error) {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means it cannot be performed. Discard.
                        discardError = error.error;
                    } else {
                        // Couldn't connect to server, reject.
                        return $q.reject(error && error.error);
                    }
                }).then(function() {
                    // Delete the offline data.
                    result.updated = true;
                    return $mmaModDataOffline.deleteEntry(action.dataid, action.entryid, action.action, siteId);
                }));
            });
            return $q.all(promises);
        }).then(function() {
            if (discardError) {
                // Submission was discarded, add a warning.
                var message = $translate.instant('mm.core.warningofflinedatadeleted', {
                    component: $mmCourse.translateModuleName('data'),
                    name: data.name,
                    error: discardError
                });

                if (result.warnings.indexOf(message) == -1) {
                    result.warnings.push(message);
                }
            }

            // Sync done. Send event.
            $mmEvents.trigger(mmaModDataEventAutomSynced, {
                siteid: siteId,
                dataid: data.id,
                entryid: entryId,
                offlineentryid: offlineId,
                warnings: result.warnings,
                deleted: deleted
            });
        });
    }

    return self;
});
