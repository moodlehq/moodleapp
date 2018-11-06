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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import { AddonMessagesProvider } from '../../providers/messages';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Page that displays the messages settings page.
 */
@IonicPage({ segment: 'addon-messages-settings' })
@Component({
    selector: 'page-addon-messages-settings',
    templateUrl: 'settings.html',
})
export class AddonMessagesSettingsPage implements OnDestroy {
    protected updateTimeout: any;

    preferences: any;
    preferencesLoaded: boolean;
    blockNonContactsState = false;

    constructor(private messagesProvider: AddonMessagesProvider, private domUtils: CoreDomUtilsProvider,
            private userProvider: CoreUserProvider) {
    }

    /**
     * Runs when the page has loaded. This event only happens once per page being created.
     * If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
     * Setup code for the page.
     */
    ionViewDidLoad(): void {
        this.fetchPreferences();
    }

    /**
     * Fetches preference data.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchPreferences(): Promise<any> {
        return this.messagesProvider.getMessagePreferences().then((preferences) => {
            this.preferences = preferences;
            this.blockNonContactsState = preferences.blocknoncontacts;
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            this.preferencesLoaded = true;
        });
    }

    /**
     * Update preferences. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updatePreferences(): void {
        this.messagesProvider.invalidateMessagePreferences().finally(() => {
            this.fetchPreferences();
        });
    }

    /**
     * Update preferences after a certain time. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updatePreferencesAfterDelay(): void {
        // Cancel pending updates.
        clearTimeout(this.updateTimeout);

        this.updateTimeout = setTimeout(() => {
            this.updateTimeout = null;
            this.updatePreferences();
        }, 5000);
    }

    /**
     * Block non contacts.
     *
     * @param {boolean} block If it should be blocked or not.
     */
    blockNonContacts(block: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);
        this.userProvider.updateUserPreference('message_blocknoncontacts', block ? 1 : 0).then(() => {
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        }).catch((message) => {
            // Show error and revert change.
            this.domUtils.showErrorModal(message);
            this.blockNonContactsState = !this.blockNonContactsState;
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Change the value of a certain preference.
     *
     * @param {any}    notification Notification object.
     * @param {string} state        State name, ['loggedin', 'loggedoff'].
     * @param {any}    processor    Notification processor.
     */
    changePreference(notification: any, state: string, processor: any): void {
        const processorState = processor[state],
            preferenceName = notification.preferencekey + '_' + processorState.name,
            valueArray = [];
        let value = 'none';

        notification.processors.forEach((processor) => {
            if (processor[state].checked) {
                valueArray.push(processor.name);
            }
        });

        if (value.length > 0) {
            value = valueArray.join(',');
        }

        if (!notification.updating) {
            notification.updating = {};
        }

        notification.updating[state] = true;
        this.userProvider.updateUserPreference(preferenceName, value).then(() => {
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        }).catch((message) => {
            // Show error and revert change.
            this.domUtils.showErrorModal(message);
            processorState.checked = !processorState.checked;
        }).finally(() => {
            notification.updating[state] = false;
        });
    }

    /**
     * Refresh the list of preferences.
     *
     * @param {any} refresher Refresher.
     */
    refreshEvent(refresher: any): void {
        this.messagesProvider.invalidateMessagePreferences().finally(() => {
            this.fetchPreferences().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        // If there is a pending action to update preferences, execute it right now.
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updatePreferences();
        }
    }
}
