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

import { AddonNotificationsNotificationData } from '@addons/notifications/services/handlers/push-click';
import { AddonNotifications } from '@addons/notifications/services/notifications';
import {
    AddonNotificationsHelper,
    AddonNotificationsNotificationToRender,
} from '@addons/notifications/services/notifications-helper';
import { Component, OnInit } from '@angular/core';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

/**
 * Page to render a notification.
 */
@Component({
    selector: 'page-addon-notifications-notification',
    templateUrl: 'notification.html',
    styleUrls: ['../../notifications.scss'],
})
export class AddonNotificationsNotificationPage implements OnInit {

    subject = ''; // Notification subject.
    content = ''; // Notification content.
    userIdFrom = -1; // User ID who sent the notification.
    profileImageUrlFrom?: string; // Avatar of the user who sent the notification.
    userFromFullName?: string; // Name of the user who sent the notification.
    iconUrl?: string; // Icon URL.
    loaded = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        let notification: AddonNotificationsNotificationToRender | AddonNotificationsNotificationData;

        try {
            notification = CoreNavigator.getRequiredRouteParam('notification');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        if (!('subject' in notification)) {
            // Try to find the notification using the WebService, it contains a better message.
            const notifId = Number(notification.savedmessageid);
            const result = await CoreUtils.ignoreErrors(
                AddonNotifications.getNotifications([], { siteId: notification.site }),
            );

            const foundNotification = result?.notifications.find(notif => notif.id === notifId);
            if (foundNotification) {
                notification = AddonNotificationsHelper.formatNotificationText(foundNotification);
            }
        }

        if ('subject' in notification) {
            this.subject = notification.subject;
            this.content = notification.mobiletext || notification.fullmessagehtml;
            this.userIdFrom = notification.useridfrom;
            this.profileImageUrlFrom = notification.profileimageurlfrom;
            this.userFromFullName = notification.userfromfullname;
            this.iconUrl = notification.iconurl;
        } else {
            this.subject = notification.title || '';
            this.content = notification.message || '';
            this.userIdFrom = notification.userfromid ? Number(notification.userfromid) : -1;
            this.profileImageUrlFrom = notification.senderImage;
            this.userFromFullName = notification.userfromfullname;
        }

        this.loaded = true;
    }

}
