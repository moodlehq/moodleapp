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
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonMessagesProvider } from './messages';

/**
 * Profile send message handler.
 */
@Injectable()
export class AddonMessagesSendMessageUserHandler implements CoreUserProfileHandler {
    name = 'AddonMessages:sendMessage';
    priority = 1000;
    type = CoreUserDelegate.TYPE_COMMUNICATION;

    constructor(private linkHelper: CoreContentLinksHelperProvider, protected sitesProvider: CoreSitesProvider,
        private messagesProvider: AddonMessagesProvider) { }

    /**
     * Check if handler is enabled.
     *
     * @return Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    isEnabled(): Promise<any> {
        return this.messagesProvider.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @param courseId Course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        const currentSite = this.sitesProvider.getCurrentSite();

        if (!currentSite) {
            return false;
        }

        // From 3.7 you can send messages to yourself.
        return user.id != currentSite.getUserId() || currentSite.isVersionGreaterEqualThan('3.7');
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'send',
            title: 'addon.messages.message',
            class: 'addon-messages-send-message-handler',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                const pageParams = {
                    showKeyboard: true,
                    userId: user.id
                };
                this.linkHelper.goInSite(navCtrl, 'AddonMessagesDiscussionPage', pageParams);
            }
        };
    }
}
