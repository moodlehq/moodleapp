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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import {
    AddonMessagesProvider, AddonMessagesMessagePreferences, AddonMessagesMessagePreferencesNotification,
    AddonMessagesMessagePreferencesNotificationProcessor
} from '../../providers/messages';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreAppProvider } from '@providers/app';
import { CoreConfigProvider } from '@providers/config';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreConstants } from '@core/constants';

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

    preferences: AddonMessagesMessagePreferences;
    preferencesLoaded: boolean;
    contactablePrivacy: number | boolean;
    advancedContactable = false; // Whether the site supports "advanced" contactable privacy.
    allowSiteMessaging = false;
    onlyContactsValue = AddonMessagesProvider.MESSAGE_PRIVACY_ONLYCONTACTS;
    courseMemberValue = AddonMessagesProvider.MESSAGE_PRIVACY_COURSEMEMBER;
    siteValue = AddonMessagesProvider.MESSAGE_PRIVACY_SITE;
    groupMessagingEnabled: boolean;
    sendOnEnter: boolean;
    isDesktop: boolean;
    isMac: boolean;

    protected previousContactableValue: number | boolean;

    constructor(private messagesProvider: AddonMessagesProvider, private domUtils: CoreDomUtilsProvider,
            private userProvider: CoreUserProvider, private sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            private configProvider: CoreConfigProvider, private eventsProvider: CoreEventsProvider) {

        const currentSite = sitesProvider.getCurrentSite();
        this.advancedContactable = currentSite && currentSite.isVersionGreaterEqualThan('3.6');
        this.allowSiteMessaging = currentSite && currentSite.canUseAdvancedFeature('messagingallusers');
        this.groupMessagingEnabled = this.messagesProvider.isGroupMessagingEnabled();

        this.configProvider.get(CoreConstants.SETTINGS_SEND_ON_ENTER, !appProvider.isMobile()).then((sendOnEnter) => {
            this.sendOnEnter = !!sendOnEnter;
        });

        this.isDesktop = !appProvider.isMobile();
        this.isMac = appProvider.isMac();
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
     * @return Promise resolved when done.
     */
    protected fetchPreferences(): Promise<void> {
        return this.messagesProvider.getMessagePreferences().then((preferences) => {
            if (this.groupMessagingEnabled) {
                // Simplify the preferences.
                for (const component of preferences.components) {
                    // Only display get the notification preferences.
                    component.notifications = component.notifications.filter((notification) => {
                        return notification.preferencekey == AddonMessagesProvider.NOTIFICATION_PREFERENCES_KEY;
                    });

                    component.notifications.forEach((notification) => {
                        notification.processors.forEach(
                                (processor: AddonMessagesMessagePreferencesNotificationProcessorFormatted) => {
                            processor.checked = processor.loggedin.checked || processor.loggedoff.checked;
                        });
                    });
                }
            }

            this.preferences = preferences;
            this.contactablePrivacy = preferences.blocknoncontacts;
            this.previousContactableValue = this.contactablePrivacy;
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
     * Save the contactable privacy setting..
     *
     * @param value The value to set.
     */
    saveContactablePrivacy(value: number | boolean): void {
        if (this.contactablePrivacy == this.previousContactableValue) {
            // Value hasn't changed from previous, it probably means that we just fetched the value from the server.
            return;
        }

        const modal = this.domUtils.showModalLoading('core.sending', true);

        if (!this.advancedContactable) {
            // Convert from boolean to number.
            value = value ? 1 : 0;
        }

        this.userProvider.updateUserPreference('message_blocknoncontacts', value).then(() => {
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
            this.previousContactableValue = this.contactablePrivacy;
        }).catch((message) => {
            // Show error and revert change.
            this.domUtils.showErrorModal(message);
            this.contactablePrivacy = this.previousContactableValue;
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Change the value of a certain preference.
     *
     * @param notification Notification object.
     * @param state State name, ['loggedin', 'loggedoff'].
     * @param processor Notification processor.
     */
    changePreference(notification: AddonMessagesMessagePreferencesNotificationFormatted, state: string,
            processor: AddonMessagesMessagePreferencesNotificationProcessorFormatted): void {

        if (this.groupMessagingEnabled) {
            // Update both states at the same time.
            const valueArray = [],
                promises = [];
            let value = 'none';

            notification.processors.forEach((processor: AddonMessagesMessagePreferencesNotificationProcessorFormatted) => {
                if (processor.checked) {
                    valueArray.push(processor.name);
                }
            });

            if (value.length > 0) {
                value = valueArray.join(',');
            }

            notification.updating = true;

            promises.push(this.userProvider.updateUserPreference(notification.preferencekey + '_loggedin', value));
            promises.push(this.userProvider.updateUserPreference(notification.preferencekey + '_loggedoff', value));

            Promise.all(promises).then(() => {
                // Update the preferences since they were modified.
                this.updatePreferencesAfterDelay();
            }).catch((error) => {
                // Show error and revert change.
                this.domUtils.showErrorModal(error);
                processor.checked = !processor.checked;
            }).finally(() => {
                notification.updating = false;
            });
        } else {
            // Update only the specified state.
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
    }

    /**
     * Refresh the list of preferences.
     *
     * @param refresher Refresher.
     */
    refreshPreferences(refresher: any): void {
        this.messagesProvider.invalidateMessagePreferences().finally(() => {
            this.fetchPreferences().finally(() => {
                refresher.complete();
            });
        });
    }

    sendOnEnterChanged(): void {
        // Save the value.
        this.configProvider.set(CoreConstants.SETTINGS_SEND_ON_ENTER, this.sendOnEnter ? 1 : 0);

        // Notify the app.
        this.eventsProvider.trigger(CoreEventsProvider.SEND_ON_ENTER_CHANGED, {sendOnEnter: !!this.sendOnEnter},
                this.sitesProvider.getCurrentSiteId());
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
