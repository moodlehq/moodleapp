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

import { Component, OnInit } from '@angular/core';
import { CoreUser } from '@features/user/services/user';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { AddonModChat } from '../../services/chat';
import { AddonModChatFormattedSessionMessage, AddonModChatHelper } from '../../services/chat-helper';

/**
 * Page that displays list of chat session messages.
 */
@Component({
    selector: 'page-addon-mod-chat-session-messages',
    templateUrl: 'session-messages.html',
    styleUrls: ['session-messages.scss'],
})
export class AddonModChatSessionMessagesPage implements OnInit {

    currentUserId!: number;
    cmId!: number;
    messages: AddonModChatFormattedSessionMessage[] = [];
    loaded = false;
    courseId!: number;

    protected chatId!: number;
    protected sessionStart!: number;
    protected sessionEnd!: number;
    protected groupId!: number;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.sessionStart = CoreNavigator.getRequiredRouteNumberParam('sessionStart');
            this.sessionEnd = CoreNavigator.getRequiredRouteNumberParam('sessionEnd');
            this.chatId = CoreNavigator.getRequiredRouteNumberParam('chatId');
            this.groupId = CoreNavigator.getRouteNumberParam('groupId') || 0;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.currentUserId = CoreSites.getCurrentSiteUserId();

        this.fetchMessages();
    }

    /**
     * Fetch session messages.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchMessages(): Promise<void> {
        try {
            const messages = await AddonModChat.getSessionMessages(
                this.chatId,
                this.sessionStart,
                this.sessionEnd,
                this.groupId,
                { cmId: this.cmId },
            );

            this.messages = await AddonModChat.getMessagesUserData(messages, this.courseId);

            // Calculate which messages need to display the date or user data.
            for (let index = 0 ; index < this.messages.length; index++) {
                const prevMessage = index > 0 ? this.messages[index - 1] : undefined;

                this.messages[index] = AddonModChatHelper.formatMessage(this.currentUserId, this.messages[index], prevMessage);

                const message = this.messages[index];

                if (message.beep && message.beep != String(this.currentUserId)) {
                    this.loadMessageBeepWho(message);
                }
            }

            this.messages[this.messages.length - 1].showTail = true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        } finally {
            this.loaded = true;
        }
    }

    protected async loadMessageBeepWho(message: AddonModChatFormattedSessionMessage): Promise<void> {
        message.beepWho = await this.getUserFullname(message.beep!);
    }

    /**
     * Get the user fullname for a beep.
     *
     * @param id User Id before parsing.
     * @returns User fullname.
     */
    protected async getUserFullname(id: string): Promise<string> {
        const idNumber = parseInt(id, 10);

        if (isNaN(idNumber)) {
            return id;
        }

        try {
            const user = await CoreUser.getProfile(idNumber, this.courseId, true);

            return user.fullname;
        } catch {
            // Error getting profile.
            return id;
        }
    }

    /**
     * Refresh session messages.
     *
     * @param refresher Refresher.
     */
    async refreshMessages(refresher: IonRefresher): Promise<void> {
        try {
            await CoreUtils.ignoreErrors(AddonModChat.invalidateSessionMessages(this.chatId, this.sessionStart, this.groupId));

            await this.fetchMessages();
        } finally {
            refresher.complete();
        }
    }

}
