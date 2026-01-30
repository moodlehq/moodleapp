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

import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreUserPreferencesOffline } from './user-preferences-offline';
import { CoreLogger } from '@static/logger';
import { makeSingleton, Translate } from '@singletons';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@static/promise-utils';
import { CORE_USER_CALENDAR_DEFAULT_STARTING_WEEKDAY, CORE_USER_TF_12, CORE_USER_TF_24 } from '../constants';

/**
 * Service with functionality related to user preferences.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserPreferencesService {

    protected static readonly ROOT_CACHE_KEY = 'CoreUserPreferences:';

    protected logger: CoreLogger = CoreLogger.getInstance('CoreUserPreferencesService');

    /**
     * Get the starting week day based on the user preference.
     *
     * @returns Starting week day.
     */
    async getStartingWeekDay(): Promise<number> {
        const preference = await CorePromiseUtils.ignoreErrors(this.getPreference('calendar_startwday'));

        if (preference && !isNaN(Number(preference))) {
            return Number(preference);
        }

        const defaultValue = Number(CoreSites.getCurrentSite()?.getStoredConfig('calendar_startwday') ??
            Translate.instant('core.firstdayofweek'));

        return !isNaN(defaultValue) ? defaultValue % 7 : CORE_USER_CALENDAR_DEFAULT_STARTING_WEEKDAY;
    }

    /**
     * Get the preferred time format to use when printing times.
     *
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolved with the format.
     */
    async getTimeFormat(siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);
        let format: string | undefined | null;

        try {
            format = await this.getPreference('calendar_timeformat');
        } catch {
            // Ignore errors.
        }

        if (!format || format === '0') {
            format = site.getStoredConfig('calendar_site_timeformat');
        }

        if (format === CORE_USER_TF_12) {
            format = Translate.instant('core.strftimetime12');
        } else if (format === CORE_USER_TF_24) {
            format = Translate.instant('core.strftimetime24');
        }

        return format && format !== '0' ? format : Translate.instant('core.strftimetime');
    }

    /**
     * Get a user preference (online or offline).
     *
     * @param name Name of the preference.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Preference value or null if preference not set.
     */
    async getPreference(name: string, siteId?: string): Promise<string | null> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const preference = await CorePromiseUtils.ignoreErrors(CoreUserPreferencesOffline.getPreference(name, siteId));

        if (preference && !CoreNetwork.isOnline()) {
            // Offline, return stored value.
            return preference.value;
        }

        const wsValue = await this.getPreferenceOnline(name, siteId);

        if (preference && preference.value != preference.onlinevalue && preference.onlinevalue == wsValue) {
            // Sync is pending for this preference, return stored value.
            return preference.value;
        }

        if (!wsValue) {
            return null;
        }

        await CoreUserPreferencesOffline.setPreference(name, wsValue, wsValue);

        return wsValue;
    }

    /**
     * Get cache key for a user preference WS call.
     *
     * @param name Preference name.
     * @returns Cache key.
     */
    protected getPreferenceCacheKey(name: string): string {
        return `${CoreUserPreferencesService.ROOT_CACHE_KEY}preference:${name}`;
    }

    /**
     * Old cache key for user preferences.
     *
     * @param name Preference name.
     * @returns Cache key.
     * @deprecated since 5.1. In the future it can be removed because the cache should already use the new cache key.
     */
    protected getOldPreferenceCacheKey(name: string): string {
        return `mmUser:preference:${name}`;
    }

    /**
     * Get a user preference online.
     *
     * @param name Name of the preference.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Preference value or null if preference not set.
     */
    async getPreferenceOnline(name: string, siteId?: string): Promise<string | null> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreUserGetUserPreferencesWSParams = {
            name,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getPreferenceCacheKey(name),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        const result = await site.read<CoreUserGetUserPreferencesWSResponse>('core_user_get_user_preferences', params, preSets);

        return result.preferences[0] ? result.preferences[0].value : null;
    }

    /**
     * Invalidate user preference.
     *
     * @param name Name of the preference.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidatePreference(name: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await Promise.all([
            site.invalidateWsCacheForKey(this.getPreferenceCacheKey(name)),
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            site.invalidateWsCacheForKey(this.getOldPreferenceCacheKey(name)),
        ]);
    }

    /**
     * Updates a user preference. If offline or cannot connect, it will be stored and synchronized later.
     *
     * @param name Name of the preference.
     * @param value Value of the preference.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved on success.
     */
    async setPreference(name: string, value: string, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!CoreNetwork.isOnline()) {
            // Offline, just update the preference.
            return CoreUserPreferencesOffline.setPreference(name, value);
        }

        try {
            // Update the preference in the site.
            const preferences = [
                { type: name, value },
            ];

            await this.setPreferencesOnline(preferences, undefined, undefined, siteId);

            // Update preference and invalidate data.
            await Promise.all([
                CoreUserPreferencesOffline.setPreference(name, value, value),
                CorePromiseUtils.ignoreErrors(this.invalidatePreference(name)),
            ]);
        } catch {
            // Preference not saved online. Update the offline one.
            await CoreUserPreferencesOffline.setPreference(name, value);
        }
    }

    /**
     * Update a preference for a user in the site. Only works online.
     *
     * @param name Preference name.
     * @param value Preference new value.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success.
     */
    setPreferenceOnline(name: string, value: string | undefined, userId?: number, siteId?: string): Promise<void> {
        const preferences = [
            {
                type: name,
                value: value,
            },
        ];

        return this.setPreferencesOnline(preferences, undefined, userId, siteId);
    }

    /**
     * Update some preferences for a user.
     *
     * @param preferences List of preferences.
     * @param disableNotifications Whether to disable all notifications. Undefined to not update this value.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success.
     */
    async setPreferencesOnline(
        preferences: { type: string; value: string | undefined }[],
        disableNotifications?: boolean,
        userId?: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const params: CoreUserUpdateUserPreferencesWSParams = {
            userid: userId,
            preferences: preferences,
        };
        const preSets: CoreSiteWSPreSets = {
            responseExpected: false,
        };

        if (disableNotifications !== undefined) {
            params.emailstop = disableNotifications ? 1 : 0;
        }

        await site.write('core_user_update_user_preferences', params, preSets);
    }

}
export const CoreUserPreferences = makeSingleton(CoreUserPreferencesService);

/**
 * Params of core_user_get_user_preferences WS.
 */
type CoreUserGetUserPreferencesWSParams = {
    name?: string; // Preference name, empty for all.
    userid?: number; // Id of the user, default to current user.
};

/**
 * Data returned by core_user_get_user_preferences WS.
 */
type CoreUserGetUserPreferencesWSResponse = {
    preferences: { // User custom fields (also known as user profile fields).
        name: string; // The name of the preference.
        value: string | null; // The value of the preference.
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_user_update_user_preferences WS.
 */
type CoreUserUpdateUserPreferencesWSParams = {
    userid?: number; // Id of the user, default to current user.
    emailstop?: number; // Enable or disable notifications for this user.
    preferences?: { // User preferences.
        type: string; // The name of the preference.
        value?: string; // The value of the preference, do not set this field if you want to remove (unset) the current value.
    }[];
};
