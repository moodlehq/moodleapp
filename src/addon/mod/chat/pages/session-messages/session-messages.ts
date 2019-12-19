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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModChatProvider } from '../../providers/chat';
import { AddonModChatHelperProvider, AddonModChatSessionMessageForView } from '../../providers/helper';

/**
 * Page that displays list of chat session messages.
 */
@IonicPage({ segment: 'addon-mod-chat-session-messages' })
@Component({
    selector: 'page-addon-mod-chat-session-messages',
    templateUrl: 'session-messages.html',
})
export class AddonModChatSessionMessagesPage {

    currentUserId: number;
    cmId: number;
    messages: AddonModChatSessionMessageForView[] = [];
    loaded = false;

    protected courseId: number;
    protected chatId: number;
    protected sessionStart: number;
    protected sessionEnd: number;
    protected groupId: number;

    constructor(navParams: NavParams, private domUtils: CoreDomUtilsProvider, private chatProvider: AddonModChatProvider,
        sitesProvider: CoreSitesProvider, private chatHelper: AddonModChatHelperProvider, private userProvider: CoreUserProvider) {
        this.courseId = navParams.get('courseId');
        this.chatId = navParams.get('chatId');
        this.groupId = navParams.get('groupId');
        this.sessionStart = navParams.get('sessionStart');
        this.sessionEnd = navParams.get('sessionEnd');
        this.cmId = navParams.get('cmId');
        this.currentUserId = sitesProvider.getCurrentSiteUserId();

        this.fetchMessages();
    }

    /**
     * Fetch session messages.
     *
     * @return Promise resolved when done.
     */
    protected fetchMessages(): Promise<any> {
        return this.chatProvider.getSessionMessages(this.chatId, this.sessionStart, this.sessionEnd, this.groupId)
                .then((messages) => {
            return this.chatProvider.getMessagesUserData(messages, this.courseId).then((messages) => {
                this.messages = <AddonModChatSessionMessageForView[]> messages;

                if (messages.length) {
                    // Calculate which messages need to display the date or user data.
                    for (let index = 0 ; index < this.messages.length; index++) {
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
                }
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        }).finally(() => {
            this.loaded = true;
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

        return this.userProvider.getProfile(parseInt(id, 10), this.courseId, true).then((user) => {
            return user.fullname;
        }).catch(() => {
            // Error getting profile.
            return  id;
        });
    }

    /**
     * Refresh session messages.
     *
     * @param refresher Refresher.
     */
    refreshMessages(refresher: any): void {
        this.chatProvider.invalidateSessionMessages(this.chatId, this.sessionStart, this.groupId).finally(() => {
            this.fetchMessages().finally(() => {
                refresher.complete();
            });
        });
    }

}
