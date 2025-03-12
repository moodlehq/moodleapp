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

    readonly COURSE_ID: number;
    readonly CHAT_ID: number;
    readonly CM_ID: number;

    showAll = false;
    groupId = 0;
    groupInfo?: CoreGroupInfo;

    constructor(courseId: number, chatId: number, cmId: number) {
        super();

        this.COURSE_ID = courseId;
        this.CHAT_ID = chatId;
        this.CM_ID = cmId;
    }

    /**
     * Invalidate chat cache.
     */
    async invalidateCache(): Promise<void> {
        await CorePromiseUtils.allPromisesIgnoringErrors([
            CoreGroups.invalidateActivityGroupInfo(this.CM_ID),
            AddonModChat.invalidateSessions(this.CHAT_ID, this.groupId, this.showAll),
        ]);
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: AddonModChatSessionFormatted[] }> {
        this.groupInfo = await CoreGroups.getActivityGroupInfo(this.CM_ID, false);

        this.groupId = CoreGroups.validateGroupId(this.groupId, this.groupInfo);

        const sessions = await AddonModChat.getSessions(this.CHAT_ID, this.groupId, this.showAll, { cmId: this.CM_ID });

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
            chatId: this.CHAT_ID,
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
            const user = await CoreUser.getProfile(sessionUser.userid, this.COURSE_ID, true);

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
