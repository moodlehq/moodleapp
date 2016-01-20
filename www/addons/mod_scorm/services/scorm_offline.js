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

.constant('mmaModScormOfflineAttemptsStore', 'mod_scorm_offline_attempts')
.constant('mmaModScormOfflineTracksStore', 'mod_scorm_offline_scos_tracks')

.config(function($mmSitesFactoryProvider, mmaModScormOfflineAttemptsStore, mmaModScormOfflineTracksStore) {
    var stores = [
        {
            name: mmaModScormOfflineAttemptsStore,
            keyPath: ['scormid', 'userid', 'attempt'],
            indexes: [
                {
                    name: 'attempt' // Attempt number.
                },
                {
                    name: 'userid'
                },
                {
                    name: 'scormid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'timemodified'
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'scormAndUser',
                    generator: function(obj) {
                        return [obj.scormid, obj.userid];
                    }
                }
            ]
        },
        {
            name: mmaModScormOfflineTracksStore,
            keyPath: ['userid', 'scormid', 'scoid', 'attempt', 'element'],
            indexes: [
                {
                    name: 'userid'
                },
                {
                    name: 'scormid'
                },
                {
                    name: 'scoid'
                },
                {
                    name: 'attempt'
                },
                {
                    name: 'element'
                },
                {
                    name: 'synced'
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'scormUserAttempt',
                    generator: function(obj) {
                        return [obj.scormid, obj.userid, obj.attempt];
                    }
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'scormUserAttemptSynced',
                    generator: function(obj) {
                        return [obj.scormid, obj.userid, obj.attempt, obj.synced];
                    }
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Service to handle SCORM offline features.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormOffline
 */
.factory('$mmaModScormOffline', function($mmSite, $mmUtil, $q, $log, mmaModScormOfflineAttemptsStore,
            mmaModScormOfflineTracksStore) {
    $log = $log.getInstance('$mmaModScormOffline');

    var self = {},
        blockedScorms = {};

    /**
     * Changes an attempt number in the data stored in offline.
     * This function is used to convert attempts into new attempts, so the stored snapshot will be removed and
     * entries will be marked as not synced.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#changeAttemptNumber
     * @param {Object} scormId    SCORM ID.
     * @param {Number} attempt    Number of the attempt to change.
     * @param {Number} newAttempt New attempt number.
     * @param {Number} [userId]   User ID. If not defined, current user.
     * @return {Promise}          Promise resolved when the attempt number changes.
     */
    self.changeAttemptNumber = function(scormId, attempt, newAttempt, userId) {
        $log.debug('Change attempt number from ' + attempt + ' to ' + newAttempt + ' in SCORM ' + scormId);
        userId = userId || $mmSite.getUserId();

        var db = $mmSite.getDb(),
            newEntry = {
                scormid: scormId,
                userid: userId,
                attempt: newAttempt,
                timemodified: $mmUtil.timestamp()
            };

        blockedScorms[scormId] = true; // Block the SCORM so it can't be synced.

        // Get current data.
        return db.get(mmaModScormOfflineAttemptsStore, [scormId, userId, attempt]).then(function(entry) {
            newEntry.timecreated = entry.timecreated;
            newEntry.courseid = entry.courseid;

            // Insert new attempt.
            return db.insert(mmaModScormOfflineAttemptsStore, newEntry).then(function() {
                // Copy tracking data to the new attempt.
                return self.getScormStoredData(scormId, attempt, userId).then(function(entries) {
                    var promises = [];
                    angular.forEach(entries, function(entry) {
                        entry.attempt = newAttempt;
                        entry.synced = 0;
                        promises.push(db.insert(mmaModScormOfflineTracksStore, entry));
                    });

                    return $mmUtil.allPromises(promises).then(function() {
                        // All entries inserted. Delete the old attempt.
                        return self.deleteAttempt(scormId, attempt).catch(function() {
                            // The delete failed, it shouldn't happen. Let's retry once.
                            return self.deleteAttempt(scormId, attempt).catch(function() {});
                        });
                    });
                }).catch(function() {
                    // Failed to get the data, remove the new attempt.
                    return self.deleteAttempt(scormId, newAttempt).then(function() {
                        return $q.reject();
                    });
                });
            });
        }).finally(function() {
            blockedScorms[scormId] = false; // Unblock the SCORM.
        });

    };

    /**
     * Clear blocked SCORMs.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#clearBlockedScorms
     * @return {Void}
     */
    self.clearBlockedScorms = function() {
        blockedScorms = {};
    };

    /**
     * Creates a new offline attempt. It can be created from scratch or as a copy of another attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#createNewAttempt
     * @param {Object} scorm      SCORM.
     * @param {Number} [userId]   User ID. If not defined, current user.
     * @param {Number} attempt    Number of the new attempt.
     * @param {Object} userData   User data to store in the attempt.
     * @param {Object} [snapshot] Optional. Snapshot to store in the attempt.
     * @return {Promise}          Promise resolved when the new attempt is created.
     */
    self.createNewAttempt = function(scorm, userId, attempt, userData, snapshot) {
        $log.debug('Creating new offline attempt ' + attempt + ' in SCORM ' + scorm.id);
        userId = userId || $mmSite.getUserId();

        blockedScorms[scorm.id] = true; // Block the SCORM so it can't be synced.

        // Create attempt in DB.
        var db = $mmSite.getDb(),
            entry = {
                scormid: scorm.id,
                userid: userId,
                attempt: attempt,
                courseid: scorm.course,
                timecreated: $mmUtil.timestamp(),
                timemodified: $mmUtil.timestamp()
            };

        if (snapshot) {
            // Save a snapshot of the data we had when we created the attempt.
            // Remove the default data, we don't want to store it.
            entry.snapshot = removeDefaultData(snapshot);
        }

        return db.insert(mmaModScormOfflineAttemptsStore, entry).then(function() {
            // Store all the data in userData.
            var promises = [];
            angular.forEach(userData, function(sco) {
                var tracks = [];
                angular.forEach(sco.userdata, function(value, element) {
                    tracks.push({element: element, value: value});
                });
                promises.push(self.saveTracks(scorm, sco.scoid, attempt, tracks, userData));
            });
            return $q.all(promises);
        }).finally(function() {
            blockedScorms[scorm.id] = false; // Unblock the SCORM.
        });
    };

    /**
     * Delete all the stored data from an attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#deleteAttempt
     * @param {Number} scormId  SCORM ID.
     * @param {Number} attempt  Attempt number.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @return {Promise}        Promise resolved when all the data has been deleted.
     */
    self.deleteAttempt = function(scormId, attempt, userId) {
        $log.debug('Delete offline attempt ' + attempt + ' in SCORM ' + scormId);
        userId = userId || $mmSite.getUserId();

        return self.getScormStoredData(scormId, attempt, userId).then(function(entries) {
            var promises = [],
                db = $mmSite.getDb();

            // Delete all the tracks.
            angular.forEach(entries, function(entry) {
                var entryId = [entry.userid, entry.scormid, entry.scoid, entry.attempt, entry.element];
                promises.push(db.remove(mmaModScormOfflineTracksStore, entryId));
            });

            // Delete the attempt.
            promises.push(db.remove(mmaModScormOfflineAttemptsStore, [scormId, userId, attempt]));

            return $q.all(promises);
        });
    };

    /**
     * Helper function to return a formatted list of interactions for reports.
     * This function is based in Moodle's scorm_format_interactions.
     *
     * @param  {Object} scoUserData Userdata from a certain SCO.
     * @return {Object}             Formatted userdata.
     */
    function formatInteractions(scoUserData) {
        var formatted = {};

        // Defined in order to unify scorm1.2 and scorm2004.
        formatted.score_raw = '';
        formatted.status = '';
        formatted.total_time = '00:00:00';
        formatted.session_time = '00:00:00';

        angular.forEach(scoUserData, function(value, element) {
            // Ignore elements that are calculated.
            if (element == 'score_raw' || element == 'status' || element == 'total_time' || element == 'session_time') {
                return;
            }

            formatted[element] = value;
            switch (element) {
                case 'cmi.core.lesson_status':
                case 'cmi.completion_status':
                    if (value == 'not attempted') {
                        value = 'notattempted';
                    }
                    formatted.status = value;
                    break;
                case 'cmi.core.score.raw':
                case 'cmi.score.raw':
                    formatted.score_raw = $mmUtil.roundToDecimals(value, 2); // Round to 2 decimals max.
                    break;
                case 'cmi.core.session_time':
                case 'cmi.session_time':
                    formatted.session_time = value;
                    break;
                case 'cmi.core.total_time':
                case 'cmi.total_time':
                    formatted.total_time = value;
                    break;
            }
        });

        return formatted;
    }

    /**
     * Get launch URLs from a list of SCOs, indexing them by SCO ID.
     *
     * @param  {Object[]} scos List of SCOs. Each SCO needs to have 'id' and 'launch' properties.
     * @return {Object}        Launch URLs indexed by SCO ID.
     */
    function getLaunchUrlsFromScos(scos) {
        var response = {};
        angular.forEach(scos, function(sco) {
            response[sco.id] = sco.launch;
        });
        return response;
    }

    /**
     * Get all the offline attempts in current site.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#getAllAttempts
     * @return {Promise} Promise resolved when the offline attempts are retrieved.
     */
    self.getAllAttempts = function() {
        var db = $mmSite.getDb();
        if (!db) {
            // No current site, return empty array.
            return $q.when([]);
        }

        return db.getAll(mmaModScormOfflineAttemptsStore);
    };

    /**
     * Get the offline attempts done by a user in the given SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#getAttempts
     * @param {Number} scormId  SCORM ID.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @return {Promise}        Promise resolved when the offline attempts are retrieved.
     */
    self.getAttempts = function(scormId, userId) {
        userId = userId || $mmSite.getUserId();

        var db = $mmSite.getDb();
        return db.whereEqual(mmaModScormOfflineAttemptsStore, 'scormAndUser', [scormId, userId]).then(function(attempts) {
            return attempts;
        });
    };

    /**
     * Get the snapshot of an attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#getAttemptSnapshot
     * @param {Number} scormId  SCORM ID.
     * @param {Number} attempt  Attempt number.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @return {Promise}        Promise resolved with the snapshot or undefined if no snapshot.
     */
    self.getAttemptSnapshot = function(scormId, attempt, userId) {
        userId = userId || $mmSite.getUserId();

        return $mmSite.getDb().get(mmaModScormOfflineAttemptsStore, [scormId, userId, attempt]).catch(function() {
            return {}; // Attempt not found.
        }).then(function(entry) {
            return entry.snapshot;
        });
    };

    /**
     * Get the creation time of an attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#getAttemptCreationTime
     * @param {Number} scormId  SCORM ID.
     * @param {Number} attempt  Attempt number.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @return {Promise}        Promise resolved with time the attempt was created.
     */
    self.getAttemptCreationTime = function(scormId, attempt, userId) {
        userId = userId || $mmSite.getUserId();

        return $mmSite.getDb().get(mmaModScormOfflineAttemptsStore, [scormId, userId, attempt]).catch(function() {
            return {}; // Attempt not found.
        }).then(function(entry) {
            return entry.timecreated;
        });
    };

    /**
     * Get data stored in local DB for a certain scorm and attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#getScormStoredData
     * @param {Number} scormId           SCORM ID.
     * @param {Number} [userId]          User ID. If not defined, current user.
     * @param {Number} attempt           Attempt number.
     * @param {Boolean} excludeSynced    True if it should only return not synced entries.
     * @param {Boolean} excludeNotSynced True if it should only return synced entries.
     * @return {Promise}                 Promise resolved with the entries.
     */
    self.getScormStoredData = function(scormId, attempt, userId, excludeSynced, excludeNotSynced) {
        userId = userId || $mmSite.getUserId();

        var where;

        if (excludeSynced && excludeNotSynced) {
            return $q.when([]);
        } else if (excludeSynced || excludeNotSynced) {
            where = ['scormUserAttemptSynced', '=', [scormId, userId, attempt, excludeNotSynced ? 1 : 0]];
        } else {
            where = ['scormUserAttempt', '=', [scormId, userId, attempt]];
        }
        return $mmSite.getDb().query(mmaModScormOfflineTracksStore, where);
    };

    /**
     * Get the user data for a certain SCORM and offline attempt.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#getScormUserData
     * @param {Number} scormId  SCORM ID.
     * @param {Number} attempt  Attempt number.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @param {Object[]} scos   SCOs returned by $mmaModScorm#getScos. Required.
     * @return {Promise}        Promise resolved when the user data is retrieved.
     */
    self.getScormUserData = function(scormId, attempt, userId, scos) {
        userId = userId || $mmSite.getUserId();

        // Get user data. Ordering when using a compound index is complex, so we won't order by scoid.
        return self.getScormStoredData(scormId, attempt, userId).then(function(entries) {
            var response = {},
                launchUrls = getLaunchUrlsFromScos(scos),
                userId = $mmSite.getUserId(),
                username = $mmSite.getInfo().username,
                fullName = $mmSite.getInfo().fullname;

            // Gather user data retrieved from DB, grouping it by scoid.
            angular.forEach(entries, function(entry) {
                var scoid = entry.scoid;
                if (!response[scoid]) {
                    // Initialize SCO.
                    response[scoid] = {
                        scoid: scoid,
                        userdata: {
                            userid: userId,
                            scoid: scoid,
                            timemodified: 0
                        }
                    };
                }
                response[scoid].userdata[entry.element] = entry.value;
                if (entry.timemodified > response[scoid].userdata.timemodified) {
                    response[scoid].userdata.timemodified = entry.timemodified;
                }
            });

            // Format each user data retrieved.
            angular.forEach(response, function(sco) {
                sco.userdata = formatInteractions(sco.userdata);
            });

            // Create empty entries for the SCOs without user data stored.
            angular.forEach(scos, function(sco) {
                if (!response[sco.id]) {
                    response[sco.id] = {
                        scoid: sco.id,
                        userdata: {
                            status: '',
                            score_raw: ''
                        }
                    };
                }
            });

            // Calculate defaultdata.
            angular.forEach(response, function(sco) {
                sco.defaultdata = {};
                sco.defaultdata['cmi.core.student_id'] = username;
                sco.defaultdata['cmi.core.student_name'] = fullName;
                sco.defaultdata['cmi.core.lesson_mode'] = 'normal'; // Overridden in player.
                sco.defaultdata['cmi.core.credit'] = 'credit'; // Overridden in player.
                if (sco.userdata.status === '') {
                    sco.defaultdata['cmi.core.entry'] = 'ab-initio';
                } else if (sco.userdata['cmi.core.exit'] === 'suspend') {
                    sco.defaultdata['cmi.core.entry'] = 'resume';
                } else {
                    sco.defaultdata['cmi.core.entry'] = '';
                }
                sco.defaultdata['cmi.student_data.mastery_score'] = scormIsset(sco.userdata, 'masteryscore');
                sco.defaultdata['cmi.student_data.max_time_allowed'] = scormIsset(sco.userdata, 'max_time_allowed');
                sco.defaultdata['cmi.student_data.time_limit_action'] = scormIsset(sco.userdata, 'time_limit_action');
                sco.defaultdata['cmi.core.total_time'] = scormIsset(sco.userdata, 'cmi.core.total_time', '00:00:00');
                sco.defaultdata['cmi.launch_data'] = launchUrls[sco.scoid];

                // Now handle standard userdata items.
                sco.defaultdata['cmi.core.lesson_location'] = scormIsset(sco.userdata, 'cmi.core.lesson_location');
                sco.defaultdata['cmi.core.lesson_status'] = scormIsset(sco.userdata, 'cmi.core.lesson_status');
                sco.defaultdata['cmi.core.score.raw'] = scormIsset(sco.userdata, 'cmi.core.score.raw');
                sco.defaultdata['cmi.core.score.max'] = scormIsset(sco.userdata, 'cmi.core.score.max');
                sco.defaultdata['cmi.core.score.min'] = scormIsset(sco.userdata, 'cmi.core.score.min');
                sco.defaultdata['cmi.core.exit'] = scormIsset(sco.userdata, 'cmi.core.exit');
                sco.defaultdata['cmi.suspend_data'] = scormIsset(sco.userdata, 'cmi.suspend_data');
                sco.defaultdata['cmi.comments'] = scormIsset(sco.userdata, 'cmi.comments');
                sco.defaultdata['cmi.student_preference.language'] = scormIsset(sco.userdata, 'cmi.student_preference.language');
                sco.defaultdata['cmi.student_preference.audio'] = scormIsset(sco.userdata, 'cmi.student_preference.audio', '0');
                sco.defaultdata['cmi.student_preference.speed'] = scormIsset(sco.userdata, 'cmi.student_preference.speed', '0');
                sco.defaultdata['cmi.student_preference.text'] = scormIsset(sco.userdata, 'cmi.student_preference.text', '0');

                // Some data needs to be both in default data and user data.
                sco.userdata.student_id = username;
                sco.userdata.student_name = fullName;
                sco.userdata.mode = sco.defaultdata['cmi.core.lesson_mode'];
                sco.userdata.credit = sco.defaultdata['cmi.core.credit'];
                sco.userdata.entry = sco.defaultdata['cmi.core.entry'];
            });

            return response;
        });
    };

    /**
     * Function to insert a track in the DB. Please do not use it directly, use insertTrack instead.
     *
     * @param  {Number} userId       User ID.
     * @param  {Number} scormId      SCORM ID.
     * @param  {Number} scoId        SCO ID.
     * @param  {Number} attempt      Attempt number.
     * @param  {String} element      Name of the element to insert.
     * @param  {Mixed} value         Value of the element to insert.
     * @param  {Boolean} synchronous True if insert should NOT return a promise. Please use it only if synchronous is a must.
     * @return {Boolean|Promise}     Returns a promise if synchronous=false, otherwise returns a boolean.
     */
    function insertTrackToDB(userId, scormId, scoId, attempt, element, value, synchronous) {
        var entry = {
            userid: userId,
            scormid: scormId,
            scoid: scoId,
            attempt: attempt,
            element: element,
            value: value,
            timemodified: $mmUtil.timestamp(),
            synced: 0
        };
        if (synchronous) {
            return $mmSite.getDb().insertSync(mmaModScormOfflineTracksStore, entry);
        } else {
            return $mmSite.getDb().insert(mmaModScormOfflineTracksStore, entry);
        }
    }

    /**
     * Insert a track in the offline tracks store.
     * This function is based on Moodle's scorm_insert_track.
     *
     * @param  {Number} [userId]        User ID.
     * @param  {Number} scormId         SCORM ID.
     * @param  {Number} scoId           SCO ID.
     * @param  {Number} attempt         Attempt number.
     * @param  {String} element         Name of the element to insert.
     * @param  {Mixed} value            Value of the element to insert.
     * @param  {Boolean} forceCompleted True if SCORM forces completed.
     * @param  {Object} [scoData]       User data for the given SCO.
     * @return {Promise}                Promise resolved when the insert is done.
     */
    function insertTrack(userId, scormId, scoId, attempt, element, value, forceCompleted, scoData) {
        userId = userId || $mmSite.getUserId();
        scoData = scoData || {};

        var promises = [], // List of promises for actions previous to the real insert.
            lessonStatusInserted = false,
            scoUserData = scoData.userdata || {};

        if (forceCompleted) {
            if (element == 'cmi.core.lesson_status' && value == 'incomplete') {
                if (scoUserData['cmi.core.score.raw']) {
                    value = 'completed';
                }
            }
            if (element == 'cmi.core.score.raw') {
                if (scoUserData['cmi.core.lesson_status'] == 'incomplete') {
                    lessonStatusInserted = true;
                    promises.push(insertTrackToDB(userId, scormId, scoId, attempt, 'cmi.core.lesson_status', 'completed'));
                }
            }
        }

        return $q.all(promises).then(function() {
            // Don't update x.start.time, keep the original value.
            if (!scoUserData[element] || element != 'x.start.time') {

                return insertTrackToDB(userId, scormId, scoId, attempt, element, value).catch(function() {
                    if (lessonStatusInserted) {
                        // Rollback previous insert.
                        return insertTrackToDB(userId, scormId, scoId, attempt, 'cmi.core.lesson_status', 'incomplete')
                                .then(function() {
                            return $q.reject();
                        });
                    }
                    return $q.reject();
                });
            }
        });
    }

    /**
     * Insert a track in the offline tracks store, returning a synchronous value.
     * Please use this function only if synchronous is a must. It's recommended to use insertTrack.
     * This function is based on Moodle's scorm_insert_track.
     *
     * @param  {Number} [userId]        User ID.
     * @param  {Number} scormId         SCORM ID.
     * @param  {Number} scoId           SCO ID.
     * @param  {Number} attempt         Attempt number.
     * @param  {String} element         Name of the element to insert.
     * @param  {Mixed} value            Value of the element to insert.
     * @param  {Boolean} forceCompleted True if SCORM forces completed.
     * @param  {Object} [scoData]       User data for the given SCO.
     * @return {Promise}                Promise resolved when the insert is done.
     */
    function insertTrackSync(userId, scormId, scoId, attempt, element, value, forceCompleted, scoData) {
        userId = userId || $mmSite.getUserId();
        scoData = scoData || {};

        var lessonStatusInserted = false,
            scoUserData = scoData.userdata || {};

        if (forceCompleted) {
            if (element == 'cmi.core.lesson_status' && value == 'incomplete') {
                if (scoUserData['cmi.core.score.raw']) {
                    value = 'completed';
                }
            }
            if (element == 'cmi.core.score.raw') {
                if (scoUserData['cmi.core.lesson_status'] == 'incomplete') {
                    lessonStatusInserted = true;
                    if (!insertTrackToDB(userId, scormId, scoId, attempt, 'cmi.core.lesson_status', 'completed', true)) {
                        return false;
                    }
                }
            }
        }

        // Don't update x.start.time, keep the original value.
        if (!scoUserData[element] || element != 'x.start.time') {
            if (!insertTrackToDB(userId, scormId, scoId, attempt, element, value, true)) {
                // Insert failed.
                if (lessonStatusInserted) {
                    // Rollback previous insert.
                    insertTrackToDB(userId, scormId, scoId, attempt, 'cmi.core.lesson_status', 'incomplete', true);
                }
                return false;
            }
            return true;
        }
    }

    /**
     * Check if a SCORM is blocked by a writing function.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#isScormBlocked
     * @param  {Number} scormId  SCORM ID.
     * @return {Boolean}         True if blocked, false otherwise.
     */
    self.isScormBlocked = function(scormId) {
        return !!blockedScorms[scormId];
    };

    /**
     * Mark all the entries from a SCO and attempt as synced.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#markAsSynced
     * @param {Number} scormId  SCORM ID.
     * @param {Number} attempt  Attempt number.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @param {Number} scoId    SCO ID.
     * @return {Promise}        Promise resolved when marked.
     */
    self.markAsSynced = function(scormId, attempt, userId, scoId) {
        $log.debug('Mark SCO ' + scoId + ' as synced for attempt ' + attempt + ' in SCORM ' + scormId);
        userId = userId || $mmSite.getUserId();

        return self.getScormStoredData(scormId, attempt, userId, true).then(function(entries) {
            var promises = [],
                db = $mmSite.getDb();

            angular.forEach(entries, function(entry) {
                if (entry.scoid == scoId) {
                    entry.synced = 1;
                    promises.push(db.insert(mmaModScormOfflineTracksStore, entry));
                }
            });

            return $q.all(promises);
        });
    };

    /**
     * Removes the default data form user data.
     *
     * @param  {Object} userData User data returned by $mmaModScorm#getScormUserData.
     * @return {Object}          User data without default data.
     */
    function removeDefaultData(userData) {
        var result = angular.copy(userData);
        angular.forEach(result, function(sco) {
            delete sco.defaultdata;
        });
        return result;
    }

    /**
     * Saves a SCORM tracking record in offline.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#saveTracks
     * @param  {Object} scorm      SCORM.
     * @param  {Number} scoId      Sco ID.
     * @param  {Number} attempt    Attempt number.
     * @param  {Object[]} tracks   Tracking data to store.
     * @param  {Object} userData   User data for this attempt and SCO.
     * @return {Promise}           Promise resolved when data is saved.
     */
    self.saveTracks = function(scorm, scoId, attempt, tracks, userData) {
        var userId = $mmSite.getUserId(),
            initialBlocked = !!blockedScorms[scorm.id]; // Save initial blocked state.

        blockedScorms[scorm.id] = true; // Block the SCORM so it can't be synced.

        // Insert all the tracks.
        var promises = [];
        angular.forEach(tracks, function(track) {
            promises.push(
                insertTrack(userId, scorm.id, scoId, attempt, track.element, track.value, scorm.forcecompleted, userData[scoId])
            );
        });
        return $q.all(promises).finally(function() {
            if (!initialBlocked) {
                blockedScorms[scorm.id] = false; // Unblock the SCORM only if it wasn't blocked by another function.
            }
        });
    };

    /**
     * Saves a SCORM tracking record in offline returning a synchronous value.
     * Please use this function only if synchronous is a must. It's recommended to use $mmaModScormOffline#saveTracks.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#saveTracksSync
     * @param  {Object} scorm    SCORM.
     * @param  {Number} scoId    Sco ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Object[]} tracks Tracking data to store.
     * @param  {Object} userData User data for this attempt and SCO.
     * @return {Boolean}         True if data to insert is valid, false otherwise. Returning true doesn't mean that the data
     *                           has been stored, this function can return true but the insertion can still fail somehow.
     */
    self.saveTracksSync = function(scorm, scoId, attempt, tracks, userData) {
        var userId = $mmSite.getUserId(),
            success = true;

        angular.forEach(tracks, function(track) {
            if (!insertTrackSync(userId, scorm.id, scoId, attempt, track.element, track.value,
                                    scorm.forcecompleted, userData[scoId])) {
                success = false;
            }
        });
        return success;
    };

    /**
     * Check for a parameter in userdata and return it if it's set or return 'ifempty' if it's empty.
     * Based on Moodle's scorm_isset function.
     *
     * @param  {Object} userdata  Contains user's data.
     * @param  {String} param     Name of parameter that should be checked.
     * @param  {Mixed}  [ifempty] Value to be replaced with if param is not set.
     * @return {Mixed}            Value from userdata[param] if set, ifempty otherwise.
     */
    function scormIsset(userdata, param, ifempty) {
        if (typeof ifempty == 'undefined') {
            ifempty = '';
        }

        if (typeof userdata[param] != 'undefined') {
            return userdata[param];
        }
        return ifempty;
    }

    /**
     * Set an attempt's snapshot.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormOffline#setAttemptSnapshot
     * @param {Number} scormId  SCORM ID.
     * @param {Number} attempt  Attempt number.
     * @param {Object} userData User data to store as snapshot.
     * @param {Number} [userId] User ID. If not defined, current user.
     * @return {Promise}        Promise resolved when snapshot has been stored.
     */
    self.setAttemptSnapshot = function(scormId, attempt, userData, userId) {
        $log.debug('Set snapshot for attempt ' + attempt + ' in SCORM ' + scormId);
        userId = userId || $mmSite.getUserId();

        return $mmSite.getDb().get(mmaModScormOfflineAttemptsStore, [scormId, userId, attempt]).then(function(entry) {
            entry.snapshot = removeDefaultData(userData);
            entry.timemodified = $mmUtil.timestamp();
            return $mmSite.getDb().insert(mmaModScormOfflineAttemptsStore, entry);
        });
    };

    return self;
});
