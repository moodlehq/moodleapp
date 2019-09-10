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
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import * as moment from 'moment';
import AddonModChatMessageWithUserData from './chat';

/**
 * Helper service that provides some features for quiz.
 */
@Injectable()
export class AddonModChatHelperProvider {

    static patternto = new RegExp(/^To\s([^:]+):(.*)/);

    constructor(protected translate: TranslateService,
        protected textUtils: CoreTextUtilsProvider) {

    }

    /**
     * Give some format info about messages.
     *
     * @param  currentUserId User Id.
     * @param  message       Message in a discussion.
     * @param  prevMessage Previous Message in a discussion (if any).
     * @return Message with additional info.
     */
    formatMessage(currentUserId: number, message: AddonModChatMessageWithUserData,
            prevMessage?: AddonModChatMessageWithUserData): any {
        message.message = message.message.trim();

        message.showDate = this.showDate(message, prevMessage);
        message.beep = message.message.substr(0, 5) == 'beep ' && message.message.substr(5).trim();

        message.special = message.issystem || message.system || !!message.beep;

        if (message.message.substr(0, 4) == '/me ') {
            message.special = true;
            message.message = message.message.substr(4).trim();
        }

        if (!message.special && message.message.match(AddonModChatHelperProvider.patternto)) {
            const matches = message.message.match(AddonModChatHelperProvider.patternto);
            message.message = '<b>' + this.translate.instant('addon.mod_chat.saidto') +
                '</b> <i>' + matches[1] + '</i>: ' + matches[2];
        }

        message.showUserData = this.showUserData(currentUserId, message, prevMessage);
        prevMessage ?
            prevMessage.showTail = this.showTail(prevMessage, message) : null;
    }

    /**
     * Check if the user info should be displayed for the current message.
     * User data is only displayed if the previous message was from another user.
     *
     * @param message Current message where to show the user info.
     * @param prevMessage Previous message.
     * @return Whether user data should be shown.
     */
    protected showUserData(currentUserId: number, message: any, prevMessage?: any): boolean {
        return message.userid != currentUserId &&
            (!prevMessage || prevMessage.userid != message.userid || message.showDate || prevMessage.special);
    }

    /**
     * Check if a css tail should be shown.
     *
     * @param message Current message where to show the user info.
     * @param nextMessage Next message.
     * @return Whether user data should be shown.
     */
    protected showTail(message: AddonModChatMessageWithUserData, nextMessage?: AddonModChatMessageWithUserData): boolean {
        return !nextMessage || nextMessage.userid != message.userid || nextMessage.showDate || nextMessage.special;
    }

    /**
     * Check if the date should be displayed between messages (when the day changes at midnight for example).
     *
     * @param  message     New message object.
     * @param  prevMessage Previous message object.
     * @return True if messages are from diferent days, false othetwise.
     */
    protected showDate(message: AddonModChatMessageWithUserData, prevMessage: AddonModChatMessageWithUserData): boolean {
        if (!prevMessage) {
            return true;
        }

        // Check if day has changed.
        return !moment(message.timestamp * 1000).isSame(prevMessage.timestamp * 1000, 'day');
    }
}
