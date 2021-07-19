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

import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonMessageOutputDelegate } from '@addons/messageoutput/services/messageoutput-delegate';
import {
    AddonNotifications,
    AddonNotificationsAnyNotification,
    AddonNotificationsGetNotificationsOptions,
    AddonNotificationsPreferences,
    AddonNotificationsPreferencesComponent,
    AddonNotificationsPreferencesNotification,
    AddonNotificationsPreferencesNotificationProcessor,
    AddonNotificationsPreferencesProcessor,
    AddonNotificationsProvider,
} from './notifications';

/**
 * Service that provides some helper functions for notifications.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsHelperProvider {

    /**
     * Format preferences data.
     *
     * @param preferences Preferences to format.
     * @return Formatted preferences.
     */
    formatPreferences(preferences: AddonNotificationsPreferences): AddonNotificationsPreferencesFormatted {
        const formattedPreferences: AddonNotificationsPreferencesFormatted = preferences;

        formattedPreferences.processors.forEach((processor) => {
            processor.supported = AddonMessageOutputDelegate.hasHandler(processor.name, true);
        });

        formattedPreferences.components.forEach((component) => {
            component.notifications.forEach((notification) => {
                notification.processorsByName = CoreUtils.arrayToObject(notification.processors, 'name');
            });
        });

        return formattedPreferences;
    }

    /**
     * Get some notifications. It will try to use the new WS if available.
     *
     * @param notifications Current list of loaded notifications. It's used to calculate the offset.
     * @param options Other options.
     * @return Promise resolved with notifications and if can load more.
     */
    async getNotifications(
        notifications: AddonNotificationsAnyNotification[],
        options?: AddonNotificationsGetNotificationsOptions,
    ): Promise<{notifications: AddonNotificationsAnyNotification[]; canLoadMore: boolean}> {

        notifications = notifications || [];
        options = options || {};
        options.limit = options.limit || AddonNotificationsProvider.LIST_LIMIT;
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const available = await AddonNotifications.isPopupAvailable(options.siteId);

        if (available) {
            return AddonNotifications.getPopupNotifications(notifications.length, options);
        }

        // Fallback to get_messages. We need 2 calls, one for read and the other one for unread.
        const unreadFrom = notifications.reduce((total, current) => total + (current.read ? 0 : 1), 0);

        const unread = await AddonNotifications.getUnreadNotifications(unreadFrom, options);

        let newNotifications = unread;

        if (unread.length < options.limit) {
            // Limit not reached. Get read notifications until reach the limit.
            const readLimit = options.limit - unread.length;
            const readFrom = notifications.length - unreadFrom;
            const readOptions = Object.assign({}, options, { limit: readLimit });

            try {
                const read = await AddonNotifications.getReadNotifications(readFrom, readOptions);

                newNotifications = unread.concat(read);
            } catch (error) {
                if (unread.length <= 0) {
                    throw error;
                }
            }
        }

        return {
            notifications: newNotifications,
            canLoadMore: notifications.length >= options.limit,
        };
    }

    /**
     * Get a certain processor from a list of processors.
     *
     * @param processors List of processors.
     * @param name Name of the processor to get.
     * @param fallback True to return first processor if not found, false to not return any. Defaults to true.
     * @return Processor.
     */
    getProcessor(
        processors: AddonNotificationsPreferencesProcessor[],
        name: string,
        fallback: boolean = true,
    ): AddonNotificationsPreferencesProcessor | undefined {
        if (!processors || !processors.length) {
            return;
        }

        const processor = processors.find((processor) => processor.name == name);
        if (processor) {
            return processor;
        }

        // Processor not found, return first if requested.
        if (fallback) {
            return processors[0];
        }
    }

    /**
     * Return the components and notifications that have a certain processor.
     *
     * @param processorName Name of the processor to filter.
     * @param components Array of components.
     * @return Filtered components.
     */
    getProcessorComponents(
        processorName: string,
        components: AddonNotificationsPreferencesComponentFormatted[],
    ): AddonNotificationsPreferencesComponentFormatted[] {
        const result: AddonNotificationsPreferencesComponentFormatted[] = [];

        components.forEach((component) => {
            // Check if the component has any notification with this processor.
            const notifications: AddonNotificationsPreferencesNotificationFormatted[] = [];

            component.notifications.forEach((notification) => {
                const processor = notification.processorsByName?.[processorName];

                if (processor) {
                    // Add the notification.
                    notifications.push(notification);
                }
            });

            if (notifications.length) {
                // At least 1 notification added, add the component to the result.
                result.push({
                    displayname: component.displayname,
                    notifications,
                });
            }
        });

        return result;
    }

}

export const AddonNotificationsHelper = makeSingleton(AddonNotificationsHelperProvider);

/**
 * Preferences with some calculated data.
 */
export type AddonNotificationsPreferencesFormatted = Omit<AddonNotificationsPreferences, 'processors'|'components'> & {
    processors: AddonNotificationsPreferencesProcessorFormatted[]; // Config form values.
    components: AddonNotificationsPreferencesComponentFormatted[]; // Available components.
};

/**
 * Preferences component with some calculated data.
 */
export type AddonNotificationsPreferencesComponentFormatted = Omit<AddonNotificationsPreferencesComponent, 'notifications'> & {
    notifications: AddonNotificationsPreferencesNotificationFormatted[]; // List of notificaitons for the component.
};

/**
 * Preferences notification with some calculated data.
 */
export type AddonNotificationsPreferencesNotificationFormatted = AddonNotificationsPreferencesNotification & {
    processorsByName?: Record<string, AddonNotificationsPreferencesNotificationProcessor>; // Calculated in the app.
};

/**
 * Preferences processor with some calculated data.
 */
export type AddonNotificationsPreferencesProcessorFormatted = AddonNotificationsPreferencesProcessor & {
    supported?: boolean; // Calculated in the app. Whether the processor is supported in the app.
};
