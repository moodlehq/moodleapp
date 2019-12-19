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

import { Component, NgZone } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModChatProvider, AddonModChatUser } from '../../providers/chat';
import { Network } from '@ionic-native/network';

/**
 * Page that displays the chat session users.
 */
@IonicPage({ segment: 'addon-mod-chat-users' })
@Component({
    selector: 'page-addon-mod-chat-users',
    templateUrl: 'users.html',
})
export class AddonModChatUsersPage {

    users: AddonModChatUser[] = [];
    usersLoaded = false;
    currentUserId: number;
    isOnline: boolean;

    protected sessionId: string;
    protected onlineObserver: any;

    constructor(navParams: NavParams, network: Network,  zone: NgZone, private appProvider: CoreAppProvider,
            private sitesProvider: CoreSitesProvider, private viewCtrl: ViewController,
            private domUtils: CoreDomUtilsProvider, private chatProvider: AddonModChatProvider) {
        this.sessionId = navParams.get('sessionId');
        this.isOnline = this.appProvider.isOnline();
        this.currentUserId = this.sitesProvider.getCurrentSiteUserId();
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
        this.chatProvider.getChatUsers(this.sessionId).then((data) => {
            this.users = data.users;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhilegettingchatusers', true);
        }).finally(() => {
            this.usersLoaded = true;
        });
    }

    /**
     * Close the chat users modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss({users: this.users});
    }

    /**
     * Add "To user:".
     *
     * @param user User object.
     */
    talkTo(user: AddonModChatUser): void {
        this.viewCtrl.dismiss({talkTo: user.fullname, users: this.users});
    }

    /**
     * Beep a user.
     *
     * @param user User object.
     */
    beepTo(user: AddonModChatUser): void {
        this.viewCtrl.dismiss({beepTo: user.id, users: this.users});
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }
}
