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
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModChoice } from './choice';
import { AddonModChoiceOffline } from './choice-offline';
import { AddonModChoicePrefetchHandler } from './handlers/prefetch';
import { ADDON_MOD_CHOICE_AUTO_SYNCED, ADDON_MOD_CHOICE_COMPONENT } from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_CHOICE_AUTO_SYNCED]: AddonModChoiceAutoSyncData;
    }

}

/**
 * Service to sync choices.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChoiceSyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModChoiceSyncResult> {

    protected componentTranslatableString = 'choice';

    constructor() {
        super('AddonModChoiceSyncProvider');
    }

    /**
     * Get the ID of a choice sync.
     *
     * @param choiceId Choice ID.
     * @param userId User the responses belong to.
     * @returns Sync ID.
     */
    protected getSyncId(choiceId: number, userId: number): string {
        return choiceId + '#' + userId;
    }

    /**
     * Try to synchronize all the choices in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllChoices(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all choices', (siteId) => this.syncAllChoicesFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all pending choices on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllChoicesFunc(force: boolean, siteId: string): Promise<void> {
        const responses = await AddonModChoiceOffline.getResponses(siteId);

        // Sync all responses.
        await Promise.all(responses.map(async (response) => {
            const result = force ?
                await this.syncChoice(response.choiceid, response.userid, siteId) :
                await this.syncChoiceIfNeeded(response.choiceid, response.userid, siteId);

            if (result?.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(ADDON_MOD_CHOICE_AUTO_SYNCED, {
                    choiceId: response.choiceid,
                    userId: response.userid,
                    warnings: result.warnings,
                }, siteId);
            }
        }));
    }

    /**
     * Sync an choice only if a certain time has passed since the last time.
     *
     * @param choiceId Choice ID to be synced.
     * @param userId User the answers belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the choice is synced or it doesn't need to be synced.
     */
    async syncChoiceIfNeeded(choiceId: number, userId: number, siteId?: string): Promise<AddonModChoiceSyncResult | undefined> {
        const syncId = this.getSyncId(choiceId, userId);

        const needed = await this.isSyncNeeded(syncId, siteId);

        if (needed) {
            return this.syncChoice(choiceId, userId, siteId);
        }
    }

    /**
     * Synchronize a choice.
     *
     * @param choiceId Choice ID to be synced.
     * @param userId User the answers belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncChoice(choiceId: number, userId?: number, siteId?: string): Promise<AddonModChoiceSyncResult> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();
        siteId = site.getId();

        const syncId = this.getSyncId(choiceId, userId);
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this discussion, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug(`Try to sync choice '${choiceId}' for user '${userId}'`);

        return this.addOngoingSync(syncId, this.performSync(choiceId, userId, siteId), siteId);
    }

    /**
     * Synchronize a choice.
     *
     * @param choiceId Choice ID to be synced.
     * @param userId User the answers belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async performSync(choiceId: number, userId: number, siteId?: string): Promise<AddonModChoiceSyncResult> {
        const syncId = this.getSyncId(choiceId, userId);
        const result: AddonModChoiceSyncResult = {
            warnings: [],
            updated: false,
        };

        // Sync offline logs.
        await CorePromiseUtils.ignoreErrors(CoreCourseLogHelper.syncActivity(ADDON_MOD_CHOICE_COMPONENT, choiceId, siteId));

        const data = await CorePromiseUtils.ignoreErrors(AddonModChoiceOffline.getResponse(choiceId, siteId, userId));

        if (!data || !data.choiceid) {
            // Nothing to sync. Set sync time.
            await this.setSyncTime(syncId, siteId);

            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const courseId = data.courseid;

        try {
            // Send the responses.
            if (data.deleting) {
                // A user has deleted some responses.
                await AddonModChoice.deleteResponsesOnline(choiceId, data.responses, siteId);
            } else {
                // A user has added some responses.
                await AddonModChoice.submitResponseOnline(choiceId, data.responses, siteId);
            }

            result.updated = true;

            await AddonModChoiceOffline.deleteResponse(choiceId, siteId, userId);
        } catch (error) {
            if (!CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, reject.
                throw error;
            }

            // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
            result.updated = true;

            await AddonModChoiceOffline.deleteResponse(choiceId, siteId, userId);

            // Responses deleted, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, data.name, error);
        }

        // Data has been sent to server, prefetch choice if needed.
        try {
            const module = await CoreCourse.getModuleBasicInfoByInstance(choiceId, 'choice', { siteId });

            await this.prefetchAfterUpdate(AddonModChoicePrefetchHandler.instance, module, courseId, undefined, siteId);
        } catch {
            // Ignore errors.
        }

        // Sync finished, set sync time.
        await this.setSyncTime(syncId, siteId);

        return result;
    }

}

export const AddonModChoiceSync = makeSingleton(AddonModChoiceSyncProvider);

/**
 * Data returned by a choice sync.
 */
export type AddonModChoiceSyncResult = CoreSyncResult;

/**
 * Data passed to ADDON_MOD_CHOICE_AUTO_SYNCED event.
 */
export type AddonModChoiceAutoSyncData = {
    choiceId: number;
    userId: number;
    warnings: string[];
};
