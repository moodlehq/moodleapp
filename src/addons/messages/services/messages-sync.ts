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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import {
    AddonMessagesOffline, AddonMessagesOfflineAnyMessagesFormatted,
} from './messages-offline';
import {
    AddonMessagesProvider,
    AddonMessages,
    AddonMessagesGetMessagesWSParams,
} from './messages';
import { CoreEvents } from '@singletons/events';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreSites } from '@services/sites';
import { CoreNetwork } from '@services/network';
import { CoreConstants } from '@/core/constants';
import { CoreUser } from '@features/user/services/user';
import { CoreError } from '@classes/errors/error';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreWait } from '@singletons/wait';
import { CoreErrorHelper, CoreErrorObject } from '@services/error-helper';

/**
 * Service to sync messages.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesSyncProvider extends CoreSyncBaseProvider<AddonMessagesSyncEvents> {

    static readonly AUTO_SYNCED = 'addon_messages_autom_synced';

    constructor() {
        super('AddonMessagesSync');
    }

    /**
     * Get the ID of a discussion sync.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @returns Sync ID.
     */
    protected getSyncId(conversationId?: number, userId?: number): string {
        if (conversationId) {
            return 'conversationid:' + conversationId;
        } else if (userId) {
            return 'userid:' + userId;
        } else {
            // Should not happen.
            throw new CoreError('Incorrect messages sync id.');
        }
    }

    /**
     * Try to synchronize all the discussions in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param onlyDeviceOffline True to only sync discussions that failed because device was offline,
     *                          false to sync all.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllDiscussions(siteId?: string, onlyDeviceOffline: boolean = false): Promise<void> {
        const syncFunctionLog = 'all discussions' + (onlyDeviceOffline ? ' (Only offline)' : '');

        return this.syncOnSites(syncFunctionLog, (siteId) => this.syncAllDiscussionsFunc(onlyDeviceOffline, siteId), siteId);
    }

    /**
     * Get all messages pending to be sent in the site.
     *
     * @param onlyDeviceOffline True to only sync discussions that failed because device was offline.
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllDiscussionsFunc(onlyDeviceOffline: boolean, siteId: string): Promise<void> {
        const userIds: number[] = [];
        const conversationIds: number[] = [];
        const promises: Promise<void>[] = [];

        const messages = onlyDeviceOffline
            ? await AddonMessagesOffline.getAllDeviceOfflineMessages(siteId)
            : await AddonMessagesOffline.getAllMessages(siteId);

        // Get all the conversations to be synced.
        messages.forEach((message) => {
            if ('conversationid' in message) {
                if (conversationIds.indexOf(message.conversationid) == -1) {
                    conversationIds.push(message.conversationid);
                }
            } else if (userIds.indexOf(message.touserid) == -1) {
                userIds.push(message.touserid);
            }
        });

        // Sync all conversations.
        conversationIds.forEach((conversationId) => {
            promises.push(this.syncDiscussion(conversationId, undefined, siteId).then((result) => {
                if (result === undefined) {
                    return;
                }

                // Sync successful, send event.
                CoreEvents.trigger(AddonMessagesSyncProvider.AUTO_SYNCED, result, siteId);

                return;
            }));
        });

        userIds.forEach((userId) => {
            promises.push(this.syncDiscussion(undefined, userId, siteId).then((result) => {
                if (result === undefined) {
                    return;
                }

                // Sync successful, send event.
                CoreEvents.trigger(AddonMessagesSyncProvider.AUTO_SYNCED, result, siteId);

                return;
            }));
        });

        await Promise.all(promises);
    }

    /**
     * Synchronize a discussion.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @param siteId Site ID.
     * @returns Promise resolved with the list of warnings if sync is successful, rejected otherwise.
     */
    syncDiscussion(conversationId?: number, userId?: number, siteId?: string): Promise<AddonMessagesSyncEvents> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getSyncId(conversationId, userId);

        const currentSyncPromise = this.getOngoingSync(syncId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this conversation, return the promise.
            return currentSyncPromise;
        }

        return this.addOngoingSync(syncId, this.performSyncDiscussion(conversationId, userId, siteId), siteId);
    }

    /**
     * Perform the synchronization of a discussion.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @param siteId Site ID.
     * @returns Promise resolved with the list of warnings if sync is successful, rejected otherwise.
     */
    protected async performSyncDiscussion(
        conversationId: number | undefined,
        userId: number | undefined,
        siteId: string,
    ): Promise<AddonMessagesSyncEvents> {
        const result: AddonMessagesSyncEvents = {
            warnings: [],
            userId,
            conversationId,
        };

        const groupMessagingEnabled = AddonMessages.isGroupMessagingEnabled();
        let messages: AddonMessagesOfflineAnyMessagesFormatted[];
        const errors: (string | CoreError | CoreErrorObject)[] = [];

        if (conversationId) {
            this.logger.debug(`Try to sync conversation '${conversationId}'`);
            messages = await AddonMessagesOffline.getConversationMessages(conversationId, undefined, siteId);
        } else if (userId) {
            this.logger.debug(`Try to sync discussion with user '${userId}'`);
            messages = await AddonMessagesOffline.getMessages(userId, siteId);
        } else {
            // Should not happen.
            throw new CoreError('Incorrect messages sync.');
        }

        if (!messages.length) {
            // Nothing to sync.
            return result;
        } else if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline. Mark messages as device offline.
            AddonMessagesOffline.setMessagesDeviceOffline(messages, true);

            throw new CoreError('Cannot sync in offline. Mark messages as device offline.');
        }

        // Order message by timecreated.
        messages = AddonMessages.sortMessages(messages);

        // Get messages sent by the user after the first offline message was sent.
        // We subtract some time because the message could've been saved in server before it was in the app.
        const timeFrom = Math.floor((messages[0].timecreated - CoreConstants.WS_TIMEOUT - 1000) / 1000);

        const onlineMessages = await this.getMessagesSentAfter(timeFrom, conversationId, userId, siteId);

        // Send the messages. Send them 1 by 1 to simulate web's behaviour and to make sure we know which message has failed.
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            const text = ('text' in message ? message.text : message.smallmessage) || '';
            const textFieldName = conversationId ? 'text' : 'smallmessage';
            const wrappedText = message[textFieldName][0] != '<' ? '<p>' + text + '</p>' : text;

            try {
                if (onlineMessages.indexOf(wrappedText) != -1) {
                    // Message already sent, ignore it to prevent duplicates.
                } else if (conversationId) {
                    await AddonMessages.sendMessageToConversationOnline(conversationId, text, siteId);
                } else if (userId) {
                    await AddonMessages.sendMessageOnline(userId, text, siteId);
                }
            } catch (error) {
                if (!CoreUtils.isWebServiceError(error)) {
                    // Error sending, stop execution.
                    if (CoreNetwork.isOnline()) {
                        // App is online, unmark deviceoffline if marked.
                        AddonMessagesOffline.setMessagesDeviceOffline(messages, false);
                    }

                    throw error;
                }

                // Error returned by WS. Store the error to show a warning but keep sending messages.
                if (errors.indexOf(error) == -1) {
                    errors.push(error);
                }
            }

            // Message was sent, delete it from local DB.
            if (conversationId) {
                await AddonMessagesOffline.deleteConversationMessage(conversationId, text, message.timecreated, siteId);
            } else if (userId) {
                await AddonMessagesOffline.deleteMessage(userId, text, message.timecreated, siteId);
            }

            // In some Moodle versions, wait 1 second to make sure timecreated is different.
            // This is because there was a bug where messages with the same timecreated had a wrong order.
            if (!groupMessagingEnabled && i < messages.length - 1) {
                await CoreWait.wait(1000);
            }
        }

        await this.handleSyncErrors(conversationId, userId, errors, result.warnings);

        // All done, return the warnings.
        return result;
    }

    /**
     * Get messages sent by current user after a certain time.
     *
     * @param time Time in seconds.
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @param siteId Site ID.
     * @returns Promise resolved with the messages texts.
     */
    protected async getMessagesSentAfter(
        time: number,
        conversationId?: number,
        userId?: number,
        siteId?: string,
    ): Promise<string[]> {
        const site = await CoreSites.getSite(siteId);

        const siteCurrentUserId = site.getUserId();

        if (conversationId) {
            try {
                const result = await AddonMessages.getConversationMessages(conversationId, {
                    excludePending: true,
                    ignoreCache: true,
                    timeFrom: time,
                });

                const sentMessages = result.messages.filter((message) => message.useridfrom == siteCurrentUserId);

                return sentMessages.map((message) => message.text);
            } catch (error) {
                if (error && error.errorcode == 'invalidresponse') {
                    // There's a bug in Moodle that causes this error if there are no new messages. Return empty array.
                    return [];
                }

                throw error;
            }
        } else if (userId) {
            const params: AddonMessagesGetMessagesWSParams = {
                useridto: userId,
                useridfrom: siteCurrentUserId,
                limitnum: AddonMessagesProvider.LIMIT_MESSAGES,
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: AddonMessages.getCacheKeyForDiscussion(userId),
                getFromCache: false,
                emergencyCache: false,
            };

            const messages = await AddonMessages.getRecentMessages(params, preSets, 0, 0, false, siteId);

            time = time * 1000; // Convert to milliseconds.
            const messagesAfterTime = messages.filter((message) => message.timecreated >= time);

            return messagesAfterTime.map((message) => message.text);
        } else {
            throw new CoreError('Incorrect messages sync identifier');
        }
    }

    /**
     * Handle sync errors.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @param errors List of errors.
     * @param warnings Array where to place the warnings.
     * @returns Promise resolved when done.
     */
    protected async handleSyncErrors(
        conversationId?: number,
        userId?: number,
        errors: (string | CoreError | CoreErrorObject)[] = [],
        warnings: string[] = [],
    ): Promise<void> {
        if (!errors || errors.length <= 0) {
            return;
        }

        if (conversationId) {
            let conversationIdentifier = String(conversationId);
            try {
                // Get conversation name and add errors to warnings array.
                const conversation = await AddonMessages.getConversation(conversationId, false, false);
                conversationIdentifier = conversation.name || String(conversationId);
            } catch {
                // Ignore errors.
            }

            errors.forEach((error) => {
                warnings.push(Translate.instant('addon.messages.warningconversationmessagenotsent', {
                    conversation: conversationIdentifier,
                    error: CoreErrorHelper.getErrorMessageFromError(error),
                }));
            });
        } else if (userId) {

            // Get user full name and add errors to warnings array.
            let userIdentifier = String(userId);
            try {
                const user = await CoreUser.getProfile(userId, undefined, true);
                userIdentifier = user.fullname;
            } catch {
                // Ignore errors.
            }

            errors.forEach((error) => {
                warnings.push(Translate.instant('addon.messages.warningmessagenotsent', {
                    user: userIdentifier,
                    error: CoreErrorHelper.getErrorMessageFromError(error),
                }));
            });
        }
    }

    /**
     * If there's an ongoing sync for a certain conversation, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID talking to (if no conversation ID).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when there's no sync going on for the identifier.
     */
    waitForSyncConversation(
        conversationId?: number,
        userId?: number,
        siteId?: string,
    ): Promise<AddonMessagesSyncEvents | undefined> {
        const syncId = this.getSyncId(conversationId, userId);

        return this.waitForSync(syncId, siteId);
    }

}

export const AddonMessagesSync = makeSingleton(AddonMessagesSyncProvider);

export type AddonMessagesSyncEvents = {
    warnings: string[];
    conversationId?: number;
    userId?: number;
};
