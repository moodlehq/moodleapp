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

import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CoreAnimations } from '@components/animations';
import { CoreSendMessageFormComponent } from '@components/send-message-form/send-message-form';
import { CanLeave } from '@guards/can-leave';
import { IonContent } from '@ionic/angular';
import { CoreApp } from '@services/app';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Network, NgZone, Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import { AddonModChatUsersModalComponent, AddonModChatUsersModalResult } from '../../components/users-modal/users-modal';
import { AddonModChat, AddonModChatProvider, AddonModChatUser } from '../../services/chat';
import { AddonModChatFormattedMessage, AddonModChatHelper } from '../../services/chat-helper';

/**
 * Page that displays a chat session.
 */
@Component({
    selector: 'page-addon-mod-chat-chat',
    templateUrl: 'chat.html',
    animations: [CoreAnimations.SLIDE_IN_OUT],
    styleUrls: ['chat.scss'],
})
export class AddonModChatChatPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild(IonContent) content?: IonContent;
    @ViewChild(CoreSendMessageFormComponent) sendMessageForm?: CoreSendMessageFormComponent;

    loaded = false;
    title = '';
    messages: AddonModChatFormattedMessage[] = [];
    newMessage?: string;
    polling?: number;
    isOnline: boolean;
    currentUserId: number;
    sending = false;
    courseId!: number;
    cmId!: number;

    protected chatId!: number;
    protected sessionId?: string;
    protected lastTime = 0;
    protected oldContentHeight = 0;
    protected onlineSubscription: Subscription;
    protected keyboardObserver: CoreEventObserver;
    protected viewDestroyed = false;
    protected pollingRunning = false;
    protected users: AddonModChatUser[] = [];

    constructor() {
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.isOnline = CoreApp.isOnline();
        this.onlineSubscription = Network.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreApp.isOnline();
            });
        });

        // Recalculate footer position when keyboard is shown or hidden.
        this.keyboardObserver = CoreEvents.on(CoreEvents.KEYBOARD_CHANGE, () => {
            // @todo probably not needed.
            // this.content.resize();
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.chatId = CoreNavigator.getRouteNumberParam('chatId')!;
        this.title = CoreNavigator.getRouteParam('title') || '';

        try {
            await this.loginUser();

            await this.fetchMessages();

            this.startPolling();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileconnecting', true);
            CoreNavigator.back();
        } finally {
            this.loaded = true;
        }

    }

    /**
     * Runs when the page has fully entered and is now the active page.
     * This event will fire, whether it was the first load or a cached page.
     */
    ionViewDidEnter(): void {
        this.startPolling();
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'chat' });
        this.stopPolling();
    }

    /**
     * Convenience function to login the user.
     *
     * @return Promise resolved when done.
     */
    protected async loginUser(): Promise<void> {
        this.sessionId = await AddonModChat.loginUser(this.chatId);
    }

    /**
     * Convenience function to fetch chat messages.
     *
     * @return Promise resolved when done.
     */
    protected async fetchMessages(): Promise<void> {
        const messagesInfo = await AddonModChat.getLatestMessages(this.sessionId!, this.lastTime);

        this.lastTime = messagesInfo.chatnewlasttime || 0;

        const messages = await AddonModChat.getMessagesUserData(messagesInfo.messages, this.courseId);

        if (!messages.length) {
            // No messages yet, nothing else to do.
            return;
        }

        const previousLength = this.messages.length;
        this.messages = this.messages.concat(messages);

        // Calculate which messages need to display the date or user data.
        for (let index = previousLength; index < this.messages.length; index++) {
            const prevMessage = index > 0 ? this.messages[index - 1] : undefined;

            this.messages[index] = AddonModChatHelper.formatMessage(this.currentUserId, this.messages[index], prevMessage);

            const message = this.messages[index];

            if (message.beep && message.beep != String(this.currentUserId)) {
                this.loadMessageBeepWho(message);
            }
        }

        this.messages[this.messages.length - 1].showTail = true;

        // New messages or beeps, scroll to bottom.
        setTimeout(() => this.scrollToBottom());
    }

    protected async loadMessageBeepWho(message: AddonModChatFormattedMessage): Promise<void> {
        message.beepWho = await this.getUserFullname(message.beep!);
    }

    /**
     * Display the chat users modal.
     */
    async showChatUsers(): Promise<void> {
        // Create the toc modal.
        const modalData = await CoreDomUtils.openSideModal<AddonModChatUsersModalResult>({
            component: AddonModChatUsersModalComponent,
            componentProps: {
                sessionId: this.sessionId,
                cmId: this.cmId,
            },
        });

        if (modalData) {
            if (modalData.talkTo) {
                this.newMessage = `To ${modalData.talkTo}: ` + (this.sendMessageForm?.message || '');
            }
            if (modalData.beepTo) {
                this.sendMessage('', modalData.beepTo);
            }

            this.users = modalData.users;
        }
    }

    /**
     * Get the user fullname for a beep.
     *
     * @param id User Id before parsing.
     * @return User fullname.
     */
    protected async getUserFullname(id: string): Promise<string> {
        const idNumber = parseInt(id, 10);

        if (isNaN(idNumber)) {
            return id;
        }

        const user = this.users.find((user) => user.id == idNumber);

        if (user) {
            return user.fullname;
        }

        try {
            const data = await AddonModChat.getChatUsers(this.sessionId!, { cmId: this.cmId });

            this.users = data.users;
            const user = this.users.find((user) => user.id == idNumber);

            if (user) {
                return user.fullname;
            }

            return id;
        } catch (error) {
            // Ignore errors.
            return id;
        }
    }

    /**
     * Start the polling to get chat messages periodically.
     */
    protected startPolling(): void {
        // We already have the polling in place.
        if (this.polling) {
            return;
        }

        // Start polling.
        this.polling = window.setInterval(() => {
            CoreUtils.ignoreErrors(this.fetchMessagesInterval());
        }, AddonModChatProvider.POLL_INTERVAL);
    }

    /**
     * Stop polling for messages.
     */
    protected stopPolling(): void {
        clearInterval(this.polling);
        this.polling = undefined;
    }

    /**
     * Convenience function to be called every certain time to fetch chat messages.
     *
     * @return Promise resolved when done.
     */
    protected async fetchMessagesInterval(): Promise<void> {
        if (!this.isOnline || this.pollingRunning) {
            // Obviously we cannot check for new messages when the app is offline.
            return;
        }

        this.pollingRunning = true;

        try {
            await this.fetchMessages();
        } catch {
            try {
                // Try to login, it might have failed because the session expired.
                await this.loginUser();

                await this.fetchMessages();
            } catch (error) {
                // Fail again. Stop polling if needed.
                this.stopPolling();
                CoreDomUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileretrievingmessages', true);

                throw error;
            }
        } finally {
            this.pollingRunning = false;
        }
    }

    /**
     * Send a message to the chat.
     *
     * @param text Text of the nessage.
     * @param beep ID of the user to beep.
     */
    async sendMessage(text: string, beep: number = 0): Promise<void> {
        if (!this.isOnline) {
            // Silent error, the view should prevent this.
            return;
        } else if (beep === 0 && !text.trim()) {
            // Silent error.
            return;
        }

        this.sending = true;

        try {
            await AddonModChat.sendMessage(this.sessionId!, text, beep);

            // Update messages to show the sent message.
            CoreUtils.ignoreErrors(this.fetchMessagesInterval());
        } catch (error) {
            // Only close the keyboard if an error happens, we want the user to be able to send multiple
            // messages without the keyboard being closed.
            CoreApp.closeKeyboard();

            this.newMessage = text;
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhilesendingmessage', true);
        } finally {
            this.sending = false;
        }
    }

    /**
     * Try to reconnect.
     *
     * @return Promise resolved when done.
     */
    async reconnect(): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            // Call startPolling would take a while for the first execution, so we'll execute it manually to check if it works now.
            await this.fetchMessagesInterval();

            // It works, start the polling again.
            this.startPolling();
        } catch {
            // Ignore errors.
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Scroll bottom when render has finished.
     */
    scrollToBottom(): void {
        // Need a timeout to leave time to the view to be rendered.
        setTimeout(() => {
            if (!this.viewDestroyed) {
                this.content?.scrollToBottom();
            }
        });
    }

    /**
     * Content or scroll has been resized. For content, only call it if it's been added on top.
     */
    resizeContent(): void {
        // @todo probably not needed.
        // let top = this.content.getContentDimensions().scrollTop;
        // this.content.resize();

        // // Wait for new content height to be calculated.
        // setTimeout(() => {
        //     // Visible content size changed, maintain the bottom position.
        //     if (!this.viewDestroyed && this.content && this.domUtils.getContentHeight(this.content) != this.oldContentHeight) {
        //         if (!top) {
        //             top = this.content.getContentDimensions().scrollTop;
        //         }

        //         top += this.oldContentHeight - this.domUtils.getContentHeight(this.content);
        //         this.oldContentHeight = this.domUtils.getContentHeight(this.content);

        //         this.content.scrollTo(0, top, 0);
        //     }
        // });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved with true if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (! this.messages.some((message) => !message.special)) {
            return true;
        }

        // Modified, confirm user wants to go back.
        await CoreDomUtils.showConfirm(Translate.instant('addon.mod_chat.confirmloss'));

        return true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.onlineSubscription && this.onlineSubscription.unsubscribe();
        this.keyboardObserver && this.keyboardObserver.off();
        this.stopPolling();
        this.viewDestroyed = true;
    }

}
