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

/**
 * Service to handle SCORM online features.
 * This service holds getters and setters that have some kind of equivalent feature in $mmaModScormOffline.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormOnline
 */
.factory('$mmaModScormOnline', function($mmSitesManager, $mmSite, $q, $mmWS, $log, mmCoreWSPrefix, $mmSyncBlock,
        mmaModScormComponent) {
    $log = $log.getInstance('$mmaModScormOnline');

    var self = {};

    /**
     * Get cache key for SCORM attempt count WS calls.
     *
     * @param {Number} scormId  SCORM ID.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @return {String}         Cache key.
     */
    function getAttemptCountCacheKey(scormId, userId) {
        userId = userId || $mmSite.getUserId();
        return 'mmaModScorm:attemptcount:' + scormId + ':' + userId;
    }

    /**
     * Get the number of attempts done by a user in the given SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOnline#getAttemptCount
     * @param {String} siteId         Site ID.
     * @param {Number} scormId        SCORM ID.
     * @param {Number} [userId]       User ID. If not defined use site's current user.
     * @param {Boolean} ignoreMissing True if it should ignore attempts that haven't reported a grade/completion.
     * @param {Boolean} ignoreCache   True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}              Promise resolved when the attempt count is retrieved.
     */
    self.getAttemptCount = function(siteId, scormId, userId, ignoreMissing, ignoreCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    scormid: scormId,
                    userid: userId,
                    ignoremissingcompletion: ignoreMissing ? 1 : 0
                },
                preSets = {
                    cacheKey: getAttemptCountCacheKey(scormId, userId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_scorm_get_scorm_attempt_count', params, preSets).then(function(response) {
                if (response && typeof response.attemptscount != 'undefined') {
                    return response.attemptscount;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get cache key for SCORM user data WS calls.
     *
     * @param {Number} scormId SCORM ID.
     * @param {Number} attempt Attempt number.
     * @return {String}        Cache key.
     */
    function getScormUserDataCacheKey(scormId, attempt) {
        return getScormUserDataCommonCacheKey(scormId) + ':' + attempt;
    }

    /**
     * Get common cache key for SCORM user data WS calls.
     *
     * @param {Number} scormId SCORM ID.
     * @return {String}        Cache key.
     */
    function getScormUserDataCommonCacheKey(scormId) {
        return 'mmaModScorm:userdata:' + scormId;
    }

    /**
     * Get the user data for a certain SCORM and attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOnline#getScormUserData
     * @param {String} siteId       Site ID.
     * @param {Number} scormId      SCORM ID.
     * @param {Number} attempt      Attempt number.
     * @param {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}            Promise resolved when the user data is retrieved.
     */
    self.getScormUserData = function(siteId, scormId, attempt, ignoreCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    scormid: scormId,
                    attempt: attempt
                },
                preSets = {
                    cacheKey: getScormUserDataCacheKey(scormId, attempt)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_scorm_get_scorm_user_data', params, preSets).then(function(response) {
                if (response && response.data) {
                    // Format the response.
                    var data = {};
                    angular.forEach(response.data, function(sco) {
                        var formattedDefaultData = {},
                            formattedUserData = {};

                        angular.forEach(sco.defaultdata, function(entry) {
                            formattedDefaultData[entry.element] = entry.value;
                        });
                        angular.forEach(sco.userdata, function(entry) {
                            formattedUserData[entry.element] = entry.value;
                        });

                        sco.defaultdata = formattedDefaultData;
                        sco.userdata = formattedUserData;

                        data[sco.scoid] = sco;
                    });
                    return data;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates attempt count.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOnline#invalidateAttemptCount
     * @param {String} siteId   Site ID.
     * @param {Number} scormId  SCORM ID.
     * @param {Number} [userId] User ID. If not defined use site's current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAttemptCount = function(siteId, scormId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getAttemptCountCacheKey(scormId, userId));
        });
    };

    /**
     * Invalidates SCORM user data for all attempts.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOnline#invalidateScormUserData
     * @param {String} siteId   Site ID.
     * @param {Number} scormId  SCORM ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateScormUserData = function(siteId, scormId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getScormUserDataCommonCacheKey(scormId));
        });
    };

    /**
     * Saves a SCORM tracking record.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOnline#saveTracks
     * @param  {String} siteId   Site ID. If not set, use current site.
     * @param  {Number} scormId  SCORM ID.
     * @param  {Number} scoId    Sco ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Object[]} tracks Tracking data.
     * @return {Promise}         Promise resolved when data is saved.
     */
    self.saveTracks = function(siteId, scormId, scoId, attempt, tracks) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                scoid: scoId,
                attempt: attempt,
                tracks: tracks
            };

            if (!tracks || !tracks.length) {
                return $q.when(); // Nothing to save.
            }

            $mmSyncBlock.blockOperation(mmaModScormComponent, scormId, 'saveTracksOnline', siteId);

            return site.write('mod_scorm_insert_scorm_tracks', params).then(function(response) {
                if (response && response.trackids) {
                    return response.trackids;
                }
                return $q.reject();
            }).finally(function() {
                $mmSyncBlock.unblockOperation(mmaModScormComponent, scormId, 'saveTracksOnline', siteId);
            });
        });
    };

    /**
     * Saves a SCORM tracking record using a synchronous call.
     * Please use this function only if synchronous is a must. It's recommended to use $mmaModScorm#saveTracks.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOnline#saveTracksSync
     * @param  {Number} scoId    Sco ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Object[]} tracks Tracking data.
     * @return {Boolean}         True if success, false otherwise.
     */
    self.saveTracksSync = function(scoId, attempt, tracks) {
        var params = {
                scoid: scoId,
                attempt: attempt,
                tracks: tracks
            },
            preSets = {
                siteurl: $mmSite.getURL(),
                wstoken: $mmSite.getToken()
            },
            wsFunction = $mmSite.getCompatibleFunction('mod_scorm_insert_scorm_tracks'),
            response;

        if (!tracks || !tracks.length) {
            return true; // Nothing to save.
        }

        // Check if the method is available, use a prefixed version if possible.
        if (!$mmSite.wsAvailable(wsFunction, false)) {
            if ($mmSite.wsAvailable(mmCoreWSPrefix + wsFunction, false)) {
                wsFunction = mmCoreWSPrefix + wsFunction;
            } else {
                $log.error("WS function '" + wsFunction + "' is not available, even in compatibility mode.");
                return false;
            }
        }

        response = $mmWS.syncCall(wsFunction, params, preSets);
        if (response && !response.error && response.trackids) {
            return true;
        }
        return false;
    };

    return self;
});
