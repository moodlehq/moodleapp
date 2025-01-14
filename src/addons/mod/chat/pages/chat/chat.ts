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
import { CoreSendMessageFormComponent } from '@components/send-message-form/send-message-form';
import { CanLeave } from '@guards/can-leave';
import { IonContent } from '@ionic/angular';
import { CoreNetwork } from '@services/network';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { NgZone, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import { AddonModChatUsersModalResult } from '../../components/users-modal/users-modal';
import { AddonModChat, AddonModChatUser } from '../../services/chat';
import { AddonModChatFormattedMessage, AddonModChatHelper } from '../../services/chat-helper';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreKeyboard } from '@singletons/keyboard';
import { CoreWait } from '@singletons/wait';
import { CoreModals } from '@services/overlays/modals';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Page that displays a chat session.
 */
@Component({
    selector: 'page-addon-mod-chat-chat',
    templateUrl: 'chat.html',
    styleUrls: ['../../../../../theme/components/discussion.scss', 'chat.scss'],
})
export class AddonModChatChatPage implements OnInit, OnDestroy, CanLeave {

    protected static readonly POLL_INTERVAL = 4000;

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
    protected viewDestroyed = false;
    protected pollingRunning = false;
    protected users: AddonModChatUser[] = [];
    protected logView: () => void;

    constructor() {
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.isOnline = CoreNetwork.isOnline();
        this.onlineSubscription = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreNetwork.isOnline();
            });
        });

        this.logView = CoreTime.once(() => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'mod_chat_get_chat_latest_messages',
                name: this.title,
                data: { chatid: this.chatId, category: 'chat' },
                url: `/mod/chat/gui_ajax/index.php?id=${this.chatId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.chatId = CoreNavigator.getRequiredRouteNumberParam('chatId');
            this.title = CoreNavigator.getRouteParam('title') || '';

            await this.loginUser();

            await this.fetchMessages();

            this.startPolling();
            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_chat.errorwhileconnecting') });
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
     * @returns Promise resolved when done.
     */
    protected async loginUser(): Promise<void> {
        this.sessionId = await AddonModChat.loginUser(this.chatId);
    }

    /**
     * Convenience function to fetch chat messages.
     *
     * @returns Promise resolved when done.
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

            if (message.beep && message.beep !== this.currentUserId) {
                this.loadMessageBeepWho(message);
            }
        }

        this.messages[this.messages.length - 1].showTail = true;

        // New messages or beeps, scroll to bottom.
        this.scrollToBottom();
    }

    protected async loadMessageBeepWho(message: AddonModChatFormattedMessage): Promise<void> {
        message.beepWho = await this.getUserFullname(message.beep!);
    }

    /**
     * Display the chat users modal.
     */
    async showChatUsers(): Promise<void> {
        const { AddonModChatUsersModalComponent } = await import('../../components/users-modal/users-modal');

        // Create the toc modal.
        const modalData = await CoreModals.openSideModal<AddonModChatUsersModalResult>({
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
     * @returns User fullname.
     */
    protected async getUserFullname(id: string | number): Promise<string> {
        const idNumber = Number(id);

        if (isNaN(idNumber)) {
            return String(id);
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

            return String(id);
        } catch {
            // Ignore errors.
            return String(id);
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
            CorePromiseUtils.ignoreErrors(this.fetchMessagesInterval());
        }, AddonModChatChatPage.POLL_INTERVAL);
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
     * @returns Promise resolved when done.
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
                CoreAlerts.showError(error, { default: Translate.instant('addon.mod_chat.errorwhileretrievingmessages') });

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
            CorePromiseUtils.ignoreErrors(this.fetchMessagesInterval());
        } catch (error) {
            // Only close the keyboard if an error happens, we want the user to be able to send multiple
            // messages without the keyboard being closed.
            CoreKeyboard.close();

            this.newMessage = text;
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_chat.errorwhilesendingmessage') });
        } finally {
            this.sending = false;
        }
    }

    /**
     * Try to reconnect.
     *
     * @returns Promise resolved when done.
     */
    async reconnect(): Promise<void> {
        const modal = await CoreLoadings.show();

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
    async scrollToBottom(): Promise<void> {
        // Need a timeout to leave time to the view to be rendered.
        await CoreWait.nextTick();
        if (!this.viewDestroyed) {
            this.content?.scrollToBottom();
        }
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved with true if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (! this.messages.some((message) => !message.special)) {
            return true;
        }

        // Modified, confirm user wants to go back.
        await CoreAlerts.confirm(Translate.instant('addon.mod_chat.confirmloss'));

        return true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.onlineSubscription && this.onlineSubscription.unsubscribe();
        this.stopPolling();
        this.viewDestroyed = true;
    }

}
