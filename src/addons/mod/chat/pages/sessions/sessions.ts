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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { Params } from '@angular/router';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreUser } from '@features/user/services/user';
import { IonRefresher } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { AddonModChat, AddonModChatSession, AddonModChatSessionUser } from '../../services/chat';

/**
 * Page that displays list of chat sessions.
 */
@Component({
    selector: 'page-addon-mod-chat-sessions',
    templateUrl: 'sessions.html',
})
export class AddonModChatSessionsPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    sessions!: AddonChatSessionsManager;
    showAll = false;
    groupId = 0;
    groupInfo?: CoreGroupInfo;

    protected courseId!: number;
    protected cmId!: number;
    protected chatId!: number;

    constructor() {
        this.sessions = new AddonChatSessionsManager(AddonModChatSessionsPage);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.chatId = CoreNavigator.getRouteNumberParam('chatId')!;
        this.sessions.setChatId(this.chatId);

        await this.fetchSessions();

        this.sessions.start(this.splitView);
    }

    /**
     * Fetch chat sessions.
     *
     * @param showLoading Display a loading modal.
     * @return Promise resolved when done.
     */
    async fetchSessions(showLoading?: boolean): Promise<void> {
        const modal = showLoading ? await CoreDomUtils.showModalLoading() : null;

        try {
            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.cmId, false);

            this.groupId = CoreGroups.validateGroupId(this.groupId, this.groupInfo);
            this.sessions.setGroupId(this.groupId);

            const sessions = await AddonModChat.getSessions(this.chatId, this.groupId, this.showAll, { cmId: this.cmId });

            // Fetch user profiles.
            const promises: Promise<unknown>[] = [];

            const formattedSessions = sessions.map((session: AddonModChatSessionFormatted) => {
                session.duration = session.sessionend - session.sessionstart;
                session.sessionusers.forEach((sessionUser) => {
                    // The WS does not return the user name, fetch user profile.
                    promises.push(this.loadUserFullname(sessionUser));
                });

                // If session has more than 4 users we display a "Show more" link.
                session.allsessionusers = session.sessionusers;
                if (session.sessionusers.length > 4) {
                    session.sessionusers = session.allsessionusers.slice(0, 3);
                }

                return session;
            });

            await Promise.all(promises);

            this.sessions.setItems(formattedSessions);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Load the fullname of a user.
     *
     * @param id User ID.
     * @return Promise resolved when done.
     */
    protected async loadUserFullname(sessionUser: AddonModChatUserSessionFormatted): Promise<void> {
        if (sessionUser.userfullname) {
            return;
        }

        try {
            const user = await CoreUser.getProfile(sessionUser.userid, this.courseId, true);

            sessionUser.userfullname = user.fullname;
        } catch {
            // Error getting profile, most probably the user is deleted.
            sessionUser.userfullname = Translate.instant('core.deleteduser') + ' ' + sessionUser.userid;
        }
    }

    /**
     * Refresh chat sessions.
     *
     * @param refresher Refresher.
     */
    async refreshSessions(refresher: IonRefresher): Promise<void> {
        try {
            await CoreUtils.ignoreErrors(CoreUtils.allPromises([
                CoreGroups.invalidateActivityGroupInfo(this.cmId),
                AddonModChat.invalidateSessions(this.chatId, this.groupId, this.showAll),
            ]));

            await this.fetchSessions();
        } finally {
            refresher.complete();
        }
    }

    /**
     * Show more session users.
     *
     * @param session Chat session.
     * @param event The event.
     */
    showMoreUsers(session: AddonModChatSessionFormatted, event: Event): void {
        session.sessionusers = session.allsessionusers!;
        event.stopPropagation();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.sessions.destroy();
    }

}

/**
 * Helper class to manage sessions.
 */
class AddonChatSessionsManager extends CorePageItemsListManager<AddonModChatSessionFormatted> {

    chatId = -1;
    groupId = 0;

    constructor(pageComponent: unknown) {
        super(pageComponent);
    }

    /**
     * Set chat ID.
     *
     * @param chatId Chat ID.
     */
    setChatId(chatId: number): void {
        this.chatId = chatId;
    }

    /**
     * Set group ID.
     *
     * @param groupId Group ID.
     */
    setGroupId(groupId: number): void {
        this.groupId = groupId;
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(session: AddonModChatSessionFormatted): string {
        return `${session.sessionstart}/${session.sessionend}`;
    }

    /**
     * @inheritdoc
     */
    protected getItemQueryParams(): Params {
        return {
            chatId: this.chatId,
            groupId: this.groupId,
        };
    }

}

/**
 * Fields added to chat session in this view.
 */
type AddonModChatSessionFormatted = Omit<AddonModChatSession, 'sessionusers'> & {
    duration?: number; // Session duration.
    sessionusers: AddonModChatUserSessionFormatted[];
    allsessionusers?: AddonModChatUserSessionFormatted[]; // All session users.
};

/**
 * Fields added to user session in this view.
 */
type AddonModChatUserSessionFormatted = AddonModChatSessionUser & {
    userfullname?: string; // User full name.
};
