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
import { AddonNotificationsProvider } from './notifications';
import { CoreAppProvider } from '@providers/app';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreSettingsHandler, CoreSettingsHandlerData } from '@core/settings/providers/delegate';

/**
 * Notifications settings handler.
 */
@Injectable()
export class AddonNotificationsSettingsHandler implements CoreSettingsHandler {
    name = 'AddonNotifications';
    priority = 500;

    constructor(private appProvider: CoreAppProvider, private localNotificationsProvider: CoreLocalNotificationsProvider,
            private notificationsProvider: AddonNotificationsProvider) {
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        // Preferences or notification sound setting available.
        return (this.notificationsProvider.isNotificationPreferencesEnabled() ||
            this.localNotificationsProvider.isAvailable() && !this.appProvider.isDesktop());
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreSettingsHandlerData {
        return {
            icon: 'notifications',
            title: 'addon.notifications.notificationpreferences',
            page: 'AddonNotificationsSettingsPage',
            class: 'addon-notifications-settings-handler'
        };
    }
}
