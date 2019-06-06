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

import { Component, OnDestroy, Optional } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { AddonNotificationsProvider } from '../../providers/notifications';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSettingsHelper } from '@core/settings/providers/helper';
import { AddonMessageOutputDelegate, AddonMessageOutputHandlerData } from '@addon/messageoutput/providers/delegate';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreConfigProvider } from '@providers/config';
import { CoreAppProvider } from '@providers/app';
import { CoreConstants } from '@core/constants';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Page that displays notifications settings.
 */
@IonicPage({ segment: 'addon-notifications-settings' })
@Component({
    selector: 'page-addon-notifications-settings',
    templateUrl: 'settings.html',
})
export class AddonNotificationsSettingsPage implements OnDestroy {
    protected updateTimeout: any;

    components: any[];
    preferences: any;
    preferencesLoaded: boolean;
    currentProcessor: any;
    notifPrefsEnabled: boolean;
    canChangeSound: boolean;
    notificationSound: boolean;
    processorHandlers = [];

    constructor(private notificationsProvider: AddonNotificationsProvider, private domUtils: CoreDomUtilsProvider,
            private settingsHelper: CoreSettingsHelper, private userProvider: CoreUserProvider,
            private navCtrl: NavController, private messageOutputDelegate: AddonMessageOutputDelegate,
            appProvider: CoreAppProvider, private configProvider: CoreConfigProvider, private eventsProvider: CoreEventsProvider,
            private localNotificationsProvider: CoreLocalNotificationsProvider, private sitesProvider: CoreSitesProvider,
            @Optional() private svComponent: CoreSplitViewComponent) {

        this.notifPrefsEnabled = notificationsProvider.isNotificationPreferencesEnabled();
        this.canChangeSound = localNotificationsProvider.canDisableSound();

        if (this.canChangeSound) {
            configProvider.get(CoreConstants.SETTINGS_NOTIFICATION_SOUND, true).then((enabled) => {
                this.notificationSound = !!enabled;
            });
        }
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.notifPrefsEnabled) {
            this.fetchPreferences();
        } else {
            this.preferencesLoaded = true;
        }
    }

    /**
     * Fetches preference data.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchPreferences(): Promise<any> {
        return this.notificationsProvider.getNotificationPreferences().then((preferences) => {
            if (!this.currentProcessor) {
                // Initialize current processor. Load "Mobile" (airnotifier) if available.
                this.currentProcessor = this.settingsHelper.getProcessor(preferences.processors, 'airnotifier');
            }

            if (!this.currentProcessor) {
                // Shouldn't happen.
                return Promise.reject('No processor found');
            }

            preferences.disableall = !!preferences.disableall; // Convert to boolean.
            this.preferences = preferences;
            this.loadProcessor(this.currentProcessor);

            // Get display data of message output handlers (thery are displayed in the context menu),
            this.processorHandlers = [];
            if (preferences.processors) {
                preferences.processors.forEach((processor) => {
                    processor.supported = this.messageOutputDelegate.hasHandler(processor.name, true);
                    if (processor.hassettings && processor.supported) {
                        this.processorHandlers.push(this.messageOutputDelegate.getDisplayData(processor));
                    }
                });
            }
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            this.preferencesLoaded = true;
        });
    }

    /**
     * Load a processor.
     *
     * @param {any} processor Processor object.
     */
    protected loadProcessor(processor: any): void {
        if (!processor) {
            return;
        }
        this.currentProcessor = processor;
        this.components = this.settingsHelper.getProcessorComponents(processor.name, this.preferences.components);
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
     * Update preferences. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updatePreferences(): void {
        this.notificationsProvider.invalidateNotificationPreferences().finally(() => {
            this.notificationsProvider.getNotificationPreferences();
        });
    }

    /**
     * The selected processor was changed.
     *
     * @param {string} name Name of the selected processor.
     */
    changeProcessor(name: string): void {
        this.preferences.processors.forEach((processor) => {
            if (processor.name == name) {
                this.loadProcessor(processor);
            }
        });
    }

    /**
     * Refresh the list of preferences.
     *
     * @param {any} [refresher] Refresher.
     */
    refreshPreferences(refresher?: any): void {
        this.notificationsProvider.invalidateNotificationPreferences().finally(() => {
            this.fetchPreferences().finally(() => {
                refresher && refresher.complete();
            });
        });
    }

    /**
     * Open extra preferences.
     *
     * @param {AddonMessageOutputHandlerData} handlerData
     */
    openExtraPreferences(handlerData: AddonMessageOutputHandlerData): void {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        navCtrl.push(handlerData.page, handlerData.pageParams);
    }

    /**
     * Change the value of a certain preference.
     *
     * @param {any} notification Notification object.
     * @param {string} state State name, ['loggedin', 'loggedoff'].
     */
    changePreference(notification: any, state: string): void {
        const processorState = notification.currentProcessor[state];
        const preferenceName = notification.preferencekey + '_' + processorState.name;
        let value;

        notification.processors.forEach((processor) => {
            if (processor[state].checked) {
                if (!value) {
                    value = processor.name;
                } else {
                    value += ',' + processor.name;
                }
            }
        });

        if (!value) {
            value = 'none';
        }

        processorState.updating = true;
        this.userProvider.updateUserPreference(preferenceName, value).then(() => {
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        }).catch((message) => {
            // Show error and revert change.
            this.domUtils.showErrorModal(message);
            notification.currentProcessor[state].checked = !notification.currentProcessor[state].checked;
        }).finally(() => {
            processorState.updating = false;
        });
    }

    /**
     * Disable all notifications changed.
     */
    disableAll(disable: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);
        this.userProvider.updateUserPreferences([], disable).then(() => {
            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        }).catch((message) => {
            // Show error and revert change.
            this.domUtils.showErrorModal(message);
            this.preferences.disableall = !this.preferences.disableall;
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Change the notification sound setting.
     *
     * @param {enabled} enabled True to enable the notification sound, false to disable it.
     */
    changeNotificationSound(enabled: boolean): void {
        this.configProvider.set(CoreConstants.SETTINGS_NOTIFICATION_SOUND, enabled ? 1 : 0).finally(() => {
            const siteId = this.sitesProvider.getCurrentSiteId();
            this.eventsProvider.trigger(CoreEventsProvider.NOTIFICATION_SOUND_CHANGED, {enabled}, siteId);
            this.localNotificationsProvider.rescheduleAll();
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
