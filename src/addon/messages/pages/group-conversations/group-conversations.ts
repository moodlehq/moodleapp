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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, Platform, NavController, NavParams, Content } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from '../../providers/messages';
import { AddonMessagesOfflineProvider } from '../../providers/messages-offline';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Page that displays the list of conversations, including group conversations.
 */
@IonicPage({ segment: 'addon-messages-group-conversations' })
@Component({
    selector: 'page-addon-messages-group-conversations',
    templateUrl: 'group-conversations.html',
})
export class AddonMessagesGroupConversationsPage implements OnInit, OnDestroy {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;
    @ViewChild(Content) content: Content;
    @ViewChild('favlist') favListEl: ElementRef;
    @ViewChild('grouplist') groupListEl: ElementRef;
    @ViewChild('indlist') indListEl: ElementRef;

    loaded = false;
    loadingMessage: string;
    selectedConversationId: number;
    selectedUserId: number;
    contactRequestsCount = 0;
    favourites: any = {
        type: null,
        favourites: true,
        count: 0,
        unread: 0
    };
    group: any = {
        type: AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP,
        favourites: false,
        count: 0,
        unread: 0
    };
    individual: any = {
        type: AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_INDIVIDUAL,
        favourites: false,
        count: 0,
        unread: 0
    };
    typeGroup = AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP;
    currentListEl: HTMLElement;

    protected loadingString: string;
    protected siteId: string;
    protected currentUserId: number;
    protected conversationId: number;
    protected discussionUserId: number;
    protected newMessagesObserver: any;
    protected pushObserver: any;
    protected appResumeSubscription: any;
    protected readChangedObserver: any;
    protected cronObserver: any;
    protected openConversationObserver: any;
    protected updateConversationListObserver: any;
    protected contactRequestsCountObserver: any;
    protected memberInfoObserver: any;

    constructor(eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider, translate: TranslateService,
            private messagesProvider: AddonMessagesProvider, private domUtils: CoreDomUtilsProvider, navParams: NavParams,
            private navCtrl: NavController, platform: Platform, private utils: CoreUtilsProvider,
            pushNotificationsDelegate: CorePushNotificationsDelegate, private messagesOffline: AddonMessagesOfflineProvider,
            private userProvider: CoreUserProvider) {

        this.loadingString = translate.instant('core.loading');
        this.siteId = sitesProvider.getCurrentSiteId();
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        // Conversation to load.
        this.conversationId = navParams.get('conversationId') || false;
        this.discussionUserId = !this.conversationId && (navParams.get('discussionUserId') || false);

        // Update conversations when new message is received.
        this.newMessagesObserver = eventsProvider.on(AddonMessagesProvider.NEW_MESSAGE_EVENT, (data) => {
            // Check if the new message belongs to the option that is currently expanded.
            const expandedOption = this.getExpandedOption(),
                messageOption = this.getConversationOption(data);

            if (expandedOption != messageOption) {
                return; // Message doesn't belong to current list, stop.
            }

            // Search the conversation to update.
            const conversation = this.findConversation(data.conversationId, data.userId, expandedOption);

            if (typeof conversation == 'undefined') {
                // Probably a new conversation, refresh the list.
                this.loaded = false;
                this.refreshData().finally(() => {
                    this.loaded = true;
                });
            } else if (conversation.lastmessage != data.message || conversation.lastmessagedate != data.timecreated / 1000) {
                const isNewer = data.timecreated / 1000 > conversation.lastmessagedate;

                // An existing conversation has a new message, update the last message.
                conversation.lastmessage = data.message;
                conversation.lastmessagedate = data.timecreated / 1000;

                // Sort the affected list.
                const option = this.getConversationOption(conversation);
                option.conversations = this.messagesProvider.sortConversations(option.conversations);

                if (isNewer) {
                    // The last message is newer than the previous one, scroll to top to keep viewing the conversation.
                    this.domUtils.scrollToTop(this.content);
                }
            }
        }, this.siteId);

        // Update conversations when a message is read.
        this.readChangedObserver = eventsProvider.on(AddonMessagesProvider.READ_CHANGED_EVENT, (data) => {
            if (data.conversationId) {
                const conversation = this.findConversation(data.conversationId);

                if (typeof conversation != 'undefined') {
                    // A conversation has been read reset counter.
                    conversation.unreadcount = 0;

                    // Conversations changed, invalidate them and refresh unread counts.
                    this.messagesProvider.invalidateConversations(this.siteId);
                    this.messagesProvider.refreshUnreadConversationCounts(this.siteId);
                }
            }
        }, this.siteId);

        // Load a discussion if we receive an event to do so.
        this.openConversationObserver = eventsProvider.on(AddonMessagesProvider.OPEN_CONVERSATION_EVENT, (data) => {
            if (data.conversationId || data.userId) {
                this.gotoConversation(data.conversationId, data.userId);
            }
        }, this.siteId);

        // Refresh the view when the app is resumed.
        this.appResumeSubscription = platform.resume.subscribe(() => {
            if (!this.loaded) {
                return;
            }
            this.loaded = false;
            this.refreshData().finally(() => {
                this.loaded = true;
            });
        });

        // Update conversations if we receive an event to do so.
        this.updateConversationListObserver = eventsProvider.on(AddonMessagesProvider.UPDATE_CONVERSATION_LIST_EVENT, (data) => {
            if (data && data.action == 'mute') {
                // If the conversation is displayed, change its muted value.
                const expandedOption = this.getExpandedOption();

                if (expandedOption && expandedOption.conversations) {
                    const conversation = this.findConversation(data.conversationId, undefined, expandedOption);
                    if (conversation) {
                        conversation.ismuted = data.value;
                    }
                }

                return;
            }

            this.refreshData();

        }, this.siteId);

        // If a message push notification is received, refresh the view.
        this.pushObserver = pushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New message received. If it's from current site, refresh the data.
            if (utils.isFalseOrZero(notification.notif) && notification.site == this.siteId) {
                // Don't refresh unread counts, it's refreshed from the main menu handler in this case.
                this.refreshData(null, false);
            }
        });

        // Update unread conversation counts.
        this.cronObserver = eventsProvider.on(AddonMessagesProvider.UNREAD_CONVERSATION_COUNTS_EVENT, (data) => {
            this.favourites.unread = data.favourites;
            this.individual.unread = data.individual + data.self; // Self is only returned if it's not favourite.
            this.group.unread = data.group;
         }, this.siteId);

        // Update the contact requests badge.
        this.contactRequestsCountObserver = eventsProvider.on(AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT, (data) => {
            this.contactRequestsCount = data.count;
        }, this.siteId);

        // Update block status of a user.
        this.memberInfoObserver = eventsProvider.on(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, (data) => {
            if (!data.userBlocked && !data.userUnblocked) {
                // The block status has not changed, ignore.
                return;
            }

            const expandedOption = this.getExpandedOption();
            if (expandedOption == this.individual || expandedOption == this.favourites) {
                if (!expandedOption.conversations || expandedOption.conversations.length <= 0) {
                    return;
                }

                const conversation = this.findConversation(undefined, data.userId, expandedOption);
                if (conversation) {
                    conversation.isblocked = data.userBlocked;
                }
            }
        }, this.siteId);
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        if (this.conversationId || this.discussionUserId) {
            // There is a discussion to load, open the discussion in a new state.
            this.gotoConversation(this.conversationId, this.discussionUserId);
        }

        this.fetchData().then(() => {
            if (!this.conversationId && !this.discussionUserId && this.splitviewCtrl.isOn()) {
                // Load the first conversation.
                let conversation;
                const expandedOption = this.getExpandedOption();

                if (expandedOption) {
                    conversation = expandedOption.conversations[0];
                }

                if (conversation) {
                    this.gotoConversation(conversation.id);
                }
            }
        });
    }

    /**
     * Fetch conversations.
     *
     * @param {booleam} [refreshUnreadCounts=true] Whether to refresh unread counts.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchData(refreshUnreadCounts: boolean = true): Promise<any> {
        this.loadingMessage = this.loadingString;

        // Load the amount of conversations and contact requests.
        const promises = [];

        promises.push(this.fetchConversationCounts());

        // View updated by the events observers.
        promises.push(this.messagesProvider.getContactRequestsCount(this.siteId));
        if (refreshUnreadCounts) {
            promises.push(this.messagesProvider.refreshUnreadConversationCounts(this.siteId));
        }

        return Promise.all(promises).then(() => {
            if (typeof this.favourites.expanded == 'undefined') {
                // The expanded status hasn't been initialized. Do it now.
                if (this.conversationId || this.discussionUserId) {
                    // A certain conversation should be opened.
                    // We don't know which option it belongs to, so we need to fetch the data for all of them.
                    const promises = [];

                    promises.push(this.fetchDataForOption(this.favourites, false));
                    promises.push(this.fetchDataForOption(this.group, false));
                    promises.push(this.fetchDataForOption(this.individual, false));

                    return Promise.all(promises).then(() => {
                        // All conversations have been loaded, find the one we need to load and expand its option.
                        const conversation = this.findConversation(this.conversationId, this.discussionUserId);
                        if (conversation) {
                            const option = this.getConversationOption(conversation);

                            return this.expandOption(option);
                        } else {
                            // Conversation not found, just open the default option.
                            this.calculateExpandedStatus();

                            // Now load the data for the expanded option.
                            return this.fetchDataForExpandedOption();
                        }
                    });
                }

                // No conversation specified or not found, determine which one should be expanded.
                this.calculateExpandedStatus();
            }

            // Now load the data for the expanded option.
            return this.fetchDataForExpandedOption();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingdiscussions', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Calculate which option should be expanded initially.
     */
    protected calculateExpandedStatus(): void {
        this.favourites.expanded = this.favourites.count != 0 && !this.group.unread && !this.individual.unread;
        this.group.expanded = !this.favourites.expanded && this.group.count != 0 && !this.individual.unread;
        this.individual.expanded = !this.favourites.expanded && !this.group.expanded;

        this.loadCurrentListElement();
    }

    /**
     * Fetch data for the expanded option.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchDataForExpandedOption(): Promise<any> {
        const expandedOption = this.getExpandedOption();

        if (expandedOption) {
            return this.fetchDataForOption(expandedOption, false);
        }

        return Promise.resolve();
    }

    /**
     * Fetch data for a certain option.
     *
     * @param {any} option The option to fetch data for.
     * @param {boolean} [loadingMore} Whether we are loading more data or just the first ones.
     * @param {booleam} [getCounts] Whether to get counts data.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchDataForOption(option: any, loadingMore?: boolean, getCounts?: boolean): Promise<void> {
        option.loadMoreError = false;

        const limitFrom = loadingMore ? option.conversations.length : 0,
            promises = [];
        let data,
            offlineMessages;

        // Get the conversations and, if needed, the offline messages. Always try to get the latest data.
        promises.push(this.messagesProvider.invalidateConversations(this.siteId).catch(() => {
            // Shouldn't happen.
        }).then(() => {
            return this.messagesProvider.getConversations(option.type, option.favourites, limitFrom, this.siteId);
        }).then((result) => {
            data = result;
        }));

        if (!loadingMore) {
            promises.push(this.messagesOffline.getAllMessages().then((data) => {
                offlineMessages = data;
            }));
        }

        if (getCounts) {
            promises.push(this.fetchConversationCounts());
            promises.push(this.messagesProvider.refreshUnreadConversationCounts(this.siteId));
        }

        return Promise.all(promises).then(() => {
            if (loadingMore) {
                option.conversations = option.conversations.concat(data.conversations);
                option.canLoadMore = data.canLoadMore;
            } else {
                option.conversations = data.conversations;
                option.canLoadMore = data.canLoadMore;

                if (offlineMessages && offlineMessages.length) {
                    return this.loadOfflineMessages(option, offlineMessages).then(() => {
                        // Sort the conversations, the offline messages could affect the order.
                        option.conversations = this.messagesProvider.sortConversations(option.conversations);
                    });
                }
            }

        });
    }

    /**
     * Fetch conversation counts.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchConversationCounts(): Promise<void> {
        // Always try to get the latest data.
        return this.messagesProvider.invalidateConversationCounts(this.siteId).catch(() => {
            // Shouldn't happen.
        }).then(() => {
            return this.messagesProvider.getConversationCounts(this.siteId);
        }).then((counts) => {
            this.favourites.count = counts.favourites;
            this.individual.count = counts.individual + counts.self; // Self is only returned if it's not favourite.
            this.group.count = counts.group;
        });
    }

    /**
     * Find a conversation in the list of loaded conversations.
     *
     * @param {number} conversationId The conversation ID to search.
     * @param {number} userId User ID to search (if no conversationId).
     * @param {any} [option] The option to search in. If not defined, search in all options.
     * @return {any} Conversation.
     */
    protected findConversation(conversationId: number, userId?: number, option?: any): any {
        if (conversationId) {
            const conversations = option ? (option.conversations || []) : ((this.favourites.conversations || [])
                    .concat(this.group.conversations || []).concat(this.individual.conversations || []));

            return conversations.find((conv) => {
                return conv.id == conversationId;
            });
        }

        const conversations = option ? (option.conversations || []) :
                ((this.favourites.conversations || []).concat(this.individual.conversations || []));

        return conversations.find((conv) => {
            return conv.userid == userId;
        });
    }

    /**
     * Get the option that is currently expanded, undefined if they are all collapsed.
     *
     * @return {any} Option currently expanded.
     */
    protected getExpandedOption(): any {
        if (this.favourites.expanded) {
            return this.favourites;
        } else if (this.group.expanded) {
            return this.group;
        } else if (this.individual.expanded) {
            return this.individual;
        }
    }

    /**
     * Navigate to contacts view.
     */
    gotoContacts(): void {
        this.splitviewCtrl.getMasterNav().push('AddonMessagesContactsPage');
    }

    /**
     * Navigate to a particular conversation.
     *
     * @param {number} conversationId Conversation Id to load.
     * @param {number} userId User of the conversation. Only if there is no conversationId.
     * @param {number} [messageId] Message to scroll after loading the discussion. Used when searching.
     */
    gotoConversation(conversationId: number, userId?: number, messageId?: number): void {
        this.selectedConversationId = conversationId;
        this.selectedUserId = userId;

        const params = {
            conversationId: conversationId,
            userId: userId
        };
        if (messageId) {
            params['message'] = messageId;
        }
        this.splitviewCtrl.push('AddonMessagesDiscussionPage', params);
    }

    /**
     * Navigate to message settings.
     */
    gotoSettings(): void {
        this.splitviewCtrl.push('AddonMessagesSettingsPage');
    }

    /**
     * Function to load more conversations.
     *
     * @param {any} option The option to fetch data for.
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     * @return {Promise<any>} Resolved when done.
     */
    loadMoreConversations(option: any, infiniteComplete?: any): Promise<any> {
        return this.fetchDataForOption(option, true).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingdiscussions', true);
            option.loadMoreError = true;
        }).finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Load offline messages into the conversations.
     *
     * @param {any} option The option where the messages should be loaded.
     * @param {any[]} messages Offline messages.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadOfflineMessages(option: any, messages: any[]): Promise<any> {
        const promises = [];

        messages.forEach((message) => {
            if (message.conversationid) {
                // It's an existing conversation. Search it in the current option.
                let conversation = this.findConversation(message.conversationid, undefined, option);

                if (conversation) {
                    // Check if it's the last message. Offline messages are considered more recent than sent messages.
                    if (typeof conversation.lastmessage === 'undefined' || conversation.lastmessage === null ||
                            !conversation.lastmessagepending || conversation.lastmessagedate <= message.timecreated / 1000) {

                        this.addLastOfflineMessage(conversation, message);
                    }
                } else {
                    // Conversation not found, it could be an old one or the message could belong to another option.
                    conversation = message.conversation || {};
                    conversation.id = message.conversationid;

                    if (this.getConversationOption(conversation) == option) {
                        // Message belongs to current option, add the conversation.
                        this.addLastOfflineMessage(conversation, message);
                        this.addOfflineConversation(conversation);
                    }
                }
            } else if (option == this.individual) {
                // It's a new conversation. Check if we already created it (there is more than one message for the same user).
                const conversation = this.findConversation(undefined, message.touserid, option);

                message.text = message.smallmessage;

                if (conversation) {
                    // Check if it's the last message. Offline messages are considered more recent than sent messages.
                    if (conversation.lastmessagedate <= message.timecreated / 1000) {
                        this.addLastOfflineMessage(conversation, message);
                    }
                } else {
                    // Get the user data and create a new conversation if it belongs to the current option.
                    promises.push(this.userProvider.getProfile(message.touserid, undefined, true).catch(() => {
                        // User not found.
                    }).then((user) => {
                        const conversation = {
                            userid: message.touserid,
                            name: user ? user.fullname : String(message.touserid),
                            imageurl: user ? user.profileimageurl : '',
                            type: AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_INDIVIDUAL
                        };

                        this.addLastOfflineMessage(conversation, message);
                        this.addOfflineConversation(conversation);
                    }));
                }
            }
        });

        return Promise.all(promises);
    }

    /**
     * Add an offline conversation into the right list of conversations.
     *
     * @param {any} conversation Offline conversation to add.
     */
    protected addOfflineConversation(conversation: any): void {
        const option = this.getConversationOption(conversation);
        option.conversations.unshift(conversation);
    }

    /**
     * Add a last offline message into a conversation.
     *
     * @param {any} conversation Conversation where to put the last message.
     * @param {any} message Offline message to add.
     */
    protected addLastOfflineMessage(conversation: any, message: any): void {
        conversation.lastmessage = message.text;
        conversation.lastmessagedate = message.timecreated / 1000;
        conversation.lastmessagepending = true;
        conversation.sentfromcurrentuser = true;
    }

    /**
     * Given a conversation, return its option (favourites, group, individual).
     *
     * @param {any} conversation Conversation to check.
     * @return {any} Option object.
     */
    protected getConversationOption(conversation: any): any {
        if (conversation.isfavourite) {
            return this.favourites;
        } else if (conversation.type == AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP) {
            return this.group;
        } else {
            return this.individual;
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {booleam} [refreshUnreadCounts=true] Whether to refresh unread counts.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshData(refresher?: any, refreshUnreadCounts: boolean = true): Promise<any> {
        // Don't invalidate conversations and so, they always try to get latest data.
        const promises = [
            this.messagesProvider.invalidateContactRequestsCountCache(this.siteId)
        ];

        return this.utils.allPromises(promises).finally(() => {
            return this.fetchData(refreshUnreadCounts).finally(() => {
                if (refresher) {
                    refresher.complete();
                }
            });
        });
    }

    /**
     * Toogle the visibility of an option (expand/collapse).
     *
     * @param {any} option The option to expand/collapse.
     */
    toggle(option: any): void {
        if (option.expanded) {
            // Already expanded, close it.
            option.expanded = false;
            this.loadCurrentListElement();
        } else {
            // Pass getCounts=true to update the counts everytime the user expands an option.
            this.expandOption(option, true).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingdiscussions', true);
            });
        }
    }

    /**
     * Expand a certain option.
     *
     * @param {any} option The option to expand.
     * @param {booleam} [getCounts] Whether to get counts data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected expandOption(option: any, getCounts?: boolean): Promise<any> {
        // Collapse all and expand the right one.
        this.favourites.expanded = false;
        this.group.expanded = false;
        this.individual.expanded = false;

        option.expanded = true;
        option.loading = true;

        return this.fetchDataForOption(option, false, getCounts).then(() => {
            this.loadCurrentListElement();
        }).catch((error) => {
            option.expanded = false;

            return Promise.reject(error);
        }).finally(() => {
            option.loading = false;
        });
    }

    /**
     * Load the current list element based on the expanded list.
     */
    protected loadCurrentListElement(): void {
        if (this.favourites.expanded) {
            this.currentListEl = this.favListEl && this.favListEl.nativeElement;
        } else if (this.group.expanded) {
            this.currentListEl = this.groupListEl && this.groupListEl.nativeElement;
        } else if (this.individual.expanded) {
            this.currentListEl = this.indListEl && this.indListEl.nativeElement;
        } else {
            this.currentListEl = undefined;
        }
    }

    /**
     * Navigate to the search page.
     */
    gotoSearch(): void {
        this.navCtrl.push('AddonMessagesSearchPage');
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.newMessagesObserver && this.newMessagesObserver.off();
        this.appResumeSubscription && this.appResumeSubscription.unsubscribe();
        this.pushObserver && this.pushObserver.unsubscribe();
        this.readChangedObserver && this.readChangedObserver.off();
        this.cronObserver && this.cronObserver.off();
        this.openConversationObserver && this.openConversationObserver.off();
        this.updateConversationListObserver && this.updateConversationListObserver.off();
        this.contactRequestsCountObserver && this.contactRequestsCountObserver.off();
        this.memberInfoObserver && this.memberInfoObserver.off();
    }
}
