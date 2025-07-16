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

import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { CoreUser } from '@features/user/services/user';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { AddonModChat, AddonModChatSession, AddonModChatSessionUser } from '../services/chat';

/**
 * Provides a collection of sessions.
 */
export class AddonModChatSessionsSource extends CoreRoutedItemsManagerSource<AddonModChatSessionFormatted> {

    readonly courseId: number;
    readonly chatId: number;
    readonly cmId: number;

    showAll = false;
    groupId = 0;
    groupInfo?: CoreGroupInfo;

    constructor(courseId: number, chatId: number, cmId: number) {
        super();

        this.courseId = courseId;
        this.chatId = chatId;
        this.cmId = cmId;
    }

    /**
     * Invalidate chat cache.
     */
    async invalidateCache(): Promise<void> {
        await CorePromiseUtils.allPromisesIgnoringErrors([
            CoreGroups.invalidateActivityGroupInfo(this.cmId),
            AddonModChat.invalidateSessions(this.chatId, this.groupId, this.showAll),
        ]);
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: AddonModChatSessionFormatted[] }> {
        this.groupInfo = await CoreGroups.getActivityGroupInfo(this.cmId, false);

        this.groupId = CoreGroups.validateGroupId(this.groupId, this.groupInfo);

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

        return { items: formattedSessions };
    }

    /**
     * @inheritdoc
     */
    getItemPath(session: AddonModChatSessionFormatted): string {
        return `${session.sessionstart}/${session.sessionend}`;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(): Params {
        return {
            chatId: this.chatId,
            groupId: this.groupId,
        };
    }

    /**
     * Load the fullname of a user.
     *
     * @param sessionUser User object.
     * @returns Promise resolved when done.
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
            sessionUser.userfullname = `${Translate.instant('core.deleteduser')} ${sessionUser.userid}`;
        }
    }

}

/**
 * Fields added to chat session in this view.
 */
export type AddonModChatSessionFormatted = Omit<AddonModChatSession, 'sessionusers'> & {
    duration?: number; // Session duration.
    sessionusers: AddonModChatUserSessionFormatted[];
    allsessionusers?: AddonModChatUserSessionFormatted[]; // All session users.
};

/**
 * Fields added to user session in this view.
 */
export type AddonModChatUserSessionFormatted = AddonModChatSessionUser & {
    userfullname?: string; // User full name.
};
