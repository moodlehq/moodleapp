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
import { CoreError } from '@classes/errors/error';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import {
    AddonModScorm,
    AddonModScormAttemptCountResult,
    AddonModScormDataEntry,
    AddonModScormScorm,
    AddonModScormUserDataMap,
} from './scorm';
import { AddonModScormOffline } from './scorm-offline';
import {
    ADDON_MOD_SCORM_COMPONENT,
    ADDON_MOD_SCORM_COMPONENT_LEGACY,
    ADDON_MOD_SCORM_DATA_AUTO_SYNCED,
    ADDON_MOD_SCORM_MODNAME,
} from '../constants';

/**
 * Service to sync SCORMs.
 */
@Injectable({ providedIn: 'root' })
export class AddonModScormSyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModScormSyncResult> {

    protected componentTranslatableString = 'scorm';

    constructor() {
        super('AddonModScormSyncProvider');
    }

    /**
     * Add an offline attempt to the right of the new attempts array if possible.
     * If the attempt cannot be created as a new attempt then it will be deleted.
     *
     * @param scormId SCORM ID.
     * @param attempt The offline attempt to treat.
     * @param lastOffline Last offline attempt number.
     * @param newAttemptsSameOrder Attempts that'll be created as new attempts but keeping the current order.
     * @param newAttemptsAtEnd Object with attempts that'll be created at the end of the list (should be max 1).
     * @param lastOfflineCreated Time when the last offline attempt was created.
     * @param lastOfflineIncomplete Whether the last offline attempt is incomplete.
     * @param warnings Array where to add the warnings.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async addToNewOrDelete(
        scormId: number,
        attempt: number,
        lastOffline: number,
        newAttemptsSameOrder: number[],
        newAttemptsAtEnd: Record<number, number>,
        lastOfflineCreated: number,
        lastOfflineIncomplete: boolean,
        warnings: string[],
        siteId: string,
    ): Promise<void> {
        if (attempt == lastOffline) {
            newAttemptsSameOrder.push(attempt);

            return;
        }

        // Check if the attempt can be created.
        const time = await AddonModScormOffline.getAttemptCreationTime(scormId, attempt, siteId);

        if (!time || time <= lastOfflineCreated) {
            newAttemptsSameOrder.push(attempt);

            return;
        }

        // This attempt was created after the last offline attempt, we'll add it to the end of the list if possible.
        if (lastOfflineIncomplete) {
            // It can't be added because the last offline attempt is incomplete, delete it.
            this.logger.debug(`Try to delete attempt ${attempt} because it cannot be created as a new attempt.`);

            await CorePromiseUtils.ignoreErrors(AddonModScormOffline.deleteAttempt(scormId, attempt, siteId));

            // eslint-disable-next-line id-denylist
            warnings.push(Translate.instant('addon.mod_scorm.warningofflinedatadeleted', { number: attempt }));
        } else {
            // Add the attempt at the end.
            newAttemptsAtEnd[time] = attempt;
        }
    }

    /**
     * Check if can retry an attempt synchronization.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param lastOnline Last online attempt number.
     * @param cmId Module ID.
     * @param siteId Site ID.
     * @returns Promise resolved if can retry the synchronization, rejected otherwise.
     */
    protected async canRetrySync(
        scormId: number,
        attempt: number,
        lastOnline: number,
        cmId: number,
        siteId: string,
    ): Promise<boolean> {
        // If it's the last attempt we don't need to ignore cache because we already did it.
        const refresh = lastOnline != attempt;

        const siteData = await AddonModScorm.getScormUserData(scormId, attempt, {
            cmId,
            readingStrategy: refresh ? CoreSitesReadingStrategy.ONLY_NETWORK : undefined,
            siteId,
        });

        // Get synchronization snapshot (if sync fails it should store a snapshot).
        const snapshot = await AddonModScormOffline.getAttemptSnapshot(scormId, attempt, siteId);

        if (!snapshot || !Object.keys(snapshot).length || !this.snapshotEquals(snapshot, siteData)) {
            // No snapshot or it doesn't match, we can't retry the synchronization.
            return false;
        }

        return true;
    }

    /**
     * Create new attempts at the end of the offline attempts list.
     *
     * @param scormId SCORM ID.
     * @param newAttempts Object with the attempts to create. The keys are the timecreated, the values are the attempt number.
     * @param lastOffline Number of last offline attempt.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async createNewAttemptsAtEnd(
        scormId: number,
        newAttempts: Record<number, number>,
        lastOffline: number,
        siteId: string,
    ): Promise<void> {
        const times = Object.keys(newAttempts).sort(); // Sort in ASC order.

        if (!times.length) {
            return;
        }

        await CorePromiseUtils.allPromises(times.map((time, index) => {
            const attempt = newAttempts[time];

            return AddonModScormOffline.changeAttemptNumber(scormId, attempt, lastOffline + index + 1, siteId);
        }));
    }

    /**
     * Finish a sync process: remove offline data if needed, prefetch SCORM data, set sync time and return the result.
     *
     * @param siteId Site ID.
     * @param scorm SCORM.
     * @param warnings List of warnings generated by the sync.
     * @param lastOnline Last online attempt number before the sync.
     * @param lastOnlineWasFinished Whether the last online attempt was finished before the sync.
     * @param initialCount Attempt count before the sync.
     * @param updated Whether some data was sent to the site.
     * @returns Promise resolved on success.
     */
    protected async finishSync(
        siteId: string,
        scorm: AddonModScormScorm,
        warnings: string[],
        lastOnline?: number,
        lastOnlineWasFinished?: boolean,
        initialCount?: AddonModScormAttemptCountResult,
        updated?: boolean,
    ): Promise<AddonModScormSyncResult> {
        const result: AddonModScormSyncResult = {
            warnings: warnings,
            attemptFinished: false,
            updated: !!updated,
        };

        if (updated) {
            try {
                // Update downloaded data.
                const module = await CoreCourse.getModuleBasicInfoByInstance(scorm.id, ADDON_MOD_SCORM_MODNAME, { siteId });

                await this.prefetchModuleAfterUpdate(module, scorm.course, undefined, siteId);
            } catch {
                // Ignore errors.
            }
        }

        await CorePromiseUtils.ignoreErrors(this.setSyncTime(scorm.id, siteId));

        if (!initialCount) {
            return result;
        }

        // Check if an attempt was finished in Moodle.
        // Get attempt count again to check if an attempt was finished.
        const attemptsData = await AddonModScorm.getAttemptCount(scorm.id, { cmId: scorm.coursemodule, siteId });

        if (attemptsData.online.length > initialCount.online.length) {
            result.attemptFinished = true;
        } else if (!lastOnlineWasFinished && lastOnline) {
            // Last online attempt wasn't finished, let's check if it is now.
            const incomplete = await AddonModScorm.isAttemptIncomplete(scorm.id, lastOnline, {
                cmId: scorm.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            });

            result.attemptFinished = !incomplete;
        }

        return result;
    }

    /**
     * Get the creation time and the status (complete/incomplete) of an offline attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param cmId Module ID.
     * @param siteId Site ID.
     * @returns Promise resolved with the data.
     */
    protected async getOfflineAttemptData(
        scormId: number,
        attempt: number,
        cmId: number,
        siteId: string,
    ): Promise<{incomplete: boolean; timecreated?: number}> {

        // Check if last offline attempt is incomplete.
        const incomplete = await AddonModScorm.isAttemptIncomplete(scormId, attempt, {
            offline: true,
            cmId,
            siteId,
        });

        const timecreated = await AddonModScormOffline.getAttemptCreationTime(scormId, attempt, siteId);

        return {
            incomplete,
            timecreated,
        };
    }

    /**
     * Change the number of some offline attempts. We need to move all offline attempts after the collisions
     * too, otherwise we would overwrite data.
     * Example: We have offline attempts 1, 2 and 3. #1 and #2 have collisions. #1 can be synced, but #2 needs
     * to be a new attempt. #3 will now be #4, and #2 will now be #3.
     *
     * @param scormId SCORM ID.
     * @param newAttempts Attempts that need to be converted into new attempts.
     * @param lastOnline Last online attempt.
     * @param lastCollision Last attempt with collision (exists in online and offline).
     * @param offlineAttempts Numbers of offline attempts.
     * @param siteId Site ID.
     * @returns Promise resolved when attempts have been moved.
     */
    protected async moveNewAttempts(
        scormId: number,
        newAttempts: number[],
        lastOnline: number,
        lastCollision: number,
        offlineAttempts: number[],
        siteId: string,
    ): Promise<void> {
        if (!newAttempts.length) {
            return;
        }

        let lastSuccessful: number | undefined;

        try {
            // Sort offline attempts in DESC order.
            offlineAttempts = offlineAttempts.sort((a, b) => Number(a) <= Number(b) ? 1 : -1);

            // First move the offline attempts after the collisions. Move them 1 by 1 in order.
            for (const i in offlineAttempts) {
                const attempt = offlineAttempts[i];

                if (attempt > lastCollision) {
                    const newNumber = attempt + newAttempts.length;

                    await AddonModScormOffline.changeAttemptNumber(scormId, attempt, newNumber, siteId);

                    lastSuccessful = attempt;
                }
            }

            const successful: number[] = [];

            try {
                // Sort newAttempts in ASC order.
                newAttempts = newAttempts.sort((a, b) => Number(a) >= Number(b) ? 1 : -1);

                // Now move the attempts in newAttempts.
                await Promise.all(newAttempts.map(async (attempt, index) => {
                    // No need to use chain of promises.
                    const newNumber = lastOnline + index + 1;

                    await AddonModScormOffline.changeAttemptNumber(scormId, attempt, newNumber, siteId);

                    successful.push(attempt);
                }));

            } catch (error) {
                // Moving the new attempts failed (it shouldn't happen). Let's undo the new attempts move.
                await CorePromiseUtils.allPromises(successful.map((attempt) => {
                    const newNumber = lastOnline + newAttempts.indexOf(attempt) + 1;

                    return AddonModScormOffline.changeAttemptNumber(scormId, newNumber, attempt, siteId);
                }));

                throw error; // It will now enter the catch that moves offline attempts after collisions.
            }
        } catch (error) {
            // Moving offline attempts after collisions failed (it shouldn't happen). Let's undo the changes.
            if (!lastSuccessful) {
                throw error;
            }

            for (let attempt = lastSuccessful; offlineAttempts.indexOf(attempt) != -1; attempt++) {
                // Move it back.
                await AddonModScormOffline.changeAttemptNumber(scormId, attempt + newAttempts.length, attempt, siteId);
            }

            throw error;
        }
    }

    /**
     * Save a snapshot from a synchronization.
     *
     * @param scormId SCORM ID.
     * @param attempt Attemot number.
     * @param cmId Module ID.
     * @param siteId Site ID.
     * @returns Promise resolved when the snapshot is stored.
     */
    protected async saveSyncSnapshot(scormId: number, attempt: number, cmId: number, siteId: string): Promise<void> {
        // Try to get current state from the site.
        let userData: AddonModScormUserDataMap;

        try {
            userData = await AddonModScorm.getScormUserData(scormId, attempt, {
                cmId,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            });
        } catch {
            // Error getting user data from the site. We'll have to build it ourselves.
            // Let's try to get cached data about the attempt.
            userData = await CorePromiseUtils.ignoreErrors(
                AddonModScorm.getScormUserData(scormId, attempt, { cmId, siteId }),
                <AddonModScormUserDataMap> {},
            );

            // We need to add the synced data to the snapshot.
            const syncedData = await AddonModScormOffline.getScormStoredData(scormId, attempt, false, true, siteId);

            syncedData.forEach((entry) => {
                if (!userData[entry.scoid]) {
                    userData[entry.scoid] = {
                        scoid: entry.scoid,
                        userdata: {},
                        defaultdata: {},
                    };
                }
                userData[entry.scoid].userdata[entry.element] = entry.value || '';
            });

        }

        return AddonModScormOffline.setAttemptSnapshot(scormId, attempt, userData, siteId);

    }

    /**
     * Compares an attempt's snapshot with the data retrieved from the site.
     * It only compares elements with dot notation. This means that, if some SCO has been added to Moodle web
     * but the user hasn't generated data for it, then the snapshot will be detected as equal.
     *
     * @param snapshot Attempt's snapshot.
     * @param userData Data retrieved from the site.
     * @returns True if snapshot is equal to the user data, false otherwise.
     */
    protected snapshotEquals(snapshot: AddonModScormUserDataMap, userData: AddonModScormUserDataMap): boolean {
        // Check that snapshot contains the data from the site.
        for (const scoId in userData) {
            const siteSco = userData[scoId];
            const snapshotSco = snapshot[scoId];

            for (const element in siteSco.userdata) {
                if (element.indexOf('.') > -1) {
                    if (!snapshotSco || siteSco.userdata[element] !== snapshotSco.userdata[element]) {
                        return false;
                    }
                }
            }
        }

        // Now check the opposite way: site userData contains the data from the snapshot.
        for (const scoId in snapshot) {
            const siteSco = userData[scoId];
            const snapshotSco = snapshot[scoId];

            for (const element in snapshotSco.userdata) {
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
     * Try to synchronize all the SCORMs in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllScorms(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all SCORMs', (siteId) => this.syncAllScormsFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all SCORMs on a site.
     *
     * @param force Wether to force sync or not.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllScormsFunc(force: boolean, siteId: string): Promise<void> {

        // Get all offline attempts.
        const attempts = await AddonModScormOffline.getAllAttempts(siteId);

        const treated: Record<number, boolean> = {}; // To prevent duplicates.

        // Sync all SCORMs that haven't been synced for a while and that aren't attempted right now.
        await Promise.all(attempts.map(async (attempt) => {
            if (treated[attempt.scormid] || CoreSync.isBlocked(ADDON_MOD_SCORM_COMPONENT, attempt.scormid, siteId)) {
                return;
            }

            treated[attempt.scormid] = true;

            const scorm = await AddonModScorm.getScormById(attempt.courseid, attempt.scormid, { siteId });

            const data = force ?
                await this.syncScorm(scorm, siteId) :
                await this.syncScormIfNeeded(scorm, siteId);

            if (data !== undefined) {
                // We tried to sync. Send event.
                CoreEvents.trigger(ADDON_MOD_SCORM_DATA_AUTO_SYNCED, {
                    scormId: scorm.id,
                    attemptFinished: data.attemptFinished,
                    warnings: data.warnings,
                    updated: data.updated,
                }, siteId);
            }
        }));
    }

    /**
     * Send data from a SCORM offline attempt to the site.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param cmId Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the attempt is successfully synced.
     */
    protected async syncAttempt(scormId: number, attempt: number, cmId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.logger.debug(`Try to sync attempt ${attempt} in SCORM ${scormId} and site ${siteId}`);

        // Get only not synced entries.
        const tracks = await AddonModScormOffline.getScormStoredData(scormId, attempt, true, false, siteId);

        const scos: Record<number, AddonModScormDataEntry[]> = {};
        let somethingSynced = false;

        // Get data to send (only elements with dots like cmi.core.exit, in Mobile we store more data to make offline work).
        tracks.forEach((track) => {
            if (track.element.indexOf('.') > -1) {
                if (!scos[track.scoid]) {
                    scos[track.scoid] = [];
                }

                scos[track.scoid].push({
                    element: track.element,
                    value: track.value || '',
                });
            }
        });

        try {
            // Send the data in each SCO.
            const promises = Object.entries(scos).map(async ([key, tracks]) => {
                const scoId = Number(key);

                await AddonModScorm.saveTracksOnline(scormId, scoId, attempt, tracks, siteId);

                // Sco data successfully sent. Mark them as synced. This is needed because some SCOs sync might fail.
                await CorePromiseUtils.ignoreErrors(AddonModScormOffline.markAsSynced(scormId, attempt, scoId, siteId));

                somethingSynced = true;
            });

            await CorePromiseUtils.allPromises(promises);
        } catch (error) {
            if (somethingSynced) {
                // Some SCOs have been synced and some not.
                // Try to store a snapshot of the current state to be able to re-try the synchronization later.
                this.logger.error(`Error synchronizing some SCOs for attempt ${attempt} in SCORM ${scormId}. Saving snapshot.`);

                await this.saveSyncSnapshot(scormId, attempt, cmId, siteId);
            } else {
                this.logger.error(`Error synchronizing attempt ${attempt} in SCORM ${scormId}`);
            }

            throw error;
        }

        // Attempt has been sent. Let's delete it from local.
        await CorePromiseUtils.ignoreErrors(AddonModScormOffline.deleteAttempt(scormId, attempt, siteId));
    }

    /**
     * Sync a SCORM only if a certain time has passed since the last time.
     *
     * @param scorm SCORM.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the SCORM is synced or if it doesn't need to be synced.
     */
    async syncScormIfNeeded(scorm: AddonModScormScorm, siteId?: string): Promise<AddonModScormSyncResult | undefined> {
        const needed = await this.isSyncNeeded(scorm.id, siteId);

        if (needed) {
            return this.syncScorm(scorm, siteId);
        }
    }

    /**
     * Try to synchronize a SCORM.
     *
     * @param scorm SCORM.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success.
     */
    syncScorm(scorm: AddonModScormScorm, siteId?: string): Promise<AddonModScormSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(scorm.id, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this SCORM, return the promise.
            return currentSyncPromise;
        }

        // Verify that SCORM isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_SCORM_COMPONENT, scorm.id, siteId)) {
            this.logger.debug(`Cannot sync SCORM ${scorm.id} because it is blocked.`);

            throw new CoreError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync SCORM ${scorm.id} in site ${siteId}`);

        const syncPromise = this.performSyncScorm(scorm, siteId);

        return this.addOngoingSync(scorm.id, syncPromise, siteId);
    }

    /**
     * Try to synchronize a SCORM.
     *
     * @param scorm SCORM.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success.
     */
    protected async performSyncScorm(scorm: AddonModScormScorm, siteId: string): Promise<AddonModScormSyncResult> {
        let warnings: string[] = [];
        let lastOnline = 0;
        let lastOnlineWasFinished = false;

        // Sync offline logs.
        await CorePromiseUtils.ignoreErrors(CoreCourseLogHelper.syncActivity(ADDON_MOD_SCORM_COMPONENT_LEGACY, scorm.id, siteId));

        // Get attempts data. We ignore cache for online attempts, so this call will fail if offline or server down.
        const attemptsData = await AddonModScorm.getAttemptCount(scorm.id, {
            cmId: scorm.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        });

        if (!attemptsData.offline || !attemptsData.offline.length) {
            // Nothing to sync.
            return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished);
        }

        const initialCount = attemptsData;
        const collisions: number[] = [];

        // Check if there are collisions between offline and online attempts (same number).
        attemptsData.online.forEach((attempt) => {
            lastOnline = Math.max(lastOnline, attempt);
            if (attemptsData.offline.indexOf(attempt) > -1) {
                collisions.push(attempt);
            }
        });

        // Check if last online attempt is finished. Ignore cache.
        let incomplete = lastOnline <= 0 ?
            false :
            await AddonModScorm.isAttemptIncomplete(scorm.id, lastOnline, {
                cmId: scorm.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            });

        lastOnlineWasFinished = !incomplete;

        if (!collisions.length) {
            if (incomplete) {
                // No collisions, but last online attempt is incomplete so we can't send offline attempts.
                warnings.push(Translate.instant('addon.mod_scorm.warningsynconlineincomplete'));

                return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished, initialCount, false);
            }

            // No collisions and last attempt is complete. Send offline attempts to Moodle.
            await Promise.all(attemptsData.offline.map(async (attempt) => {
                if (!scorm.maxattempt || attempt <= scorm.maxattempt) {
                    await this.syncAttempt(scorm.id, attempt, scorm.coursemodule, siteId);
                }
            }));

            // All data synced, finish.
            return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished, initialCount, true);
        }

        // We have collisions, treat them.
        warnings = await this.treatCollisions(scorm.id, collisions, lastOnline, attemptsData.offline, scorm.coursemodule, siteId);

        // The offline attempts might have changed since some collisions can be converted to new attempts.
        const entries = await AddonModScormOffline.getAttempts(scorm.id, siteId);

        let cannotSyncSome = false;

        // Get only the attempt number.
        const attempts = entries.map((entry) => entry.attempt);

        if (incomplete && attempts.indexOf(lastOnline) > -1) {
            // Last online was incomplete, but it was continued in offline.
            incomplete = false;
        }

        await Promise.all(attempts.map(async (attempt) => {
            // We'll always sync attempts previous to lastOnline (failed sync or continued in offline).
            // We'll only sync new attemps if last online attempt is completed.
            if (!incomplete || attempt <= lastOnline) {
                if (!scorm.maxattempt || attempt <= scorm.maxattempt) {
                    await this.syncAttempt(scorm.id, attempt, scorm.coursemodule, siteId);
                }
            } else {
                cannotSyncSome = true;
            }
        }));

        if (cannotSyncSome) {
            warnings.push(Translate.instant('addon.mod_scorm.warningsynconlineincomplete'));
        }

        return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished, initialCount, true);
    }

    /**
     * Treat collisions found in a SCORM synchronization process.
     *
     * @param scormId SCORM ID.
     * @param collisions Numbers of attempts that exist both in online and offline.
     * @param lastOnline Last online attempt.
     * @param offlineAttempts Numbers of offline attempts.
     * @param cmId Module ID.
     * @param siteId Site ID.
     * @returns Promise resolved when the collisions have been treated. It returns warnings array.
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
    protected async treatCollisions(
        scormId: number,
        collisions: number[],
        lastOnline: number,
        offlineAttempts: number[],
        cmId: number,
        siteId: string,
    ): Promise<string[]> {

        const warnings: string[] = [];
        const newAttemptsSameOrder: number[] = []; // Attempts that will be created as new attempts but keeping the current order.
        const newAttemptsAtEnd: Record<number, number> = {}; // Attempts that'll be created at the end of list (should be max 1).
        const lastCollision = Math.max(...collisions);
        let lastOffline = Math.max(...offlineAttempts);

        // Get needed data from the last offline attempt.
        const lastOfflineData = await this.getOfflineAttemptData(scormId, lastOffline, cmId, siteId);

        const promises = collisions.map(async (attempt) => {
            // First get synced entries to detect if it was a failed synchronization.
            const synced = await AddonModScormOffline.getScormStoredData(scormId, attempt, false, true, siteId);

            if (synced.length) {
                // The attempt has synced entries, it seems to be a failed synchronization.
                // Let's get the entries that haven't been synced, maybe it just failed to delete the attempt.
                const tracks = await AddonModScormOffline.getScormStoredData(scormId, attempt, true, false, siteId);

                // Check if there are elements to sync.
                const hasDataToSend = tracks.find(track => track.element.indexOf('.') > -1);

                if (!hasDataToSend) {
                    // Nothing to sync, delete the attempt.
                    return CorePromiseUtils.ignoreErrors(AddonModScormOffline.deleteAttempt(scormId, attempt, siteId));
                }

                // There are elements to sync. We need to check if it's possible to sync them or not.
                const canRetry = await this.canRetrySync(scormId, attempt, lastOnline, cmId, siteId);

                if (!canRetry) {
                    // Cannot retry sync, we'll create a new offline attempt if possible.
                    return this.addToNewOrDelete(
                        scormId,
                        attempt,
                        lastOffline,
                        newAttemptsSameOrder,
                        newAttemptsAtEnd,
                        lastOfflineData.timecreated ?? 0,
                        lastOfflineData.incomplete,
                        warnings,
                        siteId,
                    );
                }
            } else {
                // It's not a failed synchronization. Check if it's an attempt continued in offline.
                const snapshot = await AddonModScormOffline.getAttemptSnapshot(scormId, attempt, siteId);

                if (!snapshot || !Object.keys(snapshot).length) {
                    // No snapshot, it's a different attempt.
                    newAttemptsSameOrder.push(attempt);

                    return;
                }

                // It has a snapshot, it means it continued an online attempt. We need to check if they've diverged.
                // If it's the last attempt we don't need to ignore cache because we already did it.
                const refresh = lastOnline != attempt;

                const userData = await AddonModScorm.getScormUserData(scormId, attempt, {
                    cmId,
                    readingStrategy: refresh ? CoreSitesReadingStrategy.ONLY_NETWORK : undefined,
                    siteId,
                });

                if (!this.snapshotEquals(snapshot, userData)) {
                    // Snapshot has diverged, it will be converted into a new attempt if possible.
                    return this.addToNewOrDelete(
                        scormId,
                        attempt,
                        lastOffline,
                        newAttemptsSameOrder,
                        newAttemptsAtEnd,
                        lastOfflineData.timecreated ?? 0,
                        lastOfflineData.incomplete,
                        warnings,
                        siteId,
                    );
                }
            }
        });

        await Promise.all(promises);

        await this.moveNewAttempts(scormId, newAttemptsSameOrder, lastOnline, lastCollision, offlineAttempts, siteId);

        // The new attempts that need to keep the order have been created.
        // Now create the new attempts at the end of the list of offline attempts. It should only be 1 attempt max.
        lastOffline = lastOffline + newAttemptsSameOrder.length;

        await this.createNewAttemptsAtEnd(scormId, newAttemptsAtEnd, lastOffline, siteId);

        return warnings;
    }

}

export const AddonModScormSync = makeSingleton(AddonModScormSyncProvider);

/**
 * Data returned by a SCORM sync.
 */
export type AddonModScormSyncResult = CoreSyncResult & {
    attemptFinished: boolean; // Whether an attempt was finished in the site due to the sync,
};

/**
 * Auto sync event data.
 */
export type AddonModScormAutoSyncEventData = CoreSyncResult & {
    scormId: number;
    attemptFinished: boolean;
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_SCORM_DATA_AUTO_SYNCED]: AddonModScormAutoSyncEventData;
    }

}
