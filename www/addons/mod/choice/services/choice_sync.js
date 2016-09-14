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

angular.module('mm.addons.mod_choice')

/**
 * Choice synchronization service.
 *
 * @module mm.addons.mod_choice
 * @ngdoc service
 * @name $mmaModChoiceSync
 */
.factory('$mmaModChoiceSync', function($q, $log, $mmApp, $mmSitesManager, $mmaModChoiceOffline, $mmSite, $mmEvents, $mmSync,
        mmaModChoiceComponent, $mmaModChoice, $translate, $mmCourse, mmaModChoiceAutomSyncedEvent) {

    $log = $log.getInstance('$mmaModChoiceSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModChoiceComponent);

    /**
     * Try to synchronize all Choices from current site that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceSync#syncAllChoices
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllChoices = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all choices because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync choices in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync choices in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                sitePromises.push($mmaModChoiceOffline.getResponses(siteId).then(function(responses) {
                    var promises = [];

                    // Sync all responses.
                    angular.forEach(responses, function(response) {
                        promises.push(self.syncChoice(response.choiceid, response.userid, siteId).then(function(result) {
                            if (result && result.updated) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModChoiceAutomSyncedEvent, {
                                    siteid: siteId,
                                    choiceid: response.choiceid,
                                    userid: response.userid,
                                    warnings: result.warnings
                                });
                            }
                        }));
                    });

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Synchronize a choice.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceSync#syncChoice
     * @param  {Number} choiceId Choice ID to be synced.
     * @param  {Number} userId   User the answers belong to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncChoice = function(choiceId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            courseId,
            syncId = self._getSyncId(choiceId, userId),
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return self.getOngoingSync(syncId, siteId);
        }

        $log.debug('Try to sync choice ' + choiceId + ' for user ' + userId);

        // Get offline responses to be sent.
        syncPromise = $mmaModChoiceOffline.getResponse(choiceId, siteId, userId).catch(function() {
            // No offline data found, return empty object.
            return {};
        }).then(function(data) {
            if (!data.choiceid) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            var promise;

            courseId = data.courseid;

            // Send the responses.
            if (data.deleting) {
                // A user has deleted some responses.
                promise = $mmaModChoice.deleteResponsesOnline(choiceId, data.responses, siteId);
            } else {
                // A user has added some responses.
                promise = $mmaModChoice.submitResponseOnline(choiceId, data.responses, siteId);
            }

            return promise.then(function() {
                result.updated = true;

                return $mmaModChoiceOffline.deleteResponse(choiceId, siteId, userId);
            }).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                    result.updated = true;
                    return $mmaModChoiceOffline.deleteResponse(choiceId, siteId, userId).then(function() {
                        // Responses deleted, add a warning.
                        result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                            component: $mmCourse.translateModuleName('choice'),
                            name: data.name,
                            error: error.error
                        }));
                    });
                } else {
                    // Couldn't connect to server, reject.
                    return $q.reject(error && error.error);
                }
            });
        }).then(function() {
            if (courseId) {
                var p1 = $mmaModChoice.invalidateChoiceData(courseId),
                    p2 = choiceId ? $mmaModChoice.invalidateOptions(choiceId) : $q.when(),
                    p3 = choiceId ? $mmaModChoice.invalidateResults(choiceId) : $q.when();

                // Data has been sent to server, update choice data.
                return $q.all([p1, p2, p3]).then(function() {
                    return $mmaModChoice.getChoiceById(courseId, choiceId, siteId);
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
     * Get the ID of a choice sync.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceSync#_getSyncId
     * @param  {Number} choiceId Choice ID.
     * @param  {Number} userId   User the responses belong to.
     * @return {String}          Sync ID.
     * @protected
     */
    self._getSyncId = function(choiceId, userId) {
        return choiceId + '#' + userId;
    };

    return self;
});
