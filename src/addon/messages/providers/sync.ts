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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreAppProvider } from '@providers/app';
import { AddonMessagesOfflineProvider } from './messages-offline';
import { AddonMessagesProvider, AddonMessagesConversationFormatted } from './messages';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreEventsProvider } from '@providers/events';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
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
            private utils: CoreUtilsProvider, timeUtils: CoreTimeUtilsProvider) {
        super('AddonMessagesSync', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate, timeUtils);
    }

    /**
     * Get the ID of a discussion sync.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @return Sync ID.
     */
    protected getSyncId(conversationId: number, userId: number): string {
        if (conversationId) {
            return 'conversationid:' + conversationId;
        } else {
            return 'userid:' + userId;
        }
    }

    /**
     * Try to synchronize all the discussions in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param onlyDeviceOffline True to only sync discussions that failed because device was offline,
     *                          false to sync all.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllDiscussions(siteId?: string, onlyDeviceOffline: boolean = false): Promise<any> {
        const syncFunctionLog = 'all discussions' + (onlyDeviceOffline ? ' (Only offline)' : '');

        return this.syncOnSites(syncFunctionLog, this.syncAllDiscussionsFunc.bind(this), [onlyDeviceOffline], siteId);
    }

    /**
     * Get all messages pending to be sent in the site.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param onlyDeviceOffline True to only sync discussions that failed because device was offline.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllDiscussionsFunc(siteId?: string, onlyDeviceOffline: boolean = false): Promise<any> {
        const promise = onlyDeviceOffline ?
            this.messagesOffline.getAllDeviceOfflineMessages(siteId) :
            this.messagesOffline.getAllMessages(siteId);

        return promise.then((messages) => {
            const userIds = [],
                conversationIds = [],
                promises = [];

            // Get all the conversations to be synced.
            messages.forEach((message) => {
                if (message.conversationid) {
                    if (conversationIds.indexOf(message.conversationid) == -1) {
                        conversationIds.push(message.conversationid);
                    }
                } else if (userIds.indexOf(message.touserid) == -1) {
                    userIds.push(message.touserid);
                }
            });

            // Sync all conversations.
            conversationIds.forEach((conversationId) => {
                promises.push(this.syncDiscussion(conversationId, undefined, siteId).then((warnings) => {
                    if (typeof warnings != 'undefined') {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonMessagesSyncProvider.AUTO_SYNCED, {
                            conversationId: conversationId,
                            warnings: warnings
                        }, siteId);
                    }
                }));
            });

            userIds.forEach((userId) => {
                promises.push(this.syncDiscussion(undefined, userId, siteId).then((warnings) => {
                    if (typeof warnings != 'undefined') {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonMessagesSyncProvider.AUTO_SYNCED, {
                            userId: userId,
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
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    syncDiscussion(conversationId: number, userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getSyncId(conversationId, userId),
            groupMessagingEnabled = this.messagesProvider.isGroupMessagingEnabled();

        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this conversation, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        const warnings = [];

        if (conversationId) {
            this.logger.debug(`Try to sync conversation '${conversationId}'`);
        } else {
            this.logger.debug(`Try to sync discussion with user '${userId}'`);
        }

        // Get offline messages to be sent.
        let syncPromise;

        if (conversationId) {
            syncPromise = this.messagesOffline.getConversationMessages(conversationId, siteId);
        } else {
            syncPromise = this.messagesOffline.getMessages(userId, siteId);
        }

        syncPromise = syncPromise.then((messages) => {
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
            // Send them 1 by 1 to simulate web's behaviour and to make sure we know which message has failed.
            messages.forEach((message, index) => {
                // Chain message sending. If 1 message fails to be sent we'll stop sending.
                promise = promise.then(() => {
                    let subPromise;

                    if (conversationId) {
                        subPromise = this.messagesProvider.sendMessageToConversationOnline(conversationId, message.text, siteId);
                    } else {
                        subPromise = this.messagesProvider.sendMessageOnline(userId, message.smallmessage, siteId);
                    }

                    return subPromise.catch((error) => {
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
                        if (conversationId) {
                            return this.messagesOffline.deleteConversationMessage(conversationId, message.text,
                                    message.timecreated, siteId);
                        } else {
                            return this.messagesOffline.deleteMessage(userId, message.smallmessage, message.timecreated, siteId);
                        }
                    }).then(() => {
                        // In some Moodle versions, wait 1 second to make sure timecreated is different.
                        // This is because there was a bug where messages with the same timecreated had a wrong order.
                        if (!groupMessagingEnabled && index < messages.length - 1) {
                            return new Promise((resolve, reject): any => {
                                setTimeout(resolve, 1000);
                            });
                        }
                    });
                });
            });

            return promise;
        }).then((errors) => {
            return this.handleSyncErrors(conversationId, userId, errors, warnings);
        }).then(() => {
            // All done, return the warnings.
            return warnings;
        });

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Handle sync errors.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @param errors List of errors.
     * @param warnings Array where to place the warnings.
     * @return Promise resolved when done.
     */
    protected handleSyncErrors(conversationId: number, userId: number, errors: any[], warnings: any[]): Promise<any> {
        if (errors && errors.length) {
            if (conversationId) {

                // Get conversation name and add errors to warnings array.
                return this.messagesProvider.getConversation(conversationId, false, false).catch(() => {
                    // Ignore errors.
                    return <AddonMessagesConversationFormatted> {};
                }).then((conversation) => {
                    errors.forEach((error) => {
                        warnings.push(this.translate.instant('addon.messages.warningconversationmessagenotsent', {
                            conversation: conversation.name ? conversation.name : conversationId,
                            error: this.textUtils.getErrorMessageFromError(error)
                        }));
                    });
                });
            } else {

                // Get user full name and add errors to warnings array.
                return this.userProvider.getProfile(userId, undefined, true).catch(() => {
                    // Ignore errors.
                    return {};
                }).then((user) => {
                    errors.forEach((error) => {
                        warnings.push(this.translate.instant('addon.messages.warningmessagenotsent', {
                            user: user.fullname ? user.fullname : userId,
                            error: this.textUtils.getErrorMessageFromError(error)
                        }));
                    });
                });
            }
        }
    }

    /**
     * If there's an ongoing sync for a certain conversation, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when there's no sync going on for the identifier.
     */
    waitForSyncConversation(conversationId: number, userId: number, siteId?: string): Promise<any> {
        const syncId = this.getSyncId(conversationId, userId);

        return this.waitForSync(syncId, siteId);
    }
}
