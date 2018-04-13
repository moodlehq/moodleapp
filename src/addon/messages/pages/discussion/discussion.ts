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

import { Component, OnDestroy, ViewChild } from '@angular/core';
import { IonicPage, NavParams, NavController, Content } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from '../../providers/messages';
import { AddonMessagesSyncProvider } from '../../providers/sync';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreAppProvider } from '@providers/app';
import { coreSlideInOut } from '@classes/animations';
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

    protected siteId: string;
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

    userId: number;
    currentUserId: number;
    title: string;
    profileLink: string;
    showProfileLink: boolean;
    loaded = false;
    showKeyboard = false;
    canLoadMore = false;
    messages = [];
    showDelete = false;
    canDelete = false;
    scrollBottom = true;
    viewDestroyed = false;

    constructor(private eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider, navParams: NavParams,
            private userProvider: CoreUserProvider, private navCtrl: NavController, private messagesSync: AddonMessagesSyncProvider,
            private domUtils: CoreDomUtilsProvider, private messagesProvider: AddonMessagesProvider, logger: CoreLoggerProvider,
            private utils: CoreUtilsProvider, private appProvider: CoreAppProvider, private translate: TranslateService) {
        this.siteId = sitesProvider.getCurrentSiteId();
        this.currentUserId = sitesProvider.getCurrentSiteUserId();

        this.logger = logger.getInstance('AddonMessagesDiscussionPage');

        this.userId = navParams.get('userId');
        this.showKeyboard = navParams.get('showKeyboard');

        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = eventsProvider.on(AddonMessagesSyncProvider.AUTO_SYNCED, (data) => {
            if (data.userId == this.userId) {
                // Fetch messages.
                this.fetchData();

                // Show first warning if any.
                if (data.warnings && data.warnings[0]) {
                    this.domUtils.showErrorModal(data.warnings[0]);
                }
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
        // Use smallmessage instead of message ID because ID changes when a message is read.
        message.hash = Md5.hashAsciiStr(message.smallmessage) + '#' + message.timecreated + '#' + message.useridfrom;
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
        if (position > 0) {
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
        this.showProfileLink = !backViewPage || backViewPage !== 'CoreUserProfilePage';

        // Get the user profile to retrieve the user fullname and image.
        this.userProvider.getProfile(this.userId, undefined, true).then((user) => {
            if (!this.title) {
                this.title = user.fullname;
            }
            this.profileLink = user.profileimageurl;
        });

        // Synchronize messages if needed.
        this.messagesSync.syncDiscussion(this.userId).catch(() => {
            // Ignore errors.
        }).then((warnings) => {
            if (warnings && warnings[0]) {
                this.domUtils.showErrorModal(warnings[0]);
            }

            // Fetch the messages for the first time.
            return this.fetchData().then(() => {
                if (!this.title && this.messages.length) {
                    // Didn't receive the fullname via argument. Try to get it from messages.
                    // It's possible that name cannot be resolved when no messages were yet exchanged.
                    if (this.messages[0].useridto != this.currentUserId) {
                        this.title = this.messages[0].usertofullname || '';
                    } else {
                        this.title = this.messages[0].userfromfullname || '';
                    }
                }
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
            }).finally(() => {
                this.checkCanDelete();
                this.resizeContent();
                this.loaded = true;
            });
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
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchData(): Promise<any> {
        this.logger.debug(`Polling new messages for discussion with user '${this.userId}'`);
        if (this.messagesBeingSent > 0) {
            // We do not poll while a message is being sent or we could confuse the user.
            // Otherwise, his message would disappear from the list, and he'd have to wait for the interval to check for messages.
            return Promise.reject(null);
        } else if (this.fetching) {
            // Already fetching.
            return Promise.reject(null);
        }

        this.fetching = true;

        // Wait for synchronization process to finish.
        return this.messagesSync.waitForSync(this.userId).then(() => {
            // Fetch messages. Invalidate the cache before fetching.
            return this.messagesProvider.invalidateDiscussionCache(this.userId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            return this.getDiscussion(this.pagesLoaded);
        }).then((messages) => {
            if (this.viewDestroyed) {
                return Promise.resolve();
            }

            // Check if we are at the bottom to scroll it after render.
            this.scrollBottom = this.content.scrollHeight - this.content.scrollTop === this.content.contentHeight;

            if (this.messagesBeingSent > 0) {
                // Ignore polling due to a race condition.
                return Promise.reject(null);
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

            // Notify that there can be a new message.
            this.notifyNewMessage();

            // Mark retrieved messages as read if they are not.
            this.markMessagesAsRead();
        }).finally(() => {
            this.fetching = false;
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
    protected getDiscussion(pagesToLoad: number, lfReceivedUnread: number = 0, lfReceivedRead: number = 0, lfSentUnread: number = 0,
            lfSentRead: number = 0): Promise<any> {

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
                return this.getDiscussion(pagesToLoad, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead)
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
    protected markMessagesAsRead(): void {
        let readChanged = false;
        const promises = [];

        if (this.messagesProvider.isMarkAllMessagesReadEnabled()) {
            let messageUnreadFound = false;
            // Mark all messages at a time if one messages is unread.
            for (const x in this.messages) {
                const message = this.messages[x];
                // If an unread message is found, mark all messages as read.
                if (message.useridfrom != this.currentUserId && message.read == 0) {
                    messageUnreadFound = true;
                    break;
                }
            }
            if (messageUnreadFound) {
                this.setUnreadLabelPosition();
                promises.push(this.messagesProvider.markAllMessagesRead(this.userId).then(() => {
                    readChanged = true;
                    // Mark all messages as read.
                    this.messages.forEach((message) => {
                        message.read = 1;
                    });
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
                userId: this.userId,
                message: this.lastMessage.text,
                timecreated: this.lastMessage.timecreated
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

        let previousMessageRead = false;

        for (const x in this.messages) {
            const message = this.messages[x];
            if (message.useridfrom != this.currentUserId) {
                // Place unread from message label only once.
                message.unreadFrom = message.read == 0 && previousMessageRead;

                if (message.unreadFrom) {
                    // Save where the label is placed.
                    this.unreadMessageFrom = parseInt(message.id, 10);
                    break;
                }

                previousMessageRead = message.read != 0;
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
            for (const x in this.messages) {
                const message = this.messages[x];
                if (message.id == this.unreadMessageFrom) {
                    message.unreadFrom = false;
                    break;
                }
            }

            // Label hidden.
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
        if (!this.polling) {
            // Start polling.
            this.polling = setInterval(() => {
                this.fetchData().catch(() => {
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
     * Copy message to clipboard
     *
     * @param {string} text Message text to be copied.
     */
    copyMessage(text: string): void {
        this.utils.copyToClipboard(text);
    }

    /**
     * Function to delete a message.
     *
     * @param {any} message  Message object to delete.
     * @param {number} index Index where the mesasge is to delete it from the view.
     */
    deleteMessage(message: any, index: number): void {
        const langKey = message.pending ? 'core.areyousure' : 'addon.messages.deletemessageconfirmation';
        this.domUtils.showConfirm(this.translate.instant(langKey)).then(() => {
            const modal = this.domUtils.showModalLoading('core.deleting', true);

            return this.messagesProvider.deleteMessage(message).then(() => {
                 // Remove message from the list without having to wait for re-fetch.
                this.messages.splice(index, 1);
                this.removeMessage(message.hash);
                this.notifyNewMessage();

                this.fetchData(); // Re-fetch messages to update cached data.
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
     * @param {any} [infiniteScroll] Infinite scroll object.
     * @return {Promise<any>} Resolved when done.
     */
    loadPrevious(infiniteScroll: any): Promise<any> {
        // If there is an ongoing fetch, wait for it to finish.
        return this.waitForFetch().finally(() => {
            this.pagesLoaded++;

            this.fetchData().catch((error) => {
                this.pagesLoaded--;
                this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
            }).finally(() => {
                infiniteScroll.complete();
            });
        });
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
            if (!this.viewDestroyed && this.content && this.content.contentHeight != this.oldContentHeight) {
                if (!top) {
                    top = this.content.getContentDimensions().scrollTop;
                }

                top += this.oldContentHeight - this.content.contentHeight;
                this.oldContentHeight = this.content.contentHeight;

                this.content.scrollTo(0, top, 0);
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
                    this.content.scrollToBottom(0);
                }
            });
            this.scrollBottom = false;
        }
    }

    /**
     * Sends a message to the server.
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
        this.addMessage(message, false);

        this.messagesBeingSent++;

        // If there is an ongoing fetch, wait for it to finish.
        // Otherwise, if a message is sent while fetching it could disappear until the next fetch.
        this.waitForFetch().finally(() => {
            this.messagesProvider.sendMessage(this.userId, text).then((data) => {
                let promise;

                this.messagesBeingSent--;

                if (data.sent) {
                    // Message was sent, fetch messages right now.
                    promise = this.fetchData();
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
        } else if (message.pending) {
            // If pending, it has no date, not show.
            return false;
        }

        // Check if day has changed.
        return !moment(message.timecreated).isSame(prevMessage.timecreated, 'day');
    }

    /**
     * Toggles delete state.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        // Unset again, just in case.
        this.unsetPolling();
        this.syncObserver && this.syncObserver.off();
        this.viewDestroyed = true;
    }
}
