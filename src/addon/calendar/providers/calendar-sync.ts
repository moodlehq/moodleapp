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
import { TranslateService } from '@ngx-translate/core';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonCalendarProvider } from './calendar';
import { AddonCalendarOfflineProvider } from './calendar-offline';
import { AddonCalendarHelperProvider } from './helper';

/**
 * Service to sync calendar.
 */
@Injectable()
export class AddonCalendarSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_calendar_autom_synced';
    static MANUAL_SYNCED = 'addon_calendar_manual_synced';
    static SYNC_ID = 'calendar';

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            courseProvider: CoreCourseProvider,
            private eventsProvider: CoreEventsProvider,
            loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            syncProvider: CoreSyncProvider,
            textUtils: CoreTextUtilsProvider,
            timeUtils: CoreTimeUtilsProvider,
            private utils: CoreUtilsProvider,
            private calendarProvider: AddonCalendarProvider,
            private calendarOffline: AddonCalendarOfflineProvider,
            private calendarHelper: AddonCalendarHelperProvider) {

        super('AddonCalendarSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils);
    }

    /**
     * Try to synchronize all events in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllEvents(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all calendar events', this.syncAllEventsFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all events on a site.
     *
     * @param siteId Site ID to sync.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllEventsFunc(siteId: string, force?: boolean): Promise<any> {

        const promise = force ? this.syncEvents(siteId) : this.syncEventsIfNeeded(siteId);

        return promise.then((result) => {
            if (result && result.updated) {
                // Sync successful, send event.
                this.eventsProvider.trigger(AddonCalendarSyncProvider.AUTO_SYNCED, {
                    warnings: result.warnings,
                    events: result.events,
                    deleted: result.deleted
                }, siteId);
            }
        });
    }

    /**
     * Sync a site events only if a certain time has passed since the last time.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the events are synced or if it doesn't need to be synced.
     */
    syncEventsIfNeeded(siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.isSyncNeeded(AddonCalendarSyncProvider.SYNC_ID, siteId).then((needed) => {
            if (needed) {
                return this.syncEvents(siteId);
            }
        });
    }

    /**
     * Synchronize all offline events of a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    syncEvents(siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(AddonCalendarSyncProvider.SYNC_ID, siteId)) {
            // There's already a sync ongoing for this site, return the promise.
            return this.getOngoingSync(AddonCalendarSyncProvider.SYNC_ID, siteId);
        }

        this.logger.debug('Try to sync calendar events for site ' + siteId);

        const result = {
            warnings: [],
            events: [],
            deleted: [],
            toinvalidate: [],
            updated: false
        };
        let offlineEventIds: number[];

        // Get offline events.
        const syncPromise = this.calendarOffline.getAllEventsIds(siteId).catch(() => {
            // No offline data found, return empty list.
            return [];
        }).then((eventIds) => {
            offlineEventIds = eventIds;

            if (!eventIds.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            const promises = [];

            offlineEventIds.forEach((eventId) => {
                promises.push(this.syncOfflineEvent(eventId, result, siteId));
            });

            return this.utils.allPromises(promises);
        }).then(() => {
            if (result.updated) {

                // Data has been sent to server. Now invalidate the WS calls.
                const promises = [
                    this.calendarProvider.invalidateEventsList(siteId),
                    this.calendarHelper.refreshAfterChangeEvents(result.toinvalidate, siteId)
                ];

                return Promise.all(promises).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(AddonCalendarSyncProvider.SYNC_ID, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the result.
            return result;
        });

        return this.addOngoingSync(AddonCalendarSyncProvider.SYNC_ID, syncPromise, siteId);
    }

    /**
     * Synchronize an offline event.
     *
     * @param eventId The event ID to sync.
     * @param result Object where to store the result of the sync.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    protected syncOfflineEvent(eventId: number, result: any, siteId?: string): Promise<any> {

        // Verify that event isn't blocked.
        if (this.syncProvider.isBlocked(AddonCalendarProvider.COMPONENT, eventId, siteId)) {
            this.logger.debug('Cannot sync event ' + eventId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked',
                    {$a: this.translate.instant('addon.calendar.calendarevent')}));
        }

        // First of all, check if the event has been deleted.
        return this.calendarOffline.getDeletedEvent(eventId, siteId).then((data) => {
            // Delete the event.
            return this.calendarProvider.deleteEventOnline(data.id, data.repeat, siteId).then(() => {
                result.updated = true;
                result.deleted.push(eventId);

                // Event sent, delete the offline data.
                const promises = [];

                promises.push(this.calendarOffline.unmarkDeleted(eventId, siteId));
                promises.push(this.calendarOffline.deleteEvent(eventId, siteId).catch(() => {
                    // Ignore errors, maybe there was no edit data.
                }));

                // We need the event data to invalidate it. Get it from local DB.
                promises.push(this.calendarProvider.getEventFromLocalDb(eventId, siteId).then((event) => {
                    result.toinvalidate.push({
                        event: event,
                        repeated: data.repeat ? event.eventcount : 1
                    });
                }).catch(() => {
                    // Ignore errors.
                }));

                return Promise.all(promises);
            }).catch((error) => {

                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that the event cannot be created. Delete it.
                    result.updated = true;

                    const promises = [];

                    promises.push(this.calendarOffline.unmarkDeleted(eventId, siteId));
                    promises.push(this.calendarOffline.deleteEvent(eventId, siteId).catch(() => {
                        // Ignore errors, maybe there was no edit data.
                    }));

                    return Promise.all(promises).then(() => {
                        // Event deleted, add a warning.
                        result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                            component: this.translate.instant('addon.calendar.calendarevent'),
                            name: data.name,
                            error: this.textUtils.getErrorMessageFromError(error)
                        }));
                    });
                }

                // Local error, reject.
                return Promise.reject(error);
            });
        }, () => {

            // Not deleted. Now get the event data.
            return this.calendarOffline.getEvent(eventId, siteId).then((event) => {
                // Try to send the data.
                const data = this.utils.clone(event); // Clone the object because it will be modified in the submit function.

                data.description = {
                    text: data.description,
                    format: 1
                };

                return this.calendarProvider.submitEventOnline(eventId > 0 ? eventId : undefined, data, siteId).then((newEvent) => {
                    result.updated = true;
                    result.events.push(newEvent);

                    // Add data to invalidate.
                    const numberOfRepetitions = data.repeat ? data.repeats :
                        (data.repeateditall && newEvent.repeatid ? newEvent.eventcount : 1);

                    result.toinvalidate.push({
                        event: newEvent,
                        repeated: numberOfRepetitions
                    });

                    // Event sent, delete the offline data.
                    return this.calendarOffline.deleteEvent(event.id, siteId);
                }).catch((error) => {
                    if (this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means that the event cannot be created. Delete it.
                        result.updated = true;

                        return this.calendarOffline.deleteEvent(event.id, siteId).then(() => {
                            // Event deleted, add a warning.
                            result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.translate.instant('addon.calendar.calendarevent'),
                                name: event.name,
                                error: this.textUtils.getErrorMessageFromError(error)
                            }));
                        });
                    }

                    // Local error, reject.
                    return Promise.reject(error);
                });
            });
        });
    }
}
