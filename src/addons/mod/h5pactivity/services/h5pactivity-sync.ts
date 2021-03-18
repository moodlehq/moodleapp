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
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreXAPIOffline } from '@features/xapi/services/offline';
import { CoreXAPI } from '@features/xapi/services/xapi';
import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModH5PActivity, AddonModH5PActivityProvider } from './h5pactivity';

/**
 * Service to sync H5P activities.
 */
@Injectable({ providedIn: 'root' })
export class AddonModH5PActivitySyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModH5PActivitySyncResult> {

    static readonly AUTO_SYNCED = 'addon_mod_h5pactivity_autom_synced';

    protected componentTranslatableString = 'h5pactivity';

    constructor() {
        super('AddonModH5PActivitySyncProvider');
    }

    /**
     * Try to synchronize all the H5P activities in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllActivities(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('H5P activities', this.syncAllActivitiesFunc.bind(this, !!force), siteId);
    }

    /**
     * Sync all H5P activities on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllActivitiesFunc(force: boolean, siteId?: string): Promise<void> {
        const entries = await CoreXAPIOffline.getAllStatements(siteId);

        // Sync all responses.
        const promises = entries.map(async (response) => {
            const result = await (force ? this.syncActivity(response.contextid, siteId) :
                this.syncActivityIfNeeded(response.contextid, siteId));

            if (result?.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(AddonModH5PActivitySyncProvider.AUTO_SYNCED, {
                    contextId: response.contextid,
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
     * @return Promise resolved when the activity is synced or it doesn't need to be synced.
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
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    syncActivity(contextId: number, siteId?: string): Promise<AddonModH5PActivitySyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!CoreApp.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        if (this.isSyncing(contextId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return this.getOngoingSync(contextId, siteId)!;
        }

        return this.addOngoingSync(contextId, this.syncActivityData(contextId, siteId), siteId);
    }

    /**
     * Synchronize an H5P activity.
     *
     * @param contextId Context ID of the activity.
     * @param siteId Site ID.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    protected async syncActivityData(contextId: number, siteId: string): Promise<AddonModH5PActivitySyncResult> {

        this.logger.debug(`Try to sync H5P activity with context ID '${contextId}'`);

        const result: AddonModH5PActivitySyncResult = {
            warnings: [],
            updated: false,
        };

        // Get all the statements stored for the activity.
        const entries = await CoreXAPIOffline.getContextStatements(contextId, siteId);

        if (!entries || !entries.length) {
            // Nothing to sync.
            await this.setSyncTime(contextId, siteId);

            return result;
        }

        // Get the activity instance.
        const courseId = entries[0].courseid!;

        const h5pActivity = await AddonModH5PActivity.getH5PActivityByContextId(courseId, contextId, { siteId });

        // Sync offline logs.
        await CoreUtils.ignoreErrors(
            CoreCourseLogHelper.syncActivity(AddonModH5PActivityProvider.COMPONENT, h5pActivity.id, siteId),
        );

        // Send the statements in order.
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            try {
                await CoreXAPI.postStatementsOnline(entry.component, entry.statements, siteId);

                result.updated = true;

                await CoreXAPIOffline.deleteStatements(entry.id, siteId);
            } catch (error) {
                if (!CoreUtils.isWebServiceError(error)) {
                    throw error;
                }

                // The WebService has thrown an error, this means that statements cannot be submitted. Delete them.
                result.updated = true;

                await CoreXAPIOffline.deleteStatements(entry.id, siteId);

                // Responses deleted, add a warning.
                this.addOfflineDataDeletedWarning(result.warnings, entry.extra || '', error);

            }
        }

        if (result.updated) {
            // Data has been sent to server, invalidate attempts.
            await CoreUtils.ignoreErrors(AddonModH5PActivity.invalidateUserAttempts(h5pActivity.id, undefined, siteId));
        }

        // Sync finished, set sync time.
        await this.setSyncTime(contextId, siteId);

        return result;
    }

}

export const AddonModH5PActivitySync = makeSingleton(AddonModH5PActivitySyncProvider);

/**
 * Sync result.
 */
export type AddonModH5PActivitySyncResult = {
    updated: boolean;
    warnings: string[];
};

/**
 * Data passed to AUTO_SYNC event.
 */
export type AddonModH5PActivityAutoSyncData = {
    contextId: number;
    warnings: string[];
};
