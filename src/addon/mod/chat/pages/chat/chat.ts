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

import { Component, ViewChild, NgZone } from '@angular/core';
import { Content, IonicPage, ModalController, NavController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModChatProvider } from '../../providers/chat';
import { AddonModChatHelperProvider, AddonModChatMessageForView } from '../../providers/helper';
import { Network } from '@ionic-native/network';
import { coreSlideInOut } from '@classes/animations';
import { CoreSendMessageFormComponent } from '@components/send-message-form/send-message-form';

/**
 * Page that displays a chat session.
 */
@IonicPage({ segment: 'addon-mod-chat-chat' })
@Component({
    selector: 'page-addon-mod-chat-chat',
    templateUrl: 'chat.html',
    animations: [coreSlideInOut]
})
export class AddonModChatChatPage {
    @ViewChild(Content) content: Content;
    @ViewChild(CoreSendMessageFormComponent) sendMessageForm: CoreSendMessageFormComponent;

    loaded = false;
    title: string;
    messages: AddonModChatMessageForView[] = [];
    newMessage: string;
    polling: any;
    isOnline: boolean;
    currentUserId: number;
    sending: boolean;
    cmId: number;

    protected logger;
    protected courseId: number;
    protected chatId: number;
    protected sessionId: string;
    protected lastTime = 0;
    protected oldContentHeight = 0;
    protected onlineObserver: any;
    protected keyboardObserver: any;
    protected viewDestroyed = false;
    protected pollingRunning = false;
    protected users = [];

    constructor(navParams: NavParams, logger: CoreLoggerProvider, network: Network,  zone: NgZone, private navCtrl: NavController,
            private chatProvider: AddonModChatProvider, private appProvider: CoreAppProvider, sitesProvider: CoreSitesProvider,
            private modalCtrl: ModalController, private domUtils: CoreDomUtilsProvider,
            private eventsProvider: CoreEventsProvider, private chatHelper: AddonModChatHelperProvider) {

        this.chatId = navParams.get('chatId');
        this.courseId = navParams.get('courseId');
        this.title = navParams.get('title');
        this.cmId = navParams.get('cmId');

        this.logger = logger.getInstance('AddonModChoiceChoicePage');
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.isOnline = this.appProvider.isOnline();
        this.onlineObserver = network.onchange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.isOnline = this.appProvider.isOnline();
            });
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.loginUser().then(() => {
            return this.fetchMessages().then(() => {
                this.startPolling();
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileretrievingmessages', true);
                this.navCtrl.pop();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileconnecting', true);
            this.navCtrl.pop();
        }).finally(() => {
            this.loaded = true;
        });

        // Recalculate footer position when keyboard is shown or hidden.
        this.keyboardObserver = this.eventsProvider.on(CoreEventsProvider.KEYBOARD_CHANGE, (kbHeight) => {
            this.content.resize();
        });
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
        this.stopPolling();
    }

    /**
     * Display the chat users modal.
     */
    showChatUsers(): void {
        // Create the toc modal.
        const modal =  this.modalCtrl.create('AddonModChatUsersPage', {
            sessionId: this.sessionId
        }, { cssClass: 'core-modal-lateral',
            showBackdrop: true,
            enableBackdropDismiss: true,
            enterAnimation: 'core-modal-lateral-transition',
            leaveAnimation: 'core-modal-lateral-transition' });

        modal.onDidDismiss((data) => {
            if (data && data.talkTo) {
                this.newMessage = `To ${data.talkTo}: ` + (this.sendMessageForm.message || '');
            }
            if (data && data.beepTo) {
                this.sendMessage('', data.beepTo);
            }
            if (data && data.users) {
                this.users = data.users;
            }
        });

        modal.present({
            ev: event
        });
    }

    /**
     * Get the user fullname for a beep.
     *
     * @param  id User Id before parsing.
     * @return User fullname.
     */
    protected getUserFullname(id: string): Promise<string> {
        if (isNaN(parseInt(id, 10))) {
            return Promise.resolve(id);
        }

        const user = this.users.find((user) => user.id == id);

        if (user) {
            return Promise.resolve(user.fullname);
        }

        return this.chatProvider.getChatUsers(this.sessionId).then((data) => {
            this.users = data.users;
            const user = this.users.find((user) => user.id == id);

            if (user) {
                return user.fullname;
            }

            return id;
        }).catch((error) => {
            // Ignore errors.
            return id;
        });
    }

    /**
     * Convenience function to login the user.
     *
     * @return Promise resolved when done.
     */
    protected loginUser(): Promise<void> {
        return this.chatProvider.loginUser(this.chatId).then((sessionId) => {
            this.sessionId = sessionId;
        });
    }

    /**
     * Convenience function to fetch chat messages.
     *
     * @return Promise resolved when done.
     */
    protected fetchMessages(): Promise<void> {
        return this.chatProvider.getLatestMessages(this.sessionId, this.lastTime).then((messagesInfo) => {
            this.lastTime = messagesInfo.chatnewlasttime || 0;

            return this.chatProvider.getMessagesUserData(messagesInfo.messages, this.courseId).then((messages) => {
                if (messages.length) {
                    const previousLength = this.messages.length;
                    this.messages = this.messages.concat(<AddonModChatMessageForView[]> messages);

                    // Calculate which messages need to display the date or user data.
                    for (let index = previousLength ; index < this.messages.length; index++) {
                        const message = this.messages[index];
                        const prevMessage = index > 0 ? this.messages[index - 1] : null;

                        this.chatHelper.formatMessage(this.currentUserId, message, prevMessage);

                        if (message.beep && message.beep != this.currentUserId + '') {
                            this.getUserFullname(message.beep).then((fullname) => {
                                message.beepWho = fullname;
                            });
                        }
                    }

                    this.messages[this.messages.length - 1].showTail = true;

                    // New messages or beeps, scroll to bottom.
                    setTimeout(() => this.scrollToBottom());
                }
            });
        });
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
        this.polling = setInterval(() => {
            this.fetchMessagesInterval().catch(() => {
                // Ignore errors.
            });
        }, AddonModChatProvider.POLL_INTERVAL);
    }

    /**
     * Stop polling for messages.
     */
    protected stopPolling(): void {
        if (this.polling) {
            this.logger.debug('Cancelling polling for messages');
            clearInterval(this.polling);
        }
    }

    /**
     * Convenience function to be called every certain time to fetch chat messages.
     *
     * @return Promise resolved when done.
     */
    protected fetchMessagesInterval(): Promise<void> {
        this.logger.debug('Polling for messages');
        if (!this.isOnline || this.pollingRunning) {
            // Obviously we cannot check for new messages when the app is offline.
            return Promise.reject(null);
        }

        this.pollingRunning = true;

        return this.fetchMessages().catch(() => {
            // Try to login, it might have failed because the session expired.
            return this.loginUser().then(() => {
                return this.fetchMessages();
            }).catch((error) => {
                // Fail again. Stop polling if needed.
                if (this.polling) {
                    clearInterval(this.polling);
                    this.polling = undefined;
                }
                this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileretrievingmessages', true);

                return Promise.reject(null);
            });
        }).finally(() => {
            this.pollingRunning = false;
        });
    }

    /**
     * Send a message to the chat.
     *
     * @param text Text of the nessage.
     * @param beep ID of the user to beep.
     */
    sendMessage(text: string, beep: number = 0): void {
        if (!this.isOnline) {
            // Silent error, the view should prevent this.
            return;
        } else if (beep === 0 && !text.trim()) {
            // Silent error.
            return;
        }

        this.sending = true;
        this.chatProvider.sendMessage(this.sessionId, text, beep).then(() => {
            // Update messages to show the sent message.
            this.fetchMessagesInterval().catch(() => {
                // Ignore errors.
            });
        }).catch((error) => {
            /* Only close the keyboard if an error happens, we want the user to be able to send multiple
              messages without the keyboard being closed. */
            this.appProvider.closeKeyboard();

            this.newMessage = text;

            this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhilesendingmessage', true);
        }).finally(() => {
            this.sending = false;
        });
    }

    reconnect(): Promise<void> {
        const modal = this.domUtils.showModalLoading();

        // Call startPolling would take a while for the first execution, so we'll execute it manually to check if it works now.
        return this.fetchMessagesInterval().then(() => {
            // It works, start the polling again.
            this.startPolling();
        }).catch(() => {
            // Ignore errors.
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Scroll bottom when render has finished.
     */
    scrollToBottom(): void {
        // Need a timeout to leave time to the view to be rendered.
        setTimeout(() => {
            if (!this.viewDestroyed) {
                this.domUtils.scrollToBottom(this.content, 0);
            }
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
            if (!this.viewDestroyed && this.content && this.domUtils.getContentHeight(this.content) != this.oldContentHeight) {
                if (!top) {
                    top = this.content.getContentDimensions().scrollTop;
                }

                top += this.oldContentHeight - this.domUtils.getContentHeight(this.content);
                this.oldContentHeight = this.domUtils.getContentHeight(this.content);

                this.content.scrollTo(0, top, 0);
            }
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.onlineObserver && this.onlineObserver.unsubscribe();
        this.keyboardObserver && this.keyboardObserver.off();
        this.stopPolling();
        this.viewDestroyed = true;
    }
}
