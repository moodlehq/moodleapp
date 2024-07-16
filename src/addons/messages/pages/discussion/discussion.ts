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

import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { AlertOptions } from '@ionic/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonMessagesProvider,
    AddonMessagesConversationFormatted,
    AddonMessagesConversationMember,
    AddonMessagesGetMessagesMessage,
    AddonMessages,
    AddonMessagesConversationMessageFormatted,
    AddonMessagesSendMessageResults,
    AddonMessagesUpdateConversationAction,
} from '../../services/messages';
import { AddonMessagesOffline, AddonMessagesOfflineMessagesDBRecordFormatted } from '../../services/messages-offline';
import { AddonMessagesSync, AddonMessagesSyncProvider } from '../../services/messages-sync';
import { CoreUser } from '@features/user/services/user';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreLogger } from '@singletons/logger';
import { CoreInfiniteLoadingComponent } from '@components/infinite-loading/infinite-loading';
import { Md5 } from 'ts-md5/dist/md5';
import moment from 'moment-timezone';
import { CoreError } from '@classes/errors/error';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { ActivatedRoute } from '@angular/router';
import { CoreConstants } from '@/core/constants';
import { CoreDom } from '@singletons/dom';
import { CoreKeyboard } from '@singletons/keyboard';
import { CoreText } from '@singletons/text';

/**
 * Page that displays a message discussion page.
 */
@Component({
    selector: 'page-addon-messages-discussion',
    templateUrl: 'discussion.html',
    styleUrls: ['../../../../theme/components/discussion.scss', 'discussion.scss'],
})
export class AddonMessagesDiscussionPage implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild(IonContent) content?: IonContent;
    @ViewChild(CoreInfiniteLoadingComponent) infinite?: CoreInfiniteLoadingComponent;

    protected fetching = false;
    protected polling?: number;
    protected logger: CoreLogger;

    protected messagesBeingSent = 0;
    protected pagesLoaded = 1;
    protected lastMessage?: { text: string; timecreated: number };
    protected keepMessageMap: {[hash: string]: boolean} = {};
    protected syncObserver: CoreEventObserver;
    protected oldContentHeight = 0;
    protected scrollBottom = true;
    protected viewDestroyed = false;
    protected memberInfoObserver: CoreEventObserver;
    protected showLoadingModal = false; // Whether to show a loading modal while fetching data.
    protected hostElement: HTMLElement;

    conversationId?: number; // Conversation ID. Undefined if it's a new individual conversation.
    conversation?: AddonMessagesConversationFormatted; // The conversation object (if it exists).
    userId?: number; // User ID you're talking to (only if group messaging not enabled or it's a new individual conversation).
    currentUserId: number;
    siteId: string;
    title?: string;
    showInfo = false;
    conversationImage?: string;
    loaded = false;
    showKeyboard = false;
    canLoadMore = false;
    loadMoreError = false;
    messages: AddonMessagesConversationMessageFormatted[] = [];
    showDelete = false;
    canDelete = false;
    groupMessagingEnabled: boolean;
    isGroup = false;
    members: {[id: number]: AddonMessagesConversationMember} = {}; // Members that wrote a message, indexed by ID.
    favouriteIcon = 'fa-star';
    deleteIcon = 'fas-trash';
    blockIcon = 'fas-user-lock';
    addRemoveIcon = 'fas-user-plus';
    muteIcon = 'fas-bell-slash';
    muteEnabled = false;
    otherMember?: AddonMessagesConversationMember; // Other member information (individual conversations only).
    footerType: 'message' | 'blocked' | 'requiresContact' | 'requestSent' | 'requestReceived' | 'unable' = 'unable';
    requestContactSent = false;
    requestContactReceived = false;
    isSelf = false;
    newMessages = 0;
    scrollElement?: HTMLElement;
    unreadMessageFrom = 0;
    initialized = false;

    constructor(
        protected route: ActivatedRoute,
        protected elementRef: ElementRef<HTMLElement>,
    ) {
        this.hostElement = elementRef.nativeElement;
        this.siteId = CoreSites.getCurrentSiteId();
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.groupMessagingEnabled = AddonMessages.isGroupMessagingEnabled();
        this.muteEnabled = AddonMessages.isMuteConversationEnabled();

        this.logger = CoreLogger.getInstance('AddonMessagesDiscussionPage');

        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = CoreEvents.on(AddonMessagesSyncProvider.AUTO_SYNCED, (data) => {
            if ((data.userId && data.userId == this.userId) ||
                    (data.conversationId && data.conversationId == this.conversationId)) {
                // Fetch messages.
                this.fetchMessages();

                // Show first warning if any.
                if (data.warnings && data.warnings[0]) {
                    CoreDomUtils.showAlert(undefined, data.warnings[0]);
                }
            }
        }, this.siteId);

        // Refresh data if info of a mamber of the conversation have changed.
        this.memberInfoObserver = CoreEvents.on(
            AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT,
            (data) => {
                if (data.userId && (this.members[data.userId] || this.otherMember && data.userId == this.otherMember.id)) {
                    this.fetchData();
                }
            },
            this.siteId,
        );
    }

    /**
     * Runs when the page has loaded. This event only happens once per page being created.
     * If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
     * Setup code for the page.
     */
    async ngOnInit(): Promise<void> {
        this.conversationId = CoreNavigator.getRouteNumberParam('conversationId');
        this.userId = CoreNavigator.getRouteNumberParam('userId');
        this.showInfo = !CoreNavigator.getRouteBooleanParam('hideInfo');
        this.showKeyboard = !!CoreNavigator.getRouteBooleanParam('showKeyboard');

        await this.fetchData();

        this.scrollToBottom(true);
    }

    /**
     * View has been initialized.
     */
    async ngAfterViewInit(): Promise<void> {
        this.scrollElement = await this.content?.getScrollElement();
    }

    /**
     * Adds a new message to the message list.
     *
     * @param message Message to be added.
     * @param keep If set the keep flag or not.
     * @returns If message is not mine and was recently added.
     */
    protected addMessage(
        message: AddonMessagesConversationMessageFormatted,
        keep: boolean = true,
    ): boolean {

        /* Create a hash to identify the message. The text of online messages isn't reliable because it can have random data
           like VideoJS ID. Try to use id and fallback to text for offline messages. */
        const id = 'id' in message ? message.id : '';
        message.hash = Md5.hashAsciiStr(String(id || message.text || '')) + '#' + message.timecreated + '#' +
                message.useridfrom;

        let added = false;
        if (this.keepMessageMap[message.hash] === undefined) {
            // Message not added to the list. Add it now.
            this.messages.push(message);
            added = message.useridfrom != this.currentUserId;
        }
        // Message needs to be kept in the list.
        this.keepMessageMap[message.hash] = keep;

        return added;
    }

    /**
     * Remove a message if it shouldn't be in the list anymore.
     *
     * @param hash Hash of the message to be removed.
     */
    protected removeMessage(hash: string): void {
        if (this.keepMessageMap[hash]) {
            // Selected to keep it, clear the flag.
            this.keepMessageMap[hash] = false;

            return;
        }

        delete this.keepMessageMap[hash];

        const position = this.messages.findIndex((message) => message.hash == hash);
        if (position >= 0) {
            this.messages.splice(position, 1);
        }
    }

    /**
     * Convenience function to fetch the conversation data.
     *
     * @returns Resolved when done.
     */
    protected async fetchData(): Promise<void> {
        let loader: CoreIonLoadingElement | undefined;
        if (this.showLoadingModal) {
            loader = await CoreDomUtils.showModalLoading();
        }

        if (!this.groupMessagingEnabled && this.userId) {
            // Get the user profile to retrieve the user fullname and image.
            CoreUser.getProfile(this.userId, undefined, true).then((user) => {
                if (!this.title) {
                    this.title = user.fullname;
                }
                this.conversationImage = user.profileimageurl;
                this.members[user.id] = <AddonMessagesConversationMember>user;

                return;
            }).catch(() => {
                // Ignore errors.
            });
        }

        // Synchronize messages if needed.
        try {
            const syncResult = await AddonMessagesSync.syncDiscussion(this.conversationId, this.userId);
            if (syncResult.warnings && syncResult.warnings[0]) {
                CoreDomUtils.showAlert(undefined, syncResult.warnings[0]);
            }
        } catch {
            // Ignore errors;
        }

        try {
            const promises: Promise<void>[] = [];
            if (this.groupMessagingEnabled) {
                // Get the conversation ID if it exists and we don't have it yet.
                const exists = await this.getConversation(this.conversationId, this.userId);

                if (exists) {
                    // Fetch the messages for the first time.
                    promises.push(this.fetchMessages());
                }

                if (this.userId) {
                    const userId = this.userId;
                    // Get the member info. Invalidate first to make sure we get the latest status.
                    promises.push(AddonMessages.invalidateMemberInfo(this.userId).then(async () => {
                        this.otherMember = await AddonMessages.getMemberInfo(userId);

                        if (!exists && this.otherMember) {
                            this.conversationImage = this.otherMember.profileimageurl;
                            this.title = this.otherMember.fullname;
                        }
                        this.blockIcon = this.otherMember.isblocked ? 'fas-user-check' : 'fas-user-lock';

                        return;
                    }));
                } else {
                    this.otherMember = undefined;
                }

            } else {
                if (this.userId) {
                    const userId = this.userId;

                    // Fake the user member info.
                    promises.push(CoreUser.getProfile(this.userId).then(async (user) => {
                        this.otherMember = {
                            id: user.id,
                            fullname: user.fullname,
                            profileurl: '',
                            profileimageurl: user.profileimageurl || '',
                            profileimageurlsmall: user.profileimageurlsmall || '',
                            isonline: false,
                            showonlinestatus: false,
                            isblocked: false,
                            iscontact: false,
                            isdeleted: false,
                            canmessageevenifblocked: true,
                            canmessage: true,
                            requirescontact: false,
                        };
                        this.otherMember.isblocked = await AddonMessages.isBlocked(userId);
                        this.otherMember.iscontact = await AddonMessages.isContact(userId);
                        this.blockIcon = this.otherMember.isblocked ? 'fas-user-check' : 'fas-user-lock';

                        return;
                    }));

                }

                // Fetch the messages for the first time.
                promises.push(this.fetchMessages().then(() => {
                    if (!this.title && this.messages.length) {
                        // Didn't receive the fullname via argument. Try to get it from messages.
                        // It's possible that name cannot be resolved when no messages were yet exchanged.
                        const firstMessage = this.messages[0];
                        if ('usertofullname' in firstMessage) {
                            if (firstMessage.useridto != this.currentUserId) {
                                this.title = firstMessage.usertofullname || '';
                            } else {
                                this.title = firstMessage.userfromfullname || '';
                            }
                        }
                    }

                    return;
                }));
            }

            await Promise.all(promises);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
        } finally {
            this.checkCanDelete();
            this.loaded = true;
            this.setPolling(); // Make sure we're polling messages.
            this.setContactRequestInfo();
            this.setFooterType();
            loader && loader.dismiss();
        }
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
     * @param messagesAreNew If messages loaded are new messages.
     * @returns Resolved when done.
     */
    protected async fetchMessages(messagesAreNew: boolean = true): Promise<void> {
        this.loadMoreError = false;

        if (this.messagesBeingSent > 0) {
            // We do not poll while a message is being sent or we could confuse the user.
            // Otherwise, his message would disappear from the list, and he'd have to wait for the interval to check for messages.
            return;
        } else if (this.fetching) {
            // Already fetching.
            return;
        } else if (this.groupMessagingEnabled && !this.conversationId) {
            // Don't have enough data to fetch messages.
            throw new CoreError('No enough data provided to fetch messages');
        }

        if (this.conversationId) {
            this.logger.debug(`Polling new messages for conversation '${this.conversationId}'`);
        } else if (this.userId) {
            this.logger.debug(`Polling new messages for discussion with user '${this.userId}'`);
        } else {
            // Should not happen.
            throw new CoreError('No enough data provided to fetch messages');
        }

        this.fetching = true;

        try {
            // Wait for synchronization process to finish.
            await AddonMessagesSync.waitForSyncConversation(this.conversationId, this.userId);

            let messages: AddonMessagesConversationMessageFormatted[] = [];
            // Fetch messages. Invalidate the cache before fetching.
            if (this.groupMessagingEnabled) {
                await AddonMessages.invalidateConversationMessages(this.conversationId!);
                messages = await this.getConversationMessages(this.pagesLoaded);
            } else {
                await AddonMessages.invalidateDiscussionCache(this.userId!);
                messages = await this.getDiscussionMessages(this.pagesLoaded);
            }

            this.loadMessages(messages, messagesAreNew);

        } finally {
            this.fetching = false;
        }
    }

    /**
     * Format and load a list of messages into the view.
     *
     * @param messages Messages to load.
     * @param messagesAreNew If messages loaded are new messages.
     */
    protected loadMessages(
        messages: AddonMessagesConversationMessageFormatted[],
        messagesAreNew: boolean = true,
    ): void {

        if (this.viewDestroyed) {
            return;
        }

        // Check if we are at the bottom to scroll it after render.
        // Use a 5px error margin because in iOS there is 1px difference for some reason.
        this.scrollBottom = CoreDom.scrollIsBottom(this.scrollElement, 5);

        if (this.messagesBeingSent > 0) {
            // Ignore polling due to a race condition.
            return;
        }

        // Add new messages to the list and mark the messages that should still be displayed.
        const newMessages = messages.reduce((val, message) => val + (this.addMessage(message) ? 1 : 0), 0);

        // Set the new badges message if we're loading new messages.
        if (messagesAreNew) {
            this.setNewMessagesBadge(this.newMessages + newMessages);
        }

        // Remove messages that shouldn't be in the list anymore.
        for (const hash in this.keepMessageMap) {
            this.removeMessage(hash);
        }

        // Sort the messages.
        AddonMessages.sortMessages(this.messages);

        // Calculate which messages need to display the date or user data.
        this.messages.forEach((message, index) => {
            message.showDate = this.showDate(message, this.messages[index - 1]);
            message.showUserData = this.showUserData(message, this.messages[index - 1]);
            message.showTail = this.showTail(message, this.messages[index + 1]);
        });

        // If we received a new message while using group messaging, force mark messages as read.
        const last = this.messages[this.messages.length - 1];
        const forceMark = this.groupMessagingEnabled && last && last.useridfrom !== this.currentUserId && !!this.lastMessage
                    && (last.text !== this.lastMessage.text || last.timecreated !== this.lastMessage.timecreated);

        // Notify that there can be a new message.
        this.notifyNewMessage();

        // Mark retrieved messages as read if they are not.
        this.markMessagesAsRead(forceMark);
    }

    /**
     * Set the new message badge number and set scroll listener if needed.
     *
     * @param addMessages Number of messages still to be read.
     */
    protected setNewMessagesBadge(addMessages: number): void {
        if (this.newMessages == 0 && addMessages > 0) {
            this.scrollFunction();
        }

        this.newMessages = addMessages;
    }

    /**
     * The scroll was moved. Update new messages count.
     */
    scrollFunction(): void {
        if (this.newMessages == 0) {
            return;
        }

        if (CoreDom.scrollIsBottom(this.scrollElement, 40)) {
            // At the bottom, reset.
            this.setNewMessagesBadge(0);

            return;
        }

        const scrollElRect = this.scrollElement?.getBoundingClientRect();
        const scrollBottomPos = (scrollElRect && scrollElRect.bottom) || 0;

        if (scrollBottomPos == 0) {
            return;
        }

        const messages = Array.from(this.hostElement.querySelectorAll('core-message:not(.is-mine)'))
            .slice(-this.newMessages)
            .reverse();

        const newMessagesUnread = messages.findIndex((message) => {
            const elementRect = message.getBoundingClientRect();
            if (!elementRect) {
                return false;
            }

            return elementRect.bottom <= scrollBottomPos;
        });

        if (newMessagesUnread > 0 && newMessagesUnread < this.newMessages) {
            this.setNewMessagesBadge(newMessagesUnread);
        }
    }

    /**
     * Get the conversation.
     *
     * @param conversationId Conversation ID.
     * @param userId User ID.
     * @returns Promise resolved with a boolean: whether the conversation exists or not.
     */
    protected async getConversation(conversationId?: number, userId?: number): Promise<boolean> {
        let fallbackConversation: AddonMessagesConversationFormatted | undefined;

        // Try to get the conversationId if we don't have it.
        if (!conversationId && userId) {
            try {
                if (userId === this.currentUserId && AddonMessages.isSelfConversationEnabled()) {
                    fallbackConversation = await AddonMessages.getSelfConversation();
                } else {
                    fallbackConversation = await AddonMessages.getConversationBetweenUsers(userId, undefined, true);
                }
                conversationId = fallbackConversation.id;
            } catch (error) {
                // Probably conversation does not exist or user is offline. Try to load offline messages.
                this.isSelf = userId === this.currentUserId;

                const messages = await AddonMessagesOffline.getMessages(userId);

                if (messages && messages.length) {
                // We have offline messages, this probably means that the conversation didn't exist. Don't display error.
                    messages.forEach((message) => {
                        message.pending = true;
                        message.text = message.smallmessage;
                    });

                    this.loadMessages(messages);
                } else if (error.errorcode != 'errorconversationdoesnotexist') {
                    // Display the error.
                    throw error;
                }

                return false;
            }
        }

        if (!conversationId) {
            return false;
        }

        // Retrieve the conversation. Invalidate data first to get the right unreadcount.
        await AddonMessages.invalidateConversation(conversationId);

        try {
            this.conversation = await AddonMessages.getConversation(conversationId, undefined, true);
        } catch (error) {
            // Get conversation failed, use the fallback one if we have it.
            if (fallbackConversation) {
                this.conversation = fallbackConversation;
            } else {
                throw error;
            }
        }

        if (this.conversation) {
            this.conversationId = this.conversation.id;
            this.title = this.conversation.name;
            this.conversationImage = this.conversation.imageurl;
            this.isGroup = this.conversation.type == AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP;
            this.favouriteIcon = 'fas-star';
            this.muteIcon = this.conversation.ismuted ? 'fas-bell' : 'fas-bell-slash';
            if (!this.isGroup) {
                this.userId = this.conversation.userid;
            }
            this.isSelf = this.conversation.type == AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_SELF;

            return true;
        } else {
            return false;
        }

    }

    /**
     * Get the messages of the conversation. Used if group messaging is supported.
     *
     * @param pagesToLoad Number of "pages" to load.
     * @param offset Offset for message list.
     * @returns Promise resolved with the list of messages.
     */
    protected async getConversationMessages(
        pagesToLoad: number,
        offset: number = 0,
    ): Promise<AddonMessagesConversationMessageFormatted[]> {

        if (!this.conversationId) {
            return [];
        }

        const excludePending = offset > 0;

        const result = await AddonMessages.getConversationMessages(this.conversationId, {
            excludePending: excludePending,
            limitFrom: offset,
        });

        pagesToLoad--;

        // Treat members. Don't use CoreUtilsProvider.arrayToObject because we don't want to override the existing object.
        if (result.members) {
            result.members.forEach((member) => {
                this.members[member.id] = member;
            });
        }

        const messages: AddonMessagesConversationMessageFormatted[] = result.messages;

        if (pagesToLoad > 0 && result.canLoadMore) {
            offset += AddonMessagesProvider.LIMIT_MESSAGES;

            // Get more messages.
            const nextMessages = await this.getConversationMessages(pagesToLoad, offset);

            return messages.concat(nextMessages);
        }

        // No more messages to load, return them.
        this.canLoadMore = !!result.canLoadMore;

        return messages;

    }

    /**
     * Get a discussion. Can load several "pages".
     *
     * @param pagesToLoad Number of pages to load.
     * @param lfReceivedUnread Number of unread received messages already fetched, so fetch will be done from this.
     * @param lfReceivedRead Number of read received messages already fetched, so fetch will be done from this.
     * @param lfSentUnread Number of unread sent messages already fetched, so fetch will be done from this.
     * @param lfSentRead Number of read sent messages already fetched, so fetch will be done from this.
     * @returns Resolved when done.
     */
    protected async getDiscussionMessages(
        pagesToLoad: number,
        lfReceivedUnread: number = 0,
        lfReceivedRead: number = 0,
        lfSentUnread: number = 0,
        lfSentRead: number = 0,
    ): Promise<(AddonMessagesGetMessagesMessage | AddonMessagesOfflineMessagesDBRecordFormatted)[]> {

        // Only get offline messages if we're loading the first "page".
        const excludePending = lfReceivedUnread > 0 || lfReceivedRead > 0 || lfSentUnread > 0 || lfSentRead > 0;

        // Get next messages.
        const result = await AddonMessages.getDiscussion(
            this.userId!,
            excludePending,
            lfReceivedUnread,
            lfReceivedRead,
            lfSentUnread,
            lfSentRead,
        );

        pagesToLoad--;
        if (pagesToLoad > 0 && result.canLoadMore) {
            // More pages to load. Calculate new limit froms.
            result.messages.forEach((message) => {
                if (!message.pending && 'read' in message) {
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
            const nextMessages =
                await this.getDiscussionMessages(pagesToLoad, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead);

            return result.messages.concat(nextMessages);
        } else {
            // No more messages to load, return them.
            this.canLoadMore = result.canLoadMore;

            return result.messages;
        }
    }

    /**
     * Mark messages as read.
     */
    protected async markMessagesAsRead(forceMark: boolean): Promise<void> {
        let readChanged = false;
        let messageUnreadFound = false;

        // Mark all messages at a time if there is any unread message.
        if (forceMark) {
            messageUnreadFound = true;
        } else if (this.groupMessagingEnabled) {
            messageUnreadFound = !!((this.conversation?.unreadcount && this.conversation?.unreadcount > 0) &&
                (this.conversationId && this.conversationId > 0));
        } else {
            // If an unread message is found, mark all messages as read.
            messageUnreadFound = this.messages.some((message) =>
                message.useridfrom != this.currentUserId && ('read' in message && !message.read));
        }

        if (messageUnreadFound) {
            this.setUnreadLabelPosition();

            if (this.groupMessagingEnabled) {
                await AddonMessages.markAllConversationMessagesRead(this.conversationId!);
            } else {
                await AddonMessages.markAllMessagesRead(this.userId);

                // Mark all messages as read.
                this.messages.forEach((message) => {
                    if ('read' in message) {
                        message.read = true;
                    }
                });
            }

            readChanged = true;
        }

        if (readChanged) {
            CoreEvents.trigger(AddonMessagesProvider.READ_CHANGED_EVENT, {
                conversationId: this.conversationId,
                userId: this.userId,
            }, this.siteId);
        }
    }

    /**
     * Notify the last message found so discussions list controller can tell if last message should be updated.
     */
    protected notifyNewMessage(): void {
        const last = this.messages[this.messages.length - 1] as AddonMessagesConversationMessageFormatted | undefined;

        let trigger = false;

        if (!last) {
            this.lastMessage = undefined;
            trigger = true;
        } else if (last.text !== this.lastMessage?.text || last.timecreated !== this.lastMessage?.timecreated) {
            this.lastMessage = { text: last.text || '', timecreated: last.timecreated };
            trigger = true;
        }

        if (trigger) {
            // Update discussions last message.
            CoreEvents.trigger(AddonMessagesProvider.NEW_MESSAGE_EVENT, {
                conversationId: this.conversationId,
                userId: this.userId,
                message: this.lastMessage?.text,
                timecreated: this.lastMessage?.timecreated ?? 0,
                userFrom: last?.useridfrom ? this.members[last.useridfrom] : undefined,
                isfavourite: !!this.conversation?.isfavourite,
                type: this.conversation?.type,
            }, this.siteId);

            // Update navBar links and buttons.
            const newCanDelete = (last && 'id' in last && last.id && this.messages.length == 1) || this.messages.length > 1;
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
            if (this.conversation && (this.conversation?.unreadcount && this.conversation?.unreadcount > 0) && this.messages) {
                // Iterate over messages to find the right message using the unreadcount. Skip offline messages and own messages.
                let found = 0;

                for (let i = this.messages.length - 1; i >= 0; i--) {
                    const message = this.messages[i];
                    if (!message.pending && message.useridfrom != this.currentUserId && 'id' in message) {
                        found++;
                        if (found == this.conversation.unreadcount) {
                            this.unreadMessageFrom = Number(message.id);
                            break;
                        }
                    }
                }
            }
        } else {
            let previousMessageRead = false;

            for (const x in this.messages) {
                const message = this.messages[x];
                if (message.useridfrom != this.currentUserId && 'read' in message) {
                    const unreadFrom = !message.read && previousMessageRead;

                    if (unreadFrom) {
                        // Save where the label is placed.
                        this.unreadMessageFrom = Number(message.id);
                        break;
                    }

                    previousMessageRead = !!message.read;
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
     *
     * @returns Resolved when done.
     */
    protected async waitForFetch(): Promise<void> {
        if (!this.fetching) {
            return;
        }

        await CoreUtils.wait(400);
        await CoreUtils.ignoreErrors(this.waitForFetch());
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
            this.polling = window.setInterval(() => {
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
     * @param message Message to be copied.
     */
    copyMessage(message: AddonMessagesConversationMessageFormatted): void {
        const text = 'smallmessage' in message ? message.smallmessage || message.text || '' : message.text || '';
        CoreText.copyToClipboard(CoreTextUtils.decodeHTMLEntities(text));
    }

    /**
     * Function to delete a message.
     *
     * @param message Message object to delete.
     * @param index Index where the message is to delete it from the view.
     */
    async deleteMessage(
        message: AddonMessagesConversationMessageFormatted,
        index: number,
    ): Promise<void> {
        const canDeleteAll = this.conversation && this.conversation.candeletemessagesforallusers;
        const langKey = message.pending || canDeleteAll || this.isSelf ? 'core.areyousure' :
            'addon.messages.deletemessageconfirmation';
        const options: AlertOptions = {};

        if (canDeleteAll && !message.pending) {
            // Show delete for all checkbox.
            options.inputs = [{
                type: 'checkbox',
                name: 'deleteforall',
                checked: false,
                value: true,
                label: Translate.instant('addon.messages.deleteforeveryone'),
            }];
        }

        try {
            const data: boolean[] = await CoreDomUtils.showConfirm(
                Translate.instant(langKey),
                undefined,
                undefined,
                undefined,
                options,
            );

            const modal = await CoreDomUtils.showModalLoading('core.deleting', true);

            try {
                await AddonMessages.deleteMessage(message, data && data[0]);
                // Remove message from the list without having to wait for re-fetch.
                this.messages.splice(index, 1);
                this.removeMessage(message.hash!);
                this.notifyNewMessage();

                this.fetchMessages(); // Re-fetch messages to update cached data.
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.messages.errordeletemessage', true);
        }
    }

    /**
     * Function to load previous messages.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @returns Resolved when done.
     */
    async loadPrevious(infiniteComplete?: () => void): Promise<void> {
        if (!this.initialized) {
            // Don't load previous if the view isn't fully initialized.
            // Don't put the initialized condition in the "enabled" input because then the load more is hidden and
            // the scroll height changes when it appears.
            infiniteComplete && infiniteComplete();

            return;
        }

        let infiniteHeight = this.infinite?.hostElement.getBoundingClientRect().height || 0;
        const scrollHeight = (this.scrollElement?.scrollHeight || 0);

        // If there is an ongoing fetch, wait for it to finish.
        try {
            await this.waitForFetch();
        } finally {
            this.pagesLoaded++;

            try {
                await this.fetchMessages(false);

                // Try to keep the scroll position.
                const scrollBottom = scrollHeight - (this.scrollElement?.scrollTop || 0);

                const height = this.infinite?.hostElement.getBoundingClientRect().height || 0;
                if (this.canLoadMore && infiniteHeight && this.infinite) {
                    // The height of the infinite is different while spinner is shown. Add that difference.
                    infiniteHeight = infiniteHeight - height;
                } else if (!this.canLoadMore) {
                    // Can't load more, take into account the full height of the infinite loading since it will disappear now.
                    infiniteHeight = infiniteHeight || height;
                }

                this.keepScroll(scrollHeight, scrollBottom, infiniteHeight);
            } catch (error) {
                this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
                this.pagesLoaded--;
                CoreDomUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
            } finally {
                infiniteComplete && infiniteComplete();
            }
        }
    }

    /**
     * Keep scroll position after loading previous messages.
     */
    protected keepScroll(oldScrollHeight: number, oldScrollBottom: number, infiniteHeight: number, retries = 0): void {
        setTimeout(() => {
            const newScrollHeight = (this.scrollElement?.scrollHeight || 0);

            if (newScrollHeight == oldScrollHeight) {
                // Height hasn't changed yet. Retry if max retries haven't been reached.
                if (retries <= 10) {
                    this.keepScroll(oldScrollHeight, oldScrollBottom, infiniteHeight, retries + 1);
                }

                return;
            }

            // Scroll has changed, but maybe it hasn't reached the full height yet.
            setTimeout(() => {
                const newScrollHeight = (this.scrollElement?.scrollHeight || 0);
                const scrollTo = newScrollHeight - oldScrollBottom + infiniteHeight;

                this.content!.scrollToPoint(0, scrollTo, 0);
            }, 30);
        }, 30);
    }

    /**
     * Scroll bottom when render has finished.
     *
     * @param force Whether to force scroll to bottom.
     */
    async scrollToBottom(force = false): Promise<void> {
        // Check if scroll is at bottom. If so, scroll bottom after rendering since there might be something new.
        if (this.scrollBottom || force) {
            this.scrollBottom = false;

            // Reset the badge.
            this.setNewMessagesBadge(0);

            // Leave time for the view to be rendered.
            await CoreUtils.nextTicks(5);

            if (!this.viewDestroyed && this.content) {
                this.content.scrollToBottom(0);
            }

            if (force) {
                this.initialized = true;
            }
        }
    }

    /**
     * Scroll to the first new unread message.
     */
    scrollToFirstUnreadMessage(): void {
        if (this.newMessages > 0) {
            const messages = Array.from(this.hostElement.querySelectorAll<HTMLElement>('core-message:not(.is-mine)'));

            CoreDom.scrollToElement(messages[messages.length - this.newMessages]);
        }
    }

    /**
     * Sends a message to the server.
     *
     * @param text Message text.
     */
    async sendMessage(text: string): Promise<void> {
        this.hideUnreadLabel();

        this.showDelete = false;
        this.scrollBottom = true;
        this.setNewMessagesBadge(0);

        const message: AddonMessagesConversationMessageFormatted = {
            id: -1,
            pending: true,
            sending: true,
            useridfrom: this.currentUserId,
            smallmessage: text,
            text: text,
            timecreated: Date.now(),
        };
        message.showDate = this.showDate(message, this.messages[this.messages.length - 1]);
        this.addMessage(message, false);

        this.messagesBeingSent++;

        // If there is an ongoing fetch, wait for it to finish.
        // Otherwise, if a message is sent while fetching it could disappear until the next fetch.
        try {
            await this.waitForFetch();
        } finally {

            try {
                let data: AddonMessagesSendMessageResults;
                if (this.conversationId) {
                    data = await AddonMessages.sendMessageToConversation(this.conversation!, text);
                } else {
                    data = await AddonMessages.sendMessage(this.userId!, text);
                }

                this.messagesBeingSent--;
                let failure = false;
                if (data.sent) {
                    try {

                        if (!this.conversationId && data.message && 'conversationid' in data.message) {
                            // Message sent to a new conversation, try to load the conversation.
                            await this.getConversation(data.message.conversationid, this.userId);
                            // Now fetch messages.
                            try {
                                await this.fetchMessages();
                            } finally {
                                // Start polling messages now that the conversation exists.
                                this.setPolling();
                            }
                        } else {
                            // Message was sent, fetch messages right now.
                            await this.fetchMessages();
                        }
                    } catch {
                        failure = true;
                    }
                }

                if (failure || !data.sent) {
                    // Fetch failed or is offline message, mark the message as sent.
                    // If fetch is successful there's no need to mark it because the fetch will already show the message received.
                    message.sending = false;
                    if (data.sent) {
                        // Message sent to server, not pending anymore.
                        message.pending = false;
                    } else if (data.message) {
                        message.timecreated = data.message.timecreated || 0;
                    }

                    this.notifyNewMessage();
                }

            } catch (error) {
                this.messagesBeingSent--;

                // Only close the keyboard if an error happens.
                // We want the user to be able to send multiple messages without the keyboard being closed.
                CoreKeyboard.close();

                CoreDomUtils.showErrorModalDefault(error, 'addon.messages.messagenotsent', true);
                this.removeMessage(message.hash!);
            }
        }
    }

    /**
     * Check date should be shown on message list for the current message.
     * If date has changed from previous to current message it should be shown.
     *
     * @param message Current message where to show the date.
     * @param prevMessage Previous message where to compare the date with.
     * @returns If date has changed and should be shown.
     */
    showDate(
        message: AddonMessagesConversationMessageFormatted,
        prevMessage?: AddonMessagesConversationMessageFormatted,
    ): boolean {

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
     * @param message Current message where to show the user info.
     * @param prevMessage Previous message.
     * @returns Whether user data should be shown.
     */
    showUserData(
        message: AddonMessagesConversationMessageFormatted,
        prevMessage?: AddonMessagesConversationMessageFormatted,
    ): boolean {

        return this.isGroup && message.useridfrom != this.currentUserId && this.members[(message.useridfrom || 0)] &&
            (!prevMessage || prevMessage.useridfrom != message.useridfrom || !!message.showDate);
    }

    /**
     * Check if a css tail should be shown.
     *
     * @param message Current message where to show the user info.
     * @param nextMessage Next message.
     * @returns Whether user data should be shown.
     */
    showTail(
        message: AddonMessagesConversationMessageFormatted,
        nextMessage?: AddonMessagesConversationMessageFormatted,
    ): boolean {
        return !nextMessage || nextMessage.useridfrom != message.useridfrom || !!nextMessage.showDate;
    }

    /**
     * View info. If it's an individual conversation, go to the user profile.
     * If it's a group conversation, view info about the group.
     */
    async viewInfo(): Promise<void> {
        if (this.isGroup) {
            const { AddonMessagesConversationInfoComponent } =
                await import('@addons/messages/components/conversation-info/conversation-info.module');

            // Display the group information.
            const userId = await CoreDomUtils.openSideModal<number>({
                component: AddonMessagesConversationInfoComponent,
                componentProps: {
                    conversationId: this.conversationId,
                },
            });

            if (userId !== undefined) {
                const splitViewLoaded = CoreNavigator.isCurrentPathInTablet('**/messages/**/discussion/**');

                // Open user conversation.
                if (splitViewLoaded) {
                    // Notify the left pane to load it, this way the right conversation will be highlighted.
                    CoreEvents.trigger(
                        AddonMessagesProvider.OPEN_CONVERSATION_EVENT,
                        { userId },
                        this.siteId,
                    );
                } else {
                    // Open the discussion in a new view.
                    CoreNavigator.navigateToSitePath(`/messages/discussion/user/${userId}`);
                }
            }
        } else {
            // Open the user profile.
            CoreNavigator.navigateToSitePath('/user/profile', { params: { userId: this.userId } });
        }
    }

    /**
     * Change the favourite state of the current conversation.
     *
     * @param done Function to call when done.
     */
    async changeFavourite(done?: () => void): Promise<void> {
        if (!this.conversation) {
            return;
        }

        this.favouriteIcon = CoreConstants.ICON_LOADING;

        try {
            await AddonMessages.setFavouriteConversation(this.conversation.id, !this.conversation.isfavourite);

            this.conversation.isfavourite = !this.conversation.isfavourite;

            // Get the conversation data so it's cached. Don't block the user for this.
            AddonMessages.getConversation(this.conversation.id, undefined, true);

            CoreEvents.trigger(AddonMessagesProvider.UPDATE_CONVERSATION_LIST_EVENT, {
                conversationId: this.conversation.id,
                action: AddonMessagesUpdateConversationAction.FAVOURITE,
                value: this.conversation.isfavourite,
            }, this.siteId);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error changing favourite state.');
        } finally {
            this.favouriteIcon = 'fas-star';
            done && done();
        }
    }

    /**
     * Change the mute state of the current conversation.
     *
     * @param done Function to call when done.
     */
    async changeMute(done?: () => void): Promise<void> {
        if (!this.conversation) {
            return;
        }

        this.muteIcon = CoreConstants.ICON_LOADING;

        try {
            await AddonMessages.muteConversation(this.conversation.id, !this.conversation.ismuted);
            this.conversation.ismuted = !this.conversation.ismuted;

            // Get the conversation data so it's cached. Don't block the user for this.
            AddonMessages.getConversation(this.conversation.id, undefined, true);

            CoreEvents.trigger(AddonMessagesProvider.UPDATE_CONVERSATION_LIST_EVENT, {
                conversationId: this.conversation.id,
                action: AddonMessagesUpdateConversationAction.MUTE,
                value: this.conversation.ismuted,
            }, this.siteId);

        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error changing muted state.');
        } finally {
            this.muteIcon = this.conversation.ismuted ? 'fas-bell' : 'fas-bell-slash';
            done && done();
        }
    }

    /**
     * Calculate whether there are pending contact requests.
     */
    protected setContactRequestInfo(): void {
        this.requestContactSent = false;
        this.requestContactReceived = false;
        if (this.otherMember && !this.otherMember.iscontact) {
            this.requestContactSent = !!this.otherMember.contactrequests?.some((request) =>
                request.userid == this.currentUserId && request.requesteduserid == this.otherMember!.id);
            this.requestContactReceived = !!this.otherMember.contactrequests?.some((request) =>
                request.userid == this.otherMember!.id && request.requesteduserid == this.currentUserId);
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
     * @returns Promise resolved when user is blocked or dialog is cancelled.
     */
    async blockUser(): Promise<void> {
        if (!this.otherMember) {
            // Should never happen.
            throw new CoreError('No member selected to be blocked.');
        }

        if (this.otherMember.canmessageevenifblocked) {
            CoreDomUtils.showErrorModal(Translate.instant('addon.messages.cantblockuser', { $a: this.otherMember.fullname }));

            return;
        }

        const template = Translate.instant('addon.messages.blockuserconfirm', { $a: this.otherMember.fullname });
        const okText = Translate.instant('addon.messages.blockuser');

        try {
            await CoreDomUtils.showConfirm(template, undefined, okText);
            this.blockIcon = CoreConstants.ICON_LOADING;

            const modal = await CoreDomUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            try {
                try {
                    await AddonMessages.blockContact(this.otherMember.id);
                } finally {
                    modal.dismiss();
                    this.showLoadingModal = false;
                }
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
            } finally {
                this.blockIcon = this.otherMember.isblocked ? 'fas-user-check' : 'fas-user-lock';
            }
        } catch {
            // User cancelled.
        }
    }

    /**
     * Delete the conversation.
     *
     * @param done Function to call when done.
     */
    async deleteConversation(done?: () => void): Promise<void> {
        if (!this.conversation) {
            return;
        }

        const confirmMessage = 'addon.messages.' + (this.isSelf ? 'deleteallselfconfirm' : 'deleteallconfirm');

        try {
            await CoreDomUtils.showDeleteConfirm(confirmMessage);
            this.deleteIcon = CoreConstants.ICON_LOADING;

            try {
                try {
                    await AddonMessages.deleteConversation(this.conversation.id);

                    CoreEvents.trigger(
                        AddonMessagesProvider.UPDATE_CONVERSATION_LIST_EVENT,
                        {
                            conversationId: this.conversation.id,
                            action: AddonMessagesUpdateConversationAction.DELETE,
                        },
                        this.siteId,
                    );

                    this.messages = [];
                } finally {
                    done && done();
                }
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'Error deleting conversation.');
            } finally {
                this.deleteIcon = 'fas-trash';
            }
        } catch {
            // User cancelled.
        }
    }

    /**
     * Displays a confirmation modal to unblock the user of the individual conversation.
     *
     * @returns Promise resolved when user is unblocked or dialog is cancelled.
     */
    async unblockUser(): Promise<void> {
        if (!this.otherMember) {
            // Should never happen.
            throw new CoreError('No member selected to be unblocked.');
        }

        const template = Translate.instant('addon.messages.unblockuserconfirm', { $a: this.otherMember.fullname });
        const okText = Translate.instant('addon.messages.unblockuser');

        try {
            await CoreDomUtils.showConfirm(template, undefined, okText);

            this.blockIcon = CoreConstants.ICON_LOADING;

            const modal = await CoreDomUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            try {
                try {
                    await AddonMessages.unblockContact(this.otherMember.id);
                } finally {
                    modal.dismiss();
                    this.showLoadingModal = false;
                }
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
            } finally {
                this.blockIcon = this.otherMember.isblocked ? 'fas-user-check' : 'fas-user-lock';
            }
        } catch {
            // User cancelled.
        }
    }

    /**
     * Displays a confirmation modal to send a contact request to the other user of the individual conversation.
     *
     * @returns Promise resolved when the request is sent or the dialog is cancelled.
     */
    async createContactRequest(): Promise<void> {
        if (!this.otherMember) {
            // Should never happen.
            throw new CoreError('No member selected to be requested.');
        }

        const template = Translate.instant('addon.messages.addcontactconfirm', { $a: this.otherMember.fullname });
        const okText = Translate.instant('core.add');

        try {
            await CoreDomUtils.showConfirm(template, undefined, okText);

            this.addRemoveIcon = CoreConstants.ICON_LOADING;

            const modal = await CoreDomUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            try {
                try {
                    await AddonMessages.createContactRequest(this.otherMember.id);
                } finally {
                    modal.dismiss();
                    this.showLoadingModal = false;
                }
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
            } finally {
                this.addRemoveIcon = 'fas-user-plus';
            }
        } catch {
            // User cancelled.
        }
    }

    /**
     * Confirms the contact request of the other user of the individual conversation.
     *
     * @returns Promise resolved when the request is confirmed.
     */
    async confirmContactRequest(): Promise<void> {
        if (!this.otherMember) {
            // Should never happen.
            throw new CoreError('No member selected to be confirmed.');
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);
        this.showLoadingModal = true;

        try {
            try {
                await AddonMessages.confirmContactRequest(this.otherMember.id);
            } finally {
                modal.dismiss();
                this.showLoadingModal = false;
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
        }
    }

    /**
     * Declines the contact request of the other user of the individual conversation.
     *
     * @returns Promise resolved when the request is confirmed.
     */
    async declineContactRequest(): Promise<void> {
        if (!this.otherMember) {
            // Should never happen.
            throw new CoreError('No member selected to be declined.');
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);
        this.showLoadingModal = true;

        try {
            try {
                await AddonMessages.declineContactRequest(this.otherMember.id);
            } finally {
                modal.dismiss();
                this.showLoadingModal = false;
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
        }
    }

    /**
     * Displays a confirmation modal to remove the other user of the conversation from contacts.
     *
     * @returns Promise resolved when the request is sent or the dialog is cancelled.
     */
    async removeContact(): Promise<void> {
        if (!this.otherMember) {
            // Should never happen.
            throw new CoreError('No member selected to be removed.');
        }

        const template = Translate.instant('addon.messages.removecontactconfirm', { $a: this.otherMember.fullname });
        const okText = Translate.instant('core.remove');

        try {
            await CoreDomUtils.showConfirm(template, undefined, okText);

            this.addRemoveIcon = CoreConstants.ICON_LOADING;

            const modal = await CoreDomUtils.showModalLoading('core.sending', true);
            this.showLoadingModal = true;

            try {
                try {
                    await AddonMessages.removeContact(this.otherMember.id);
                } finally {
                    modal.dismiss();
                    this.showLoadingModal = false;
                }
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
            } finally {
                this.addRemoveIcon = 'fas-user-plus';
            }
        } catch {
            // User cancelled.
        }

    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        // Unset again, just in case.
        this.unsetPolling();
        this.syncObserver?.off();
        this.memberInfoObserver?.off();
        this.viewDestroyed = true;
    }

}
