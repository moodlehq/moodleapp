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
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreAppProvider } from '../../../providers/app';
import { CoreUserProvider } from '../../../core/user/providers/user';
import { AddonMessagesOfflineProvider } from './messages-offline';

/**
 * Service to handle messages.
 */
@Injectable()
export class AddonMessagesProvider {
    protected ROOT_CACHE_KEY = 'mmaMessages:';
    protected LIMIT_MESSAGES = 50;
    static NEW_MESSAGE_EVENT = 'new_message_event';
    static READ_CHANGED_EVENT = 'read_changed_event';
    static READ_CRON_EVENT = 'read_cron_event';
    static SPLIT_VIEW_LOAD_EVENT = 'split_view_load_event';

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider,
            private userProvider: CoreUserProvider, private messagesOffline: AddonMessagesOfflineProvider) {
        this.logger = logger.getInstance('AddonMessagesProvider');
    }

    /**
     * Get the cache key for contacts.
     *
     * @return {string} Cache key.
     */
    protected getCacheKeyForContacts(): string {
        return this.ROOT_CACHE_KEY + 'contacts';
    }

    /**
     * Get the cache key for the list of discussions.
     *
     * @return {string} Cache key.
     */
    protected getCacheKeyForDiscussions(): string {
        return this.ROOT_CACHE_KEY + 'discussions';
    }

    /**
     * Get the discussions of the current user.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Resolved with an object where the keys are the user ID of the other user.
     */
    getDiscussions(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const discussions = {},
                currentUserId = site.getUserId(),
                params = {
                    useridto: currentUserId,
                    useridfrom: 0,
                    limitnum: this.LIMIT_MESSAGES
                },
                preSets = {
                    cacheKey: this.getCacheKeyForDiscussions()
                };

            /**
             * Convenience function to treat a recent message, adding it to discussions list if needed.
             */
            const treatRecentMessage = (message: any, userId: number, userFullname: string): void => {
                if (typeof discussions[userId] === 'undefined') {
                    discussions[userId] = {
                        fullname: userFullname,
                        profileimageurl: ''
                    };

                    if (!message.timeread && !message.pending && message.useridfrom != currentUserId) {
                        discussions[userId].unread = true;
                    }
                }

                // Extract the most recent message. Pending messages are considered more recent than messages already sent.
                const discMessage = discussions[userId].message;
                if (typeof discMessage === 'undefined' || (!discMessage.pending && message.pending) ||
                        (discMessage.pending == message.pending && (discMessage.timecreated < message.timecreated ||
                        (discMessage.timecreated == message.timecreated && discMessage.id < message.id)))) {

                    discussions[userId].message = {
                        id: message.id,
                        user: userId,
                        message: message.text,
                        timecreated: message.timecreated,
                        pending: message.pending
                    };
                }
            };

            // Get recent messages sent to current user.
            return this.getRecentMessages(params, preSets, undefined, undefined, undefined, site.getId()).then((messages) => {

                // Extract the discussions by filtering same senders.
                messages.forEach((message) => {
                    treatRecentMessage(message, message.useridfrom, message.userfromfullname);
                });

                // Now get the last messages sent by the current user.
                params.useridfrom = params.useridto;
                params.useridto = 0;

                return this.getRecentMessages(params, preSets);
            }).then((messages) => {

                // Extract the discussions by filtering same senders.
                messages.forEach((message) => {
                    treatRecentMessage(message, message.useridto, message.usertofullname);
                });

                // Now get unsent messages.
                return this.messagesOffline.getAllMessages(site.getId());
            }).then((offlineMessages) => {
                offlineMessages.forEach((message) => {
                    message.pending = true;
                    message.text = message.smallmessage;
                    treatRecentMessage(message, message.touserid, '');
                });

                return this.getDiscussionsUserImg(discussions, site.getId()).then((discussions) => {
                    this.storeUsersFromDiscussions(discussions);

                    return discussions;
                });
            });
        });
    }

    /**
     * Get user images for all the discussions that don't have one already.
     *
     * @param {any} discussions List of discussions.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}             Promise always resolved. Resolve param is the formatted discussions.
     */
    protected getDiscussionsUserImg(discussions: any, siteId?: string): Promise<any> {
        const promises = [];

        for (const userId in discussions) {
            if (!discussions[userId].profileimageurl) {
                // We don't have the user image. Try to retrieve it.
                promises.push(this.userProvider.getProfile(discussions[userId].message.user, 0, true, siteId).then((user) => {
                    discussions[userId].profileimageurl = user.profileimageurl;
                }).catch(() => {
                    // Error getting profile, resolve promise without adding any extra data.
                }));
            }
        }

        return Promise.all(promises).then(() => {
            return discussions;
        });
    }

    /**
     * Get messages according to the params.
     *
     * @param  {any} params            Parameters to pass to the WS.
     * @param  {any} preSets           Set of presets for the WS.
     * @param  {boolean} [toDisplay=true] True if messages will be displayed to the user, either in view or in a notification.
     * @param  {string} [siteId]          Site ID. If not defined, use current site.
     * @return {Promise<any>}
     */
    protected getMessages(params: any, preSets: any, toDisplay: boolean = true, siteId?: string): Promise<any> {
        params['type'] = 'conversations';
        params['newestfirst'] = 1;

        return this.sitesProvider.getSite(siteId).then((site) => {
            const userId = site.getUserId();

            return site.read('core_message_get_messages', params, preSets).then((response) => {
                response.messages.forEach((message) => {
                    message.read = params.read == 0 ? 0 : 1;
                    // Convert times to milliseconds.
                    message.timecreated = message.timecreated ? message.timecreated * 1000 : 0;
                    message.timeread = message.timeread ? message.timeread * 1000 : 0;
                });

                if (toDisplay && this.appProvider.isDesktop() && !params.read && params.useridto == userId &&
                        params.limitfrom === 0) {
                    // Store the last unread received messages. Don't block the user for this.
                    // @todo
                    // this.storeLastReceivedMessageIfNeeded(params.useridfrom, response.messages[0], site.getId());
                }

                return response;
            });
        });
    }

    /**
     * Get the most recent messages.
     *
     * @param  {any} params              Parameters to pass to the WS.
     * @param  {any} preSets             Set of presets for the WS.
     * @param  {number} [limitFromUnread=0] Number of read messages already fetched, so fetch will be done from this number.
     * @param  {number} [limitFromRead=0]   Number of unread messages already fetched, so fetch will be done from this number.
     * @param  {boolean} [toDisplay=true]   True if messages will be displayed to the user, either in view or in a notification.
     * @param  {string} [siteId]            Site ID. If not defined, use current site.
     * @return {Promise<any>}
     */
    protected getRecentMessages(params: any, preSets: any, limitFromUnread: number = 0, limitFromRead: number = 0,
            toDisplay: boolean = true, siteId?: string): Promise<any> {
        limitFromUnread = limitFromUnread || 0;
        limitFromRead = limitFromRead || 0;

        params['read'] = 0;
        params['limitfrom'] = limitFromUnread;

        return this.getMessages(params, preSets, toDisplay, siteId).then((response) => {
            let messages = response.messages;
            if (messages) {
                if (messages.length >= params.limitnum) {
                    return messages;
                }

                // We need to fetch more messages.
                params.limitnum = params.limitnum - messages.length;
                params.read = 1;
                params.limitfrom = limitFromRead;

                return this.getMessages(params, preSets, toDisplay, siteId).then((response) => {
                    if (response.messages) {
                        messages = messages.concat(response.messages);
                    }

                    return messages;
                }).catch(() => {
                    return messages;
                });

            } else {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Invalidate contacts cache.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Resolved when done.
     */
    invalidateContactsCache(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForContacts());
        });
    }

    /**
     * Invalidate discussions cache.
     *
     * Note that {@link this.getDiscussions} uses the contacts, so we need to invalidate contacts too.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Resolved when done.
     */
    invalidateDiscussionsCache(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForDiscussions()).then(() => {
                return this.invalidateContactsCache(site.getId());
            });
        });
    }

    /**
     * Returns whether or not the plugin is enabled in a certain site.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.canUseAdvancedFeature('messaging');
        });
    }

    /**
     * Returns whether or not we can search messages.
     *
     * @return {boolean}
     * @since  3.2
     */
    isSearchMessagesEnabled(): boolean {
        return this.sitesProvider.getCurrentSite().wsAvailable('core_message_data_for_messagearea_search_messages');
    }

    /**
     * Search for all the messges with a specific text.
     *
     * @param  {string} query         The query string
     * @param  {number} [userId]      The user ID. If not defined, current user.
     * @param  {number} [from=0]     Position of the first result to get. Defaults to 0.
     * @param  {number} [limit]       Number of results to get. Defaults to LIMIT_MESSAGES.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}              Promise resolved with the results.
     */
    searchMessages(query: string, userId?: number, from: number = 0, limit: number = this.LIMIT_MESSAGES, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const param = {
                    userid: userId || site.getUserId(),
                    search: query,
                    limitfrom: from,
                    limitnum: limit
                },
                preSets = {
                    getFromCache: false // Always try to get updated data. If it fails, it will get it from cache.
                };

            return site.read('core_message_data_for_messagearea_search_messages', param, preSets).then((searchResults) => {
                return searchResults.contacts;
            });
        });
    }

    /**
     * Store user data from discussions in local DB.
     *
     * @param {any} discussions List of discussions.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    protected storeUsersFromDiscussions(discussions: any, siteId?: string): void {
        const users = [];
        for (const userId in discussions) {
            if (typeof userId != 'undefined' && !isNaN(parseInt(userId))) {
                users.push({
                    id: userId,
                    fullname: discussions[userId].fullname,
                    profileimageurl: discussions[userId].profileimageurl
                });
            }
        }
        this.userProvider.storeUsers(users, siteId);
    }
}
