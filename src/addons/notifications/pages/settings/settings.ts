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

import { Component, OnInit, OnDestroy, signal } from '@angular/core';

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
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreLoadings } from '@services/loadings';

/**
 * Page that displays notifications settings.
 */
@Component({
    selector: 'page-addon-notifications-settings',
    templateUrl: 'settings.html',
    styleUrl: 'settings.scss',
})
export class AddonNotificationsSettingsPage implements OnInit, OnDestroy {

    preferences?: AddonNotificationsPreferencesFormatted;
    components?: AddonNotificationsPreferencesComponentFormatted[];
    currentProcessorName = 'airnotifier';
    preferencesLoaded = false;
    notificationSound = false;
    canChangeSound: boolean;
    processorHandlers: AddonMessageOutputHandlerData[] = [];
    loggedInOffLegacyMode = false;
    warningMessage = signal<string | undefined>(undefined);

    protected updateTimeout?: number;
    protected logView: () => void;

    constructor() {
        this.canChangeSound = CoreLocalNotifications.canDisableSound();

        const currentSite = CoreSites.getRequiredCurrentSite();
        this.loggedInOffLegacyMode = !currentSite.isVersionGreaterEqualThan('4.0');

        this.logView = CoreTime.once(async () => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_message_get_user_notification_preferences',
                name: Translate.instant('addon.notifications.notificationpreferences'),
                data: { category: 'notifications' },
                url: '/message/notificationpreferences.php',
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (this.canChangeSound) {
            this.notificationSound = await CoreConfig.get<boolean>(CoreConstants.SETTINGS_NOTIFICATION_SOUND, true);
        }

        this.fetchPreferences();
    }

    /**
     * Fetches preferences data.
     *
     * @returns Resolved when done.
     */
    protected async fetchPreferences(): Promise<void> {
        try {
            const preferences = await AddonNotifications.getNotificationPreferences();

            this.warningMessage.set(undefined);

            // Initialize current processor. Load "Mobile" (airnotifier) if available.
            let currentProcessor = preferences.processors.find((processor) => processor.name == this.currentProcessorName);
            if (!currentProcessor) {
                currentProcessor = preferences.processors[0];
            }

            if (!currentProcessor) {
                // Shouldn't happen.
                throw new CoreError('No processor found');
            }

            preferences.enableall = !preferences.disableall;
            this.preferences = AddonNotificationsHelper.formatPreferences(preferences);
            this.loadProcessor(currentProcessor);

            this.logView();
        } catch (error) {
            if (error.errorcode === 'nopermissions') {
                this.warningMessage.set(CoreErrorHelper.getErrorMessageFromError(error));

                return;
            }

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

        this.currentProcessorName = processor.name;
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
     * @returns Promise resolved when done.
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
        const processor = this.preferences?.processors.find((processor) => processor.name == name);

        if (processor) {
            this.loadProcessor(processor);
        }
    }

    /**
     * Refresh the list of preferences.
     *
     * @param refresher Refresher.
     */
    async refreshPreferences(refresher?: HTMLIonRefresherElement): Promise<void> {
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
     * @param handlerData The handler data to open.
     */
    openExtraPreferences(handlerData: AddonMessageOutputHandlerData): void {
        CoreNavigator.navigateToSitePath(handlerData.page, { params: handlerData.pageParams });
    }

    /**
     * Change the value of a certain preference.
     *
     * @param notification Notification object.
     * @param state State name, ['loggedin', 'loggedoff'].
     * @returns Promise resolved when done.
     */
    async changePreferenceLegacy(notification: AddonNotificationsPreferencesNotificationFormatted, state: string): Promise<void> {
        const processor = notification.processorsByName?.[this.currentProcessorName];
        if (!processor) {
            return;
        }

        const processorState: ProcessorStateFormatted = processor[state];
        const preferenceName = notification.preferencekey + '_' + processorState.name;

        let value = notification.processors
            .filter((processor) => processor[state].checked)
            .map((processor) => processor.name)
            .join(',');

        if (value == '') {
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
     * Change the value of a certain preference.
     *
     * @param notification Notification object.
     * @returns Promise resolved when done.
     */
    async changePreference(notification: AddonNotificationsPreferencesNotificationFormatted): Promise<void> {
        const processor = notification.processorsByName?.[this.currentProcessorName];
        if (!processor) {
            return;
        }

        const preferenceName = notification.preferencekey + '_enabled';

        let value = notification.processors
            .filter((processor) => processor.enabled)
            .map((processor) => processor.name)
            .join(',');

        if (value == '') {
            value = 'none';
        }

        processor.updating = true;

        try {
            await CoreUser.updateUserPreference(preferenceName, value);

            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        } catch (error) {
            // Show error and revert change.
            CoreDomUtils.showErrorModal(error);
            processor.enabled = !processor.enabled;
        } finally {
            processor.updating = false;
        }
    }

    /**
     * Enable all notifications changed.
     *
     * @param enable Whether to enable or disable.
     * @returns Promise resolved when done.
     */
    async enableAll(enable?: boolean): Promise<void> {
        if (!this.preferences) {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            CoreUser.updateUserPreferences([], !enable);

            // Update the preferences since they were modified.
            this.updatePreferencesAfterDelay();
        } catch (error) {
            // Show error and revert change.
            CoreDomUtils.showErrorModal(error);
            this.preferences.enableall = !this.preferences.enableall;
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
 * State in notification processor in notification preferences component with some calculated data.
 *
 * @deprecatedonmoodle since 4.0
 */
type ProcessorStateFormatted = AddonNotificationsPreferencesNotificationProcessorState & {
    updating?: boolean; // Calculated in the app. Whether the state is being updated.
};
