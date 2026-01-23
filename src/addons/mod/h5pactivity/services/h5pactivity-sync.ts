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

import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import { CoreSyncResult } from '@services/sync';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreXAPIOffline } from '@features/xapi/services/offline';
import { CoreXAPI, XAPI_STATE_DELETED } from '@features/xapi/services/xapi';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import {
    AddonModH5PActivity,
    AddonModH5PActivityAttempt,
    AddonModH5PActivityData,
} from './h5pactivity';
import { CoreXAPIStateDBRecord, CoreXAPIStatementDBRecord } from '@features/xapi/services/database/xapi';
import { CoreXAPIIRI } from '@features/xapi/classes/iri';
import { CoreXAPIItemAgent } from '@features/xapi/classes/item-agent';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreArray } from '@singletons/array';
import {
    ADDON_MOD_H5PACTIVITY_AUTO_SYNCED,
    ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
    ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT,
} from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';

/**
 * Service to sync H5P activities.
 */
@Injectable({ providedIn: 'root' })
export class AddonModH5PActivitySyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModH5PActivitySyncResult> {

    protected componentTranslatableString = 'h5pactivity';

    constructor() {
        super('AddonModH5PActivitySyncProvider');
    }

    /**
     * Try to synchronize all the H5P activities in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllActivities(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('H5P activities', (siteId) => this.syncAllActivitiesFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all H5P activities on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllActivitiesFunc(force: boolean, siteId?: string): Promise<void> {
        const [statements, states] = await Promise.all([
            CoreXAPIOffline.getAllStatements(siteId),
            CoreXAPIOffline.getAllStates(siteId),
        ]);

        const entries = (<(CoreXAPIStatementDBRecord|CoreXAPIStateDBRecord)[]> statements).concat(states);
        const contextIds = CoreArray.unique(entries.map(entry => 'contextid' in entry ? entry.contextid : entry.itemid));

        // Sync all activities.
        const promises = contextIds.map(async (contextId) => {
            const result = await (force ? this.syncActivity(contextId, siteId) :
                this.syncActivityIfNeeded(contextId, siteId));

            if (result?.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(ADDON_MOD_H5PACTIVITY_AUTO_SYNCED, {
                    contextId,
                    warnings: result.warnings,
                }, siteId);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Sync an H5P activity only if a certain time has passed since the last time.
     *
     * @param contextId Context ID of the activity.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the activity is synced or it doesn't need to be synced.
     */
    async syncActivityIfNeeded(contextId: number, siteId?: string): Promise<AddonModH5PActivitySyncResult | undefined> {
        const needed = await this.isSyncNeeded(contextId, siteId);

        if (needed) {
            return this.syncActivity(contextId, siteId);
        }
    }

    /**
     * Synchronize an H5P activity. If it's already being synced it will reuse the same promise.
     *
     * @param contextId Context ID of the activity.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncActivity(contextId: number, siteId?: string): Promise<AddonModH5PActivitySyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const currentSyncPromise = this.getOngoingSync(contextId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this discussion, return the promise.
            return currentSyncPromise;
        }

        return this.addOngoingSync(contextId, this.syncActivityData(contextId, siteId), siteId);
    }

    /**
     * Synchronize an H5P activity.
     *
     * @param contextId Context ID of the activity.
     * @param siteId Site ID.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async syncActivityData(contextId: number, siteId: string): Promise<AddonModH5PActivitySyncResult> {

        this.logger.debug(`Try to sync H5P activity with context ID '${contextId}'`);

        let h5pActivity: AddonModH5PActivityData | null = null;
        const result: AddonModH5PActivitySyncResult = {
            warnings: [],
            updated: false,
        };

        // Get all the statements stored for the activity.
        const [statements, states] = await Promise.all([
            CoreXAPIOffline.getContextStatements(contextId, siteId),
            CoreXAPIOffline.getItemStates(contextId, siteId),
        ]);

        const deleteOfflineData = async (): Promise<void> => {
            await Promise.all([
                statements.length ? CoreXAPIOffline.deleteStatementsForContext(contextId, siteId) : undefined,
                states.length ? CoreXAPIOffline.deleteStates(ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT, {
                    itemId: contextId,
                    siteId,
                }) : undefined,
            ]);

            result.updated = true;
        };
        const finishSync = async (): Promise<AddonModH5PActivitySyncResult> => {
            await this.setSyncTime(contextId, siteId);

            return result;
        };

        if (!statements.length && !states.length) {
            // Nothing to sync.
            return finishSync();
        }

        // Get the activity instance.
        const courseId = (statements.find(statement => !!statement.courseid) ?? states.find(state => !!state.courseid))?.courseid;
        if (!courseId) {
            // Data not valid (shouldn't happen), delete it.
            await deleteOfflineData();

            return finishSync();
        }

        try {
            h5pActivity = await AddonModH5PActivity.getH5PActivityByContextId(courseId, contextId, { siteId });
        } catch (error) {
            if (
                CoreWSError.isWebServiceError(error) ||
                CoreCourseModuleHelper.isNotFoundError(error)
            ) {
                // Activity no longer accessible. Delete the data and finish the sync.
                await deleteOfflineData();

                return finishSync();
            }

            throw error;
        }

        // Sync offline logs.
        await CorePromiseUtils.ignoreErrors(
            CoreCourseLogHelper.syncActivity(ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY, h5pActivity.id, siteId),
        );

        // Get the last attempt before synchronizing the statements, otherwise we could have a race condition and detect
        // that the new statements sent during the sync process were the last online attempt.
        const lastAttempt = states.length > 0 ? await this.getLastOnlineAttempt(h5pActivity, siteId) : undefined;

        // Sync all statements before synchronizing states, because sending a statement deletes the state in LMS.
        const syncStatementsResult = await this.syncStatements(h5pActivity.id, statements, siteId);
        const syncStatesResult = await this.syncStates(h5pActivity, states, siteId, lastAttempt);

        result.updated = syncStatementsResult.updated || syncStatesResult.updated;
        result.warnings = syncStatementsResult.warnings.concat(syncStatesResult.warnings);

        return finishSync();
    }

    /**
     * Get last online attempt.
     *
     * @param h5pActivity The H5P activity.
     * @param siteId Site ID.
     * @returns Last online attempt (if any).
     */
    protected async getLastOnlineAttempt(
        h5pActivity: AddonModH5PActivityData,
        siteId: string,
    ): Promise<AddonModH5PActivityAttempt | undefined> {
        try {
            const attemptsData = await AddonModH5PActivity.getUserAttempts(h5pActivity.id, {
                cmId: h5pActivity.context,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            });

            return attemptsData.attempts.pop();
        } catch (error) {
            // Error getting attempts. If the WS has thrown an exception it means the user cannot retrieve the attempts for
            // some reason (it shouldn't happen), continue synchronizing in that case.
            if (!CoreWSError.isWebServiceError(error)) {
                throw error;
            }
        }
    }

    /**
     * Sync statements.
     *
     * @param id H5P activity ID.
     * @param statements Statements to sync.
     * @param siteId Site ID.
     * @returns Promise resolved with the sync result.
     */
    protected async syncStatements(
        id: number,
        statements: CoreXAPIStatementDBRecord[],
        siteId: string,
    ): Promise<AddonModH5PActivitySyncResult> {
        const result: AddonModH5PActivitySyncResult = {
            warnings: [],
            updated: false,
        };

        // Send the statements in order.
        for (let i = 0; i < statements.length; i++) {
            const entry = statements[i];

            try {
                await CoreXAPI.postStatementsOnline(entry.component, entry.statements, siteId);

                result.updated = true;

                await CoreXAPIOffline.deleteStatements(entry.id, siteId);
            } catch (error) {
                if (!CoreWSError.isWebServiceError(error)) {
                    throw error;
                }

                // The WebService has thrown an error, this means that statements cannot be submitted. Delete them.
                result.updated = true;

                await CoreXAPIOffline.deleteStatements(entry.id, siteId);

                // Statements deleted, add a warning.
                this.addOfflineDataDeletedWarning(result.warnings, entry.extra || '', error);
            }
        }

        if (result.updated) {
            // Data has been sent to server, invalidate attempts.
            await CorePromiseUtils.ignoreErrors(AddonModH5PActivity.invalidateUserAttempts(id, undefined, siteId));
        }

        return result;
    }

    /**
     * Sync states.
     *
     * @param h5pActivity H5P activity instance.
     * @param states States to sync.
     * @param siteId Site ID.
     * @param lastAttempt Last attempt made by the user (if any).
     * @returns Promise resolved with the sync result.
     */
    protected async syncStates(
        h5pActivity: AddonModH5PActivityData,
        states: CoreXAPIStateDBRecord[],
        siteId: string,
        lastAttempt: AddonModH5PActivityAttempt | undefined,
    ): Promise<AddonModH5PActivitySyncResult> {
        const result: AddonModH5PActivitySyncResult = {
            warnings: [],
            updated: false,
        };

        if (!states.length) {
            return result;
        }

        const [site, activityIRI] = await Promise.all([
            CoreSites.getSite(siteId),
            CoreXAPIIRI.generate(h5pActivity.context, 'activity', siteId),
        ]);
        const agent = JSON.stringify(CoreXAPIItemAgent.createFromSite(site).getData());

        await Promise.all(states.map(async (state) => {
            try {
                if (lastAttempt && state.timecreated <= lastAttempt.timecreated) {
                    // State was created before the last attempt. It means the user finished an attempt in another device.
                    throw new CoreWSError({
                        message: Translate.instant('core.warningofflinedatadeletedreason'),
                        errorcode: 'offlinedataoutdated',
                    });
                }

                // Check if there is a newer state in LMS.
                const onlineStates = await CoreXAPI.getStatesSince(state.component, h5pActivity.context, {
                    registration: state.registration,
                    since: state.timecreated,
                    siteId,
                });

                if (onlineStates.length) {
                    // There is newer data in the server, discard the offline data.
                    throw new CoreWSError({
                        message: Translate.instant('core.warningofflinedatadeletedreason'),
                        errorcode: 'offlinedataoutdated',
                    });
                }

                if (state.statedata === XAPI_STATE_DELETED) {
                    await CoreXAPI.deleteStateOnline(state.component, activityIRI, agent, state.stateid, {
                        registration: state.registration,
                        siteId,
                    });
                } else if (state.statedata) {
                    await CoreXAPI.postStateOnline(state.component, activityIRI, agent, state.stateid, state.statedata, {
                        registration: state.registration,
                        siteId,
                    });
                }

                result.updated = true;

                await CoreXAPIOffline.deleteStates(state.component, {
                    itemId: h5pActivity.context,
                    stateId: state.stateid,
                    registration: state.registration,
                    siteId,
                });
            } catch (error) {
                if (!CoreWSError.isWebServiceError(error)) {
                    throw error;
                }

                // The WebService has thrown an error, this means the state cannot be submitted. Delete it.
                result.updated = true;

                await CoreXAPIOffline.deleteStates(state.component, {
                    itemId: h5pActivity.context,
                    stateId: state.stateid,
                    registration: state.registration,
                    siteId,
                });

                // State deleted, add a warning.
                this.addOfflineDataDeletedWarning(result.warnings, state.extra || '', error);
            }
        }));

        return result;
    }

}

export const AddonModH5PActivitySync = makeSingleton(AddonModH5PActivitySyncProvider);

/**
 * Sync result.
 */
export type AddonModH5PActivitySyncResult = CoreSyncResult;

/**
 * Data passed to AUTO_SYNC event.
 */
export type AddonModH5PActivityAutoSyncData = {
    contextId: number;
    warnings: string[];
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_H5PACTIVITY_AUTO_SYNCED]: AddonModH5PActivityAutoSyncData;
    }

}
