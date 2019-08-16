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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModChatProvider } from '../../providers/chat';
import * as moment from 'moment';

/**
 * Page that displays list of chat session messages.
 */
@IonicPage({ segment: 'addon-mod-chat-session-messages' })
@Component({
    selector: 'page-addon-mod-chat-session-messages',
    templateUrl: 'session-messages.html',
})
export class AddonModChatSessionMessagesPage {

    protected courseId: number;
    protected chatId: number;
    protected sessionStart: number;
    protected sessionEnd: number;
    protected groupId: number;
    protected loaded = false;
    protected messages = [];

    constructor(navParams: NavParams, private domUtils: CoreDomUtilsProvider, private chatProvider: AddonModChatProvider) {
        this.courseId = navParams.get('courseId');
        this.chatId = navParams.get('chatId');
        this.groupId = navParams.get('groupId');
        this.sessionStart = navParams.get('sessionStart');
        this.sessionEnd = navParams.get('sessionEnd');

        this.fetchMessages();
    }

    /**
     * Fetch session messages.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMessages(): Promise<any> {
        return this.chatProvider.getSessionMessages(this.chatId, this.sessionStart, this.sessionEnd, this.groupId)
                .then((messages) => {
            return this.chatProvider.getMessagesUserData(messages, this.courseId).then((messages) => {
                this.messages = messages;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Refresh session messages.
     *
     * @param {any} refresher Refresher.
     */
    refreshMessages(refresher: any): void {
        this.chatProvider.invalidateSessionMessages(this.chatId, this.sessionStart, this.groupId).finally(() => {
            this.fetchMessages().finally(() => {
                refresher.complete();
            });
        });
    }

   /**
    * Check if the date should be displayed between messages (when the day changes at midnight for example).
    *
    * @param  {any} message     New message object.
    * @param  {any} prevMessage Previous message object.
    * @return {boolean} True if messages are from diferent days, false othetwise.
    */
   showDate(message: any, prevMessage: any): boolean {
       if (!prevMessage) {
           return true;
       }

       // Check if day has changed.
       return !moment(message.timestamp * 1000).isSame(prevMessage.timestamp * 1000, 'day');
   }
}
