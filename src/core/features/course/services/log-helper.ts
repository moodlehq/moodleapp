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

import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { ACTIVITY_LOG_TABLE, CoreCourseActivityLogDBRecord } from './database/log';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { CoreWSError } from '@classes/errors/wserror';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Helper to manage logging to Moodle.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseLogHelperProvider {

    /**
     * Delete the offline saved activity logs.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted, rejected if failure.
     */
    protected async deleteLogs(component: string, componentId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<CoreCourseActivityLogDBRecord> = {
            component,
            componentid: componentId,
        };

        await site.getDb().deleteRecords(ACTIVITY_LOG_TABLE, conditions);
    }

    /**
     * Delete a WS based log.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param ws WS name.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted, rejected if failure.
     */
    protected async deleteWSLogsByComponent(component: string, componentId: number, ws: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<CoreCourseActivityLogDBRecord> = {
            component,
            componentid: componentId,
            ws,
        };

        await site.getDb().deleteRecords(ACTIVITY_LOG_TABLE, conditions);
    }

    /**
     * Delete the offline saved activity logs using call data.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted, rejected if failure.
     */
    protected async deleteWSLogs(ws: string, data: Record<string, unknown>, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<CoreCourseActivityLogDBRecord> = {
            ws,
            data: CoreUtils.sortAndStringify(data),
        };

        await site.getDb().deleteRecords(ACTIVITY_LOG_TABLE, conditions);
    }

    /**
     * Get all the offline saved activity logs.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of offline logs.
     */
    protected async getAllLogs(siteId?: string): Promise<CoreCourseActivityLogDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getAllRecords<CoreCourseActivityLogDBRecord>(ACTIVITY_LOG_TABLE);
    }

    /**
     * Get the offline saved activity logs.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of offline logs.
     */
    protected async getLogs(component: string, componentId: number, siteId?: string): Promise<CoreCourseActivityLogDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<CoreCourseActivityLogDBRecord> = {
            component,
            componentid: componentId,
        };

        return site.getDb().getRecords<CoreCourseActivityLogDBRecord>(ACTIVITY_LOG_TABLE, conditions);
    }

    /**
     * Perform log online. Data will be saved offline for syncing.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async log(ws: string, data: Record<string, unknown>, component: string, componentId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return this.storeOffline(ws, data, component, componentId, site.getId());
        }

        try {
            await this.logOnline(ws, data, site.getId());
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return this.storeOffline(ws, data, component, componentId, site.getId());
        }
    }

    /**
     * Perform the log online.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when log is successfully submitted. Rejected with object containing
     *         the error message (if any) and a boolean indicating if the error was returned by WS.
     */
    protected async logOnline<T extends CoreStatusWithWarningsWSResponse>(
        ws: string,
        data: Record<string, unknown>,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        // Clone to have an unmodified data object.
        const wsData = Object.assign({}, data);

        const response = await site.write<T>(ws, wsData);

        if (!response.status) {
            // Return the warning. If no warnings (shouldn't happen), create a fake one.
            const warning = response.warnings?.[0] || {
                warningcode: 'errorlog',
                message: 'Error logging data.',
            };

            throw new CoreWSError(warning);
        }

        // Remove all the logs performed.
        // TODO: Remove this lines when time is accepted in logs.
        await this.deleteWSLogs(ws, data, siteId);
    }

    /**
     * Perform log online. Data will be saved offline for syncing.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param component Component name.
     * @param componentId Component ID.
     * @param name Name of the viewed item.
     * @param category Category of the viewed item.
     * @param eventData Data to pass to the analytics event.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @deprecated since 4.3. Please use CoreCourseLogHelper.log instead.
     */
    logSingle(
        ws: string,
        data: Record<string, unknown>,
        component: string,
        componentId: number,
        name?: string,
        category?: string,
        eventData?: Record<string, string | number | boolean | undefined>,
        siteId?: string,
    ): Promise<void> {
        return this.log(ws, data, component, componentId, siteId);
    }

    /**
     * Perform log online. Data will be saved offline for syncing.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param component Component name.
     * @param componentId Component ID.
     * @param category Category of the viewed item.
     * @param eventData Data to pass to the analytics event.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @deprecated since 4.3. Please use CoreCourseLogHelper.log instead.
     */
    logList(
        ws: string,
        data: Record<string, unknown>,
        component: string,
        componentId: number,
        category: string,
        eventData?: Record<string, string | number | boolean | undefined>,
        siteId?: string,
    ): Promise<void> {
        return this.log(ws, data, component, componentId, siteId);
    }

    /**
     * Save activity log for offline sync.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    protected async storeOffline(
        ws: string,
        data: Record<string, unknown>,
        component: string,
        componentId: number,
        siteId?: string,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        const log: CoreCourseActivityLogDBRecord = {
            component,
            componentid: componentId,
            ws,
            data: CoreUtils.sortAndStringify(data),
            time: CoreTimeUtils.timestamp(),
        };

        await site.getDb().insertRecord(ACTIVITY_LOG_TABLE, log);
    }

    /**
     * Sync all the offline saved activity logs.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async syncSite(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        siteId = site.getId();

        const logs = await this.getAllLogs(siteId);

        const unique: CoreCourseActivityLogDBRecord[] = [];

        // TODO: When time is accepted on log, do not discard same logs.
        logs.forEach((log) => {
            // Just perform unique syncs.
            const found = unique.find((doneLog) => log.component == doneLog.component && log.componentid == doneLog.componentid &&
                log.ws == doneLog.ws && log.data == doneLog.data);

            if (!found) {
                unique.push(log);
            }
        });

        return this.syncLogs(unique, siteId);
    }

    /**
     * Sync the offline saved activity logs.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async syncActivity(component: string, componentId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        siteId = site.getId();

        const logs = await this.getLogs(component, componentId, siteId);

        const unique: CoreCourseActivityLogDBRecord[] = [];

        // TODO: When time is accepted on log, do not discard same logs.
        logs.forEach((log) => {
            // Just perform unique syncs.
            const found = unique.find((doneLog) => log.ws == doneLog.ws && log.data == doneLog.data);

            if (!found) {
                unique.push(log);
            }
        });

        return this.syncLogs(unique, siteId);
    }

    /**
     * Sync and delete given logs.
     *
     * @param logs Array of log objects.
     * @param siteId Site Id.
     * @returns Promise resolved when done.
     */
    protected async syncLogs(logs: CoreCourseActivityLogDBRecord[], siteId: string): Promise<void> {
        await Promise.all(logs.map(async (log) => {
            const data = CoreText.parseJSON<Record<string, unknown>>(log.data || '{}', {});

            try {
                await this.logOnline(log.ws, data, siteId);
            } catch (error) {
                if (CoreUtils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    await CorePromiseUtils.ignoreErrors(this.deleteWSLogs(log.ws, data, siteId));
                }

                throw error;
            }

            await this.deleteWSLogsByComponent(log.component, log.componentid, log.ws, siteId);
        }));
    }

}

export const CoreCourseLogHelper = makeSingleton(CoreCourseLogHelperProvider);
