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

import { AddonsNotificationsNotificationsSource } from '@addons/notifications/classes/notifications-source';
import { AddonNotificationsNotificationData } from '@addons/notifications/services/handlers/push-click';
import {
    AddonNotificationsHelper,
    AddonNotificationsNotificationToRender,
} from '@addons/notifications/services/notifications-helper';
import { Component, OnInit } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreContentLinksAction, CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Page to render a notification.
 */
@Component({
    selector: 'page-addon-notifications-notification',
    templateUrl: 'notification.html',
    styleUrls: ['../../notifications.scss', 'notification.scss'],
})
export class AddonNotificationsNotificationPage implements OnInit {

    subject = ''; // Notification subject.
    content = ''; // Notification content.
    userIdFrom = -1; // User ID who sent the notification.
    profileImageUrlFrom?: string; // Avatar of the user who sent the notification.
    userFromFullName?: string; // Name of the user who sent the notification.
    iconUrl?: string; // Icon URL.
    modname?: string; // Module name.
    loaded = false;
    timecreated = 0;

    // Actions data.
    actions: CoreContentLinksAction[] = [];
    contextUrl?: string;
    courseId?: number;
    actionsData?: Record<string, unknown>; // Extra data to handle the URL.

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        let notification: AddonNotificationsNotification;

        try {
            notification = this.getCurrentNotification();
        } catch (error) {
            await CoreDomUtils.showErrorModal(error);
            await CoreNavigator.back();

            return;
        }

        if ('subject' in notification) {
            this.subject = notification.subject;
            this.content = notification.mobiletext || notification.fullmessagehtml;
            this.userIdFrom = notification.useridfrom;
            this.profileImageUrlFrom = notification.profileimageurlfrom;
            this.userFromFullName = notification.userfromfullname;
            this.iconUrl = notification.iconurl;
            if (notification.moodlecomponent?.startsWith('mod_') && notification.iconurl) {
                const modname = notification.moodlecomponent.substring(4);
                if (
                    notification.iconurl.match('/theme/image.php/[^/]+/' + modname + '/[-0-9]*/') ||
                    notification.iconurl.match('/theme/image.php/[^/]+/' + notification.moodlecomponent + '/[-0-9]*/')
                ) {
                    this.modname = modname;
                }
            }
            this.timecreated = notification.timecreated;

        } else {
            this.subject = notification.title || '';
            this.content = notification.message || '';
            this.userIdFrom = notification.userfromid ? Number(notification.userfromid) : -1;
            this.profileImageUrlFrom = notification.senderImage;
            this.userFromFullName = notification.userfromfullname;
        }

        await this.loadActions(notification);
        AddonNotificationsHelper.markNotificationAsRead(notification);

        this.loaded = true;
    }

    /**
     * Load notifications
     *
     * @param notificationId Notification id.
     * @return Found notification
     */
    loadNotifications(notificationId: number): AddonNotificationsNotification {
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
            AddonsNotificationsNotificationsSource,
            [],
        );
        const notification = source.getItems()?.find(({ id }) => id === notificationId);

        if (!notification) {
            throw new CoreError(`Notification with id ${notificationId} not found`);
        }

        return notification;
    }

    /**
     * Load current notification if it's found
     *
     * @return Found notification
     */
    getCurrentNotification(): AddonNotificationsNotification {
        const pushNotification: AddonNotificationsNotificationData | undefined = CoreNavigator.getRouteParam('notification');

        return this.loadNotifications(
            pushNotification ? Number(pushNotification?.savedmessageid) : CoreNavigator.getRequiredRouteNumberParam('id'),
        );
    }

    /**
     * Load notification actions
     *
     * @param notification Notification.
     * @return Promise resolved when done.
     */
    async loadActions(notification: AddonNotificationsNotification): Promise<void> {
        if (!notification.contexturl && (!notification.customdata || !notification.customdata.appurl)) {
            // No URL, nothing to do.
            return;
        }

        let actions: CoreContentLinksAction[] = [];
        this.actionsData = notification.customdata;
        this.contextUrl = notification.contexturl;
        this.courseId = 'courseid' in notification ? notification.courseid : undefined;

        // Treat appurl first if any.
        if (this.actionsData?.appurl) {
            actions = await CoreContentLinksDelegate.getActionsFor(
                <string> this.actionsData.appurl,
                this.courseId,
                undefined,
                this.actionsData,
            );
        }

        if (!actions.length && this.contextUrl) {
            // No appurl or cannot handle it. Try with contextUrl.
            actions = await CoreContentLinksDelegate.getActionsFor(this.contextUrl, this.courseId, undefined, this.actionsData);
        }

        if (!actions.length) {
            // URL is not supported. Add an action to open it in browser.
            actions.push({
                message: 'core.view',
                icon: 'fas-eye',
                action: this.openInBrowser.bind(this),
            });
        }

        this.actions = actions;
    }

    /**
     * Default action. Open in browser.
     *
     * @param siteId Site ID to use.
     */
    protected async openInBrowser(siteId?: string): Promise<void> {
        const url = <string> this.actionsData?.appurl || this.contextUrl;

        if (!url) {
            return;
        }

        const site = await CoreSites.getSite(siteId);

        site.openInBrowserWithAutoLogin(url);
    }

}

type AddonNotificationsNotification = AddonNotificationsNotificationToRender | AddonNotificationsNotificationData;
