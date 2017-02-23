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

angular.module('mm.addons.mod_glossary')

/**
 * Glossary synchronization service.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossarySync
 */
.factory('$mmaModGlossarySync', function($q, $log, $mmApp, $mmSitesManager, $mmaModGlossaryOffline, $mmSite, $mmEvents, $mmSync,
        $mmLang, mmaModGlossaryComponent, $mmaModGlossary, $translate, mmaModGlossaryAutomSyncedEvent, mmaModGlossarySyncTime,
        $mmCourse, $mmSyncBlock, $mmUtil, $mmaModGlossaryHelper, $mmFileUploader) {

    $log = $log.getInstance('$mmaModGlossarySync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModGlossaryComponent, mmaModGlossarySyncTime);

    /**
     * Try to synchronize all glossaries from current site that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossarySync#syncAllGlossaries
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllGlossaries = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all glossaries because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync glossaries in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync glossaries in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Sync all new entries.
                sitePromises.push($mmaModGlossaryOffline.getAllAddEntries(siteId).then(function(entries) {
                    var promises = {};

                    // Do not sync same glossary twice.
                    for (var i in entries) {
                        var entry = entries[i];

                        if (typeof promises[entry.glossaryid] != 'undefined') {
                            continue;
                        }

                        promises[entry.glossaryid] = self.syncGlossaryEntriesIfNeeded(entry.glossaryid, entry.userid, siteId)
                                .then(function(result) {
                            if (result && result.updated) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModGlossaryAutomSyncedEvent, {
                                    siteid: siteId,
                                    glossaryid: entry.glossaryid,
                                    userid: entry.userid,
                                    warnings: result.warnings
                                });
                            }
                        });
                    }
                    // Promises will be an object so, convert to an array first;
                    promises = $mmUtil.objectToArray(promises);

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync a glossary only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossarySync#syncGlossaryEntriesIfNeeded
     * @param  {Number} glossaryId  Glossary ID.
     * @param  {Number} userId      User the entry belong to.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the glossary is synced or if it doesn't need to be synced.
     */
    self.syncGlossaryEntriesIfNeeded = function(glossaryId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncId = self.getGlossarySyncId(glossaryId, userId);
        return self.isSyncNeeded(syncId, siteId).then(function(needed) {
            if (needed) {
                return self.syncGlossaryEntries(glossaryId, userId, siteId);
            }
        });
    };

    /**
     * Synchronize all offline entries of a glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossarySync#syncGlossaryEntries
     * @param  {Number} glossaryId  Glossary ID to be synced.
     * @param  {Number} [userId]    User the entries belong to.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncGlossaryEntries = function(glossaryId, userId, siteId) {
        userId = userId || $mmSite.getUserId();
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            courseId,
            syncId = self.getGlossarySyncId(glossaryId, userId),
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this glossary, return the promise.
            return self.getOngoingSync(syncId, siteId);
        }

        // Verify that glossary isn't blocked.
        if ($mmSyncBlock.isBlocked(mmaModGlossaryComponent, syncId, siteId)) {
            $log.debug('Cannot sync glossary ' + glossaryId + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('glossary');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
        }

        $log.debug('Try to sync glossary ' + glossaryId + ' for user ' + userId);

        // Get offline responses to be sent.
        syncPromise = $mmaModGlossaryOffline.getGlossaryAddEntries(glossaryId, siteId, userId).catch(function() {
            // No offline data found, return empty object.
            return [];
        }).then(function(entries) {
            if (!entries.length) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            var promises = [];

            angular.forEach(entries, function(data) {
                var promise;

                courseId = data.courseid;

                // First of all upload the attachments (if any).
                promise = uploadAttachments(glossaryId, data, siteId).then(function(itemId) {
                    // Now try to add the entry.
                    return $mmaModGlossary.addEntryOnline(glossaryId, data.concept, data.definition, data.options, itemId, siteId);
                });

                promises.push(promise.then(function() {
                    result.updated = true;

                    return deleteAddEntry(glossaryId, data.concept, data.timecreated, siteId);
                }).catch(function(error) {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                        result.updated = true;
                        return deleteAddEntry(glossaryId, data.concept, data.timecreated, siteId).then(function() {
                            // Responses deleted, add a warning.
                            result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                                component: $mmCourse.translateModuleName('glossary'),
                                name: data.concept,
                                error: error.error
                            }));
                        });
                    } else {
                        // Couldn't connect to server, reject.
                        return $q.reject(error && error.error);
                    }
                }));
            });

            return $q.all(promises);
        }).then(function() {
            if (result.updated && courseId) {
                // Data has been sent to server. Now invalidate the WS calls.
                return $mmaModGlossary.getGlossaryById(courseId, glossaryId).then(function(glossary) {
                    return $mmaModGlossary.invalidateGlossaryEntries(glossary, true);
                }).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(syncId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(syncId, syncPromise, siteId);
    };

     /**
      * Delete a new entry.
      *
      * @param  {Number} glossaryId   Glossary ID.
      * @param  {String} concept      Glossary entry concept.
      * @param  {Number} timecreated  Time to allow duplicated entries.
      * @param  {String} [siteId]     Site ID. If not defined, current site.
      * @return {Promise}             Promise resolved when deleted.
      */
    function deleteAddEntry(glossaryId, concept, timecreated, siteId) {
        var promises = [];

        promises.push($mmaModGlossaryOffline.deleteAddEntry(glossaryId, concept, timecreated, siteId));
        promises.push($mmaModGlossaryHelper.deleteStoredFiles(glossaryId, concept, timecreated, siteId).catch(function() {
            // Ignore errors, maybe there are no files.
        }));

        return $q.all(promises);
    }

    /**
     * Upload attachments of an offline entry.
     *
     * @param  {Number} glossaryId Glossary ID.
     * @param  {Object} entry      Offline entry.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with draftid if uploaded, resolved with undefined if nothing to upload.
     */
    function uploadAttachments(glossaryId, entry, siteId) {
        var attachments = entry && entry.attachments;
        if (attachments) {
            // Has some attachments to sync.
            var files = attachments.online || [],
                promise;

            if (attachments.offline) {
                // Has offline files.
                promise = $mmaModGlossaryHelper.getStoredFiles(glossaryId, entry.concept, entry.timecreated, siteId).then(function(atts) {
                    files = files.concat(atts);
                }).catch(function() {
                    // Folder not found, no files to add.
                });
            } else {
                promise = $q.when();
            }

            return promise.then(function() {
                return $mmFileUploader.uploadOrReuploadFiles(files, mmaModGlossaryComponent, glossaryId, siteId);
            });
        }

        // No attachments, resolve.
        return $q.when();
    }

    /**
     * Get the ID of a glossary sync.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossarySync#getGlossarySyncId
     * @param  {Number} glossaryId  Glossary ID.
     * @param  {Number} [userId]    User the entries belong to.. If not defined, current user.
     * @return {String}             Sync ID.
     * @protected
     */
    self.getGlossarySyncId = function(glossaryId, userId) {
        userId = userId || $mmSite.getUserId();
        return 'glossary#' + glossaryId + '#' + userId;
    };

    return self;
});
