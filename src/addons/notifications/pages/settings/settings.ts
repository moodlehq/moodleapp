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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreConfig } from '@services/config';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreUser } from '@features/user/services/user';
import { AddonMessageOutputDelegate, AddonMessageOutputHandlerData } from '@addons/messageoutput/services/messageoutput-delegate';
import { CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';
import { CoreEvents } from '@singletons/events';
import {
    AddonNotifications,
    AddonNotificationsPreferencesProcessor,
    AddonNotificationsPreferencesNotificationProcessorState,
} from '../../services/notifications';
import {
    AddonNotificationsHelper,
    AddonNotificationsPreferencesComponentFormatted,
    AddonNotificationsPreferencesFormatted,
    AddonNotificationsPreferencesNotificationFormatted,
    AddonNotificationsPreferencesProcessorFormatted,
} from '@addons/notifications/services/notifications-helper';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays notifications settings.
 */
@Component({
    selector: 'page-addon-notifications-settings',
    templateUrl: 'settings.html',
    styleUrls: ['settings.scss'],
})
export class AddonNotificationsSettingsPage implements OnInit, OnDestroy {

    preferences?: AddonNotificationsPreferencesFormatted;
    components?: AddonNotificationsPreferencesComponentFormatted[];
    currentProcessor?: AddonNotificationsPreferencesProcessor;
    preferencesLoaded = false;
    notificationSound = false;
    notifPrefsEnabled: boolean;
    canChangeSound: boolean;
    processorHandlers: AddonMessageOutputHandlerData[] = [];

    protected updateTimeout?: number;

    constructor() {
        this.notifPrefsEnabled = AddonNotifications.isNotificationPreferencesEnabled();
        this.canChangeSound = CoreLocalNotifications.canDisableSound();
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        if (this.canChangeSound) {
            this.notificationSound = await CoreConfig.get<boolean>(CoreConstants.SETTINGS_NOTIFICATION_SOUND, true);
        }

        if (this.notifPrefsEnabled) {
            this.fetchPreferences();
        } else {
            this.preferencesLoaded = true;
        }
    }

    /**
     * Fetches preferences data.
     *
     * @return Resolved when done.
     */
    protected async fetchPreferences(): Promise<void> {
        try {
            const preferences = await AddonNotifications.getNotificationPreferences();

            if (!this.currentProcessor) {
                // Initialize current processor. Load "Mobile" (airnotifier) if available.
                this.currentProcessor = AddonNotificationsHelper.getProcessor(preferences.processors, 'airnotifier');
            }

            if (!this.currentProcessor) {
                // Shouldn't happen.
                throw new CoreError('No processor found');
            }

            preferences.enableall = !preferences.disableall;
            this.preferences = AddonNotificationsHelper.formatPreferences(preferences);
            this.loadProcessor(this.currentProcessor);

        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            this.preferencesLoaded = true;
        }
    }

    /**
     * Load a processor.
     *
     * @param processor Processor object.
     */
    protected loadProcessor(processor: AddonNotificationsPreferencesProcessorFormatted): void {
        if (!processor) {
            return;
        }

        this.currentProcessor = processor;
        this.processorHandlers = [];
        this.components = AddonNotificationsHelper.getProcessorComponents(
            processor.name,
            this.preferences?.components || [],
        );

        if (!processor.hassettings || !processor.supported) {
            return;
        }

        const handlerData = AddonMessageOutputDelegate.getDisplayData(processor);
        if (handlerData) {
            this.processorHandlers.push(handlerData);
        }
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
     * Update preferences. The purpose is to store the updated data, it won't be reflected in the view.
     *
     * @return Promise resolved when done.
     */
    protected async updatePreferences(): Promise<void> {
        await CoreUtils.ignoreErrors(AddonNotifications.invalidateNotificationPreferences());

        await AddonNotifications.getNotificationPreferences();
    }

    /**
     * The selected processor was changed.
     *
     * @param name Name of the selected processor.
     */
    changeProcessor(name: string): void {
        const processor = this.preferences!.processors.find((processor) => processor.name == name);

        if (processor) {
            this.loadProcessor(processor);
        }
    }

    /**
     * Refresh the list of preferences.
     *
     * @param refresher Refresher.
     */
    async refreshPreferences(refresher?: IonRefresher): Promise<void> {
        try {
            await CoreUtils.ignoreErrors(AddonNotifications.invalidateNotificationPreferences());

            await this.fetchPreferences();
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Open extra preferences.
     *
     * @param handlerData
     */
    openExtraPreferences(handlerData: AddonMessageOutputHandlerData): void {
        CoreNavigator.navigateToSitePath(handlerData.page, { params: handlerData.pageParams });
    }

    /**
     * Change the value of a certain preference.
     *
     * @param notification Notification object.
     * @param state State name, ['loggedin', 'loggedoff'].
     * @return Promise resolved when done.
     */
    async changePreference(notification: AddonNotificationsPreferencesNotificationFormatted, state: string): Promise<void> {
        const processor = notification.processorsByName?.[this.currentProcessor?.name || ''];
        if (!processor) {
            return;
        }

        const processorState: ProcessorStateFormatted = processor[state];
        const preferenceName = notification.preferencekey + '_' + processorState.name;
        let value: string | undefined;

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

        try {
            await CoreUser.updateUserPreference(preferenceName, value);

            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        } catch (error) {
            // Show error and revert change.
            CoreDomUtils.showErrorModal(error);
            processor[state].checked = !processor[state].checked;
        } finally {
            processorState.updating = false;
        }
    }

    /**
     * Enable all notifications changed.
     *
     * @param enable Whether to enable or disable.
     * @return Promise resolved when done.
     */
    async enableAll(enable?: boolean): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        try {
            CoreUser.updateUserPreferences([], !enable);

            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        } catch (error) {
            // Show error and revert change.
            CoreDomUtils.showErrorModal(error);
            this.preferences!.enableall = !this.preferences!.enableall;
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Change the notification sound setting.
     *
     * @param enabled True to enable the notification sound, false to disable it.
     */
    async changeNotificationSound(enabled: boolean): Promise<void> {
        await CoreUtils.ignoreErrors(CoreConfig.set(CoreConstants.SETTINGS_NOTIFICATION_SOUND, enabled ? 1 : 0));

        const siteId = CoreSites.getCurrentSiteId();
        CoreEvents.trigger(CoreEvents.NOTIFICATION_SOUND_CHANGED, { enabled }, siteId);
        CoreLocalNotifications.rescheduleAll();
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
 * State in notification processor in notification preferences component with some calculated data.
 */
type ProcessorStateFormatted = AddonNotificationsPreferencesNotificationProcessorState & {
    updating?: boolean; // Calculated in the app. Whether the state is being updated.
};
