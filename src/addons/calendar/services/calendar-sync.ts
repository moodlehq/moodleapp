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
import { CoreSyncBaseProvider, CoreSyncBlockedError } from '@classes/base-sync';
import { CoreNetwork } from '@services/network';
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonCalendar,
    AddonCalendarEvent,
    AddonCalendarSubmitCreateUpdateFormDataWSParams,
} from './calendar';
import { AddonCalendarOffline } from './calendar-offline';
import { AddonCalendarHelper } from './calendar-helper';
import { makeSingleton, Translate } from '@singletons';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreNetworkError } from '@classes/errors/network-error';
import moment from 'moment-timezone';
import {
    ADDON_CALENDAR_AUTO_SYNCED,
    ADDON_CALENDAR_COMPONENT,
    ADDON_CALENDAR_MANUAL_SYNCED,
    ADDON_CALENDAR_SYNC_ID,
} from '../constants';

/**
 * Service to sync calendar.
 */
@Injectable({ providedIn: 'root' })
export class AddonCalendarSyncProvider extends CoreSyncBaseProvider<AddonCalendarSyncEvents> {

    protected componentTranslatableString = 'addon.calendar.calendarevent';

    constructor() {
        super('AddonCalendarSync');
    }

    /**
     * Try to synchronize all events in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    async syncAllEvents(siteId?: string, force = false): Promise<void> {
        await this.syncOnSites('all calendar events', (siteId) => this.syncAllEventsFunc(force, siteId), siteId);
    }

    /**
     * Sync all events on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllEventsFunc(force = false, siteId?: string): Promise<void> {
        const result = force
            ? await this.syncEvents(siteId)
            : await this.syncEventsIfNeeded(siteId);

        if (result?.updated) {
            // Sync successful, send event.
            CoreEvents.trigger(ADDON_CALENDAR_AUTO_SYNCED, result, siteId);
        }
    }

    /**
     * Sync a site events only if a certain time has passed since the last time.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the events are synced or if it doesn't need to be synced.
     */
    async syncEventsIfNeeded(siteId?: string): Promise<AddonCalendarSyncEvents | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const needed = await this.isSyncNeeded(ADDON_CALENDAR_SYNC_ID, siteId);

        if (needed) {
            return this.syncEvents(siteId);
        }
    }

    /**
     * Synchronize all offline events of a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncEvents(siteId?: string): Promise<AddonCalendarSyncEvents> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(ADDON_CALENDAR_SYNC_ID, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this site, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug('Try to sync calendar events for site ' + siteId);

        // Get offline events.
        const syncPromise = this.performSyncEvents(siteId);

        return this.addOngoingSync(ADDON_CALENDAR_SYNC_ID, syncPromise, siteId);
    }

    /**
     * Sync user preferences of a site.
     *
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async performSyncEvents(siteId: string): Promise<AddonCalendarSyncEvents> {
        const result: AddonCalendarSyncEvents = {
            warnings: [],
            events: [],
            offlineIdMap: {},
            deleted: [],
            toinvalidate: [],
            updated: false,
        };

        const eventIds: number[] = await CoreUtils.ignoreErrors(AddonCalendarOffline.getAllEventsIds(siteId), []);

        if (eventIds.length > 0) {
            if (!CoreNetwork.isOnline()) {
                // Cannot sync in offline.
                throw new CoreNetworkError();
            }

            const promises = eventIds.map((eventId) => this.syncOfflineEvent(eventId, result, siteId));

            await CoreUtils.allPromises(promises);

            if (result.updated) {

                // Data has been sent to server. Now invalidate the WS calls.
                const promises = [
                    AddonCalendar.invalidateEventsList(siteId),
                    AddonCalendarHelper.refreshAfterChangeEvents(result.toinvalidate, siteId),
                ];

                await CoreUtils.ignoreErrors(Promise.all(promises));
            }
        }

        // Sync finished, set sync time.
        await CoreUtils.ignoreErrors(this.setSyncTime(ADDON_CALENDAR_SYNC_ID, siteId));

        // All done, return the result.
        return result;
    }

    /**
     * Synchronize an offline event.
     *
     * @param eventId The event ID to sync.
     * @param result Object where to store the result of the sync.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async syncOfflineEvent(eventId: number, result: AddonCalendarSyncEvents, siteId?: string): Promise<void> {

        // Verify that event isn't blocked.
        if (CoreSync.isBlocked(ADDON_CALENDAR_COMPONENT, eventId, siteId)) {
            this.logger.debug('Cannot sync event ' + eventId + ' because it is blocked.');

            throw new CoreSyncBlockedError(Translate.instant(
                'core.errorsyncblocked',
                { $a: Translate.instant('addon.calendar.calendarevent') },
            ));
        }

        // First of all, check if the event has been deleted.
        try {
            const data = await AddonCalendarOffline.getDeletedEvent(eventId, siteId);
            // Delete the event.
            try {
                await AddonCalendar.deleteEventOnline(data.id, !!data.repeat, siteId);

                result.updated = true;
                result.deleted.push(eventId);

                // Event sent, delete the offline data.
                const promises: Promise<void>[] = [];

                promises.push(AddonCalendarOffline.unmarkDeleted(eventId, siteId));
                promises.push(AddonCalendarOffline.deleteEvent(eventId, siteId).catch(() => {
                    // Ignore errors, maybe there was no edit data.
                }));

                // We need the event data to invalidate it. Get it from local DB.
                promises.push(AddonCalendar.getEventFromLocalDb(eventId, siteId).then((event) => {
                    result.toinvalidate.push({
                        id: event.id,
                        repeatid: event.repeatid,
                        timestart: event.timestart,
                        repeated: data?.repeat ? (event as AddonCalendarEvent).eventcount || 1 : 1,
                    });

                    return;
                }).catch(() => {
                    // Ignore errors.
                }));

                await Promise.all(promises);
            } catch (error) {

                if (!CoreUtils.isWebServiceError(error)) {
                    // Local error, reject.
                    throw error;
                }

                // The WebService has thrown an error, this means that the event cannot be created. Delete it.
                result.updated = true;

                const promises: Promise<void>[] = [];

                promises.push(AddonCalendarOffline.unmarkDeleted(eventId, siteId));
                promises.push(AddonCalendarOffline.deleteEvent(eventId, siteId).catch(() => {
                    // Ignore errors, maybe there was no edit data.
                }));

                await Promise.all(promises);

                // Event deleted, add a warning.
                this.addOfflineDataDeletedWarning(result.warnings, data.name, error);
            }

            return;
        } catch {
            // Not deleted.
        }

        // Not deleted. Now get the event data.
        const event = await AddonCalendarOffline.getEvent(eventId, siteId);

        // Try to send the data.
        const data: AddonCalendarSubmitCreateUpdateFormDataWSParams = Object.assign(
            CoreUtils.clone(event),
            {
                description: {
                    text: event.description || '',
                    format: 1,
                    itemid: 0, // Files not supported yet.
                },
            },
        ); // Clone the object because it will be modified in the submit function.

        try {
            const newEvent = await AddonCalendar.submitEventOnline(eventId, data, siteId);

            result.updated = true;
            result.events.push(newEvent);
            if (eventId < 0) {
                result.offlineIdMap[eventId] = newEvent.id;
            }

            // Add data to invalidate.
            const numberOfRepetitions = data.repeat ? data.repeats :
                (data.repeateditall && newEvent.repeatid ? newEvent.eventcount : 1);

            result.toinvalidate.push({
                id: newEvent.id,
                repeatid: newEvent.repeatid,
                timestart: newEvent.timestart,
                repeated: numberOfRepetitions || 1,
            });

            // Event sent, delete the offline data.
            return AddonCalendarOffline.deleteEvent(event.id, siteId);

        } catch (error) {
            if (!CoreUtils.isWebServiceError(error)) {
                // Local error, reject.
                throw error;
            }

            // The WebService has thrown an error, this means that the event cannot be created. Delete it.
            result.updated = true;

            await AddonCalendarOffline.deleteEvent(event.id, siteId);

            // Event deleted, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, event.name, error);
        }
    }

}
export const AddonCalendarSync = makeSingleton(AddonCalendarSyncProvider);

export type AddonCalendarSyncEvents = CoreSyncResult & {
    events: AddonCalendarEvent[];
    offlineIdMap: Record<number, number>; // Map offline ID with online ID for created events.
    deleted: number[];
    toinvalidate: AddonCalendarSyncInvalidateEvent[];
    source?: string; // Added on pages.
    moment?: moment.Moment; // Added on day page.
};

export type AddonCalendarSyncInvalidateEvent = {
    id: number;
    repeatid?: number;
    timestart: number;
    repeated: number;
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_CALENDAR_MANUAL_SYNCED]: AddonCalendarSyncEvents;
        [ADDON_CALENDAR_AUTO_SYNCED]: AddonCalendarSyncEvents;
    }

}
