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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';

/**
 * Helper to manage logging to Moodle.
 */
@Injectable()
export class CoreCourseLogHelperProvider {

    // Variables for database.
    static ACTIVITY_LOG_TABLE = 'course_activity_log';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreCourseLogHelperProvider',
        version: 1,
        tables: [
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
        ]
    };

    constructor(protected sitesProvider: CoreSitesProvider, protected timeUtils: CoreTimeUtilsProvider,
            protected textUtils: CoreTextUtilsProvider, protected utils: CoreUtilsProvider,
            protected appProvider: CoreAppProvider, protected pushNotificationsProvider: CorePushNotificationsProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete the offline saved activity logs.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when deleted, rejected if failure.
     */
    protected deleteLogs(component: string, componentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().deleteRecords(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE,
                {component: component, componentid: componentId});
        });
    }

    /**
     * Delete a WS based log.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param ws WS name.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when deleted, rejected if failure.
     */
    protected deleteWSLogsByComponent(component: string, componentId: number, ws: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().deleteRecords(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE,
                {component: component, componentid: componentId, ws: ws});
        });
    }

    /**
     * Delete the offline saved activity logs using call data.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when deleted, rejected if failure.
     */
    protected deleteWSLogs(ws: string, data: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().deleteRecords(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE,
                {ws: ws, data: this.utils.sortAndStringify(data)});
        });
    }

    /**
     * Get all the offline saved activity logs.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of offline logs.
     */
    protected getAllLogs(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().getAllRecords(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE);
        });
    }

    /**
     * Get the offline saved activity logs.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of offline logs.
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
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
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
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when log is successfully submitted. Rejected with object containing
     *         the error message (if any) and a boolean indicating if the error was returned by WS.
     */
    protected logOnline(ws: string, data: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Clone to have an unmodified data object.
            const wsData = Object.assign({}, data);

            return site.write(ws, wsData).then((response) => {
                if (!response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Remove all the logs performed.
                // TODO: Remove this lines when time is accepted in logs.
                return this.deleteWSLogs(ws, data, siteId);
            });
        });
    }

    /**
     * Perform log online. Data will be saved offline for syncing.
     * It also triggers a Firebase view_item event.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param component Component name.
     * @param componentId Component ID.
     * @param name Name of the viewed item.
     * @param category Category of the viewed item.
     * @param eventData Data to pass to the Firebase event.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    logSingle(ws: string, data: any, component: string, componentId: number, name?: string, category?: string, eventData?: any,
            siteId?: string): Promise<any> {
        this.pushNotificationsProvider.logViewEvent(componentId, name, category, ws, eventData, siteId);

        return this.log(ws, data, component, componentId, siteId);
    }

    /**
     * Perform log online. Data will be saved offline for syncing.
     * It also triggers a Firebase view_item_list event.
     *
     * @param ws WS name.
     * @param data Data to send to the WS.
     * @param component Component name.
     * @param componentId Component ID.
     * @param category Category of the viewed item.
     * @param eventData Data to pass to the Firebase event.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    logList(ws: string, data: any, component: string, componentId: number, category: string, eventData?: any, siteId?: string)
            : Promise<any> {
        this.pushNotificationsProvider.logViewListEvent(category, ws, eventData, siteId);

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
     * @return Resolved with the inserted rowId field.
     */
    protected storeOffline(ws: string, data: any, component: string, componentId: number, siteId?: string):
            Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const log = {
                    ws: ws,
                    data: this.utils.sortAndStringify(data),
                    component: component,
                    componentid: componentId,
                    time: this.timeUtils.timestamp()
                };

            return site.getDb().insertRecord(CoreCourseLogHelperProvider.ACTIVITY_LOG_TABLE, log);
        });
    }

    /**
     * Sync all the offline saved activity logs.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    syncSite(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const siteId = site.getId();

            return this.getAllLogs(siteId).then((logs) => {
                const unique = [];

                // TODO: When time is accepted on log, do not discard same logs.
                logs.forEach((log) => {
                    // Just perform unique syncs.
                    const found = unique.find((doneLog) => {
                        return log.component == doneLog.component && log.componentid == doneLog.componentid &&
                            log.ws == doneLog.ws && log.data == doneLog.data;
                    });

                    if (!found) {
                        unique.push(log);
                    }
                });

                return this.syncLogs(unique, siteId);
            });
        });
    }

    /**
     * Sync the offline saved activity logs.
     *
     * @param component Component name.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    syncIfNeeded(component: string, componentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const siteId = site.getId();

            return this.getLogs(component, componentId, siteId).then((logs) => {
                const unique = [];

                // TODO: When time is accepted on log, do not discard same logs.
                logs.forEach((log) => {
                    // Just perform unique syncs.
                    const found = unique.find((doneLog) => {
                        return log.ws == doneLog.ws && log.data == doneLog.data;
                    });

                    if (!found) {
                        unique.push(log);
                    }
                });

                return this.syncLogs(unique, siteId);
            });
        });
    }

    /**
     * Sync and delete given logs.
     *
     * @param logs Array of log objects.
     * @param siteId Site Id.
     * @return Promise resolved when done.
     */
    protected syncLogs(logs: any[], siteId: string): Promise<any> {
        return Promise.all(logs.map((log) => {
            const data = this.textUtils.parseJSON(log.data);

            return this.logOnline(log.ws, data, siteId).catch((error) => {
                const promise = this.utils.isWebServiceError(error) ? this.deleteWSLogs(log.ws, data, siteId) : Promise.resolve();

                return promise.catch(() => {
                    // Ignore errors.
                }).then(() => {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return Promise.reject(error);
                });
            }).then(() => {
                return this.deleteWSLogsByComponent(log.component, log.componentid, log.ws, siteId);
            });
        }));
    }
}
