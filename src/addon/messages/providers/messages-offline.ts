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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';

/**
 * Service to handle Offline messages.
 */
@Injectable()
export class AddonMessagesOfflineProvider {

    protected logger;

    // Variables for database.
    static MESSAGES_TABLE = 'addon_messages_offline_messages';
    protected tablesSchema = [
        {
            name: AddonMessagesOfflineProvider.MESSAGES_TABLE,
            columns: [
                {
                    name: 'touserid',
                    type: 'INTEGER'
                },
                {
                    name: 'useridfrom',
                    type: 'INTEGER'
                },
                {
                    name: 'smallmessage',
                    type: 'TEXT'
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER'
                },
                {
                    name: 'deviceoffline', // If message was stored because device was offline.
                    type: 'INTEGER'
                }
            ],
            primaryKeys: ['touserid', 'smallmessage', 'timecreated']
        }
    ];

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider) {
        this.logger = logger.getInstance('AddonMessagesOfflineProvider');
        this.sitesProvider.createTablesFromSchema(this.tablesSchema);
    }

    /**
     * Delete a message.
     *
     * @param  {number} toUserId    User ID to send the message to.
     * @param  {string} message     The message.
     * @param  {number} timeCreated The time the message was created.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved if stored, rejected if failure.
     */
    deleteMessage(toUserId: number, message: string, timeCreated: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE, {
                    touserid: toUserId,
                    smallmessage: message,
                    timecreated: timeCreated
                });
        });
    }

    /**
     * Get all messages where deviceoffline is set to 1.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved with messages.
     */
    getAllDeviceOfflineMessages(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE, {deviceoffline: 1});
        });
    }

    /**
     * Get offline messages to send to a certain user.
     *
     * @param  {number} toUserId       User ID to get messages to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved with messages.
     */
    getMessages(toUserId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE, {touserid: toUserId});
        });
    }

    /**
     * Get all offline messages.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved with messages.
     */
    getAllMessages(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getAllRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE);
        });
    }

    /**
     * Check if there are offline messages to send to a certain user.
     *
     * @param  {number} toUserId User ID to check.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved with boolean: true if has offline messages, false otherwise.
     */
    hasMessages(toUserId: number, siteId?: string): Promise<any> {
        return this.getMessages(toUserId, siteId).then((messages) => {
            return !!messages.length;
        });
    }

    /**
     * Save a message to be sent later.
     *
     * @param  {number} toUserId User ID recipient of the message.
     * @param  {string} message  The message to send.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if stored, rejected if failure.
     */
    saveMessage(toUserId: number, message: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                touserid: toUserId,
                useridfrom: site.getUserId(),
                smallmessage: message,
                timecreated: new Date().getTime(),
                deviceoffline: this.appProvider.isOnline() ? 0 : 1
            };

            return site.getDb().insertRecord(AddonMessagesOfflineProvider.MESSAGES_TABLE, entry).then(() => {
                return entry;
            });
        });
    }

    /**
     * Set deviceoffline for a group of messages.
     *
     * @param  {any} messages Messages to update. Should be the same entry as retrieved from the DB.
     * @param  {boolean} value   Value to set.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if stored, rejected if failure.
     */
    setMessagesDeviceOffline(messages: any, value: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb(),
                promises = [],
                data = { deviceoffline: value ? 1 : 0 };

            messages.forEach((message) => {
                promises.push(db.insertRecord(AddonMessagesOfflineProvider.MESSAGES_TABLE, data));
            });

            return Promise.all(promises);
        });
    }
}
