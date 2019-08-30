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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreGroupsProvider, CoreGroupInfo } from '@providers/groups';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModChatProvider } from '../../providers/chat';

/**
 * Page that displays list of chat sessions.
 */
@IonicPage({ segment: 'addon-mod-chat-sessions' })
@Component({
    selector: 'page-addon-mod-chat-sessions',
    templateUrl: 'sessions.html',
})
export class AddonModChatSessionsPage {

    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    protected courseId: number;
    protected cmId: number;
    protected chatId: number;
    protected loaded = false;
    protected showAll = false;
    protected groupId = 0;
    protected groupInfo: CoreGroupInfo;
    protected sessions = [];
    protected selectedSessionStart: number;
    protected selectedSessionGroupId: number;

    constructor(navParams: NavParams, private chatProvider: AddonModChatProvider, private domUtils: CoreDomUtilsProvider,
            private userProvider: CoreUserProvider, private groupsProvider: CoreGroupsProvider,
            private translate: TranslateService, private utils: CoreUtilsProvider) {
        this.courseId = navParams.get('courseId');
        this.cmId = navParams.get('cmId');
        this.chatId = navParams.get('chatId');

        this.fetchSessions().then(() => {
            if (this.splitviewCtrl.isOn() && this.sessions.length > 0) {
                this.openSession(this.sessions[0]);
            }
        });
    }

    /**
     * Fetch chat sessions.
     *
     * @param {number} [showLoading] Display a loading modal.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchSessions(showLoading?: boolean): Promise<any> {
        const modal = showLoading ? this.domUtils.showModalLoading() : null;

        return this.groupsProvider.getActivityGroupInfo(this.cmId, false).then((groupInfo) => {
            this.groupInfo = groupInfo;
            this.groupId = this.groupsProvider.validateGroupId(this.groupId, groupInfo);

            return this.chatProvider.getSessions(this.chatId, this.groupId, this.showAll);
        }).then((sessions) => {
            // Fetch user profiles.
            const promises = [];

            sessions.forEach((session) => {
                session.duration = session.sessionend - session.sessionstart;
                session.sessionusers.forEach((sessionUser) => {
                    if (!sessionUser.userfullname) {
                        // The WS does not return the user name, fetch user profile.
                        promises.push(this.userProvider.getProfile(sessionUser.userid, this.courseId, true).then((user) => {
                            sessionUser.userfullname = user.fullname;
                        }).catch(() => {
                            // Error getting profile, most probably the user is deleted.
                            sessionUser.userfullname = this.translate.instant('core.deleteduser') + ' ' + sessionUser.userid;
                        }));
                    }
                });

                // If session has more than 4 users we display a "Show more" link.
                session.allsessionusers = session.sessionusers;
                if (session.sessionusers.length > 4) {
                    session.sessionusers = session.allsessionusers.slice(0, 3);
                }
            });

            return Promise.all(promises).then(() => {
                this.sessions = sessions;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        }).finally(() => {
            this.loaded = true;
            modal && modal.dismiss();
        });
    }

    /**
     * Refresh chat sessions.
     *
     * @param {any} refresher Refresher.
     */
    refreshSessions(refresher: any): void {
        const promises = [
            this.groupsProvider.invalidateActivityGroupInfo(this.cmId),
            this.chatProvider.invalidateSessions(this.chatId, this.groupId, this.showAll)
        ];

        this.utils.allPromises(promises).finally(() => {
            this.fetchSessions().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Navigate to a session.
     *
     * @param {any} session Chat session.
     */
    openSession(session: any): void {
        this.selectedSessionStart = session.sessionstart;
        this.selectedSessionGroupId = this.groupId;
        const params = {
            courseId: this.courseId,
            chatId: this.chatId,
            groupId: this.groupId,
            sessionStart: session.sessionstart,
            sessionEnd: session.sessionend
        };
        this.splitviewCtrl.push('AddonModChatSessionMessagesPage', params);
    }

    /**
     * Show more session users.
     *
     * @param {any} session Chat session.
     * @param {Event} $event The event.
     */
    showMoreUsers(session: any, $event: Event): void {
        session.sessionusers = session.allsessionusers;
        $event.stopPropagation();
    }
}
