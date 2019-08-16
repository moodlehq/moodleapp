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

import { Injectable } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModScormProvider } from './scorm';
import { SQLiteDB } from '@classes/sqlitedb';

/**
 * Service to handle offline SCORM.
 */
@Injectable()
export class AddonModScormOfflineProvider {

    protected logger;

    // Variables for database.
    static ATTEMPTS_TABLE = 'addon_mod_scorm_offline_attempts';
    static TRACKS_TABLE = 'addon_mod_scorm_offline_scos_tracks';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModScormOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModScormOfflineProvider.ATTEMPTS_TABLE,
                columns: [
                    {
                        name: 'scormid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'attempt', // Attempt number.
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'snapshot',
                        type: 'TEXT'
                    },
                ],
                primaryKeys: ['scormid', 'userid', 'attempt']
            },
            {
                name: AddonModScormOfflineProvider.TRACKS_TABLE,
                columns: [
                    {
                        name: 'scormid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'attempt', // Attempt number.
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'scoid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'element',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'value',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'synced',
                        type: 'INTEGER'
                    },
                ],
                primaryKeys: ['scormid', 'userid', 'attempt', 'scoid', 'element']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider,
            private syncProvider: CoreSyncProvider, private utils: CoreUtilsProvider, private textUtils: CoreTextUtilsProvider,
            private userProvider: CoreUserProvider) {
        this.logger = logger.getInstance('AddonModScormOfflineProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Changes an attempt number in the data stored in offline.
     * This function is used to convert attempts into new attempts, so the stored snapshot will be removed and
     * entries will be marked as not synced.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Number of the attempt to change.
     * @param {number} newAttempt New attempt number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the attempt number changes.
     */
    changeAttemptNumber(scormId: number, attempt: number, newAttempt: number, siteId?: string, userId?: number): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Change attempt number from ' + attempt + ' to ' + newAttempt + ' in SCORM ' + scormId);

            // Update the attempt number.
            const db = site.getDb(),
                currentAttemptConditions = {scormid: scormId, userid: userId, attempt: attempt},
                newAttemptConditions = {scormid: scormId, userid: userId, attempt: newAttempt};
            let newData: any = {
                    attempt: newAttempt,
                    timemodified: this.timeUtils.timestamp()
                };

            // Block the SCORM so it can't be synced.
            this.syncProvider.blockOperation(AddonModScormProvider.COMPONENT, scormId, 'changeAttemptNumber', site.id);

            return db.updateRecords(AddonModScormOfflineProvider.ATTEMPTS_TABLE, newData, currentAttemptConditions).then(() => {

                // Now update the attempt number of all the tracks and mark them as not synced.
                newData = {
                    attempt: newAttempt,
                    synced: 0
                };

                return db.updateRecords(AddonModScormOfflineProvider.TRACKS_TABLE, newData, currentAttemptConditions)
                        .catch((error) => {
                    // Failed to update the tracks, restore the old attempt number.
                    return db.updateRecords(AddonModScormOfflineProvider.ATTEMPTS_TABLE, { attempt: attempt },
                            newAttemptConditions).then(() => {
                        return Promise.reject(error);
                    });
                });
            }).finally(() => {
                // Unblock the SCORM.
                this.syncProvider.unblockOperation(AddonModScormProvider.COMPONENT, scormId, 'changeAttemptNumber', site.id);
            });
        });
    }

    /**
     * Creates a new offline attempt. It can be created from scratch or as a copy of another attempt.
     *
     * @param {any} scorm SCORM.
     * @param {number} attempt Number of the new attempt.
     * @param {any} userData User data to store in the attempt.
     * @param {any} [snapshot] Optional. Snapshot to store in the attempt.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the new attempt is created.
     */
    createNewAttempt(scorm: any, attempt: number, userData: any, snapshot?: any, siteId?: string, userId?: number): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Creating new offline attempt ' + attempt + ' in SCORM ' + scorm.id);

            // Block the SCORM so it can't be synced.
            this.syncProvider.blockOperation(AddonModScormProvider.COMPONENT, scorm.id, 'createNewAttempt', site.id);

            // Create attempt in DB.
            const db = site.getDb(),
                entry: any = {
                    scormid: scorm.id,
                    userid: userId,
                    attempt: attempt,
                    courseid: scorm.course,
                    timecreated: this.timeUtils.timestamp(),
                    timemodified: this.timeUtils.timestamp(),
                    snapshot: null
                };

            if (snapshot) {
                // Save a snapshot of the data we had when we created the attempt.
                // Remove the default data, we don't want to store it.
                entry.snapshot = JSON.stringify(this.removeDefaultData(snapshot));
            }

            return db.insertRecord(AddonModScormOfflineProvider.ATTEMPTS_TABLE, entry).then(() => {
                // Store all the data in userData.
                const promises = [];

                for (const key in userData) {
                    const sco = userData[key],
                        tracks = [];

                    for (const element in sco.userdata) {
                        tracks.push({element: element, value: sco.userdata[element]});
                    }

                    promises.push(this.saveTracks(scorm, sco.scoid, attempt, tracks, userData, site.id, userId));
                }

                return Promise.all(promises);
            }).finally(() => {
                // Unblock the SCORM.
                this.syncProvider.unblockOperation(AddonModScormProvider.COMPONENT, scorm.id, 'createNewAttempt', site.id);
            });
        });
    }

    /**
     * Delete all the stored data from an attempt.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Attempt number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when all the data has been deleted.
     */
    deleteAttempt(scormId: number, attempt: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Delete offline attempt ' + attempt + ' in SCORM ' + scormId);

            const promises = [],
                db = site.getDb();

            // Delete the attempt.
            promises.push(db.deleteRecords(AddonModScormOfflineProvider.ATTEMPTS_TABLE, {scormid: scormId, userid: userId,
                    attempt: attempt}));

            // Delete all the tracks.
            promises.push(db.deleteRecords(AddonModScormOfflineProvider.TRACKS_TABLE, {scormid: scormId, userid: userId,
                    attempt: attempt}));

            return Promise.all(promises);
        });
    }

    /**
     * Helper function to return a formatted list of interactions for reports.
     * This function is based in Moodle's scorm_format_interactions.
     *
     * @param {any} scoUserData Userdata from a certain SCO.
     * @return {any} Formatted userdata.
     */
    protected formatInteractions(scoUserData: any): any {
        const formatted: any = {};

        // Defined in order to unify scorm1.2 and scorm2004.
        formatted.score_raw = '';
        formatted.status = '';
        formatted.total_time = '00:00:00';
        formatted.session_time = '00:00:00';

        for (const element in scoUserData) {
            let value = scoUserData[element];

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
                    formatted.score_raw = this.textUtils.roundToDecimals(value, 2); // Round to 2 decimals max.
                    break;

                case 'cmi.core.session_time':
                case 'cmi.session_time':
                    formatted.session_time = value;
                    break;

                case 'cmi.core.total_time':
                case 'cmi.total_time':
                    formatted.total_time = value;
                    break;
                default:
                    // Nothing to do.
            }
        }

        return formatted;
    }

    /**
     * Get all the offline attempts in a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved when the offline attempts are retrieved.
     */
    getAllAttempts(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getAllRecords(AddonModScormOfflineProvider.ATTEMPTS_TABLE);
        }).then((attempts) => {
            attempts.forEach((attempt) => {
                attempt.snapshot = this.textUtils.parseJSON(attempt.snapshot);
            });

            return attempts;
        });
    }

    /**
     * Get an offline attempt.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Attempt number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<number>} Promise resolved with the attempt.
     */
    getAttempt(scormId: number, attempt: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().getRecord(AddonModScormOfflineProvider.ATTEMPTS_TABLE, {scormid: scormId, userid: userId,
                    attempt: attempt});
        }).then((entry) => {
            entry.snapshot = this.textUtils.parseJSON(entry.snapshot);

            return entry;
        });
    }

    /**
     * Get the creation time of an attempt.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Attempt number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<number>} Promise resolved with time the attempt was created.
     */
    getAttemptCreationTime(scormId: number, attempt: number, siteId?: string, userId?: number): Promise<number> {
        return this.getAttempt(scormId, attempt, siteId, userId).catch(() => {
            return {}; // Attempt not found.
        }).then((entry) => {
            return entry.timecreated;
        });
    }

    /**
     * Get the offline attempts done by a user in the given SCORM.
     *
     * @param {number} scormId  SCORM ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any[]>} Promise resolved when the offline attempts are retrieved.
     */
    getAttempts(scormId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().getRecords(AddonModScormOfflineProvider.ATTEMPTS_TABLE, {scormid: scormId, userid: userId});
        }).then((attempts) => {
            attempts.forEach((attempt) => {
                attempt.snapshot = this.textUtils.parseJSON(attempt.snapshot);
            });

            return attempts;
        });
    }

    /**
     * Get the snapshot of an attempt.
     *
     * @param {number} scormId  SCORM ID.
     * @param {number} attempt  Attempt number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved with the snapshot or undefined if no snapshot.
     */
    getAttemptSnapshot(scormId: number, attempt: number, siteId?: string, userId?: number): Promise<any> {
        return this.getAttempt(scormId, attempt, siteId, userId).catch(() => {
            return {}; // Attempt not found.
        }).then((entry) => {
            return entry.snapshot;
        });
    }

    /**
     * Get launch URLs from a list of SCOs, indexing them by SCO ID.
     *
     * @param {any[]} scos List of SCOs. Each SCO needs to have 'id' and 'launch' properties.
     * @return {{[scoId: number]: string}} Launch URLs indexed by SCO ID.
     */
    protected getLaunchUrlsFromScos(scos: any[]): {[scoId: number]: string} {
        scos = scos || [];

        const response = {};

        scos.forEach((sco) => {
            response[sco.id] = sco.launch;
        });

        return response;
    }

    /**
     * Get data stored in local DB for a certain scorm and attempt.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Attempt number.
     * @param {boolean} [excludeSynced] Whether it should only return not synced entries.
     * @param {boolean} [excludeNotSynced] Whether it should only return synced entries.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any[]>} Promise resolved with the entries.
     */
    getScormStoredData(scormId: number, attempt: number, excludeSynced?: boolean, excludeNotSynced?: boolean, siteId?: string,
            userId?: number): Promise<any[]> {

        if (excludeSynced && excludeNotSynced) {
            return Promise.resolve([]);
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const conditions: any = {
                scormid: scormId,
                userid: userId,
                attempt: attempt
            };

            if (excludeSynced) {
                conditions.synced = 0;
            } else if (excludeNotSynced) {
                conditions.synced = 1;
            }

            return site.getDb().getRecords(AddonModScormOfflineProvider.TRACKS_TABLE, conditions);
        }).then((tracks) => {
            tracks.forEach((track) => {
                track.value = this.textUtils.parseJSON(track.value);
            });

            return tracks;
        });
    }

    /**
     * Get the user data for a certain SCORM and offline attempt.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Attempt number.
     * @param {any[]} scos SCOs returned by AddonModScormProvider.getScos. If not supplied, this function will only return the
     *                     SCOs that have something stored and cmi.launch_data will be undefined.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the user data is retrieved.
     */
    getScormUserData(scormId: number, attempt: number, scos: any[], siteId?: string, userId?: number): Promise<any> {
        scos = scos || [];

        let fullName = '',
            userName = '';

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            // Get username and fullname.
            if (userId == site.getUserId()) {
                fullName = site.getInfo().fullname;
                userName = site.getInfo().username;
            } else {
                return this.userProvider.getProfile(userId).then((profile) => {
                    fullName = profile.fullname;
                    userName = profile.username || '';
                }).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {

            // Get user data. Ordering when using a compound index is complex, so we won't order by scoid.
            return this.getScormStoredData(scormId, attempt, false, false, siteId, userId).then((entries) => {
                const response = {},
                    launchUrls = this.getLaunchUrlsFromScos(scos);

                // Gather user data retrieved from DB, grouping it by scoid.
                entries.forEach((entry) => {
                    const scoId = entry.scoid;

                    if (!response[scoId]) {
                        // Initialize SCO.
                        response[scoId] = {
                            scoid: scoId,
                            userdata: {
                                userid: userId,
                                scoid: scoId,
                                timemodified: 0
                            }
                        };
                    }

                    response[scoId].userdata[entry.element] = entry.value;
                    if (entry.timemodified > response[scoId].userdata.timemodified) {
                        response[scoId].userdata.timemodified = entry.timemodified;
                    }
                });

                // Format each user data retrieved.
                for (const scoId in response) {
                    const sco = response[scoId];
                    sco.userdata = this.formatInteractions(sco.userdata);
                }

                // Create empty entries for the SCOs without user data stored.
                scos.forEach((sco) => {
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
                for (const scoId in response) {
                    const sco = response[scoId];

                    sco.defaultdata = {};
                    sco.defaultdata['cmi.core.student_id'] = userName;
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

                    sco.defaultdata['cmi.student_data.mastery_score'] = this.scormIsset(sco.userdata, 'masteryscore');
                    sco.defaultdata['cmi.student_data.max_time_allowed'] = this.scormIsset(sco.userdata, 'max_time_allowed');
                    sco.defaultdata['cmi.student_data.time_limit_action'] = this.scormIsset(sco.userdata, 'time_limit_action');
                    sco.defaultdata['cmi.core.total_time'] = this.scormIsset(sco.userdata, 'cmi.core.total_time', '00:00:00');
                    sco.defaultdata['cmi.launch_data'] = launchUrls[sco.scoid];

                    // Now handle standard userdata items.
                    sco.defaultdata['cmi.core.lesson_location'] = this.scormIsset(sco.userdata, 'cmi.core.lesson_location');
                    sco.defaultdata['cmi.core.lesson_status'] = this.scormIsset(sco.userdata, 'cmi.core.lesson_status');
                    sco.defaultdata['cmi.core.score.raw'] = this.scormIsset(sco.userdata, 'cmi.core.score.raw');
                    sco.defaultdata['cmi.core.score.max'] = this.scormIsset(sco.userdata, 'cmi.core.score.max');
                    sco.defaultdata['cmi.core.score.min'] = this.scormIsset(sco.userdata, 'cmi.core.score.min');
                    sco.defaultdata['cmi.core.exit'] = this.scormIsset(sco.userdata, 'cmi.core.exit');
                    sco.defaultdata['cmi.suspend_data'] = this.scormIsset(sco.userdata, 'cmi.suspend_data');
                    sco.defaultdata['cmi.comments'] = this.scormIsset(sco.userdata, 'cmi.comments');
                    sco.defaultdata['cmi.student_preference.language'] = this.scormIsset(sco.userdata,
                            'cmi.student_preference.language');
                    sco.defaultdata['cmi.student_preference.audio'] = this.scormIsset(sco.userdata,
                            'cmi.student_preference.audio', '0');
                    sco.defaultdata['cmi.student_preference.speed'] = this.scormIsset(sco.userdata,
                            'cmi.student_preference.speed', '0');
                    sco.defaultdata['cmi.student_preference.text'] = this.scormIsset(sco.userdata,
                            'cmi.student_preference.text', '0');

                    // Some data needs to be both in default data and user data.
                    sco.userdata.student_id = userName;
                    sco.userdata.student_name = fullName;
                    sco.userdata.mode = sco.defaultdata['cmi.core.lesson_mode'];
                    sco.userdata.credit = sco.defaultdata['cmi.core.credit'];
                    sco.userdata.entry = sco.defaultdata['cmi.core.entry'];
                }

                return response;
            });
        });
    }

    /**
     * Insert a track in the offline tracks store.
     * This function is based on Moodle's scorm_insert_track.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} scoId SCO ID.
     * @param {number} attempt Attempt number.
     * @param {string} element Name of the element to insert.
     * @param {any} value Value to insert.
     * @param {boolean} [forceCompleted] True if SCORM forces completed.
     * @param {any} [scoData] User data for the given SCO.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not set use site's current user.
     * @return {Promise<any>} Promise resolved when the insert is done.
     */
    protected insertTrack(scormId: number, scoId: number, attempt: number, element: string, value: any, forceCompleted?: boolean,
            scoData?: any, siteId?: string, userId?: number): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();
            scoData = scoData || {};

            const promises = [], // List of promises for actions previous to the real insert.
                scoUserData = scoData.userdata || {},
                db = site.getDb();
            let lessonStatusInserted = false;

            if (forceCompleted) {
                if (element == 'cmi.core.lesson_status' && value == 'incomplete') {
                    if (scoUserData['cmi.core.score.raw']) {
                        value = 'completed';
                    }
                }
                if (element == 'cmi.core.score.raw') {
                    if (scoUserData['cmi.core.lesson_status'] == 'incomplete') {
                        lessonStatusInserted = true;

                        promises.push(this.insertTrackToDB(db, userId, scormId, scoId, attempt, 'cmi.core.lesson_status',
                                'completed'));
                    }
                }
            }

            return Promise.all(promises).then(() => {
                // Don't update x.start.time, keep the original value.
                if (!scoUserData[element] || element != 'x.start.time') {
                    let promise = <Promise<any>> this.insertTrackToDB(db, userId, scormId, scoId, attempt, element, value);

                    return promise.catch((error) => {
                        if (lessonStatusInserted) {
                            // Rollback previous insert.
                            promise = <Promise<any>> this.insertTrackToDB(db, userId, scormId, scoId, attempt,
                                    'cmi.core.lesson_status', 'incomplete');

                            return promise.then(() => {
                                return Promise.reject(error);
                            });
                        }

                        return Promise.reject(null);
                    });
                }
            });
        });
    }

    /**
     * Insert a track in the DB.
     *
     * @param {SQLiteDB} db Site's DB.
     * @param {number} userId User ID.
     * @param {number} scormId SCORM ID.
     * @param {number} scoId SCO ID.
     * @param {number} attempt Attempt number.
     * @param {string} element Name of the element to insert.
     * @param {any} value Value of the element to insert.
     * @param {boolean} synchronous True if insert should NOT return a promise. Please use it only if synchronous is a must.
     * @return {boolean|Promise<any>} Returns a promise if synchronous=false, otherwise returns a boolean.
     */
    protected insertTrackToDB(db: SQLiteDB, userId: number, scormId: number, scoId: number, attempt: number, element: string,
            value: any, synchronous?: boolean): boolean | Promise<any> {

        const entry = {
            userid: userId,
            scormid: scormId,
            scoid: scoId,
            attempt: attempt,
            element: element,
            value: typeof value == 'undefined' ? null : JSON.stringify(value),
            timemodified: this.timeUtils.timestamp(),
            synced: 0
        };

        if (synchronous) {
            // The insert operation is always asynchronous, always return true.
            db.insertRecord(AddonModScormOfflineProvider.TRACKS_TABLE, entry);

            return true;
        } else {
            return db.insertRecord(AddonModScormOfflineProvider.TRACKS_TABLE, entry);
        }
    }

    /**
     * Insert a track in the offline tracks store, returning a synchronous value.
     * Please use this function only if synchronous is a must. It's recommended to use insertTrack.
     * This function is based on Moodle's scorm_insert_track.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} scoId SCO ID.
     * @param {number} attempt Attempt number.
     * @param {string} element Name of the element to insert.
     * @param {any} value Value of the element to insert.
     * @param {boolean} [forceCompleted] True if SCORM forces completed.
     * @param {any} [scoData] User data for the given SCO.
     * @param {number} [userId] User ID. If not set use current user.
     * @return {boolean} Promise resolved when the insert is done.
     */
    protected insertTrackSync(scormId: number, scoId: number, attempt: number, element: string, value: any,
            forceCompleted?: boolean, scoData?: any, userId?: number): boolean {
        scoData = scoData || {};
        userId = userId || this.sitesProvider.getCurrentSiteUserId();

        if (!this.sitesProvider.isLoggedIn()) {
            // Not logged in, we can't get the site DB. User logged out or session expired while an operation was ongoing.
            return false;
        }

        const scoUserData = scoData.userdata || {},
            db = this.sitesProvider.getCurrentSite().getDb();
        let lessonStatusInserted = false;

        if (forceCompleted) {
            if (element == 'cmi.core.lesson_status' && value == 'incomplete') {
                if (scoUserData['cmi.core.score.raw']) {
                    value = 'completed';
                }
            }
            if (element == 'cmi.core.score.raw') {
                if (scoUserData['cmi.core.lesson_status'] == 'incomplete') {
                    lessonStatusInserted = true;

                    if (!this.insertTrackToDB(db, userId, scormId, scoId, attempt, 'cmi.core.lesson_status', 'completed', true)) {
                        return false;
                    }
                }
            }
        }

        // Don't update x.start.time, keep the original value.
        if (!scoUserData[element] || element != 'x.start.time') {
            if (!this.insertTrackToDB(db, userId, scormId, scoId, attempt, element, value, true)) {
                // Insert failed.
                if (lessonStatusInserted) {
                    // Rollback previous insert.
                    this.insertTrackToDB(db, userId, scormId, scoId, attempt, 'cmi.core.lesson_status', 'incomplete', true);
                }

                return false;
            }

            return true;
        }
    }

    /**
     * Mark all the entries from a SCO and attempt as synced.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Attempt number.
     * @param {number} scoId SCO ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when marked.
     */
    markAsSynced(scormId: number, attempt: number, scoId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Mark SCO ' + scoId + ' as synced for attempt ' + attempt + ' in SCORM ' + scormId);

            return site.getDb().updateRecords(AddonModScormOfflineProvider.TRACKS_TABLE, {synced: 1}, {
                scormid: scormId,
                userid: userId,
                attempt: attempt,
                scoid: scoId,
                synced: 0
            });
        });
    }

    /**
     * Removes the default data form user data.
     *
     * @param {any} userData User data returned by AddonModScormProvider.getScormUserData.
     * @return {any} User data without default data.
     */
    protected removeDefaultData(userData: any): any {
        const result = this.utils.clone(userData);

        for (const key in result) {
            delete result[key].defaultdata;
        }

        return result;
    }

    /**
     * Saves a SCORM tracking record in offline.
     *
     * @param {any} scorm SCORM.
     * @param {number} scoId Sco ID.
     * @param {number} attempt Attempt number.
     * @param {any[]} tracks Tracking data to store.
     * @param {any} userData User data for this attempt and SCO.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when data is saved.
     */
    saveTracks(scorm: any, scoId: number, attempt: number, tracks: any[], userData: any, siteId?: string, userId?: number)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            // Block the SCORM so it can't be synced.
            this.syncProvider.blockOperation(AddonModScormProvider.COMPONENT, scorm.id, 'saveTracksOffline', siteId);

            // Insert all the tracks.
            const promises = [];
            tracks.forEach((track) => {
                promises.push(this.insertTrack(scorm.id, scoId, attempt, track.element, track.value, scorm.forcecompleted,
                        userData[scoId], siteId, userId));
            });

            return Promise.all(promises).finally(() => {
                // Unblock the SCORM operation.
                this.syncProvider.unblockOperation(AddonModScormProvider.COMPONENT, scorm.id, 'saveTracksOffline', siteId);
            });
        });
    }

    /**
     * Saves a SCORM tracking record in offline returning a synchronous value.
     * Please use this function only if synchronous is a must. It's recommended to use saveTracks.
     *
     * @param  {any} scorm    SCORM.
     * @param  {number} scoId    Sco ID.
     * @param  {number} attempt  Attempt number.
     * @param  {Object[]} tracks Tracking data to store.
     * @param  {any} userData User data for this attempt and SCO.
     * @return {boolean}         True if data to insert is valid, false otherwise. Returning true doesn't mean that the data
     *                           has been stored, this function can return true but the insertion can still fail somehow.
     */
    saveTracksSync(scorm: any, scoId: number, attempt: number, tracks: any[], userData: any, userId?: number): boolean {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();
        let success = true;

        tracks.forEach((track) => {
            if (!this.insertTrackSync(scorm.id, scoId, attempt, track.element, track.value, scorm.forcecompleted, userData[scoId],
                    userId)) {
                success = false;
            }
        });

        return success;
    }

    /**
     * Check for a parameter in userData and return it if it's set or return 'ifempty' if it's empty.
     * Based on Moodle's scorm_isset function.
     *
     * @param {any} userData Contains user's data.
     * @param {string} param Name of parameter that should be checked.
     * @param {any} [ifEmpty] Value to be replaced with if param is not set.
     * @return {any} Value from userData[param] if set, ifEmpty otherwise.
     */
    protected scormIsset(userData: any, param: string, ifEmpty: any = ''): any {
        if (typeof userData[param] != 'undefined') {
            return userData[param];
        }

        return ifEmpty;
    }

    /**
     * Set an attempt's snapshot.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Attempt number.
     * @param {any} userData User data to store as snapshot.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when snapshot has been stored.
     */
    setAttemptSnapshot(scormId: number, attempt: number, userData: any, siteId?: string, userId?: number): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Set snapshot for attempt ' + attempt + ' in SCORM ' + scormId);

            const newData = {
                timemodified: this.timeUtils.timestamp(),
                snapshot: JSON.stringify(this.removeDefaultData(userData))
            };

            return site.getDb().updateRecords(AddonModScormOfflineProvider.ATTEMPTS_TABLE, newData, { scormid: scormId,
                    userid: userId, attempt: attempt });
        });
    }
}
