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

import { Component, OnDestroy, ViewChild, Optional } from '@angular/core';
import { IonicPage, NavParams, NavController, Content, ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from '../../providers/messages';
import { AddonMessagesOfflineProvider } from '../../providers/messages-offline';
import { AddonMessagesSyncProvider } from '../../providers/sync';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreAppProvider } from '@providers/app';
import { coreSlideInOut } from '@classes/animations';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreInfiniteLoadingComponent } from '@components/infinite-loading/infinite-loading';
import { Md5 } from 'ts-md5/dist/md5';
import * as moment from 'moment';

/**
 * Page that displays a message discussion page.
 */
@IonicPage({ segment: 'addon-messages-discussion' })
@Component({
    selector: 'page-addon-messages-discussion',
    templateUrl: 'discussion.html',
    animations: [coreSlideInOut]
})
export class AddonMessagesDiscussionPage implements OnDestroy {
    @ViewChild(Content) content: Content;
    @ViewChild(CoreInfiniteLoadingComponent) infinite: CoreInfiniteLoadingComponent;

    siteId: string;
    protected fetching: boolean;
    protected polling;
    protected logger;

    protected unreadMessageFrom = 0;
    protected messagesBeingSent = 0;
    protected pagesLoaded = 1;
    protected lastMessage = {text: '', timecreated: 0};
    protected keepMessageMap = {};
    protected syncObserver: any;
    protected oldContentHeight = 0;
    protected keyboardObserver: any;
    protected scrollBottom = true;
    protected viewDestroyed = false;
    protected memberInfoObserver: any;
    protected showLoadingModal = false; // Whether to show a loading modal while fetching data.

    conversationId: number; // Conversation ID. Undefined if it's a new individual conversation.
    conversation: any; // The conversation object (if it exists).
    userId: number; // User ID you're talking to (only if group messaging not enabled or it's a new individual conversation).
    currentUserId: number;
    title: string;
    showInfo: boolean;
    conversationImage: string;
    loaded = false;
    showKeyboard = false;
    canLoadMore = false;
    loadMoreError = false;
    messages = [];
    showDelete = false;
    canDelete = false;
    groupMessagingEnabled: boolean;
    isGroup = false;
    members: any = {}; // Members that wrote a message, indexed by ID.
    favouriteIcon = 'fa-star';
    favouriteIconSlash = false;
    deleteIcon = 'trash';
    blockIcon = 'close-circle';
    addRemoveIcon = 'person';
    otherMember: any; // Other member information (individual conversations only).
    footerType: 'message' | 'blocked' | 'requiresContact' | 'requestSent' | 'requestReceived' | 'unable';
    requestContactSent = false;
    requestContactReceived = false;
    isSelf = false;
    muteEnabled = false;
    muteIcon = 'volume-off';

    constructor(private eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider, navParams: NavParams,
            private userProvider: CoreUserProvider, private navCtrl: NavController, private messagesSync: AddonMessagesSyncProvider,
            private domUtils: CoreDomUtilsProvider, private messagesProvider: AddonMessagesProvider, logger: CoreLoggerProvider,
            private utils: CoreUtilsProvider, private appProvider: CoreAppProvider, private translate: TranslateService,
            @Optional() private svComponent: CoreSplitViewComponent, private messagesOffline: AddonMessagesOfflineProvider,
            private modalCtrl: ModalController, private textUtils: CoreTextUtilsProvider) {

        this.siteId = sitesProvider.getCurrentSiteId();
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.groupMessagingEnabled = this.messagesProvider.isGroupMessagingEnabled();
        this.muteEnabled = this.messagesProvider.isMuteConversationEnabled();

        this.logger = logger.getInstance('AddonMessagesDiscussionPage');

        this.conversationId = navParams.get('conversationId');
        this.userId = navParams.get('userId');
        this.showKeyboard = navParams.get('showKeyboard');

        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = eventsProvider.on(AddonMessagesSyncProvider.AUTO_SYNCED, (data) => {
            if ((data.userId && data.userId == this.userId) ||
                    (data.conversationId && data.conversationId == this.conversationId)) {
                // Fetch messages.
                this.fetchMessages();

                // Show first warning if any.
                if (data.warnings && data.warnings[0]) {
                    this.domUtils.showErrorModal(data.warnings[0]);
                }
            }
        }, this.siteId);

        // Refresh data if info of a mamber of the conversation have changed.
        this.memberInfoObserver = eventsProvider.on(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, (data) => {
            if (data.userId && (this.members[data.userId] || this.otherMember && data.userId == this.otherMember.id)) {
                this.fetchData();
            }
        }, this.siteId);
    }

    /**
     * Adds a new message to the message list.
     *
     * @param {any} message Message to be added.
     * @param {boolean} [keep=true] If set the keep flag or not.
     */
    protected addMessage(message: any, keep: boolean = true): void {
        /* Create a hash to identify the message. The text of online messages isn't reliable because it can have random data
           like VideoJS ID. Try to use id and fallback to text for offline messages. */
        message.hash = Md5.hashAsciiStr(String(message.id || message.text || '')) + '#' + message.timecreated + '#' +
                message.useridfrom;

        if (typeof this.keepMessageMap[message.hash] === 'undefined') {
            // Message not added to the list. Add it now.
            this.messages.push(message);
        }
        // Message needs to be kept in the list.
        this.keepMessageMap[message.hash] = keep;
    }

    /**
     * Remove a message if it shouldn't be in the list anymore.
     *
     * @param {string} hash Hash of the message to be removed.
     */
    protected removeMessage(hash: any): void {
        if (this.keepMessageMap[hash]) {
            // Selected to keep it, clear the flag.
            this.keepMessageMap[hash] = false;

            return;
        }

        delete this.keepMessageMap[hash];

        const position = this.messages.findIndex((message) => {
            return message.hash == hash;
        });
        if (position >= 0) {
            this.messages.splice(position, 1);
        }
    }

    /**
     * Runs when the page has loaded. This event only happens once per page being created.
     * If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
     * Setup code for the page.
     */
    ionViewDidLoad(): void {
        // Disable the profile button if we're already coming from a profile.
        const backViewPage = this.navCtrl.getPrevious() && this.navCtrl.getPrevious().component.name;
        this.showInfo = !backViewPage || backViewPage !== 'CoreUserProfilePage';

        // Recalculate footer position when keyboard is shown or hidden.
        this.keyboardObserver = this.eventsProvider.on(CoreEventsProvider.KEYBOARD_CHANGE, (kbHeight) => {
            this.content.resize();
        });

        this.fetchData();
    }

    /**
     * Convenience function to fetch the conversation data.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchData(): Promise<any> {
        let loader;
        if (this.showLoadingModal) {
            loader = this.domUtils.showModalLoading();
        }

        if (!this.groupMessagingEnabled && this.userId) {
            // Get the user profile to retrieve the user fullname and image.
            this.userProvider.getProfile(this.userId, undefined, true).then((user) => {
                if (!this.title) {
                    this.title = user.fullname;
                }
                this.conversationImage = user.profileimageurl;
            });
        }

        // Synchronize messages if needed.
        return this.messagesSync.syncDiscussion(this.conversationId, this.userId).catch(() => {
            // Ignore errors.
        }).then((warnings): Promise<any> => {
            if (warnings && warnings[0]) {
                this.domUtils.showErrorModal(warnings[0]);
            }

            if (this.groupMessagingEnabled) {
                // Get the conversation ID if it exists and we don't have it yet.
                return this.getConversation(this.conversationId, this.userId).then((exists) => {
                    const promises = [];

                    if (exists) {
                        // Fetch the messages for the first time.
                        promises.push(this.fetchMessages());
                    }

                    if (this.userId) {
                        // Get the member info. Invalidate first to make sure we get the latest status.
                        promises.push(this.messagesProvider.invalidateMemberInfo(this.userId).catch(() => {
                            // Shouldn't happen.
                        }).then(() => {
                            return this.messagesProvider.getMemberInfo(this.userId);
                        }).then((member) => {
                            this.otherMember = member;
                            if (!exists && member) {
                                this.conversationImage = member.profileimageurl;
                                this.title = member.fullname;
                            }
                            this.blockIcon = this.otherMember && this.otherMember.isblocked ? 'checkmark-circle' : 'close-circle';
                        }));
                    } else {
                        this.otherMember = null;
                    }

                    return Promise.all(promises);
                });
            } else {
                this.otherMember = null;

                // Fetch the messages for the first time.
                return this.fetchMessages().then(() => {
                    if (!this.title && this.messages.length) {
                        // Didn't receive the fullname via argument. Try to get it from messages.
                        // It's possible that name cannot be resolved when no messages were yet exchanged.
                        if (this.messages[0].useridto != this.currentUserId) {
                            this.title = this.messages[0].usertofullname || '';
                        } else {
                            this.title = this.messages[0].userfromfullname || '';
                        }
                    }
                });
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
        }).finally(() => {
            this.checkCanDelete();
            this.resizeContent();
            this.loaded = true;
            this.setPolling(); // Make sure we're polling messages.
            this.setContactRequestInfo();
            this.setFooterType();
            loader && loader.dismiss();
        });
    }

    /**
     * Runs when the page has fully entered and is now the active page.
     * This event will fire, whether it was the first load or a cached page.
     */
    ionViewDidEnter(): void {
        this.setPolling();
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.unsetPolling();
    }

    /**
     * Convenience function to fetch messages.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchMessages(): Promise<any> {
        this.loadMoreError = false;

        if (this.messagesBeingSent > 0) {
            // We do not poll while a message is being sent or we could confuse the user.
            // Otherwise, his message would disappear from the list, and he'd have to wait for the interval to check for messages.
            return Promise.reject(null);
        } else if (this.fetching) {
            // Already fetching.
            return Promise.reject(null);
        } else if (this.groupMessagingEnabled && !this.conversationId) {
            // Don't have enough data to fetch messages.
            return Promise.reject(null);
        }

        if (this.conversationId) {
            this.logger.debug(`Polling new messages for conversation '${this.conversationId}'`);
        } else {
            this.logger.debug(`Polling new messages for discussion with user '${this.userId}'`);
        }

        this.fetching = true;

        // Wait for synchronization process to finish.
        return this.messagesSync.waitForSyncConversation(this.conversationId, this.userId).then(() => {
            // Fetch messages. Invalidate the cache before fetching.
            if (this.groupMessagingEnabled) {
                return this.messagesProvider.invalidateConversationMessages(this.conversationId).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return this.getConversationMessages(this.pagesLoaded);
                });
            } else {
                return this.messagesProvider.invalidateDiscussionCache(this.userId).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return this.getDiscussionMessages(this.pagesLoaded);
                });
            }
        }).then((messages) => {
            this.loadMessages(messages);
        }).finally(() => {
            this.fetching = false;
        });
    }

    /**
     * Format and load a list of messages into the view.
     *
     * @param {any[]} messages Messages to load.
     */
    protected loadMessages(messages: any[]): void {
        if (this.viewDestroyed) {
            return;
        }

        // Check if we are at the bottom to scroll it after render.
        // Use a 5px error margin because in iOS there is 1px difference for some reason.
        this.scrollBottom = Math.abs(this.domUtils.getScrollHeight(this.content) - this.domUtils.getScrollTop(this.content) -
            this.domUtils.getContentHeight(this.content)) < 5;

        if (this.messagesBeingSent > 0) {
            // Ignore polling due to a race condition.
            return;
        }

        // Add new messages to the list and mark the messages that should still be displayed.
        messages.forEach((message) => {
            this.addMessage(message);
        });

        // Remove messages that shouldn't be in the list anymore.
        for (const hash in this.keepMessageMap) {
            this.removeMessage(hash);
        }

        // Sort the messages.
        this.messagesProvider.sortMessages(this.messages);

        // Calculate which messages need to display the date or user data.
        this.messages.forEach((message, index): any => {
            message.showDate = this.showDate(message, this.messages[index - 1]);
            message.showUserData = this.showUserData(message, this.messages[index - 1]);
            message.showTail = this.showTail(message, this.messages[index + 1]);
        });

        // Call resize to recalculate the dimensions.
        this.content && this.content.resize();

        // If we received a new message while using group messaging, force mark messages as read.
        const last = this.messages[this.messages.length - 1],
            forceMark = this.groupMessagingEnabled && last && last.useridfrom != this.currentUserId && this.lastMessage.text != ''
                    && (last.text !== this.lastMessage.text || last.timecreated !== this.lastMessage.timecreated);

        // Notify that there can be a new message.
        this.notifyNewMessage();

        // Mark retrieved messages as read if they are not.
        this.markMessagesAsRead(forceMark);
    }

    /**
     * Get the conversation.
     *
     * @param {number} conversationId Conversation ID.
     * @param {number} userId User ID.
     * @return {Promise<boolean>} Promise resolved with a boolean: whether the conversation exists or not.
     */
    protected getConversation(conversationId: number, userId: number): Promise<boolean> {
        let promise,
            fallbackConversation;

        // Try to get the conversationId if we don't have it.
        if (conversationId) {
            promise = Promise.resolve(conversationId);
        } else {
            if (userId == this.currentUserId && this.messagesProvider.isSelfConversationEnabled()) {
                promise = this.messagesProvider.getSelfConversation();
            } else {
                promise = this.messagesProvider.getConversationBetweenUsers(userId, undefined, true);
            }

            promise = promise.then((conversation) => {
                fallbackConversation = conversation;

                return conversation.id;
            });
        }

        return promise.then((conversationId) => {
            // Retrieve the conversation. Invalidate data first to get the right unreadcount.
            return this.messagesProvider.invalidateConversation(conversationId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.messagesProvider.getConversation(conversationId, undefined, true);
            }).catch((error) => {
                // Get conversation failed, use the fallback one if we have it.
                if (fallbackConversation) {
                    return fallbackConversation;
                }

                return Promise.reject(error);
            }).then((conversation) => {
                this.conversation = conversation;

                if (conversation) {
                    this.conversationId = conversation.id;
                    this.title = conversation.name;
                    this.conversationImage = conversation.imageurl;
                    this.isGroup = conversation.type == AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP;
                    this.favouriteIcon = 'fa-star';
                    this.favouriteIconSlash = conversation.isfavourite;
                    this.muteIcon = conversation.ismuted ? 'volume-up' : 'volume-off';
                    if (!this.isGroup) {
                        this.userId = conversation.userid;
                    }
                    this.isSelf = conversation.type == AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_SELF;

                    return true;
                } else {
                    return false;
                }
            });
        }, (error) => {
            // Probably conversation does not exist or user is offline. Try to load offline messages.
            this.isSelf = userId == this.currentUserId;

            return this.messagesOffline.getMessages(userId).then((messages): any => {
                if (messages && messages.length) {
                    // We have offline messages, this probably means that the conversation didn't exist. Don't display error.
                    messages.forEach((message) => {
                        message.pending = true;
                        message.text = message.smallmessage;
                    });

                    this.loadMessages(messages);
                } else if (error.errorcode != 'errorconversationdoesnotexist') {
                    // Display the error.
                    return Promise.reject(error);
                }

                return false;
            });
        });
    }

    /**
     * Get the messages of the conversation. Used if group messaging is supported.
     *
     * @param {number} pagesToLoad Number of "pages" to load.
     * @param  {number} [offset=0] Offset for message list.
     * @return {Promise<any[]>} Promise resolved with the list of messages.
     */
    protected getConversationMessages(pagesToLoad: number, offset: number = 0): Promise<any[]> {
        const excludePending = offset > 0;

        return this.messagesProvider.getConversationMessages(this.conversationId, excludePending, offset).then((result) => {
            pagesToLoad--;

            // Treat members. Don't use CoreUtilsProvider.arrayToObject because we don't want to override the existing object.
            if (result.members) {
                result.members.forEach((member) => {
                    this.members[member.id] = member;
                });
            }

            if (pagesToLoad > 0 && result.canLoadMore) {
                offset += AddonMessagesProvider.LIMIT_MESSAGES;

                // Get more messages.
                return this.getConversationMessages(pagesToLoad, offset).then((nextMessages) => {
                    return result.messages.concat(nextMessages);
                });
            } else {
                // No more messages to load, return them.
                this.canLoadMore = result.canLoadMore;

                return result.messages;
            }
        });
    }

    /**
     * Get a discussion. Can load several "pages".
     *
     * @param  {number}  pagesToLoad          Number of pages to load.
     * @param  {number}  [lfReceivedUnread=0] Number of unread received messages already fetched, so fetch will be done from this.
     * @param  {number}  [lfReceivedRead=0]   Number of read received messages already fetched, so fetch will be done from this.
     * @param  {number}  [lfSentUnread=0]     Number of unread sent messages already fetched, so fetch will be done from this.
     * @param  {number}  [lfSentRead=0]       Number of read sent messages already fetched, so fetch will be done from this.
     * @return {Promise<any>}  Resolved when done.
     */
    protected getDiscussionMessages(pagesToLoad: number, lfReceivedUnread: number = 0, lfReceivedRead: number = 0,
            lfSentUnread: number = 0, lfSentRead: number = 0): Promise<any> {

        // Only get offline messages if we're loading the first "page".
        const excludePending = lfReceivedUnread > 0 || lfReceivedRead > 0 || lfSentUnread > 0 || lfSentRead > 0;

        // Get next messages.
        return this.messagesProvider.getDiscussion(this.userId, excludePending, lfReceivedUnread, lfReceivedRead, lfSentUnread,
                lfSentRead).then((result) => {

            pagesToLoad--;
            if (pagesToLoad > 0 && result.canLoadMore) {
                // More pages to load. Calculate new limit froms.
                result.messages.forEach((message) => {
                    if (!message.pending) {
                        if (message.useridfrom == this.userId) {
                            if (message.read) {
                                lfReceivedRead++;
                            } else {
                                lfReceivedUnread++;
                            }
                        } else {
                            if (message.read) {
                                lfSentRead++;
                            } else {
                                lfSentUnread++;
                            }
                        }
                    }
                });

                // Get next messages.
                return this.getDiscussionMessages(pagesToLoad, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead)
                        .then((nextMessages) => {
                    return result.messages.concat(nextMessages);
                });
            } else {
                // No more messages to load, return them.
                this.canLoadMore = result.canLoadMore;

                return result.messages;
            }
        });
    }

    /**
     * Mark messages as read.
     */
    protected markMessagesAsRead(forceMark: boolean): void {
        let readChanged = false;
        const promises = [];

        if (this.messagesProvider.isMarkAllMessagesReadEnabled()) {
            let messageUnreadFound = false;

            // Mark all messages at a time if there is any unread message.
            if (forceMark) {
                messageUnreadFound = true;
            } else if (this.groupMessagingEnabled) {
                messageUnreadFound = this.conversation && this.conversation.unreadcount > 0 && this.conversationId > 0;
            } else {
                for (const x in this.messages) {
                    const message = this.messages[x];
                    // If an unread message is found, mark all messages as read.
                    if (message.useridfrom != this.currentUserId && message.read == 0) {
                        messageUnreadFound = true;
                        break;
                    }
                }
            }

            if (messageUnreadFound) {
                this.setUnreadLabelPosition();

                let promise;

                if (this.groupMessagingEnabled) {
                    promise = this.messagesProvider.markAllConversationMessagesRead(this.conversationId);
                } else {
                    promise = this.messagesProvider.markAllMessagesRead(this.userId).then(() => {
                        // Mark all messages as read.
                        this.messages.forEach((message) => {
                            message.read = 1;
                        });
                    });
                }

                promises.push(promise.then(() => {
                    readChanged = true;
                }));
            }
        } else {
            this.setUnreadLabelPosition();
            // Mark each message as read one by one.
            this.messages.forEach((message) => {
                // If the message is unread, call this.messagesProvider.markMessageRead.
                if (message.useridfrom != this.currentUserId && message.read == 0) {
                    promises.push(this.messagesProvider.markMessageRead(message.id).then(() => {
                        readChanged = true;
                        message.read = 1;
                    }));
                }
            });
        }

        Promise.all(promises).finally(() => {
            if (readChanged) {
                this.eventsProvider.trigger(AddonMessagesProvider.READ_CHANGED_EVENT, {
                    conversationId: this.conversationId,
                    userId: this.userId
                }, this.siteId);
            }
        });
    }

    /**
     * Notify the last message found so discussions list controller can tell if last message should be updated.
     */
    protected notifyNewMessage(): void {
        const last = this.messages[this.messages.length - 1];

        let trigger = false;

        if (!last) {
            this.lastMessage = {text: '', timecreated: 0};
            trigger = true;
        } else if (last.text !== this.lastMessage.text || last.timecreated !== this.lastMessage.timecreated) {
            this.lastMessage = {text: last.text, timecreated: last.timecreated};
            trigger = true;
        }

        if (trigger) {
            // Update discussions last message.
            this.eventsProvider.trigger(AddonMessagesProvider.NEW_MESSAGE_EVENT, {
                conversationId: this.conversationId,
                userId: this.userId,
                message: this.lastMessage.text,
                timecreated: this.lastMessage.timecreated,
                isfavourite: this.conversation && this.conversation.isfavourite,
                type: this.conversation && this.conversation.type
            }, this.siteId);

            // Update navBar links and buttons.
            const newCanDelete = (last && last.id && this.messages.length == 1) || this.messages.length > 1;
            if (this.canDelete != newCanDelete) {
                this.checkCanDelete();
            }
        }
    }

    /**
     * Set the place where the unread label position has to be.
     */
    protected setUnreadLabelPosition(): void {
        if (this.unreadMessageFrom != 0) {
            return;
        }

        if (this.groupMessagingEnabled) {
            // Use the unreadcount from the conversation to calculate where should the label be placed.
            if (this.conversation && this.conversation.unreadcount > 0 && this.messages) {
                // Iterate over messages to find the right message using the unreadcount. Skip offline messages and own messages.
                let found = 0;

                for (let i = this.messages.length - 1; i >= 0; i--) {
                    const message = this.messages[i];
                    if (!message.pending && message.useridfrom != this.currentUserId) {
                        found++;
                        if (found == this.conversation.unreadcount) {
                            this.unreadMessageFrom = parseInt(message.id, 10);
                            break;
                        }
                    }
                }
            }
        } else {
            let previousMessageRead = false;

            for (const x in this.messages) {
                const message = this.messages[x];
                if (message.useridfrom != this.currentUserId) {
                    const unreadFrom = message.read == 0 && previousMessageRead;

                    if (unreadFrom) {
                        // Save where the label is placed.
                        this.unreadMessageFrom = parseInt(message.id, 10);
                        break;
                    }

                    previousMessageRead = message.read != 0;
                }
            }
        }

        // Do not update the message unread from label on next refresh.
        if (this.unreadMessageFrom == 0) {
            // Using negative to indicate the label is not placed but should not be placed.
            this.unreadMessageFrom = -1;
        }
    }

    /**
     * Check if there's any message in the list that can be deleted.
     */
    protected checkCanDelete(): void {
        // All messages being sent should be at the end of the list.
        const first = this.messages[0];
        this.canDelete = first && !first.sending;
    }

    /**
     * Hide unread label when sending messages.
     */
    protected hideUnreadLabel(): void {
        if (this.unreadMessageFrom > 0) {
            this.unreadMessageFrom = -1;
        }
    }

    /**
     * Wait until fetching is false.
     * @return {Promise<void>} Resolved when done.
     */
    protected waitForFetch(): Promise<void> {
        if (!this.fetching) {
            return Promise.resolve();
        }

        const deferred = this.utils.promiseDefer();

        setTimeout(() => {
            return this.waitForFetch().finally(() => {
                deferred.resolve();
            });
        }, 400);

        return deferred.promise;
    }

    /**
     * Set a polling to get new messages every certain time.
     */
    protected setPolling(): void {
        if (this.groupMessagingEnabled && !this.conversationId) {
            // Don't have enough data to poll messages.
            return;
        }

        if (!this.polling) {
            // Start polling.
            this.polling = setInterval(() => {
                this.fetchMessages().catch(() => {
                    // Ignore errors.
                });
            }, AddonMessagesProvider.POLL_INTERVAL);
        }
    }

    /**
     * Unset polling.
     */
    protected unsetPolling(): void {
        if (this.polling) {
            this.logger.debug(`Cancelling polling for conversation with user '${this.userId}'`);
            clearInterval(this.polling);
            this.polling = undefined;
        }
    }

    /**
     * Copy message to clipboard.
     *
     * @param {any} message Message to be copied.
     */
    copyMessage(message: any): void {
        const text = this.textUtils.decodeHTMLEntities(message.smallmessage || message.text || '');
        this.utils.copyToClipboard(text);
    }

    /**
     * Function to delete a message.
     *
     * @param {any} message  Message object to delete.
     * @param {number} index Index where the message is to delete it from the view.
     */
    deleteMessage(message: any, index: number): void {
        const canDeleteAll = this.conversation && this.conversation.candeletemessagesforallusers,
            langKey = message.pending || canDeleteAll || this.isSelf ? 'core.areyousure' :
                    'addon.messages.deletemessageconfirmation',
            options: any = {};

        if (canDeleteAll && !message.pending) {
            // Show delete for all checkbox.
            options.inputs = [{
                type: 'checkbox',
                name: 'deleteforall',
                checked: false,
                value: true,
                label: this.translate.instant('addon.messages.deleteforeveryone')
            }];
        }

        this.domUtils.showConfirm(this.translate.instant(langKey), undefined, undefined, undefined, options).then((data) => {
            const modal = this.domUtils.showModalLoading('core.deleting', true);

            return this.messagesProvider.deleteMessage(message, data && data[0]).then(() => {
                 // Remove message from the list without having to wait for re-fetch.
                this.messages.splice(index, 1);
                this.removeMessage(message.hash);
                this.notifyNewMessage();

                this.fetchMessages(); // Re-fetch messages to update cached data.
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errordeletemessage', true);
        });
    }

    /**
     * Function to load previous messages.
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     * @return {Promise<any>} Resolved when done.
     */
    loadPrevious(infiniteComplete?: any): Promise<any> {
        let infiniteHeight = this.infinite ? this.infinite.getHeight() : 0;
        const scrollHeight = this.domUtils.getScrollHeight(this.content);

        // If there is an ongoing fetch, wait for it to finish.
        return this.waitForFetch().finally(() => {
            this.pagesLoaded++;

            this.fetchMessages().then(() => {

                // Try to keep the scroll position.
                const scrollBottom = scrollHeight - this.domUtils.getScrollTop(this.content);

                if (this.canLoadMore && infiniteHeight && this.infinite) {
                    // The height of the infinite is different while spinner is shown. Add that difference.
                    infiniteHeight = infiniteHeight - this.infinite.getHeight();
                } else if (!this.canLoadMore) {
                    // Can't load more, take into account the full height of the infinite loading since it will disappear now.
                    infiniteHeight = infiniteHeight || (this.infinite ? this.infinite.getHeight() : 0);
                }

                this.keepScroll(scrollHeight, scrollBottom, infiniteHeight);
            }).catch((error) => {
                this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
                this.pagesLoaded--;
                this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
            }).finally(() => {
                infiniteComplete && infiniteComplete();
            });
        });
    }

    /**
     * Keep scroll position after loading previous messages.
     * We don't use resizeContent because the approach used is different and it isn't easy to calculate these positions.
     */
    protected keepScroll(oldScrollHeight: number, oldScrollBottom: number, infiniteHeight: number, retries?: number): void {
        retries = retries || 0;

        setTimeout(() => {
            const newScrollHeight = this.domUtils.getScrollHeight(this.content);

            if (newScrollHeight == oldScrollHeight) {
                // Height hasn't changed yet. Retry if max retries haven't been reached.
                if (retries <= 10) {
                    this.keepScroll(oldScrollHeight, oldScrollBottom, infiniteHeight, retries + 1);
                }

                return;
            }

            const scrollTo = newScrollHeight - oldScrollBottom + infiniteHeight;

            this.domUtils.scrollTo(this.content, 0, scrollTo, 0);
        }, 30);
    }

    /**
     * Content or scroll has been resized. For content, only call it if it's been added on top.
     */
    resizeContent(): void {
        let top = this.content.getContentDimensions().scrollTop;
        this.content.resize();

        // Wait for new content height to be calculated.
        setTimeout(() => {
            // Visible content size changed, maintain the bottom position.
            if (!this.viewDestroyed && this.content && this.domUtils.getContentHeight(this.content) != this.oldContentHeight) {
                if (!top) {
                    top = this.content.getContentDimensions().scrollTop;
                }

                top += this.oldContentHeight - this.domUtils.getContentHeight(this.content);
                this.oldContentHeight = this.domUtils.getContentHeight(this.content);

                this.domUtils.scrollTo(this.content, 0, top, 0);
            }
        });
    }

    /**
     * Scroll bottom when render has finished.
     */
    scrollToBottom(): void {
        // Check if scroll is at bottom. If so, scroll bottom after rendering since there might be something new.
        if (this.scrollBottom) {
             // Need a timeout to leave time to the view to be rendered.
            setTimeout(() => {
                if (!this.viewDestroyed) {
                    this.domUtils.scrollToBottom(this.content, 0);
                }
            });
            this.scrollBottom = false;
        }
    }

    /**
     * Sends a message to the server.
     *
     * @param {string} text Message text.
     */
    sendMessage(text: string): void {
        let message;

        this.hideUnreadLabel();

        this.showDelete = false;
        this.scrollBottom = true;

        message = {
            pending: true,
            sending: true,
            useridfrom: this.currentUserId,
            smallmessage: text,
            text: text,
            timecreated: new Date().getTime()
        };
        message.showDate = this.showDate(message, this.messages[this.messages.length - 1]);
        this.addMessage(message, false);

        this.messagesBeingSent++;

        // If there is an ongoing fetch, wait for it to finish.
        // Otherwise, if a message is sent while fetching it could disappear until the next fetch.
        this.waitForFetch().finally(() => {
            let promise;

            if (this.conversationId) {
                promise = this.messagesProvider.sendMessageToConversation(this.conversation, text);
            } else {
                promise = this.messagesProvider.sendMessage(this.userId, text);
            }

            promise.then((data) => {
                let promise;

                this.messagesBeingSent--;

                if (data.sent) {
                    if (!this.conversationId && data.message && data.message.conversationid) {
                        // Message sent to a new conversation, try to load the conversation.
                        promise = this.getConversation(data.message.conversationid, this.userId).then(() => {
                            // Now fetch messages.
                            return this.fetchMessages();
                        }).finally(() => {
                            // Start polling messages now that the conversation exists.
                            this.setPolling();
                        });
                    } else {
                        // Message was sent, fetch messages right now.
                        promise = this.fetchMessages();
                    }
                } else {
                    promise = Promise.reject(null);
                }

                promise.catch(() => {
                    // Fetch failed or is offline message, mark the message as sent.
                    // If fetch is successful there's no need to mark it because the fetch will already show the message received.
                    message.sending = false;
                    if (data.sent) {
                        // Message sent to server, not pending anymore.
                        message.pending = false;
                    } else if (data.message) {
                        message.timecreated = data.message.timecreated;
                    }

                    this.notifyNewMessage();
                });
            }).catch((error) => {
                this.messagesBeingSent--;

                // Only close the keyboard if an error happens.
                // We want the user to be able to send multiple messages without the keyboard being closed.
                this.appProvider.closeKeyboard();

                this.domUtils.showErrorModalDefault(error, 'addon.messages.messagenotsent', true);
                this.removeMessage(message.hash);
            });
        });
    }

    /**
     * Check date should be shown on message list for the current message.
     * If date has changed from previous to current message it should be shown.
     *
     * @param {any} message       Current message where to show the date.
     * @param {any} [prevMessage] Previous message where to compare the date with.
     * @return {boolean}  If date has changed and should be shown.
     */
    showDate(message: any, prevMessage?: any): boolean {
        if (!prevMessage) {
            // First message, show it.
            return true;
        }

        // Check if day has changed.
        return !moment(message.timecreated).isSame(prevMessage.timecreated, 'day');
    }

    /**
     * Check if the user info should be displayed for the current message.
     * User data is only displayed for group conversations if the previous message was from another user.
     *
     * @param {any} message Current message where to show the user info.
     * @param {any} [prevMessage] Previous message.
     * @return {boolean} Whether user data should be shown.
     */
    showUserData(message: any, prevMessage?: any): boolean {
        return this.isGroup && message.useridfrom != this.currentUserId && this.members[message.useridfrom] &&
            (!prevMessage || prevMessage.useridfrom != message.useridfrom || message.showDate);
    }

    /**
     * Check if a css tail should be shown.
     *
     * @param {any} message Current message where to show the user info.
     * @param {any} [nextMessage] Next message.
     * @return {boolean} Whether user data should be shown.
     */
    showTail(message: any, nextMessage?: any): boolean {
        return !nextMessage || nextMessage.useridfrom != message.useridfrom || nextMessage.showDate;
    }

    /**
     * Toggles delete state.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }

    /**
     * View info. If it's an individual conversation, go to the user profile.
     * If it's a group conversation, view info about the group.
     */
    viewInfo(): void {
        if (this.isGroup) {
            // Display the group information.
            const modal = this.modalCtrl.create('AddonMessagesConversationInfoPage', {
                conversationId: this.conversationId
            });

            modal.present();
            modal.onDidDismiss((userId) => {
                if (typeof userId != 'undefined') {
                    // Open user conversation.
                    if (this.svComponent) {
                        // Notify the left pane to load it, this way the right conversation will be highlighted.
                        this.eventsProvider.trigger(AddonMessagesProvider.OPEN_CONVERSATION_EVENT, {userId: userId}, this.siteId);
                    } else {
                        // Open the discussion in a new view.
                        this.navCtrl.push('AddonMessagesDiscussionPage', {userId: userId});
                    }
                }
            });
        } else {
            // Open the user profile.
            const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
            navCtrl.push('CoreUserProfilePage', { userId: this.userId });
        }
    }

    /**
     * Change the favourite state of the current conversation.
     *
     * @param {Function} [done] Function to call when done.
     */
    changeFavourite(done?: () => void): void {
        this.favouriteIcon = 'spinner';

        this.messagesProvider.setFavouriteConversation(this.conversation.id, !this.conversation.isfavourite).then(() => {
            this.conversation.isfavourite = !this.conversation.isfavourite;

            // Get the conversation data so it's cached. Don't block the user for this.
            this.messagesProvider.getConversation(this.conversation.id, undefined, true);

            this.eventsProvider.trigger(AddonMessagesProvider.UPDATE_CONVERSATION_LIST_EVENT, {
                conversationId: this.conversation.id,
                action: 'favourite',
                value: this.conversation.isfavourite
            }, this.siteId);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error changing favourite state.');
        }).finally(() => {
            this.favouriteIcon = 'fa-star';
            this.favouriteIconSlash = this.conversation.isfavourite;
            done && done();
        });
    }

    /**
     * Change the mute state of the current conversation.
     *
     * @param {Function} [done] Function to call when done.
     */
    changeMute(done?: () => void): void {
        this.muteIcon = 'spinner';

        this.messagesProvider.muteConversation(this.conversation.id, !this.conversation.ismuted).then(() => {
            this.conversation.ismuted = !this.conversation.ismuted;

            // Get the conversation data so it's cached. Don't block the user for this.
            this.messagesProvider.getConversation(this.conversation.id, undefined, true);

            this.eventsProvider.trigger(AddonMessagesProvider.UPDATE_CONVERSATION_LIST_EVENT, {
                conversationId: this.conversation.id,
                action: 'mute',
                value: this.conversation.ismuted
            }, this.siteId);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error changing muted state.');
        }).finally(() => {
            this.muteIcon = this.conversation.ismuted ? 'volume-up' : 'volume-off';
            done && done();
        });
    }

    /**
     * Calculate whether there are pending contact requests.
     */
    protected setContactRequestInfo(): void {
        this.requestContactSent = false;
        this.requestContactReceived = false;
        if (this.otherMember && !this.otherMember.iscontact) {
            this.requestContactSent = this.otherMember.contactrequests.some((request) => {
                return request.userid == this.currentUserId && request.requesteduserid == this.otherMember.id;
            });
            this.requestContactReceived = this.otherMember.contactrequests.some((request) => {
                return request.userid == this.otherMember.id && request.requesteduserid == this.currentUserId;
            });
        }
    }

    /**
     * Calculate what to display in the footer.
     */
    protected setFooterType(): void {
        if (!this.otherMember) {
            // Group conversation or group messaging not available.
            this.footerType = 'message';
        } else if (this.otherMember.isblocked) {
            this.footerType = 'blocked';
        } else if (this.requestContactReceived) {
            this.footerType = 'requestReceived';
        } else if (this.otherMember.canmessage) {
            this.footerType = 'message';
        } else if (this.requestContactSent) {
            this.footerType = 'requestSent';
        } else if (this.otherMember.requirescontact) {
            this.footerType = 'requiresContact';
        } else {
            this.footerType = 'unable';
        }
    }

    /**
     * Displays a confirmation modal to block the user of the individual conversation.
     *
     * @return {Promise<any>} Promise resolved when user is blocked or dialog is cancelled.
     */
    blockUser(): Promise<any> {
        if (!this.otherMember) {
            // Should never happen.
            return Promise.reject(null);
        }

        const template = this.translate.instant('addon.messages.blockuserconfirm', {$a: this.otherMember.fullname});
        const okText = this.translate.instant('addon.messages.blockuser');

        return this.domUtils.showConfirm(template, undefined, okText).then(() => {
            this.blockIcon = 'spinner';

            const modal = this.domUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            return this.messagesProvider.blockContact(this.otherMember.id).finally(() => {
                modal.dismiss();
                this.showLoadingModal = false;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.error', true);
        }).finally(() => {
            this.blockIcon = this.otherMember.isblocked ? 'close-circle' : 'checkmark-circle';
        });
    }

    /**
     * Delete the conversation.
     *
     * @param {Function} [done] Function to call when done.
     */
    deleteConversation(done?: () => void): void {
        const confirmMessage = 'addon.messages.' + (this.isSelf ? 'deleteallselfconfirm' : 'deleteallconfirm');

        this.domUtils.showConfirm(this.translate.instant(confirmMessage)).then(() => {
            this.deleteIcon = 'spinner';

            return this.messagesProvider.deleteConversation(this.conversation.id).then(() => {
                this.eventsProvider.trigger(AddonMessagesProvider.UPDATE_CONVERSATION_LIST_EVENT, {
                    conversationId: this.conversation.id,
                    action: 'delete'
                }, this.siteId);

                this.messages = [];
            }).finally(() => {
                this.deleteIcon = 'trash';
                done && done();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error deleting conversation.');
        });
    }

    /**
     * Displays a confirmation modal to unblock the user of the individual conversation.
     *
     * @return {Promise<any>} Promise resolved when user is unblocked or dialog is cancelled.
     */
    unblockUser(): Promise<any> {
        if (!this.otherMember) {
            // Should never happen.
            return Promise.reject(null);
        }

        const template = this.translate.instant('addon.messages.unblockuserconfirm', {$a: this.otherMember.fullname});
        const okText = this.translate.instant('addon.messages.unblockuser');

        return this.domUtils.showConfirm(template, undefined, okText).then(() => {
            this.blockIcon = 'spinner';

            const modal = this.domUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            return this.messagesProvider.unblockContact(this.otherMember.id).finally(() => {
                modal.dismiss();
                this.showLoadingModal = false;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.error', true);
        }).finally(() => {
            this.blockIcon = this.otherMember.isblocked ? 'close-circle' : 'checkmark-circle';
        });
    }

    /**
     * Displays a confirmation modal to send a contact request to the other user of the individual conversation.
     *
     * @return {Promise<any>} Promise resolved when the request is sent or the dialog is cancelled.
     */
    createContactRequest(): Promise<any> {
        if (!this.otherMember) {
            // Should never happen.
            return Promise.reject(null);
        }

        const template = this.translate.instant('addon.messages.addcontactconfirm', { $a: this.otherMember.fullname });
        const okText = this.translate.instant('core.add');

        return this.domUtils.showConfirm(template, undefined, okText).then(() => {
            this.addRemoveIcon = 'spinner';

            const modal = this.domUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            return this.messagesProvider.createContactRequest(this.otherMember.id).finally(() => {
                modal.dismiss();
                this.showLoadingModal = false;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.error', true);
        }).finally(() => {
            this.addRemoveIcon = 'person';
        });
    }

    /**
     * Confirms the contact request of the other user of the individual conversation.
     *
     * @return {Promise<any>} Promise resolved when the request is confirmed.
     */
    confirmContactRequest(): Promise<any> {
        if (!this.otherMember) {
            // Should never happen.
            return Promise.reject(null);
        }

        const modal = this.domUtils.showModalLoading('core.sending', true);
        this.showLoadingModal = true;

        return this.messagesProvider.confirmContactRequest(this.otherMember.id).finally(() => {
            modal.dismiss();
            this.showLoadingModal = false;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.error', true);
        });
    }

    /**
     * Declines the contact request of the other user of the individual conversation.
     *
     * @return {Promise<any>} Promise resolved when the request is confirmed.
     */
    declineContactRequest(): Promise<any> {
        if (!this.otherMember) {
            // Should never happen.
            return Promise.reject(null);
        }

        const modal = this.domUtils.showModalLoading('core.sending', true);
        this.showLoadingModal = true;

        return this.messagesProvider.declineContactRequest(this.otherMember.id).finally(() => {
            modal.dismiss();
            this.showLoadingModal = false;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.error', true);
        });
    }

    /**
     * Displays a confirmation modal to remove the other user of the conversation from contacts.
     *
     * @return {Promise<any>} Promise resolved when the request is sent or the dialog is cancelled.
     */
    removeContact(): Promise<any> {
        if (!this.otherMember) {
            // Should never happen.
            return Promise.reject(null);
        }

        const template = this.translate.instant('addon.messages.removecontactconfirm', { $a: this.otherMember.fullname });
        const okText = this.translate.instant('core.remove');

        return this.domUtils.showConfirm(template, undefined, okText).then(() => {
            this.addRemoveIcon = 'spinner';

            const modal = this.domUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            return this.messagesProvider.removeContact(this.otherMember.id).finally(() => {
                modal.dismiss();
                this.showLoadingModal = false;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.error', true);
        }).finally(() => {
            this.addRemoveIcon = 'person';
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        // Unset again, just in case.
        this.unsetPolling();
        this.syncObserver && this.syncObserver.off();
        this.keyboardObserver && this.keyboardObserver.off();
        this.memberInfoObserver && this.memberInfoObserver.off();
        this.viewDestroyed = true;
    }
}
