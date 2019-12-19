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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { AddonMessagesProvider } from './messages';

/**
 * Handler for messaging push notifications clicks.
 */
@Injectable()
export class AddonMessagesPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonMessagesPushClickHandler';
    priority = 200;
    featureName = 'CoreMainMenuDelegate_AddonMessages';

    constructor(private utils: CoreUtilsProvider, private messagesProvider: AddonMessagesProvider,
            private loginHelper: CoreLoginHelperProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        if (this.utils.isTrueOrOne(notification.notif) && notification.name != 'messagecontactrequests') {
            return false;
        }

        // Check that messaging is enabled.
        return this.messagesProvider.isPluginEnabled(notification.site);
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        return this.messagesProvider.invalidateDiscussionsCache(notification.site).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Check if group messaging is enabled, to determine which page should be loaded.
            return this.messagesProvider.isGroupMessagingEnabledInSite(notification.site).then((enabled) => {
                const pageParams: any = {};
                let pageName = 'AddonMessagesIndexPage';
                if (enabled) {
                    pageName = 'AddonMessagesGroupConversationsPage';
                }

                // Check if we have enough information to open the conversation.
                if (notification.convid && enabled) {
                    pageParams.conversationId = Number(notification.convid);
                } else if (notification.userfromid) {
                    pageParams.discussionUserId = Number(notification.userfromid);
                }

                return this.loginHelper.redirect(pageName, pageParams, notification.site);
            });
        });
    }
}
