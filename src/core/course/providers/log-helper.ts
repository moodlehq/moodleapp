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
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';

/**
 * Helper to manage logging to Moodle.
 */
@Injectable()
export class CoreCourseLogHelperProvider {

    // Variables for database.
    static ACTIVITY_LOG_TABLE = 'course_activity_log';
    protected tablesSchema = [
        {
            name: CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE,
            columns: [
                {
                    name: 'component',
                    type: 'TEXT'
                },
                {
                    name: 'componentid',
                    type: 'INTEGER'
                },
                {
                    name: 'ws',
                    type: 'TEXT'
                },
                {
                    name: 'data',
                    type: 'TEXT'
                },
                {
                    name: 'time',
                    type: 'INTEGER'
                }
            ],
            primaryKeys: ['component', 'componentid', 'ws', 'time']
        }
    ];

    constructor(protected sitesProvider: CoreSitesProvider, protected timeUtils: CoreTimeUtilsProvider,
            protected textUtils: CoreTextUtilsProvider, protected utils: CoreUtilsProvider,
            protected appProvider: CoreAppProvider) {
        this.sitesProvider.createTablesFromSchema(this.tablesSchema);
    }

    /**
     * Delete the offline saved activity logs.
     *
     * @param  {string}         component   Component name.
     * @param  {number}         componentId Component ID.
     * @param  {string}         siteId      Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when deleted, rejected if failure.
     */
    protected deleteLogs(component: string, componentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().deleteRecords(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE,
                {component: component, componentid: componentId});
        });
    }

    /**
     * Delete the offline saved activity logs using call data.
     *
     * @param  {string}         ws          WS name.
     * @param  {any}            data        Data to send to the WS.
     * @param  {string}         siteId      Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when deleted, rejected if failure.
     */
    protected deleteWSLogs(ws: string, data: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().deleteRecords(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE,
                {ws: ws, data: JSON.stringify(data)});
        });
    }

    /**
     * Get the offline saved activity logs.
     *
     * @param  {string}         component   Component name.
     * @param  {number}         componentId Component ID.
     * @param  {string}         siteId      Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of offline logs.
     */
    protected getLogs(component: string, componentId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().getRecords(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE,
                {component: component, componentid: componentId});
        });
    }

    /**
     * Perform log online. Data will be saved offline for syncing.
     *
     * @param  {string}         ws          WS name.
     * @param  {any}            data        Data to send to the WS.
     * @param  {string}         component   Component name.
     * @param  {number}         componentId Component ID.
     * @param  {string}         siteId      Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    log(ws: string, data: any, component: string, componentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!this.appProvider.isOnline()) {
                // App is offline, store the action.
                return this.storeOffline(ws, data, component, componentId, site.getId());
            }

            return this.logOnline(ws, data, site.getId()).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return Promise.reject(error);
                }

                // Couldn't connect to server, store in offline.
                return this.storeOffline(ws, data, component, componentId, site.getId());
            });
        });
    }

    /**
     * Perform the log online.
     *
     * @param  {string}       ws     WS name.
     * @param  {any}          data Data to send to the WS.
     * @param  {string}       siteId Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when log is successfully submitted. Rejected with object containing
     *                            the error message (if any) and a boolean indicating if the error was returned by WS.
     */
    protected logOnline(ws: string, data: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.write(ws, data).then((response) => {
                if (!response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Remove all the logs performed.
                // TODO: Remove this lines when time is accepted in logs.
                return this.deleteWSLogs(ws, data);
            }).catch((error) => {
                return Promise.reject(this.utils.createFakeWSError(error));
            });
        });
    }

    /**
     * Save activity log for offline sync.
     *
     * @param  {string}         ws          WS name.
     * @param  {any}            data        Data to send to the WS.
     * @param  {string}         component   Component name.
     * @param  {number}         componentId Component ID.
     * @param  {string}         siteId      Site ID. If not defined, current site.
     * @return {Promise<number>} Resolved with the inserted rowId field.
     */
    protected storeOffline(ws: string, data: any, component: string, componentId: number, siteId?: string):
            Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const log = {
                    ws: ws,
                    data: JSON.stringify(data),
                    component: component,
                    componentid: componentId,
                    time: this.timeUtils.timestamp()
                };

            return site.getDb().insertRecord(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE, log);
        });
    }

    /**
     * Sync the offline saved activity logs.
     *
     * @param  {string}         component   Component name.
     * @param  {number}         componentId Component ID.
     * @param  {string}         siteId      Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when done.
     */
    syncIfNeeded(component: string, componentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const siteId = site.getId();

            return this.getLogs(component, componentId, siteId).then((logs) => {
                const done = [];

                // TODO: When time is accepted on log, do not discard same logs.
                return Promise.all(logs.map((log) => {
                    // Just perform unique syncs.
                    const found = done.find((doneLog) => {
                        return log.ws == doneLog.ws && log.data == doneLog.data;
                    });

                    if (found) {
                        return Promise.resolve();
                    }

                    done.push(log);

                    return this.logOnline(log.ws, this.textUtils.parseJSON(log.data), siteId);
                }));
            });
        });
    }
}
