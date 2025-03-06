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

import { Injectable } from '@angular/core';
import { makeSingleton, Translate } from '@singletons';
import dayjs from 'dayjs';
import { AddonModChatMessage, AddonModChatSessionMessage } from './chat';

const patternTo = new RegExp(/^To\s([^:]+):(.*)/);

/**
 * Helper service that provides some features for chat.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChatHelperProvider {

    /**
     * Give some format info about messages.
     *
     * @param currentUserId User Id.
     * @param message Message.
     * @param prevMessage Previous message (if any).
     * @returns Message with additional info.
     */
    formatMessage(
        currentUserId: number,
        message: AddonModChatMessage,
        prevMessage?: AddonModChatFormattedMessage,
    ): AddonModChatFormattedMessage;
    formatMessage(
        currentUserId: number,
        message: AddonModChatSessionMessage,
        prevMessage?: AddonModChatFormattedSessionMessage,
    ): AddonModChatFormattedSessionMessage;
    formatMessage(
        currentUserId: number,
        message: AddonModChatMessage | AddonModChatSessionMessage,
        prevMessage?: AddonModChatAnyFormattedMessage,
    ): AddonModChatAnyFormattedMessage {
        const formattedMessage: AddonModChatAnyFormattedMessage = message;

        formattedMessage.message = formattedMessage.message.trim();

        formattedMessage.showDate = this.showDate(message, prevMessage);
        formattedMessage.beep = (message.message.substring(0, 5) == 'beep ' && message.message.substring(5).trim()) || undefined;
        if (formattedMessage.beep && !isNaN(Number(formattedMessage.beep))) {
            formattedMessage.beep = Number(formattedMessage.beep);
        }

        formattedMessage.special = !!formattedMessage.beep || (<AddonModChatSessionMessage> message).issystem ||
            (<AddonModChatMessage> message).system;

        if (formattedMessage.message.substring(0, 4) == '/me ') {
            formattedMessage.special = true;
            formattedMessage.message = formattedMessage.message.substring(4).trim();
        }

        if (!formattedMessage.special && formattedMessage.message.match(patternTo)) {
            const matches = formattedMessage.message.match(patternTo);

            formattedMessage.message = `<em>
                <strong>${Translate.instant('addon.mod_chat.saidto')} </strong>
                ${matches![1]}</em>: ${matches![2]}`;
        }

        formattedMessage.showUserData = this.showUserData(currentUserId, message, prevMessage);
        if (prevMessage) {
            prevMessage.showTail = this.showTail(prevMessage, message);
        }

        return formattedMessage;
    }

    /**
     * Check if the user info should be displayed for the current message.
     * User data is only displayed if the previous message was from another user.
     *
     * @param currentUserId Current User Id.
     * @param message Current message where to show the user info.
     * @param prevMessage Previous message.
     * @returns Whether user data should be shown.
     */
    protected showUserData(
        currentUserId: number,
        message: AddonModChatAnyFormattedMessage,
        prevMessage?: AddonModChatAnyFormattedMessage,
    ): boolean {
        return message.userid != currentUserId &&
            (!prevMessage || prevMessage.userid != message.userid || !!message.showDate || !!prevMessage.special);
    }

    /**
     * Check if a css tail should be shown.
     *
     * @param message Current message where to show the user info.
     * @param nextMessage Next message.
     * @returns Whether user data should be shown.
     */
    protected showTail(message: AddonModChatAnyFormattedMessage, nextMessage?: AddonModChatAnyFormattedMessage): boolean {
        return !nextMessage || nextMessage.userid != message.userid || !!nextMessage.showDate || !!nextMessage.special;
    }

    /**
     * Check if the date should be displayed between messages (when the day changes at midnight for example).
     *
     * @param message New message object.
     * @param prevMessage Previous message object.
     * @returns True if messages are from diferent days, false othetwise.
     */
    protected showDate(message: AddonModChatAnyFormattedMessage, prevMessage?: AddonModChatAnyFormattedMessage): boolean {
        if (!prevMessage) {
            return true;
        }

        // Check if day has changed.
        return !dayjs.tz(message.timestamp * 1000).isSame(prevMessage.timestamp * 1000, 'day');
    }

}

export const AddonModChatHelper = makeSingleton(AddonModChatHelperProvider);

/**
 * Special info for view usage.
 */
type AddonModChatInfoForView = {
    showDate?: boolean; // If date should be displayed before the message.
    beep?: string | number; // User id of the beeped user or 'all'.
    special?: boolean; // True if is an special message (system, beep or command).
    showUserData?: boolean; // If user data should be displayed.
    showTail?: boolean; // If tail should be displayed (decoration).
    beepWho?: string; // Fullname of the beeped user.
};

/**
 * Message with data for view usage.
 */
export type AddonModChatFormattedMessage = AddonModChatMessage & AddonModChatInfoForView;

/**
 * Session message with data for view usage.
 */
export type AddonModChatFormattedSessionMessage = AddonModChatSessionMessage & AddonModChatInfoForView;

/**
 * Any possivle formatted message.
 */
export type AddonModChatAnyFormattedMessage = AddonModChatFormattedMessage | AddonModChatFormattedSessionMessage;
