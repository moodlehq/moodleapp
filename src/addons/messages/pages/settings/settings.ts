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

import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import {
    AddonMessagesMessagePreferences,
    AddonMessagesMessagePreferencesNotification,
    AddonMessagesMessagePreferencesNotificationProcessor,
    AddonMessages,
} from '../../services/messages';
import { CoreUserPreferences } from '@features/user/services/user-preferences';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@static/events';
import { CoreSites } from '@services/sites';
import { CoreConfigSettingKey } from '@/core/constants';
import { CorePlatform } from '@services/platform';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreLoadings } from '@services/overlays/loadings';
import { ADDON_MESSAGES_NOTIFICATION_PREFERENCES_KEY, AddonMessagesMessagePrivacy } from '@addons/messages/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the messages settings page.
 */
@Component({
    selector: 'page-addon-messages-settings',
    templateUrl: 'settings.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonMessagesSettingsPage implements OnInit, OnDestroy {

    protected updateTimeout?: number;

    preferences?: AddonMessagesMessagePreferences;
    preferencesLoaded = false;
    contactablePrivacy?: number | boolean;
    allowSiteMessaging = false;
    onlyContactsValue = AddonMessagesMessagePrivacy.ONLYCONTACTS;
    courseMemberValue = AddonMessagesMessagePrivacy.COURSEMEMBER;
    siteValue = AddonMessagesMessagePrivacy.SITE;
    sendOnEnter = false;
    readonly warningMessage = signal<string | undefined>(undefined);

    protected loggedInOffLegacyMode = false;
    protected previousContactableValue?: number | boolean;

    constructor() {

        const currentSite = CoreSites.getRequiredCurrentSite();
        this.allowSiteMessaging = currentSite.canUseAdvancedFeature('messagingallusers');
        this.loggedInOffLegacyMode = !currentSite.isVersionGreaterEqualThan('4.0');

        this.asyncInit();
    }

    protected async asyncInit(): Promise<void> {
        this.sendOnEnter = !!(await CoreConfig.get(CoreConfigSettingKey.SEND_ON_ENTER, !CorePlatform.isMobile()));
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.fetchPreferences();
    }

    /**
     * Fetches preference data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchPreferences(): Promise<void> {
        try {
            const preferences = await AddonMessages.getMessagePreferences();
            // Simplify the preferences.
            for (const component of preferences.components) {
                // Only display get the notification preferences.
                component.notifications = component.notifications.filter((notification) =>
                    notification.preferencekey === ADDON_MESSAGES_NOTIFICATION_PREFERENCES_KEY);

                if (this.loggedInOffLegacyMode) {
                    // Load enabled from loggedin / loggedoff values.
                    component.notifications.forEach((notification) => {
                        notification.processors.forEach(
                            (processor) => {
                                processor.enabled = processor.loggedin.checked || processor.loggedoff.checked;
                            },
                        );
                    });
                }
            }

            this.preferences = preferences;
            this.contactablePrivacy = preferences.blocknoncontacts;
            this.previousContactableValue = this.contactablePrivacy;
            this.warningMessage.set(undefined);
        } catch (error) {
            if (error.errorcode === 'nopermissions') {
                this.warningMessage.set(CoreErrorHelper.getErrorMessageFromError(error));

                return;
            }

            CoreAlerts.showError(error);
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

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await CoreUserPreferences.setPreferenceOnline('message_blocknoncontacts', String(value));
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
            this.previousContactableValue = this.contactablePrivacy;
        } catch (message) {
            // Show error and revert change.
            CoreAlerts.showError(message);
            this.contactablePrivacy = this.previousContactableValue;
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Change the value of a certain preference.
     *
     * @param notification Notification object.
     * @param processor Notification processor.
     * @since 3.6
     */
    async changePreference(
        notification: AddonMessagesMessagePreferencesNotificationFormatted,
        processor: AddonMessagesMessagePreferencesNotificationProcessor,
    ): Promise<void> {
        // Update both states at the same time.
        let value = notification.processors
            .filter((processor) => processor.enabled)
            .map((processor) => processor.name)
            .join(',');

        if (value == '') {
            value = 'none';
        }

        notification.updating = true;

        const promises: Promise<void>[] = [];
        if (this.loggedInOffLegacyMode) {
            promises.push(CoreUserPreferences.setPreferenceOnline(`${notification.preferencekey}_loggedin`, value));
            promises.push(CoreUserPreferences.setPreferenceOnline(`${notification.preferencekey}_loggedoff`, value));
        }  else {
            promises.push(CoreUserPreferences.setPreferenceOnline(`${notification.preferencekey}_enabled`, value));
        }

        try {
            await Promise.all(promises);
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        } catch (error) {
            // Show error and revert change.
            CoreAlerts.showError(error);
            processor.enabled = !processor.enabled;
        } finally {
            notification.updating = false;
        }
    }

    /**
     * Refresh the list of preferences.
     *
     * @param refresher Refresher.
     */
    refreshPreferences(refresher?: HTMLIonRefresherElement): void {
        AddonMessages.invalidateMessagePreferences().finally(() => {
            this.fetchPreferences().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Send on Enter toggle has changed.
     */
    sendOnEnterChanged(): void {
        // Save the value.
        CoreConfig.set(CoreConfigSettingKey.SEND_ON_ENTER, this.sendOnEnter ? 1 : 0);

        // Notify the app.
        CoreEvents.trigger(
            CoreEvents.SEND_ON_ENTER_CHANGED,
            { sendOnEnter: !!this.sendOnEnter },
            CoreSites.getCurrentSiteId(),
        );
    }

    /**
     * @inheritdoc
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
    updating?: boolean; // Calculated in the app. Whether the notification is being updated.
    updatingloggedin?: boolean; // Calculated in the app. Whether the notification is being updated.
    updatingloggedoff?: boolean; // Calculated in the app. Whether the notification is being updated.
};
