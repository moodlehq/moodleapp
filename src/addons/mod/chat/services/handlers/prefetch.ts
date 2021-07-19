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
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreUser } from '@features/user/services/user';
import { CoreGroups } from '@services/groups';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonModChat, AddonModChatProvider, AddonModChatSession } from '../chat';

/**
 * Handler to prefetch chats.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChatPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModChat';
    modName = 'chat';
    component = AddonModChatProvider.COMPONENT;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonModChat.areSessionsAvailable();
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        const chat = await AddonModChat.getChat(courseId, moduleId);

        await CoreUtils.allPromises([
            AddonModChat.invalidateAllSessions(chat.id),
            AddonModChat.invalidateAllSessionMessages(chat.id),
        ]);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        await CoreUtils.allPromises([
            AddonModChat.invalidateChats(courseId),
            CoreCourse.invalidateModule(module.id),
        ]);
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return this.prefetchPackage(module, courseId, this.prefetchChat.bind(this, module, courseId));
    }

    /**
     * Prefetch a chat.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchChat(module: CoreCourseAnyModuleData, courseId: number, siteId: string): Promise<void> {
        const options = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };
        const modOptions = {
            ...options,
            cmId: module.id,
        };

        // Prefetch chat and group info.
        const [chat, groupInfo] = await Promise.all([
            AddonModChat.getChat(courseId, module.id, options),
            CoreGroups.getActivityGroupInfo(module.id, false, undefined, siteId),
        ]);

        const promises: Promise<void>[] = [];

        let groupIds = [0];
        if (groupInfo.groups && groupInfo.groups.length > 0) {
            groupIds = groupInfo.groups.map((group) => group.id);
        }

        groupIds.forEach((groupId) => {
            // Prefetch complete sessions.
            promises.push(this.prefetchSessions(chat.id, groupId, courseId, false, modOptions));

            // Prefetch all sessions.
            promises.push(this.prefetchSessions(chat.id, groupId, courseId, true, modOptions));
        });

        await Promise.all(promises);
    }

    /**
     * Prefetch chat sessions.
     *
     * @param chatId Chat ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param courseId Course ID.
     * @param showAll Whether to include incomplete sessions or not.
     * @param modOptions Other options.
     * @return Promise resolved with the list of sessions.
     */
    protected async prefetchSessions(
        chatId: number,
        groupId: number,
        courseId: number,
        showAll: boolean,
        modOptions: CoreCourseCommonModWSOptions,
    ): Promise<void> {
        try {
            const sessions = await AddonModChat.getSessions(chatId, groupId, showAll, modOptions);

            if (showAll) {
                // Prefetch each session data too.
                await Promise.all(sessions.map((session) => this.prefetchSession(chatId, session, groupId, courseId, modOptions)));
            }
        } catch (error) {
            // Ignore group error.
            if (error && error.errorcode == 'notingroup') {
                return;
            }

            throw error;
        }
    }

    /**
     * Prefetch chat session messages and user profiles.
     *
     * @param chatId Chat ID.
     * @param session Session object.
     * @param groupId Group ID.
     * @param courseId Course ID the module belongs to.
     * @param modOptions Other options.
     * @return Promise resolved when done.
     */
    protected async prefetchSession(
        chatId: number,
        session: AddonModChatSession,
        groupId: number,
        courseId: number,
        modOptions: CoreCourseCommonModWSOptions,
    ): Promise<void> {
        const messages = await AddonModChat.getSessionMessages(
            chatId,
            session.sessionstart,
            session.sessionend,
            groupId,
            modOptions,
        );

        const users: Record<number, number> = {};
        session.sessionusers.forEach((user) => {
            users[user.userid] = user.userid;
        });
        messages.forEach((message) => {
            users[message.userid] = message.userid;
        });
        const userIds = Object.values(users);

        await CoreUser.prefetchProfiles(userIds, courseId, modOptions.siteId);
    }

}

export const AddonModChatPrefetchHandler = makeSingleton(AddonModChatPrefetchHandlerService);
