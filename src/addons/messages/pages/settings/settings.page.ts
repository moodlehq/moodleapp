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

import { Component, OnDestroy, OnInit } from '@angular/core';
import {
    AddonMessagesProvider, AddonMessagesMessagePreferences,
    AddonMessagesMessagePreferencesNotification,
    AddonMessagesMessagePreferencesNotificationProcessor,
    AddonMessages,
} from '../../services/messages';
import { CoreUser } from '@features/user/services/user';
import { CoreApp } from '@services/app';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreConstants } from '@/core/constants';
import { IonRefresher } from '@ionic/angular';

/**
 * Page that displays the messages settings page.
 */
@Component({
    selector: 'page-addon-messages-settings',
    templateUrl: 'settings.html',
})
export class AddonMessagesSettingsPage implements OnInit, OnDestroy {

    protected updateTimeout?: number;

    preferences?: AddonMessagesMessagePreferences;
    preferencesLoaded = false;
    contactablePrivacy?: number | boolean;
    advancedContactable = false; // Whether the site supports "advanced" contactable privacy.
    allowSiteMessaging = false;
    onlyContactsValue = AddonMessagesProvider.MESSAGE_PRIVACY_ONLYCONTACTS;
    courseMemberValue = AddonMessagesProvider.MESSAGE_PRIVACY_COURSEMEMBER;
    siteValue = AddonMessagesProvider.MESSAGE_PRIVACY_SITE;
    groupMessagingEnabled = false;
    sendOnEnter = false;

    protected previousContactableValue?: number | boolean;

    constructor() {

        const currentSite = CoreSites.getCurrentSite();
        this.advancedContactable = !!currentSite?.isVersionGreaterEqualThan('3.6');
        this.allowSiteMessaging = !!currentSite?.canUseAdvancedFeature('messagingallusers');
        this.groupMessagingEnabled = AddonMessages.isGroupMessagingEnabled();

        this.asyncInit();
    }

    protected async asyncInit(): Promise<void> {
        this.sendOnEnter = !!(await CoreConfig.get(CoreConstants.SETTINGS_SEND_ON_ENTER, !CoreApp.isMobile()));
    }

    /**
     * Runs when the page has loaded. This event only happens once per page being created.
     * If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
     * Setup code for the page.
     */
    ngOnInit(): void {
        this.fetchPreferences();
    }

    /**
     * Fetches preference data.
     *
     * @return Promise resolved when done.
     */
    protected async fetchPreferences(): Promise<void> {
        try {
            const preferences = await AddonMessages.getMessagePreferences();
            if (this.groupMessagingEnabled) {
                // Simplify the preferences.
                for (const component of preferences.components) {
                    // Only display get the notification preferences.
                    component.notifications = component.notifications.filter((notification) =>
                        notification.preferencekey == AddonMessagesProvider.NOTIFICATION_PREFERENCES_KEY);

                    component.notifications.forEach((notification) => {
                        notification.processors.forEach(
                            (processor: AddonMessagesMessagePreferencesNotificationProcessorFormatted) => {
                                processor.checked = processor.loggedin.checked || processor.loggedoff.checked;
                            },
                        );
                    });
                }
            }

            this.preferences = preferences;
            this.contactablePrivacy = preferences.blocknoncontacts;
            this.previousContactableValue = this.contactablePrivacy;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            this.preferencesLoaded = true;
        }
    }

    /**
     * Update preferences. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updatePreferences(): void {
        AddonMessages.invalidateMessagePreferences().finally(() => {
            this.fetchPreferences();
        });
    }

    /**
     * Update preferences after a certain time. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updatePreferencesAfterDelay(): void {
        // Cancel pending updates.
        clearTimeout(this.updateTimeout);

        this.updateTimeout = window.setTimeout(() => {
            this.updateTimeout = undefined;
            this.updatePreferences();
        }, 5000);
    }

    /**
     * Save the contactable privacy setting..
     *
     * @param value The value to set.
     */
    async saveContactablePrivacy(value?: number | boolean): Promise<void> {
        if (this.contactablePrivacy == this.previousContactableValue) {
            // Value hasn't changed from previous, it probably means that we just fetched the value from the server.
            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        if (!this.advancedContactable) {
            // Convert from boolean to number.
            value = value ? 1 : 0;
        }

        try {
            await CoreUser.updateUserPreference('message_blocknoncontacts', String(value));
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
            this.previousContactableValue = this.contactablePrivacy;
        } catch (message) {
            // Show error and revert change.
            CoreDomUtils.showErrorModal(message);
            this.contactablePrivacy = this.previousContactableValue;
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Change the value of a certain preference.
     *
     * @param notification Notification object.
     * @param state State name, ['loggedin', 'loggedoff'].
     * @param processor Notification processor.
     */
    async changePreference(
        notification: AddonMessagesMessagePreferencesNotificationFormatted,
        state: string,
        processor: AddonMessagesMessagePreferencesNotificationProcessorFormatted,
    ): Promise<void> {

        const valueArray: string[] = [];
        let value = 'none';

        if (this.groupMessagingEnabled) {
            // Update both states at the same time.
            const promises: Promise<void>[] = [];

            notification.processors.forEach((processor: AddonMessagesMessagePreferencesNotificationProcessorFormatted) => {
                if (processor.checked) {
                    valueArray.push(processor.name);
                }
            });

            if (value.length > 0) {
                value = valueArray.join(',');
            }

            notification.updating = true;

            promises.push(CoreUser.updateUserPreference(notification.preferencekey + '_loggedin', value));
            promises.push(CoreUser.updateUserPreference(notification.preferencekey + '_loggedoff', value));

            try {
                await Promise.all(promises);
                // Update the preferences since they were modified.
                this.updatePreferencesAfterDelay();
            } catch (error) {
                // Show error and revert change.
                CoreDomUtils.showErrorModal(error);
                processor.checked = !processor.checked;
            } finally {
                notification.updating = false;
            }

            return;
        }

        // Update only the specified state.
        const processorState = processor[state];
        const preferenceName = notification.preferencekey + '_' + processorState.name;

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
        try {
            await CoreUser.updateUserPreference(preferenceName, value);
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        } catch (error) {
            // Show error and revert change.
            CoreDomUtils.showErrorModal(error);
            processorState.checked = !processorState.checked;
        } finally {
            notification.updating[state] = false;
        }
    }

    /**
     * Refresh the list of preferences.
     *
     * @param refresher Refresher.
     */
    refreshPreferences(refresher?: IonRefresher): void {
        AddonMessages.invalidateMessagePreferences().finally(() => {
            this.fetchPreferences().finally(() => {
                refresher?.complete();
            });
        });
    }

    sendOnEnterChanged(): void {
        // Save the value.
        CoreConfig.set(CoreConstants.SETTINGS_SEND_ON_ENTER, this.sendOnEnter ? 1 : 0);

        // Notify the app.
        CoreEvents.trigger(
            CoreEvents.SEND_ON_ENTER_CHANGED,
            { sendOnEnter: !!this.sendOnEnter },
            CoreSites.getCurrentSiteId(),
        );
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

/**
 * Message preferences notification with some caclulated data.
 */
type AddonMessagesMessagePreferencesNotificationFormatted = AddonMessagesMessagePreferencesNotification & {
    updating?: boolean | {[state: string]: boolean}; // Calculated in the app. Whether the notification is being updated.
};

/**
 * Message preferences notification processor with some caclulated data.
 */
type AddonMessagesMessagePreferencesNotificationProcessorFormatted = AddonMessagesMessagePreferencesNotificationProcessor & {
    checked?: boolean; // Calculated in the app. Whether the processor is checked either for loggedin or loggedoff.
};
