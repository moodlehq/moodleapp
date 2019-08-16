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
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreGroupsProvider, CoreGroupInfo } from '@providers/groups';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModChatProvider } from './chat';

/**
 * Handler to prefetch chats.
 */
@Injectable()
export class AddonModChatPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModChat';
    modName = 'chat';
    component = AddonModChatProvider.COMPONENT;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            private groupsProvider: CoreGroupsProvider,
            private userProvider: CoreUserProvider,
            private chatProvider: AddonModChatProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.chatProvider.areSessionsAvailable();
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId The course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.chatProvider.getChat(courseId, moduleId).then((chat) => {
            const promises = [
                this.chatProvider.invalidateAllSessions(chat.id),
                this.chatProvider.invalidateAllSessionMessages(chat.id)
            ];

            return this.utils.allPromises(promises);
        });
    }

    /**
     * Invalidate WS calls needed to determine module status (usually, to check if module is downloadable).
     * It doesn't need to invalidate check updates. It should NOT invalidate files nor all the prefetched data.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        const promises = [
            this.chatProvider.invalidateChats(courseId),
            this.courseProvider.invalidateModule(module.id)
        ];

        return this.utils.allPromises(promises);
    }

    /**
     * Prefetch a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [dirPath] Path of the directory where to store all the content files.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any> {
        return this.prefetchPackage(module, courseId, single, this.prefetchChat.bind(this));
    }

    /**
     * Prefetch a chat.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} single True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} siteId Site ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected prefetchChat(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        // Prefetch chat and group info.
        const promises = [
            this.chatProvider.getChat(courseId, module.id, siteId),
            this.groupsProvider.getActivityGroupInfo(module.id, false, undefined, siteId)
        ];

        return Promise.all(promises).then(([chat, groupInfo]: [any, CoreGroupInfo]) => {
            const promises = [];

            let groupIds = [0];
            if (groupInfo.groups && groupInfo.groups.length > 0) {
                groupIds = groupInfo.groups.map((group) => group.id);
            }

            groupIds.forEach((groupId) => {
                // Prefetch complete sessions.
                promises.push(this.chatProvider.getSessions(chat.id, groupId, false, true, siteId).catch((error) => {
                    // Ignore group error.
                    if (error.errorcode != 'notingroup') {
                        return Promise.reject(error);
                    }
                }));

                // Prefetch all sessions.
                promises.push(this.chatProvider.getSessions(chat.id, groupId, true, true, siteId).then((sessions) => {
                    const promises = sessions.map((session) => this.prefetchSession(chat.id, session, 0, courseId, siteId));

                    return Promise.all(promises);
                }).catch((error) => {
                    // Ignore group error.
                    if (error.errorcode != 'notingroup') {
                        return Promise.reject(error);
                    }
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Prefetch chat session messages and user profiles.
     *
     * @param {number} chatId Chat ID.
     * @param {any} session Session object.
     * @param {number} groupId Group ID.
     * @param {number} courseId Course ID the module belongs to.
     * @param {string} siteId Site ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected prefetchSession(chatId: number, session: any, groupId: number, courseId: number, siteId: string): Promise<any> {
        return this.chatProvider.getSessionMessages(chatId, session.sessionstart, session.sessionend, groupId, true, siteId)
                .then((messages) => {
            const users = {};
            session.sessionusers.forEach((user) => {
                users[user.userid] = true;
            });
            messages.forEach((message) => {
                users[message.userid] = true;
            });
            const userIds = Object.keys(users).map(Number);

            return this.userProvider.prefetchProfiles(userIds, courseId, siteId).catch(() => {
                // Ignore errors, some users might not exist.
            });
        });
    }
}
