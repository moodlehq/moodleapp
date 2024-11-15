// (C) Copyright 2015 Moodle Pty Ltd.
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
import { CoreUser } from '@features/user/services/user';
import { CoreSites } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreText } from '@singletons/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import {
    AddonModScormAttemptDBPrimaryKeys,
    AddonModScormAttemptDBRecord,
    AddonModScormOfflineDBCommonData,
    AddonModScormTrackDBPrimaryKeys,
    AddonModScormTrackDBRecord,
    ATTEMPTS_TABLE_NAME,
    ATTEMPTS_TABLE_PRIMARY_KEYS,
    TRACKS_TABLE_NAME,
    TRACKS_TABLE_PRIMARY_KEYS,
} from './database/scorm';
import {
    AddonModScormDataEntry,
    AddonModScormDataValue,
    AddonModScormScorm,
    AddonModScormScoUserData,
    AddonModScormUserDataMap,
    AddonModScormWSSco,
} from './scorm';
import { lazyMap, LazyMap } from '@/core/utils/lazy-map';
import { asyncInstance, AsyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import { ADDON_MOD_SCORM_COMPONENT } from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Service to handle offline SCORM.
 */
@Injectable({ providedIn: 'root' })
export class AddonModScormOfflineProvider {

    protected logger: CoreLogger;

    protected tracksTables: LazyMap<
        AsyncInstance<CoreDatabaseTable<AddonModScormTrackDBRecord, AddonModScormTrackDBPrimaryKeys, never>>
    >;

    protected attemptsTables: LazyMap<
        AsyncInstance<CoreDatabaseTable<AddonModScormAttemptDBRecord, AddonModScormAttemptDBPrimaryKeys, never>>
    >;

    constructor() {
        this.logger = CoreLogger.getInstance('AddonModScormOfflineProvider');
        this.tracksTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable<AddonModScormTrackDBRecord, AddonModScormTrackDBPrimaryKeys, never>(
                    TRACKS_TABLE_NAME,
                    {
                        siteId,
                        primaryKeyColumns: [...TRACKS_TABLE_PRIMARY_KEYS],
                        rowIdColumn: null,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.tracksTables[siteId],
                    },
                ),
            ),
        );
        this.attemptsTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable<AddonModScormAttemptDBRecord, AddonModScormAttemptDBPrimaryKeys, never>(
                    ATTEMPTS_TABLE_NAME,
                    {
                        siteId,
                        primaryKeyColumns: [...ATTEMPTS_TABLE_PRIMARY_KEYS],
                        rowIdColumn: null,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.tracksTables[siteId],
                    },
                ),
            ),
        );
    }

    /**
     * Changes an attempt number in the data stored in offline.
     * This function is used to convert attempts into new attempts, so the stored snapshot will be removed and
     * entries will be marked as not synced.
     *
     * @param scormId SCORM ID.
     * @param attempt Number of the attempt to change.
     * @param newAttempt New attempt number.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the attempt number changes.
     */
    async changeAttemptNumber(
        scormId: number,
        attempt: number,
        newAttempt: number,
        siteId?: string,
        userId?: number,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        this.logger.debug(`Change attempt number from ${attempt} to ${newAttempt} in SCORM ${scormId}`);

        // Block the SCORM so it can't be synced.
        CoreSync.blockOperation(ADDON_MOD_SCORM_COMPONENT, scormId, 'changeAttemptNumber', site.id);

        try {
            const currentAttemptConditions = {
                sql: 'scormid = ? AND userid = ? AND attempt = ?',
                sqlParams: [scormId, userId, attempt],
                js: (record: AddonModScormOfflineDBCommonData) =>
                    record.scormid === scormId &&
                    record.userid === userId &&
                    record.attempt === attempt,
            };

            await this.attemptsTables[site.id].updateWhere(
                { attempt: newAttempt, timemodified: CoreTimeUtils.timestamp() },
                currentAttemptConditions,
            );

            try {
                // Now update the attempt number of all the tracks and mark them as not synced.
                await this.tracksTables[site.id].updateWhere(
                    { attempt: newAttempt, synced: 0 },
                    currentAttemptConditions,
                );
            } catch (error) {
                // Failed to update the tracks, restore the old attempt number.
                await this.attemptsTables[site.id].updateWhere(
                    { attempt },
                    {
                        sql: 'scormid = ? AND userid = ? AND attempt = ?',
                        sqlParams: [scormId, userId, newAttempt],
                        js: (attempt) =>
                            attempt.scormid === scormId &&
                            attempt.userid === userId &&
                            attempt.attempt === newAttempt,
                    },
                );

                throw error;
            }
        } finally {
            // Unblock the SCORM.
            CoreSync.unblockOperation(ADDON_MOD_SCORM_COMPONENT, scormId, 'changeAttemptNumber', site.id);
        }
    }

    /**
     * Creates a new offline attempt. It can be created from scratch or as a copy of another attempt.
     *
     * @param scorm SCORM.
     * @param attempt Number of the new attempt.
     * @param userData User data to store in the attempt.
     * @param snapshot Optional. Snapshot to store in the attempt.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the new attempt is created.
     */
    async createNewAttempt(
        scorm: AddonModScormScorm,
        attempt: number,
        userData: AddonModScormUserDataMap,
        snapshot?: AddonModScormUserDataMap,
        siteId?: string,
        userId?: number,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        this.logger.debug(`Creating new offline attempt ${attempt} in SCORM ${scorm.id}`);

        // Block the SCORM so it can't be synced.
        CoreSync.blockOperation(ADDON_MOD_SCORM_COMPONENT, scorm.id, 'createNewAttempt', site.id);

        // Create attempt in DB.
        const entry: AddonModScormAttemptDBRecord = {
            scormid: scorm.id,
            userid: userId,
            attempt,
            courseid: scorm.course,
            timecreated: CoreTimeUtils.timestamp(),
            timemodified: CoreTimeUtils.timestamp(),
            snapshot: null,
        };

        if (snapshot) {
            // Save a snapshot of the data we had when we created the attempt.
            // Remove the default data, we don't want to store it.
            entry.snapshot = JSON.stringify(this.removeDefaultData(snapshot));
        }

        try {
            await this.attemptsTables[site.id].insert(entry);

            // Store all the data in userData.
            const promises: Promise<void>[] = [];

            for (const key in userData) {
                const sco = userData[key];
                const tracks: AddonModScormDataEntry[] = [];

                for (const element in sco.userdata) {
                    tracks.push({ element, value: sco.userdata[element] });
                }

                promises.push(this.saveTracks(scorm, sco.scoid, attempt, tracks, userData, site.id, userId));
            }

            await Promise.all(promises);
        } finally {
            // Unblock the SCORM.
            CoreSync.unblockOperation(ADDON_MOD_SCORM_COMPONENT, scorm.id, 'createNewAttempt', site.id);
        }
    }

    /**
     * Delete all the stored data from an attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when all the data has been deleted.
     */
    async deleteAttempt(scormId: number, attempt: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        this.logger.debug(`Delete offline attempt ${attempt} in SCORM ${scormId}`);

        const conditions = {
            scormid: scormId,
            userid: userId,
            attempt,
        };

        await Promise.all([
            this.attemptsTables[site.id].delete(conditions),
            this.tracksTables[site.id].delete(conditions),
        ]);
    }

    /**
     * Helper function to return a formatted list of interactions for reports.
     * This function is based in Moodle's scorm_format_interactions.
     *
     * @param scoUserData Userdata from a certain SCO.
     * @returns Formatted userdata.
     */
    protected formatInteractions(scoUserData: Record<string, AddonModScormDataValue>): Record<string, AddonModScormDataValue> {
        const formatted: Record<string, AddonModScormDataValue> = {};

        // Defined in order to unify scorm1.2 and scorm2004.
        formatted.score_raw = '';
        formatted.status = '';
        formatted.total_time = '00:00:00';
        formatted.session_time = '00:00:00';

        for (const element in scoUserData) {
            let value = scoUserData[element];

            // Ignore elements that are calculated.
            if (element == 'score_raw' || element == 'status' || element == 'total_time' || element == 'session_time') {
                continue;
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
                    formatted.score_raw = CoreText.roundToDecimals(Number(value), 2); // Round to 2 decimals max.
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
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the offline attempts are retrieved.
     */
    async getAllAttempts(siteId?: string): Promise<AddonModScormOfflineAttempt[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        const attempts = await this.attemptsTables[siteId].getMany();

        return attempts.map((attempt) => this.parseAttempt(attempt));
    }

    /**
     * Get an offline attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved with the attempt.
     */
    async getAttempt(scormId: number, attempt: number, siteId?: string, userId?: number): Promise<AddonModScormOfflineAttempt> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const attemptRecord = await this.attemptsTables[site.id].getOneByPrimaryKey({
            scormid: scormId,
            userid: userId,
            attempt,
        });

        return this.parseAttempt(attemptRecord);
    }

    /**
     * Get the creation time of an attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved with time the attempt was created, undefined if attempt not found.
     */
    async getAttemptCreationTime(scormId: number, attempt: number, siteId?: string, userId?: number): Promise<number | undefined> {
        try {
            const attemptRecord = await this.getAttempt(scormId, attempt, siteId, userId);

            return attemptRecord.timecreated;
        } catch {
            return;
        }
    }

    /**
     * Get the offline attempts done by a user in the given SCORM.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the offline attempts are retrieved.
     */
    async getAttempts(scormId: number, siteId?: string, userId?: number): Promise<AddonModScormOfflineAttempt[]> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const attempts = await this.attemptsTables[site.id].getMany({
            scormid: scormId,
            userid: userId,
        });

        return attempts.map((attempt) => this.parseAttempt(attempt));
    }

    /**
     * Get the snapshot of an attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved with the snapshot or undefined if no snapshot.
     */
    async getAttemptSnapshot(
        scormId: number,
        attempt: number,
        siteId?: string,
        userId?: number,
    ): Promise<AddonModScormUserDataMap | undefined> {
        try {
            const attemptRecord = await this.getAttempt(scormId, attempt, siteId, userId);

            return attemptRecord.snapshot || undefined;
        } catch {
            return;
        }
    }

    /**
     * Get launch URLs from a list of SCOs, indexing them by SCO ID.
     *
     * @param scos List of SCOs.
     * @returns Launch URLs indexed by SCO ID.
     */
    protected getLaunchUrlsFromScos(scos: AddonModScormWSSco[]): Record<number, string> {
        scos = scos || [];

        const response: Record<number, string> = {};

        scos.forEach((sco) => {
            response[sco.id] = sco.launch;
        });

        return response;
    }

    /**
     * Get data stored in local DB for a certain scorm and attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param excludeSynced Whether it should only return not synced entries.
     * @param excludeNotSynced Whether it should only return synced entries.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved with the entries.
     */
    async getScormStoredData(
        scormId: number,
        attempt: number,
        excludeSynced?: boolean,
        excludeNotSynced?: boolean,
        siteId?: string,
        userId?: number,
    ): Promise<AddonModScormOfflineTrack[]> {
        if (excludeSynced && excludeNotSynced) {
            return [];
        }

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const conditions: Partial<AddonModScormTrackDBRecord> = {
            scormid: scormId,
            userid: userId,
            attempt,
        };

        if (excludeSynced) {
            conditions.synced = 0;
        } else if (excludeNotSynced) {
            conditions.synced = 1;
        }

        const tracks = await this.tracksTables[site.id].getMany(conditions);

        return this.parseTracks(tracks);
    }

    /**
     * Get the user data for a certain SCORM and offline attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param scos SCOs returned by AddonModScormProvider.getScos. If not supplied, this function will only return the
     *             SCOs that have something stored and cmi.launch_data will be undefined.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the user data is retrieved.
     */
    async getScormUserData(
        scormId: number,
        attempt: number,
        scos?: AddonModScormWSSco[],
        siteId?: string,
        userId?: number,
    ): Promise<AddonModScormUserDataMap> {
        scos = scos || [];

        let fullName = '';
        let userName = '';

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        // Get username and fullname.
        if (userId == site.getUserId()) {
            fullName = site.getInfo()?.fullname || '';
            userName = site.getInfo()?.username || '';
        } else {
            const profile = await CorePromiseUtils.ignoreErrors(CoreUser.getProfile(userId));

            fullName = profile?.fullname || '';
            userName = profile?.username || '';
        }

        // Get user data.
        const entries = await this.getScormStoredData(scormId, attempt, false, false, siteId, userId);
        const response: AddonModScormUserDataMap = {};
        const launchUrls = this.getLaunchUrlsFromScos(scos);

        // Gather user data retrieved from DB, grouping it by scoid.
        entries.forEach((entry) => {
            const scoId = entry.scoid;

            if (!response[scoId]) {
                // Initialize SCO.
                response[scoId] = {
                    scoid: scoId,
                    userdata: {
                        userid: userId ?? site.getUserId(),
                        scoid: scoId,
                        timemodified: 0,
                    },
                    defaultdata: {},
                };
            }

            response[scoId].userdata[entry.element] = entry.value ?? '';
            if (entry.timemodified > Number(response[scoId].userdata.timemodified)) {
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
                        score_raw: '', // eslint-disable-line @typescript-eslint/naming-convention
                    },
                    defaultdata: {},
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
            sco.defaultdata['cmi.student_preference.language'] = this.scormIsset(sco.userdata, 'cmi.student_preference.language');
            sco.defaultdata['cmi.student_preference.audio'] = this.scormIsset(sco.userdata, 'cmi.student_preference.audio', '0');
            sco.defaultdata['cmi.student_preference.speed'] = this.scormIsset(sco.userdata, 'cmi.student_preference.speed', '0');
            sco.defaultdata['cmi.student_preference.text'] = this.scormIsset(sco.userdata, 'cmi.student_preference.text', '0');

            // Some data needs to be both in default data and user data.
            sco.userdata.student_id = userName;
            sco.userdata.student_name = fullName;
            sco.userdata.mode = sco.defaultdata['cmi.core.lesson_mode'];
            sco.userdata.credit = sco.defaultdata['cmi.core.credit'];
            sco.userdata.entry = sco.defaultdata['cmi.core.entry'];
        }

        return response;
    }

    /**
     * Insert a track in the offline tracks store.
     * This function is based on Moodle's scorm_insert_track.
     *
     * @param scormId SCORM ID.
     * @param scoId SCO ID.
     * @param attempt Attempt number.
     * @param element Name of the element to insert.
     * @param value Value to insert.
     * @param forceCompleted True if SCORM forces completed.
     * @param scoData User data for the given SCO.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not set use site's current user.
     * @returns Promise resolved when the insert is done.
     */
    protected async insertTrack(
        scormId: number,
        scoId: number,
        attempt: number,
        element: string,
        value?: string | number,
        forceCompleted?: boolean,
        scoData?: AddonModScormScoUserData,
        siteId?: string,
        userId?: number,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const scoUserData = scoData?.userdata || {};
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

                    await this.tracksTables[site.id].insert({
                        userid: userId,
                        scormid: scormId,
                        scoid: scoId,
                        attempt,
                        element: 'cmi.core.lesson_status',
                        value: JSON.stringify('completed'),
                        timemodified: CoreTimeUtils.timestamp(),
                        synced: 0,
                    });
                }
            }
        }

        if (scoUserData[element] && element == 'x.start.time') {
            // Don't update x.start.time, keep the original value.
            return;
        }

        try {
            await this.tracksTables[site.id].insert({
                userid: userId,
                scormid: scormId,
                scoid: scoId,
                attempt,
                element,
                value: value === undefined ? null : JSON.stringify(value),
                timemodified: CoreTimeUtils.timestamp(),
                synced: 0,
            });
        } catch (error) {
            if (lessonStatusInserted) {
                // Rollback previous insert.
                await this.tracksTables[site.id].insert({
                    userid: userId,
                    scormid: scormId,
                    scoid: scoId,
                    attempt,
                    element: 'cmi.core.lesson_status',
                    value: JSON.stringify('incomplete'),
                    timemodified: CoreTimeUtils.timestamp(),
                    synced: 0,
                });
            }

            throw error;
        }
    }

    /**
     * Insert a track in the offline tracks store, returning a synchronous value.
     * Please use this function only if synchronous is a must. It's recommended to use insertTrack.
     * This function is based on Moodle's scorm_insert_track.
     *
     * @param scormId SCORM ID.
     * @param scoId SCO ID.
     * @param attempt Attempt number.
     * @param element Name of the element to insert.
     * @param value Value of the element to insert.
     * @param forceCompleted True if SCORM forces completed.
     * @param scoData User data for the given SCO.
     * @param userId User ID. If not set use current user.
     * @returns Promise resolved when the insert is done.
     */
    protected insertTrackSync(
        scormId: number,
        scoId: number,
        attempt: number,
        element: string,
        value?: AddonModScormDataValue,
        forceCompleted?: boolean,
        scoData?: AddonModScormScoUserData,
        userId?: number,
    ): boolean {
        userId = userId || CoreSites.getCurrentSiteUserId();

        if (!CoreSites.isLoggedIn()) {
            // Not logged in, we can't get the site DB. User logged out or session expired while an operation was ongoing.
            return false;
        }

        const scoUserData = scoData?.userdata || {};
        const siteId = CoreSites.getRequiredCurrentSite().id;

        if (forceCompleted) {
            if (element == 'cmi.core.lesson_status' && value == 'incomplete') {
                if (scoUserData['cmi.core.score.raw']) {
                    value = 'completed';
                }
            }
            if (element == 'cmi.core.score.raw') {
                if (scoUserData['cmi.core.lesson_status'] == 'incomplete') {
                    this.tracksTables[siteId].syncInsert({
                        userid: userId,
                        scormid: scormId,
                        scoid: scoId,
                        attempt,
                        element: 'cmi.core.lesson_status',
                        value: JSON.stringify('completed'),
                        timemodified: CoreTimeUtils.timestamp(),
                        synced: 0,
                    });
                }
            }
        }

        if (scoUserData[element] && element == 'x.start.time') {
            // Don't update x.start.time, keep the original value.
            return true;
        }

        this.tracksTables[siteId].syncInsert({
            userid: userId,
            scormid: scormId,
            scoid: scoId,
            attempt,
            element: element,
            value: value === undefined ? null : JSON.stringify(value),
            timemodified: CoreTimeUtils.timestamp(),
            synced: 0,
        });

        return true;
    }

    /**
     * Mark all the entries from a SCO and attempt as synced.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param scoId SCO ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when marked.
     */
    async markAsSynced(scormId: number, attempt: number, scoId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        this.logger.debug(`Mark SCO ${scoId} as synced for attempt ${attempt} in SCORM ${scormId}`);

        await this.tracksTables[site.id].update({ synced: 1 }, {
            scormid: scormId,
            userid: userId,
            attempt,
            scoid: scoId,
            synced: 0,
        });
    }

    /**
     * Parse an attempt.
     *
     * @param attempt Attempt to parse.
     * @returns Parsed attempt.
     */
    protected parseAttempt(attempt: AddonModScormAttemptDBRecord): AddonModScormOfflineAttempt {
        return {
            ...attempt,
            snapshot: attempt.snapshot ? CoreText.parseJSON(attempt.snapshot) : null,
        };
    }

    /**
     * Parse tracks.
     *
     * @param tracks Tracks to parse.
     * @returns Parsed tracks.
     */
    protected parseTracks(tracks: AddonModScormTrackDBRecord[]): AddonModScormOfflineTrack[] {
        return tracks.map((track) => ({
            ...track,
            value: track.value ? CoreText.parseJSON(track.value) : null,
        }));
    }

    /**
     * Removes the default data form user data.
     *
     * @param userData User data.
     * @returns User data without default data.
     */
    protected removeDefaultData(userData: AddonModScormUserDataMap): AddonModScormUserDataMap {
        const result: AddonModScormUserDataMap = CoreUtils.clone(userData);

        for (const key in result) {
            result[key].defaultdata = {};
        }

        return result;
    }

    /**
     * Saves a SCORM tracking record in offline.
     *
     * @param scorm SCORM.
     * @param scoId Sco ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data to store.
     * @param userData User data for this attempt and SCO.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when data is saved.
     */
    async saveTracks(
        scorm: AddonModScormScorm,
        scoId: number,
        attempt: number,
        tracks: AddonModScormDataEntry[],
        userData: AddonModScormUserDataMap,
        siteId?: string,
        userId?: number,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        // Block the SCORM so it can't be synced.
        CoreSync.blockOperation(ADDON_MOD_SCORM_COMPONENT, scorm.id, 'saveTracksOffline', siteId);

        try {
            // Insert all the tracks.
            await Promise.all(tracks.map((track) => this.insertTrack(
                scorm.id,
                scoId,
                attempt,
                track.element,
                track.value,
                scorm.forcecompleted,
                userData[scoId],
                siteId,
                userId,
            )));
        } finally {
            // Unblock the SCORM operation.
            CoreSync.unblockOperation(ADDON_MOD_SCORM_COMPONENT, scorm.id, 'saveTracksOffline', siteId);
        }
    }

    /**
     * Saves a SCORM tracking record in offline returning a synchronous value.
     * Please use this function only if synchronous is a must. It's recommended to use saveTracks.
     *
     * @param scorm SCORM.
     * @param scoId Sco ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data to store.
     * @param userData User data for this attempt and SCO.
     * @returns True if data to insert is valid, false otherwise. Returning true doesn't mean that the data
     *         has been stored, this function can return true but the insertion can still fail somehow.
     */
    saveTracksSync(
        scorm: AddonModScormScorm,
        scoId: number,
        attempt: number,
        tracks: AddonModScormDataEntry[],
        userData: AddonModScormUserDataMap,
        userId?: number,
    ): boolean {
        userId = userId || CoreSites.getCurrentSiteUserId();
        let success = true;

        tracks.forEach((track) => {
            const trackSuccess = this.insertTrackSync(
                scorm.id,
                scoId,
                attempt,
                track.element,
                track.value,
                scorm.forcecompleted,
                userData[scoId],
                userId,
            );

            success = success && trackSuccess;
        });

        return success;
    }

    /**
     * Check for a parameter in userData and return it if it's set or return 'ifempty' if it's empty.
     * Based on Moodle's scorm_isset function.
     *
     * @param userData Contains user's data.
     * @param param Name of parameter that should be checked.
     * @param ifEmpty Value to be replaced with if param is not set.
     * @returns Value from userData[param] if set, ifEmpty otherwise.
     */
    protected scormIsset(
        userData: Record<string, AddonModScormDataValue>,
        param: string,
        ifEmpty: AddonModScormDataValue = '',
    ): AddonModScormDataValue {
        if (userData[param] !== undefined) {
            return userData[param];
        }

        return ifEmpty;
    }

    /**
     * Set an attempt's snapshot.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param userData User data to store as snapshot.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when snapshot has been stored.
     */
    async setAttemptSnapshot(
        scormId: number,
        attempt: number,
        userData: AddonModScormUserDataMap,
        siteId?: string,
        userId?: number,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        this.logger.debug(`Set snapshot for attempt ${attempt} in SCORM ${scormId}`);

        const newData: Partial<AddonModScormAttemptDBRecord> = {
            timemodified: CoreTimeUtils.timestamp(),
            snapshot: JSON.stringify(this.removeDefaultData(userData)),
        };

        await this.attemptsTables[site.id].updateWhere(newData, {
            sql: 'scormid = ? AND userid = ? AND attempt = ?',
            sqlParams: [scormId, userId, attempt],
            js: (record: AddonModScormOfflineDBCommonData) =>
                record.scormid === scormId &&
                record.userid === userId &&
                record.attempt === attempt,
        });
    }

}

export const AddonModScormOffline = makeSingleton(AddonModScormOfflineProvider);

/**
 * SCORM offline attempt data.
 */
export type AddonModScormOfflineAttempt = Omit<AddonModScormAttemptDBRecord, 'snapshot'> & {
    snapshot?: AddonModScormUserDataMap | null;
};

/**
 * SCORM offline track data.
 */
export type AddonModScormOfflineTrack = Omit<AddonModScormTrackDBRecord, 'value'> & {
    value?: string | number | null;
};
