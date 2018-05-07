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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreAppProvider } from '@providers/app';
import { AddonMessagesOfflineProvider } from './messages-offline';
import { AddonMessagesProvider } from './messages';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreEventsProvider } from '@providers/events';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { TranslateService } from '@ngx-translate/core';
import { CoreSyncProvider } from '@providers/sync';

/**
 * Service to sync messages.
 */
@Injectable()
export class AddonMessagesSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_messages_autom_synced';

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            translate: TranslateService, syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider,
            private messagesOffline: AddonMessagesOfflineProvider, private eventsProvider: CoreEventsProvider,
            private messagesProvider: AddonMessagesProvider, private userProvider: CoreUserProvider,
            private utils: CoreUtilsProvider) {
        super('AddonMessagesSync', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate);
    }

    /**
     * Try to synchronize all the discussions in a certain site or in all sites.
     *
     * @param  {string} [siteId]                   Site ID to sync. If not defined, sync all sites.
     * @param  {boolean} [onlyDeviceOffline=false] True to only sync discussions that failed because device was offline,
     *                                             false to sync all.
     * @return {Promise<any>}                      Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllDiscussions(siteId?: string, onlyDeviceOffline: boolean = false): Promise<any> {
        const syncFunctionLog = 'all discussions' + (onlyDeviceOffline ? ' (Only offline)' : '');

        return this.syncOnSites(syncFunctionLog, this.syncAllDiscussionsFunc.bind(this), [onlyDeviceOffline], siteId);
    }

    /**
     * Get all messages pending to be sent in the site.
     *
     * @param {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} [onlyDeviceOffline=false] True to only sync discussions that failed because device was offline.
     * @param {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllDiscussionsFunc(siteId?: string, onlyDeviceOffline: boolean = false): Promise<any> {
        const promise = onlyDeviceOffline ?
            this.messagesOffline.getAllDeviceOfflineMessages(siteId) :
            this.messagesOffline.getAllMessages(siteId);

        return promise.then((messages) => {
            const userIds = [],
                promises = [];

            // Get all the discussions to be synced.
            messages.forEach((message) => {
                if (userIds.indexOf(message.touserid) == -1) {
                    userIds.push(message.touserid);
                }
            });

            // Sync all discussions.
            userIds.forEach((userId) => {
                promises.push(this.syncDiscussion(userId, siteId).then((warnings) => {
                    if (typeof warnings != 'undefined') {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonMessagesSyncProvider.AUTO_SYNCED, {
                            userid: userId,
                            warnings: warnings
                        }, siteId);
                    }
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Synchronize a discussion.
     *
     * @param  {number} userId   User ID of the discussion.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected otherwise.
     */
    syncDiscussion(userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(userId, siteId)) {
            // There's already a sync ongoing for this SCORM, return the promise.
            return this.getOngoingSync(userId, siteId);
        }

        const warnings = [];

        this.logger.debug(`Try to sync discussion with user '${userId}'`);

        // Get offline messages to be sent.
        const syncPromise = this.messagesOffline.getMessages(userId, siteId).then((messages) => {
            if (!messages.length) {
                // Nothing to sync.
                return [];
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline. Mark messages as device offline.
                this.messagesOffline.setMessagesDeviceOffline(messages, true);

                return Promise.reject(null);
            }

            let promise: Promise<any> = Promise.resolve();
            const errors = [];

            // Order message by timecreated.
            messages = this.messagesProvider.sortMessages(messages);

            // Send the messages.
            // We don't use AddonMessagesProvider#sendMessagesOnline because there's a problem with display order.
            // @todo Use AddonMessagesProvider#sendMessagesOnline once the display order is fixed.
            messages.forEach((message, index) => {
                // Chain message sending. If 1 message fails to be sent we'll stop sending.
                promise = promise.then(() => {
                    return this.messagesProvider.sendMessageOnline(userId, message.smallmessage, siteId).catch((error) => {
                        if (this.utils.isWebServiceError(error)) {
                            // Error returned by WS. Store the error to show a warning but keep sending messages.
                            if (errors.indexOf(error) == -1) {
                                errors.push(error);
                            }

                            return;
                        }

                        // Error sending, stop execution.
                        if (this.appProvider.isOnline()) {
                            // App is online, unmark deviceoffline if marked.
                            this.messagesOffline.setMessagesDeviceOffline(messages, false);
                        }

                        return Promise.reject(error);
                    }).then(() => {
                        // Message was sent, delete it from local DB.
                        return this.messagesOffline.deleteMessage(userId, message.smallmessage, message.timecreated, siteId);
                    }).then(() => {
                        // All done. Wait 1 second to ensure timecreated of messages is different.
                        if (index < messages.length - 1) {
                            return setTimeout(() => {return; }, 1000);
                        }
                    });
                });
            });

            return promise.then(() => {
                return errors;
            });
        }).then((errors) => {
            if (errors && errors.length) {
                // At least an error occurred, get user full name and add errors to warnings array.
                return this.userProvider.getProfile(userId, undefined, true).catch(() => {
                    // Ignore errors.
                    return {};
                }).then((user) => {
                    errors.forEach((error) => {
                        warnings.push(this.translate.instant('addon.messages.warningmessagenotsent', {
                            user: user.fullname ? user.fullname : userId,
                            error: error
                        }));
                    });
                });
            }
        }).then(() => {
            // All done, return the warnings.
            return warnings;
        });

        return this.addOngoingSync(userId, syncPromise, siteId);
    }
}
