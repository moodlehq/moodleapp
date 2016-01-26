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

angular.module('mm.addons.mod_scorm')

.constant('mmaModScormSynchronizationStore', 'mod_scorm_sync')

.config(function($mmSitesFactoryProvider, mmaModScormSynchronizationStore) {
    var stores = [
        {
            name: mmaModScormSynchronizationStore,
            keyPath: 'scormid',
            indexes: []
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * SCORM synchronization service.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormSync
 */
.factory('$mmaModScormSync', function($mmaModScorm, $mmSite, $q, $translate, $mmaModScormOnline, $mmaModScormOffline, $mmUtil,
            $log, mmaModScormSynchronizationStore, mmaModScormSyncTime, $mmConfig, mmCoreSettingsSyncOnlyOnWifi, $mmApp,
            $mmEvents, mmaModScormEventAutomSynced, $mmSitesManager) {
    $log = $log.getInstance('$mmaModScormSync');

    var self = {},
        syncPromises = {}; // Store sync promises.

    /**
     * Get the synchronization time of a SCORM. Returns 0 if no time stored.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormSync#getScormSyncTime
     * @param {Number} scormId  SCORM ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the time.
     */
    self.getScormSyncTime = function(scormId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            return db.get(mmaModScormSynchronizationStore, scormId).then(function(entry) {
                return entry.time;
            }).catch(function() {
                return 0;
            });
        });
    };

    /**
     * Set the synchronization time of a SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormSync#setScormSyncTime
     * @param {Number} scormId  SCORM ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @param {Number} [time]   Time to set. If not defined, current time.
     * @return {Promise}        Promise resolved when the time is set.
     */
    self.setScormSyncTime = function(scormId, siteId, time) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            if (typeof time == 'undefined') {
                time = new Date().getTime();
            }
            return db.insert(mmaModScormSynchronizationStore, {scormid: scormId, time: time});
        });
    };

    /**
     * Try to synchronize all SCORMs from current site that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormSync#syncAllScorms
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllScorms = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all SCORMs because device is offline.');
            return $q.reject();
        }

        // We first check sync settings and current connection to see if we can sync.
        return $mmConfig.get(mmCoreSettingsSyncOnlyOnWifi, true).then(function(syncOnlyOnWifi) {

            if (syncOnlyOnWifi && $mmApp.isNetworkAccessLimited()) {
                $log.debug('Cannot sync all SCORMs because device isn\'t using a WiFi network.');
                return $q.reject();
            }

            var promise;
            if (!siteId) {
                // No site ID defined, sync all sites.
                $log.debug('Try to sync SCORMs in all sites.');
                promise = $mmSitesManager.getSitesIds();
            } else {
                $log.debug('Try to sync SCORMs in site ' + siteId);
                promise = $q.when([siteId]);
            }

            return promise.then(function(siteIds) {
                var sitePromises = [];

                angular.forEach(siteIds, function(siteId) {
                    sitePromises.push($mmaModScormOffline.getAllAttempts(siteId).then(function(attempts) {
                        var scorms = [],
                            ids = [], // To prevent duplicates.
                            promises = [];

                        // Get the IDs of all the SCORMs that have something to be synced.
                        angular.forEach(attempts, function(attempt) {
                            if (ids.indexOf(attempt.scormid) == -1) {
                                ids.push(attempt.scormid);
                                scorms.push({
                                    id: attempt.scormid,
                                    courseid: attempt.courseid
                                });
                            }
                        });

                        // Sync all SCORMs that haven't been synced for a while and that aren't played right now.
                        angular.forEach(scorms, function(scorm) {
                            if (!$mmaModScorm.isScormBeingPlayed(scorm.id, siteId)) {
                                promises.push($mmaModScorm.getScormById(scorm.courseid, scorm.id, '', siteId).then(function(scorm) {
                                    return self.syncScormIfNeeded(scorm, siteId).then(function(warnings) {
                                        if (typeof warnings != 'undefined') {
                                            // We tried to sync. Send event.
                                            $mmEvents.trigger(mmaModScormEventAutomSynced, {
                                                siteid: siteId,
                                                scormid: scorm.id
                                            });
                                        }
                                    });
                                }));
                            }
                        });

                        return $q.all(promises);
                    }));
                });

                return $q.all(sitePromises);
            });
        });
    };

    /**
     * Send data from a SCORM offline attempt to the site.
     * Reserved for core use, please use $mmaModScormSync#syncScorm to synchronize SCORM data.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormSync#_syncAttempt
     * @param  {Number} scormId  SCORM ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the attempt is successfully synced.
     * @protected
     */
    self._syncAttempt = function(scormId, attempt, siteId) {
        siteId = siteId || $mmSite.getId();
        $log.debug('Try to sync attempt ' + attempt + ' in SCORM ' + scormId + ' and site ' + siteId);
        // Get only not synced entries.
        return $mmaModScormOffline.getScormStoredData(siteId, scormId, attempt, undefined, true).then(function(entries) {
            var scos = {},
                promises = [],
                somethingSynced = false;

            // Get data to send (only elements with dots like cmi.core.exit, in Mobile we store more data to make offline work).
            angular.forEach(entries, function(entry) {
                if (entry.element.indexOf('.') > -1) {
                    if (!scos[entry.scoid]) {
                        scos[entry.scoid] = [];
                    }
                    scos[entry.scoid].push({
                        element: entry.element,
                        value: entry.value
                    });
                }
            });

            angular.forEach(scos, function(tracks, scoId) {
                promises.push($mmaModScormOnline.saveTracks(siteId, scormId, scoId, attempt, tracks).then(function() {
                    // Sco data successfully sent. Mark them as synced. This is needed because some SCOs sync might fail.
                    return $mmaModScormOffline.markAsSynced(siteId, scormId, attempt, undefined, scoId).catch(function() {
                        // Ignore errors.
                    }).then(function() {
                        somethingSynced = true;
                    });
                }));
            });

            return $mmUtil.allPromises(promises).then(function() {
                // Attempt has been sent. Let's delete it from local.
                return $mmaModScormOffline.deleteAttempt(siteId, scormId, attempt).catch(function() {
                    // Failed to delete (shouldn't happen). Let's retry once.
                    return $mmaModScormOffline.deleteAttempt(siteId, scormId, attempt).catch(function() {
                        // Maybe there's something wrong with the data or the storage implementation.
                        $log.error('After sync: error deleting attempt ' + attempt + ' in SCORM ' + scormId);
                    });
                });
            }).catch(function() {
                if (somethingSynced) {
                    // Some SCOs have been synced and some not. We'll try to store a snapshot of the current state
                    // to be able to re-try the synchronization later.
                    $log.error('Error synchronizing some SCOs for attempt ' + attempt + ' in SCORM ' + scormId + '. Saving snapshot.');
                    return saveSyncSnapshot(scormId, attempt, siteId).then(function() {
                        return $q.reject();
                    });
                } else {
                    $log.error('Error synchronizing attempt ' + attempt + ' in SCORM ' + scormId);
                }
                return $q.reject();
            });
        });
    };

    /**
     * Save a snapshot from a synchronization.
     *
     * @param  {Number} scormId SCORM ID.
     * @param  {Number} attempt Attemot number.
     * @param  {String} siteId  Site ID.
     * @return {Promise}        Promise resolved when the snapshot is stored.
     */
    function saveSyncSnapshot(scormId, attempt, siteId) {
        // Try to get current state from Moodle.
        return $mmaModScorm.getScormUserData(scormId, attempt, false, siteId, undefined, true).then(function(data) {
            return $mmaModScormOffline.setAttemptSnapshot(siteId, scormId, attempt, data);
        }, function() {
            // Error getting user data from Moodle. We'll have to build it ourselves.
            // Let's try to get cached data about the attempt.
            return $mmaModScorm.getScormUserData(scormId, attempt, false, siteId).catch(function() {
                // No cached data, Moodle has no data stored.
                return {};
            }).then(function(data) {
                // We need to add the synced data to the snapshot.
                return $mmaModScormOffline.getScormStoredData(siteId, scormId, attempt, undefined, false, true)
                            .then(function(synced) {
                    angular.forEach(synced, function(entry) {
                        if (!data[entry.scoid]) {
                            data[entry.scoid] = {
                                scoid: entry.scoid,
                                userdata: {}
                            };
                        }
                        data[entry.scoid].userdata[entry.element] = entry.value;
                    });
                    return $mmaModScormOffline.setAttemptSnapshot(siteId, scormId, attempt, data);
                });
            });
        });
    }

    /**
     * Sync a SCORM only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormSync#syncScormIfNeeded
     * @param {Object} scorm    SCORM downloaded.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the SCORM is synced or if it doesn't need to be synced.
     */
    self.syncScormIfNeeded = function(scorm, siteId) {
        siteId = siteId || $mmSite.getId();
        return self.getScormSyncTime(scorm.id, siteId).then(function(time) {
            if (new Date().getTime() - mmaModScormSyncTime >= time) {
                return self.syncScorm(scorm, siteId);
            }
        });
    };

    /**
     * Try to synchronize a SCORM's attempts.
     * The promise returned will be resolved with an array with warnings if the synchronization is successful. A successful
     * synchronization doesn't mean that all the data has been sent to the site, it's possible that some attempt can't be sent.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormSync#syncScorm
     * @param  {Object} scorm   SCORM to sync.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with warnings in success, rejected if synchronization fails.
     */
    self.syncScorm = function(scorm, siteId) {
        siteId = siteId || $mmSite.getId();
        var warnings = [],
            syncPromise,
            deleted = false;

        if (syncPromises[siteId] && syncPromises[siteId][scorm.id]) {
            // There's already a sync ongoing for this SCORM, return the promise.
            return syncPromises[siteId][scorm.id];
        } else if (!syncPromises[siteId]) {
            syncPromises[siteId] = {};
        }

        if ($mmaModScormOnline.isScormBlocked(siteId, scorm.id) || $mmaModScormOffline.isScormBlocked(siteId, scorm.id)) {
            $log.debug('Cannot sync SCORM ' + scorm.id + ' because it is blocked.');
            return $q.reject();
        }

        $log.debug('Try to sync SCORM ' + scorm.id + ' in site ' + siteId);

        // Prefetches data , set sync time and return warnings.
        function finishSync() {
            return $mmaModScorm.invalidateAllScormData(scorm.id, siteId).catch(function() {}).then(function() {
                return $mmaModScorm.prefetchData(scorm, siteId).then(function() {
                    return self.setScormSyncTime(scorm.id, siteId).catch(function() {
                        // Ignore errors.
                    }).then(function() {
                        return warnings; // No offline attempts, nothing to sync.
                    });
                });
            });
        }

        // Get attempts data. We ignore cache for online attempts, so this call will fail if offline or server down.
        syncPromise = $mmaModScorm.getAttemptCount(scorm.id, siteId, undefined, false, true).then(function(attemptsData) {
            if (!attemptsData.offline || !attemptsData.offline.length) {
                return finishSync();
            }

            var collisions = [],
                lastOnline = 0,
                promise;

            // Check if there are collisions between offline and online attempts (same number).
            angular.forEach(attemptsData.online, function(attempt) {
                lastOnline = Math.max(lastOnline, attempt);
                if (attemptsData.offline.indexOf(attempt) > -1) {
                    collisions.push(attempt);
                }
            });

            // Check if last online attempt is finished. Ignore cache.
            promise = lastOnline > 0 ? $mmaModScorm.isAttemptIncomplete(scorm.id, lastOnline, false, true, siteId) : $q.when(false);

            return promise.then(function(incomplete) {
                if (!collisions.length && !incomplete) {
                    // No collisions and last attempt is complete. Send offline attempts to Moodle.
                    var promises = [];
                    angular.forEach(attemptsData.offline, function(attempt) {
                        if (scorm.maxattempt == 0 || attempt <= scorm.maxattempt) {
                            promises.push(self._syncAttempt(scorm.id, attempt, siteId));
                        }
                    });
                    return $q.all(promises).then(function() {
                        return finishSync();
                    });

                } else if (collisions.length) {
                    // We have collisions, treat them.
                    return treatCollisions(scorm.id, siteId, collisions, lastOnline, attemptsData.offline).then(function(warns) {
                        warnings = warnings.concat(warns);

                        // The offline attempts might have changed since some collisions can be converted to new attempts.
                        return $mmaModScormOffline.getAttempts(siteId, scorm.id).then(function(entries) {
                            var promises = [],
                                cannotSyncSome = false;

                            entries = entries.map(function(entry) {
                                return entry.attempt; // Get only the attempt number.
                            });
                            if (incomplete && entries.indexOf(lastOnline) > -1) {
                                // Last online was incomplete, but it was continued in offline.
                                incomplete = false;
                            }

                            angular.forEach(entries, function(attempt) {
                                // We'll always sync attempts previous to lastOnline (failed sync or continued in offline).
                                // We'll only sync new attemps if last online attempt is completed.
                                if (!incomplete || attempt <= lastOnline) {
                                    if (scorm.maxattempt == 0 || attempt <= scorm.maxattempt) {
                                        promises.push(self._syncAttempt(scorm.id, attempt, siteId));
                                    }
                                } else {
                                    cannotSyncSome = true;
                                }
                            });
                            return $q.all(promises).then(function() {
                                if (cannotSyncSome) {
                                    warnings.push($translate.instant('mma.mod_scorm.warningsynconlineincomplete'));
                                }
                                return finishSync();
                            });
                        });
                    });
                } else {
                    // No collisions, but last online attempt is incomplete so we can't send offline attempts.
                    warnings.push($translate.instant('mma.mod_scorm.warningsynconlineincomplete'));
                    return finishSync();
                }
            });
        }).finally(function() {
            deleted = true;
            delete syncPromises[siteId][scorm.id];
        });

        if (!deleted) {
            syncPromises[siteId][scorm.id] = syncPromise;
        }
        return syncPromise;
    };

    /**
     * Treat collisions found in a SCORM synchronization process.
     *
     * @param  {Number} scormId           SCORM ID.
     * @param  {String} siteId            Site ID.
     * @param  {Number[]} collisions      Numbers of attempts that exist both in online and offline.
     * @param  {Number} lastOnline        Last online attempt.
     * @param  {Number[]} offlineAttempts Numbers of offline attempts.
     * @return {Promise}                  Promise resolved when the collisions have been treated. It returns warnings array.
     * @description
     *
     * Treat collisions found in a SCORM synchronization process. A collision is when an attempt exists both in offline
     * and online. A collision can be:
     *
     * - Two different attempts.
     * - An online attempt continued in offline.
     * - A failure in a previous sync.
     *
     * This function will move into new attempts the collisions that can't be merged. It will usually keep the order of the
     * offline attempts EXCEPT if the offline attempt was created after the last offline attempt (edge case).
     *
     * Edge case: A user creates offline attempts and when he syncs we retrieve an incomplete online attempt, so the offline
     * attempts cannot be synced. Then the user continues that online attempt and goes offline, so a collision is created.
     * When we perform the next sync we detect that this collision cannot be merged, so this offline attempt needs to be
     * created as a new attempt. Since this attempt was created after the last offline attempt, it will be added ot the end
     * of the list if the last attempt is completed. If the last attempt is not completed then the offline data will de deleted
     * because we can't create a new attempt.
     */
    function treatCollisions(scormId, siteId, collisions, lastOnline, offlineAttempts) {
        var warnings = [],
            promises = [],
            newAttemptsSameOrder = [], // Attempts that will be created as new attempts but keeping the current order.
            newAttemptsAtEnd = {}, // Attempts that will be created at the end of the list of attempts (should be max 1 attempt).
            lastCollision = Math.max.apply(Math, collisions),
            lastOffline = Math.max.apply(Math, offlineAttempts),
            lastOfflineIncomplete,
            lastOfflineCreated;

        // Get the creation time and the status (complete/incomplete) of the last offline attempt.
        function getLastOfflineAttemptData() {
            // Check if last offline attempt is incomplete.
            return $mmaModScorm.isAttemptIncomplete(scormId, lastOffline, true, false, siteId).then(function(incomplete) {
                lastOfflineIncomplete = incomplete;
                return $mmaModScormOffline.getAttemptCreationTime(siteId, scormId, lastOffline).then(function(time) {
                    lastOfflineCreated = time;
                });
            });
        }

        // Add an attempt to the right new attempts array if possible.
        // If the attempt cannot be created as a new attempt then it will be deleted.
        function addToNewOrDelete(attempt) {
            if (attempt == lastOffline) {
                newAttemptsSameOrder.push(attempt);
                return $q.when();
            }

            return $mmaModScormOffline.getAttemptCreationTime(siteId, scormId, attempt).then(function(time) {
                if (time > lastOfflineCreated) {
                    // This attempt was created after the last offline attempt, we'll add it to the end of the list if possible.
                    if (lastOfflineIncomplete) {
                        // It can't be added because the last offline attempt is incomplete, delete it.
                        $log.debug('Try to delete attempt ' + attempt + ' because it cannot be created as a new attempt.');
                        return $mmaModScormOffline.deleteAttempt(siteId, scormId, attempt).then(function() {
                            warnings.push($translate.instant('mma.mod_scorm.warningofflinedatadeleted', {number: attempt}));
                        }).catch(function() {
                            // Maybe there's something wrong with the data or the storage implementation.
                        });
                    } else {
                        newAttemptsAtEnd[time] = attempt;
                    }

                } else {
                    newAttemptsSameOrder.push(attempt);
                }
            });
        }

        // Get needed data from the last offline attempt.
        return getLastOfflineAttemptData().then(function() {

            collisions.forEach(function(attempt) {
                // First get synced entries to detect if it was a failed synchronization.
                var getDataFn = $mmaModScormOffline.getScormStoredData,
                    promise = getDataFn(siteId, scormId, attempt, undefined, false, true).then(function(synced) {
                    if (synced && synced.length) {
                        // The attempt has synced entries, it seems to be a failed synchronization.
                        // Let's get the entries that haven't been synced, maybe it just failed to delete the attempt.
                        return getDataFn(siteId, scormId, attempt, undefined, true).then(function(entries) {
                            var hasDataToSend = false;
                            angular.forEach(entries, function(entry) {
                                if (entry.element.indexOf('.') > -1) {
                                    hasDataToSend = true;
                                }
                            });

                            if (hasDataToSend) {
                                // There are elements to sync. We need to check if it's possible to sync them or not.
                                return canRetrySync(scormId, siteId, attempt, lastOnline).catch(function() {
                                    // Cannot retry sync, we'll create a new offline attempt if possible.
                                    return addToNewOrDelete(attempt);
                                });
                            } else {
                                // Nothing to sync, delete the attempt.
                                return $mmaModScormOffline.deleteAttempt(siteId, scormId, attempt).catch(function() {
                                    // Maybe there's something wrong with the data or the storage implementation.
                                });
                            }
                        });
                    } else {
                        // It's not a failed synchronization. Check if it's an attempt continued in offline.
                        return $mmaModScormOffline.getAttemptSnapshot(siteId, scormId, attempt).then(function(snapshot) {
                            if (snapshot && Object.keys(snapshot).length) {
                                // It has a snapshot, it means it continued an online attempt. We need to check if they've diverged.
                                // If it's the last attempt we don't need to ignore cache because we already did it.
                                var refresh = lastOnline != attempt;
                                return $mmaModScorm.getScormUserData(scormId, attempt, false, siteId, undefined, refresh)
                                            .then(function(data) {
                                    if (!snapshotEquals(snapshot, data)) {
                                        // Snapshot has diverged, it will be converted into a new attempt if possible.
                                        return addToNewOrDelete(attempt);
                                    }
                                });
                            } else {
                                // No snapshot, it's a different attempt.
                                newAttemptsSameOrder.push(attempt);
                            }
                        });
                    }
                });
                promises.push(promise);
            });

            return $q.all(promises).then(function() {
                return moveNewAttempts(scormId, siteId, newAttemptsSameOrder, lastOnline, lastCollision, offlineAttempts).then(function() {
                    // The new attempts that need to keep the order have been created. Now we'll create the new attempts
                    // at the end of the list of offline attempts. It should only be 1 attempt max.
                    lastOffline = lastOffline + newAttemptsSameOrder.length;
                    return createNewAttemptsAtEnd(scormId, siteId, newAttemptsAtEnd, lastOffline).then(function() {
                        return warnings;
                    });
                });
            });
        });
    }

    /**
     * Change the number of some offline attempts. We need to move all offline attempts after the collisions
     * too, otherwise we would overwrite data.
     * Example: We have offline attempts 1, 2 and 3. #1 and #2 have collisions. #1 can be synced, but #2 needs
     * to be a new attempt. #3 will now be #4, and #2 will now be #3.
     *
     * @param  {Number} scormId           SCORM ID.
     * @param  {String} siteId            Site ID.
     * @param  {Number[]} newAttempts     Attempts that need to be converted into new attempts.
     * @param  {Number} lastOnline        Last online attempt.
     * @param  {Number} lastCollision     Last attempt with collision (exists in online and offline).
     * @param  {Number[]} offlineAttempts Numbers of offline attempts.
     * @return {Promise}                  Promise resolved when attempts have been moved.
     */
    function moveNewAttempts(scormId, siteId, newAttempts, lastOnline, lastCollision, offlineAttempts) {
        if (!newAttempts.length) {
            return $q.when();
        }

        var promise = $q.when(),
            lastSuccessful;

        // Sort offline attempts in DESC order.
        offlineAttempts = offlineAttempts.sort(function(a, b) {
            return parseInt(a, 10) < parseInt(b, 10);
        });

        // First move the offline attempts after the collisions;
        angular.forEach(offlineAttempts, function(attempt) {
            if (attempt > lastCollision) {
                // We use a chain of promises because we need to move them in order.
                promise = promise.then(function() {
                    var newNumber = attempt + newAttempts.length;
                    return $mmaModScormOffline.changeAttemptNumber(siteId, scormId, attempt, newNumber).then(function() {
                        lastSuccessful = attempt;
                    });
                });
            }
        });

        return promise.then(function() {
            var promises = [],
                successful = [];

            // Sort newAttempts in ASC order.
            newAttempts = newAttempts.sort(function(a, b) {
                return parseInt(a, 10) > parseInt(b, 10);
            });

            // Now move the attempts in newAttempts.
            angular.forEach(newAttempts, function(attempt, index) {
                // No need to use chain of promises.
                var newNumber = lastOnline + index + 1;
                promises.push($mmaModScormOffline.changeAttemptNumber(siteId, scormId, attempt, newNumber).then(function() {
                    successful.push(attempt);
                }));
            });

            return $q.all(promises).catch(function() {
                // Moving the new attempts failed (it shouldn't happen). Let's undo the new attempts move.
                promises = [];
                angular.forEach(successful, function(attempt) {
                    var newNumber = lastOnline + newAttempts.indexOf(attempt) + 1;
                    promises.push($mmaModScormOffline.changeAttemptNumber(siteId, scormId, newNumber, attempt));
                });
                return $mmUtil.allPromises(promises).then(function() {
                    return $q.reject(); // It will now enter the .catch that moves offline attempts after collisions.
                });
            });

        }).catch(function() {
            // Moving offline attempts after collisions failed (it shouldn't happen). Let's undo the changes.
            if (!lastSuccessful) {
                return $q.reject();
            }

            promise = $q.when();

            var attemptsToUndo = [];
            for (var i = lastSuccessful; offlineAttempts.indexOf(i) != -1; i++) {
                attemptsToUndo.push(i);
            }
            attemptsToUndo.forEach(function(attempt) {
                promise = promise.then(function() {
                    // Move it back.
                    return $mmaModScormOffline.changeAttemptNumber(siteId, scormId, attempt + newAttempts.length, attempt);
                });
            });
            return promise.then(function() {
                return $q.reject();
            });
        });
    }

    /**
     * Create new attempts at the end of the offline attempts list.
     *
     * @param  {Number} scormId     SCORM ID.
     * @param  {String} siteId      Site ID.
     * @param  {Object} newAttempts Attempts to create. The keys are the timecreated, the values are the attempt number.
     * @param  {Number} lastOffline Number of last offline attempt.
     * @return {Promise}            Promise resolved when the creation is finished.
     */
    function createNewAttemptsAtEnd(scormId, siteId, newAttempts, lastOffline) {
        var times = Object.keys(newAttempts).sort(), // Sort in ASC order.
            promises = [];

        if (!times.length) {
            return $q.when();
        }

        angular.forEach(times, function(time, index) {
            var attempt = newAttempts[time];
            promises.push($mmaModScormOffline.changeAttemptNumber(siteId, scormId, attempt, lastOffline + index + 1));
        });
        return $mmUtil.allPromises(promises);
    }

    /**
     * Check if can retry an attempt synchronization.
     *
     * @param  {Number} scormId    SCORM ID.
     * @param  {String} siteId     Site ID.
     * @param  {Number} attempt    Attempt number.
     * @param  {Number} lastOnline Last online attempt number.
     * @return {Promise}           Promise resolved if can retry the synchronization, false otherwise.
     */
    function canRetrySync(scormId, siteId, attempt, lastOnline) {
        // If it's the last attempt we don't need to ignore cache because we already did it.
        var refresh = lastOnline != attempt;
        return $mmaModScorm.getScormUserData(scormId, attempt, false, siteId, undefined, refresh).then(function(siteData) {
            // Get synchronization snapshot (if sync fails it should store a snapshot).
            return $mmaModScormOffline.getAttemptSnapshot(siteId, scormId, attempt).then(function(snapshot) {
                if (!snapshot || !Object.keys(snapshot).length || !snapshotEquals(snapshot, siteData)) {
                    // No snapshot or it doesn't match, we can't retry the synchronization.
                    return $q.reject();
                }
            });
        });
    }

    /**
     * Compares an attempt's snapshot with the data retrieved from the site.
     * It only compares elements with dot notation. This means that, if some SCO has been added to Moodle web
     * but the user hasn't generated data for it, then the snapshot will be detected as equal.
     *
     * @param  {Object} snapshot Attempt's snapshot.
     * @param  {Object} userData Data retrieved from the site.
     * @return {Boolean}         True if snapshot is equal to the user data, false otherwise.
     */
    function snapshotEquals(snapshot, userData) {
        var scoId,
            element,
            siteSco,
            snapshotSco;

        // Check that snapshot contains the data from the site.
        for (scoId in userData) {
            siteSco = userData[scoId];
            snapshotSco = snapshot[scoId];

            for (element in siteSco.userdata) {
                if (element.indexOf('.') > -1) {
                    if (!snapshotSco || siteSco.userdata[element] !== snapshotSco.userdata[element]) {
                        return false;
                    }
                }
            }
        }

        // Now check the opposite way: site userData contains the data from the snapshot.
        for (scoId in snapshot) {
            siteSco = userData[scoId];
            snapshotSco = snapshot[scoId];

            for (element in snapshotSco.userdata) {
                if (element.indexOf('.') > -1) {
                    if (!siteSco || siteSco.userdata[element] !== snapshotSco.userdata[element]) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * If there's an ongoing sync for a certain SCORM, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormSync#waitForSync
     * @param  {Number} scormId  SCORM to check.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when there's no sync going on for the SCORM.
     */
    self.waitForSync = function(scormId, siteId) {
        siteId = siteId || $mmSite.getId();
        if (syncPromises[siteId] && syncPromises[siteId][scormId]) {
            // There's a sync ongoing for this SCORM.
            return syncPromises[siteId][scormId].catch(function() {});
        }
        return $q.when();
    };

    return self;
});
