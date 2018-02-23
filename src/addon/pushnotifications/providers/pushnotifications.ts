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
import { Platform } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { AddonPushNotificationsDelegate } from './delegate';

/**
 * Service to handle push notifications.
 */
@Injectable()
export class AddonPushNotificationsProvider {

    protected logger;
    protected pushID: string;
    protected appDB: any;

    // Variables for database.
    protected BADGE_TABLE = 'mma_pushnotifications_badge';
    protected tablesSchema = [
        {
            name: this.BADGE_TABLE,
            columns: [
                {
                    name: 'siteid',
                    type: 'INTEGER'
                },
                {
                    name: 'addon',
                    type: 'TEXT'
                },
                {
                    name: 'number',
                    type: 'INTEGER'
                }
            ]
        }
    ];

    constructor(logger: CoreLoggerProvider, protected appProvider: CoreAppProvider, private platform: Platform,
            protected pushNotificationsDelegate: AddonPushNotificationsDelegate, protected sitesProvider: CoreSitesProvider) {
        this.logger = logger.getInstance('AddonPushNotificationsProvider');
        this.appDB = appProvider.getDB();
        this.appDB.createTablesFromSchema(this.tablesSchema);
    }

    /**
     * Get the pushID for this device.
     *
     * @return {string} Push ID.
     */
    getPushId(): string {
        return this.pushID;
    }

    /**
     * Function called when a push notification is clicked. Redirect the user to the right state.
     *
     * @param {any} notification Notification.
     */
    notificationClicked(notification: any): void {
        this.platform.ready().then(() => {
            this.pushNotificationsDelegate.clicked(notification);
        });
    }
}
