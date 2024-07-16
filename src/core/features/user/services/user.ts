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
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreUserOffline } from './user-offline';
import { CoreLogger } from '@singletons/logger';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents, CoreEventSiteData, CoreEventUserDeletedData, CoreEventUserSuspendedData } from '@singletons/events';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalWarning } from '@services/ws';
import { CoreError } from '@classes/errors/error';
import { USERS_TABLE_NAME, CoreUserDBRecord } from './database/user';
import { CoreUrl } from '@singletons/url';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreConstants } from '@/core/constants';

const ROOT_CACHE_KEY = 'mmUser:';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [USER_PROFILE_REFRESHED]: CoreUserProfileRefreshedData;
        [USER_PROFILE_PICTURE_UPDATED]: CoreUserProfilePictureUpdatedData;
    }

}

/**
 * Profile picture updated event.
 */
export const USER_PROFILE_REFRESHED = 'CoreUserProfileRefreshed';

/**
 * Profile picture updated event.
 */
export const USER_PROFILE_PICTURE_UPDATED = 'CoreUserProfilePictureUpdated';

/**
 * Value set in timezone when using the server's timezone.
 */
export const USER_PROFILE_SERVER_TIMEZONE = '99';

/**
 * Fake ID for a "no reply" user.
 */
export const USER_NOREPLY_USER = -10;

/**
 * Service to provide user functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserProvider {

    static readonly PARTICIPANTS_LIST_LIMIT = 50; // Max of participants to retrieve in each WS call.

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreUserProvider');

        CoreEvents.on(CoreEvents.USER_DELETED, data => this.handleUserKickedOutEvent(data));
        CoreEvents.on(CoreEvents.USER_SUSPENDED, data => this.handleUserKickedOutEvent(data));
        CoreEvents.on(CoreEvents.USER_NO_LOGIN, data => this.handleUserKickedOutEvent(data));
    }

    /**
     * Check if WS to search participants is available in site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it's available.
     * @since 3.8
     */
    async canSearchParticipants(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.canSearchParticipantsInSite(site);
    }

    /**
     * Check if WS to search participants is available in site.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether it's available.
     * @since 3.8
     */
    canSearchParticipantsInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.wsAvailable('core_enrol_search_users');
    }

    /**
     * Change the given user profile picture.
     *
     * @param draftItemId New picture draft item id.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolve with the new profileimageurl
     */
    async changeProfilePicture(draftItemId: number, userId: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreUserUpdatePictureWSParams = {
            draftitemid: draftItemId,
            delete: false,
            userid: userId,
        };

        const result = await site.write<CoreUserUpdatePictureWSResponse>('core_user_update_picture', params);

        if (!result.success || !result.profileimageurl) {
            return Promise.reject(null);
        }

        return result.profileimageurl;
    }

    /**
     * Handle an event where a user was kicked out of the site.
     *
     * @param data Event data.
     */
    async handleUserKickedOutEvent(
        data: CoreEventSiteData & (CoreEventUserDeletedData | CoreEventUserSuspendedData),
    ): Promise<void> {
        // Search for userid in params.
        let userId = 0;

        if (data.params.userid) {
            userId = data.params.userid;
        } else if (data.params.userids) {
            userId = data.params.userids[0];
        } else if (data.params.field === 'id' && data.params.values && data.params.values.length) {
            userId = data.params.values[0];
        } else if (data.params.userlist && data.params.userlist.length) {
            userId = data.params.userlist[0].userid;
        }

        if (userId > 0) {
            await this.deleteStoredUser(userId, data.siteId);
        }
    }

    /**
     * Store user basic information in local DB to be retrieved if the WS call fails.
     *
     * @param userId User ID.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolve when the user is deleted.
     */
    async deleteStoredUser(userId: number, siteId?: string): Promise<void> {
        if (isNaN(userId)) {
            throw new CoreError('Invalid user ID.');
        }

        const site = await CoreSites.getSite(siteId);

        await Promise.all([
            this.invalidateUserCache(userId, site.getId()),
            site.getDb().deleteRecords(USERS_TABLE_NAME, { id: userId }),
        ]);
    }

    /**
     * Get participants for a certain course.
     *
     * @param courseId ID of the course.
     * @param limitFrom Position of the first participant to get.
     * @param limitNumber Number of participants to get.
     * @param siteId Site Id. If not defined, use current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved when the participants are retrieved.
     */
    async getParticipants(
        courseId: number,
        limitFrom: number = 0,
        limitNumber: number = CoreUserProvider.PARTICIPANTS_LIST_LIMIT,
        siteId?: string,
        ignoreCache?: boolean,
    ): Promise<{participants: CoreUserParticipant[]; canLoadMore: boolean}> {

        const site = await CoreSites.getSite(siteId);

        this.logger.debug(`Get participants for course '${courseId}' starting at '${limitFrom}'`);

        const params: CoreEnrolGetEnrolledUsersWSParams = {
            courseid: courseId,
            options: [
                {
                    name: 'limitfrom',
                    value: String(limitFrom),
                },
                {
                    name: 'limitnumber',
                    value: String(limitNumber),
                },
                {
                    name: 'sortby',
                    value: 'siteorder',
                },
            ],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getParticipantsListCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const users = await site.read<CoreEnrolGetEnrolledUsersWSResponse>('core_enrol_get_enrolled_users', params, preSets);

        const canLoadMore = users.length >= limitNumber;
        this.storeUsers(users, siteId);

        return { participants: users, canLoadMore: canLoadMore };
    }

    /**
     * Get cache key for participant list WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getParticipantsListCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'list:' + courseId;
    }

    /**
     * Get user profile. The type of profile retrieved depends on the params.
     *
     * @param userId User's ID.
     * @param courseId Course ID to get course profile, undefined or 0 to get site profile.
     * @param forceLocal True to retrieve the user data from local DB, false to retrieve it from WS.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolved with the user data.
     */
    async getProfile(
        userId: number,
        courseId?: number,
        forceLocal: boolean = false,
        siteId?: string,
    ): Promise<CoreUserProfile> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (forceLocal) {
            try {
                return await this.getUserFromLocalDb(userId, siteId);
            } catch {
                return this.getUserFromWS(userId, courseId, siteId);
            }
        }

        try {
            return await this.getUserFromWS(userId, courseId, siteId);
        } catch (error) {
            try {
                return await this.getUserFromLocalDb(userId, siteId);
            } catch {
                throw error;
            }
        }
    }

    /**
     * Get the starting week day based on the user preference.
     *
     * @returns Starting week day.
     */
    async getStartingWeekDay(): Promise<number> {
        const preference = await CoreUtils.ignoreErrors(this.getUserPreference('calendar_startwday'));

        if (preference && !isNaN(Number(preference))) {
            return Number(preference);
        }

        const defaultValue = Number(CoreSites.getCurrentSite()?.getStoredConfig('calendar_startwday') ??
            Translate.instant('core.firstdayofweek'));

        return !isNaN(defaultValue) ? defaultValue % 7 : CoreConstants.CALENDAR_DEFAULT_STARTING_WEEKDAY;
    }

    /**
     * Get cache key for a user WS call.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getUserCacheKey(userId: number): string {
        return ROOT_CACHE_KEY + 'data:' + userId;
    }

    /**
     * Get user basic information from local DB.
     *
     * @param userId User ID.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolve when the user is retrieved.
     */
    protected async getUserFromLocalDb(userId: number, siteId?: string): Promise<CoreUserDBRecord> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecord(USERS_TABLE_NAME, { id: userId });
    }

    /**
     * Get a user fullname, using a default text if user not found.
     *
     * @param userId User ID.
     * @param courseId Course ID.
     * @param siteId Site ID.
     * @returns Promise resolved with user name.
     */
    async getUserFullNameWithDefault(userId: number, courseId?: number, siteId?: string): Promise<string> {
        try {
            const user = await CoreUser.getProfile(userId, courseId, true, siteId);

            return user.fullname;

        } catch {
            return Translate.instant('core.user.userwithid', { id: userId });
        }
    }

    /**
     * Get user profile from WS.
     *
     * @param userId User ID.
     * @param courseId Course ID to get course profile, undefined or 0 to get site profile.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolve when the user is retrieved.
     */
    protected async getUserFromWS(
        userId: number,
        courseId?: number,
        siteId?: string,
    ): Promise<CoreUserCourseProfile | CoreUserData> {
        const site = await CoreSites.getSite(siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserCacheKey(userId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };
        let users: CoreUserData[] | CoreUserCourseProfile[] | undefined;

        // Determine WS and data to use.
        if (courseId && courseId != site.getSiteHomeId()) {
            this.logger.debug(`Get participant with ID '${userId}' in course '${courseId}`);

            const params: CoreUserGetCourseUserProfilesWSParams = {
                userlist: [
                    {
                        userid: userId,
                        courseid: courseId,
                    },
                ],
            };

            users = await site.read<CoreUserGetCourseUserProfilesWSResponse>('core_user_get_course_user_profiles', params, preSets);
        } else {
            this.logger.debug(`Get user with ID '${userId}'`);

            const params: CoreUserGetUsersByFieldWSParams = {
                field: 'id',
                values: [String(userId)],
            };

            users = await site.read<CoreUserGetUsersByFieldWSResponse>('core_user_get_users_by_field', params, preSets);
        }

        if (users.length == 0) {
            // Shouldn't happen.
            throw new CoreError('Cannot retrieve user info.');
        }

        const user: CoreUserData | CoreUserCourseProfile = users[0];
        if (user.country) {
            user.country = CoreUtils.getCountryName(user.country);
        }
        this.storeUser(user.id, user.fullname, user.profileimageurl);

        return user;
    }

    /**
     * Get a user preference (online or offline).
     *
     * @param name Name of the preference.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Preference value or null if preference not set.
     */
    async getUserPreference(name: string, siteId?: string): Promise<string | null> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const preference = await CoreUtils.ignoreErrors(CoreUserOffline.getPreference(name, siteId));

        if (preference && !CoreNetwork.isOnline()) {
            // Offline, return stored value.
            return preference.value;
        }

        const wsValue = await this.getUserPreferenceOnline(name, siteId);

        if (preference && preference.value != preference.onlinevalue && preference.onlinevalue == wsValue) {
            // Sync is pending for this preference, return stored value.
            return preference.value;
        }

        if (!wsValue) {
            return null;
        }

        await CoreUserOffline.setPreference(name, wsValue, wsValue);

        return wsValue;
    }

    /**
     * Get cache key for a user preference WS call.
     *
     * @param name Preference name.
     * @returns Cache key.
     */
    protected getUserPreferenceCacheKey(name: string): string {
        return ROOT_CACHE_KEY + 'preference:' + name;
    }

    /**
     * Get a user preference online.
     *
     * @param name Name of the preference.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Preference value or null if preference not set.
     */
    async getUserPreferenceOnline(name: string, siteId?: string): Promise<string | null> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreUserGetUserPreferencesWSParams = {
            name,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserPreferenceCacheKey(name),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        const result = await site.read<CoreUserGetUserPreferencesWSResponse>('core_user_get_user_preferences', params, preSets);

        return result.preferences[0] ? result.preferences[0].value : null;
    }

    /**
     * Invalidates user WS calls.
     *
     * @param userId User ID.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateUserCache(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserCacheKey(userId));
    }

    /**
     * Invalidates participant list for a certain course.
     *
     * @param courseId Course ID.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved when the list is invalidated.
     */
    async invalidateParticipantsList(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getParticipantsListCacheKey(courseId));
    }

    /**
     * Invalidate user preference.
     *
     * @param name Name of the preference.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateUserPreference(name: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserPreferenceCacheKey(name));
    }

    /**
     * Check if course participants is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isParticipantsDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isParticipantsDisabledInSite(site);
    }

    /**
     * Check if course participants is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isParticipantsDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled('CoreCourseOptionsDelegate_CoreUserParticipants');
    }

    /**
     * Returns whether or not participants is enabled for a certain course.
     *
     * @param courseId Course ID.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabledForCourse(courseId: number, siteId?: string): Promise<boolean> {
        if (!courseId) {
            throw new CoreError('Invalid course ID.');
        }

        // Retrieving one participant will fail if browsing users is disabled by capabilities.
        return CoreUtils.promiseWorks(this.getParticipants(courseId, 0, 1, siteId));
    }

    /**
     * Check if update profile picture is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns True if disabled, false otherwise.
     */
    isUpdatePictureDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled('CoreUserDelegate_picture');
    }

    /**
     * Log User Profile View in Moodle.
     *
     * @param userId User ID.
     * @param courseId Course ID.
     * @returns Promise resolved when done.
     */
    async logView(userId: number, courseId?: number, siteId?: string): Promise<CoreStatusWithWarningsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreUserViewUserProfileWSParams = {
            userid: userId,
        };

        if (courseId) {
            params.courseid = courseId;
        }

        return site.write('core_user_view_user_profile', params);
    }

    /**
     * Log Participants list view in Moodle.
     *
     * @param courseId Course ID.
     * @returns Promise resolved when done.
     */
    async logParticipantsView(courseId: number, siteId?: string): Promise<CoreStatusWithWarningsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreUserViewUserListWSParams = {
            courseid: courseId,
        };

        return site.write('core_user_view_user_list', params);
    }

    /**
     * Prefetch user profiles and their images from a certain course. It prevents duplicates.
     *
     * @param userIds List of user IDs.
     * @param courseId Course the users belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when prefetched.
     */
    async prefetchProfiles(userIds: number[], courseId?: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!siteId) {
            return;
        }

        const treated: Record<string, boolean> = {};

        await Promise.all(userIds.map(async (userId) => {
            if (userId === null || !siteId) {
                return;
            }

            userId = Number(userId); // Make sure it's a number.

            // Prevent repeats and errors.
            if (isNaN(userId) || treated[userId] || userId <= 0) {
                return;
            }

            treated[userId] = true;

            try {
                const profile = await this.getProfile(userId, courseId, false, siteId);

                if (profile.profileimageurl) {
                    await CoreFilepool.addToQueueByUrl(siteId, profile.profileimageurl);
                }
            } catch (error) {
                this.logger.warn(`Ignore error when prefetching user ${userId}`, error);
            }
        }));
    }

    /**
     * Prefetch user avatars. It prevents duplicates.
     *
     * @param entries List of entries that have the images.
     * @param propertyName The name of the property that contains the image.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when prefetched.
     */
    async prefetchUserAvatars(entries: Record<string, unknown>[], propertyName: string, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!siteId) {
            return;
        }

        const treated: Record<string, boolean> = {};

        const promises = entries.map(async (entry) => {
            const imageUrl = <string> entry[propertyName];

            if (!imageUrl || treated[imageUrl] || !siteId) {
                // It doesn't have an image or it has already been treated.
                return;
            }

            // Do not prefetch when initials are set and image is default.
            if (imageUrl && CoreUrl.isThemeImageUrl(imageUrl)) {
                return;
            }

            treated[imageUrl] = true;

            try {
                await CoreFilepool.addToQueueByUrl(siteId, imageUrl);
            } catch (ex) {
                this.logger.warn(`Ignore error when prefetching user avatar ${imageUrl}`, entry, ex);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Search participants in a certain course.
     *
     * @param courseId ID of the course.
     * @param search The string to search.
     * @param searchAnywhere Whether to find a match anywhere or only at the beginning.
     * @param page Page to get.
     * @param perPage Number of participants to get.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved when the participants are retrieved.
     * @since 3.8
     */
    async searchParticipants(
        courseId: number,
        search: string,
        searchAnywhere: boolean = true,
        page: number = 0,
        perPage: number = CoreUserProvider.PARTICIPANTS_LIST_LIMIT,
        siteId?: string,
    ): Promise<{participants: CoreUserData[]; canLoadMore: boolean}> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreEnrolSearchUsersWSParams = {
            courseid: courseId,
            search: search,
            searchanywhere: !!searchAnywhere,
            page: page,
            perpage: perPage,
        };
        const preSets: CoreSiteWSPreSets = {
            getFromCache: false, // Always try to get updated data. If it fails, it will get it from cache.
        };

        const users = await site.read<CoreEnrolSearchUsersWSResponse>('core_enrol_search_users', params, preSets);

        const canLoadMore = users.length >= perPage;
        this.storeUsers(users, siteId);

        return { participants: users, canLoadMore: canLoadMore };
    }

    /**
     * Store user basic information in local DB to be retrieved if the WS call fails.
     *
     * @param userId User ID.
     * @param fullname User full name.
     * @param avatar User avatar URL.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolve when the user is stored.
     */
    protected async storeUser(userId: number, fullname: string, avatar?: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const userRecord: CoreUserDBRecord = {
            id: userId,
            fullname: fullname,
            profileimageurl: avatar,
        };

        await site.getDb().insertRecord(USERS_TABLE_NAME, userRecord);
    }

    /**
     * Store users basic information in local DB.
     *
     * @param users Users to store.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolve when the user is stored.
     */
    async storeUsers(users: CoreUserBasicData[], siteId?: string): Promise<void> {

        await Promise.all(users.map((user) => {
            if (!user.id || isNaN(Number(user.id))) {
                return;
            }

            return this.storeUser(Number(user.id), user.fullname, user.profileimageurl, siteId);
        }));
    }

    /**
     * Set a user preference (online or offline).
     *
     * @param name Name of the preference.
     * @param value Value of the preference.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved on success.
     */
    async setUserPreference(name: string, value: string, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!CoreNetwork.isOnline()) {
            // Offline, just update the preference.
            return CoreUserOffline.setPreference(name, value);
        }

        try {
            // Update the preference in the site.
            const preferences = [
                { type: name, value },
            ];

            await this.updateUserPreferences(preferences, undefined, undefined, siteId);

            // Update preference and invalidate data.
            await Promise.all([
                CoreUserOffline.setPreference(name, value, value),
                CoreUtils.ignoreErrors(this.invalidateUserPreference(name)),
            ]);
        } catch (error) {
            // Preference not saved online. Update the offline one.
            await CoreUserOffline.setPreference(name, value);
        }
    }

    /**
     * Update a preference for a user.
     *
     * @param name Preference name.
     * @param value Preference new value.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success.
     */
    updateUserPreference(name: string, value: string | undefined, userId?: number, siteId?: string): Promise<void> {
        const preferences = [
            {
                type: name,
                value: value,
            },
        ];

        return this.updateUserPreferences(preferences, undefined, userId, siteId);
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
    async updateUserPreferences(
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
export const CoreUser = makeSingleton(CoreUserProvider);

/**
 * Data passed to PROFILE_REFRESHED event.
 */
export type CoreUserProfileRefreshedData = {
    courseId?: number; // Course the user profile belongs to.
    userId: number; // User ID.
    user?: CoreUserProfile; // User affected.
};

/**
 * Data passed to PROFILE_PICTURE_UPDATED event.
 */
export type CoreUserProfilePictureUpdatedData = {
    userId: number; // User ID.
    picture: string | undefined; // New picture URL.
};

/**
 * Basic data of a user.
 */
export type CoreUserBasicData = {
    id: number; // ID of the user.
    fullname: string; // The fullname of the user.
    profileimageurl?: string; // User image profile URL - big version.
};

/**
 * User preference.
 */
export type CoreUserPreference = {
    name: string; // The name of the preference.
    value: string; // The value of the preferenc.
};

/**
 * User custom profile field.
 */
export type CoreUserProfileField = {
    type: string; // The type of the custom field - text field, checkbox...
    value: string; // The value of the custom field.
    displayvalue?: string; // @since 4.2. Formatted value of the custom field.
    name: string; // The name of the custom field.
    shortname: string; // The shortname of the custom field - to be able to build the field class in the code.
};

/**
 * User group.
 */
export type CoreUserGroup = {
    id: number; // Group id.
    name: string; // Group name.
    description: string; // Group description.
    descriptionformat: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
};

/**
 * User role.
 */
export type CoreUserRole = {
    roleid: number; // Role id.
    name: string; // Role name.
    shortname: string; // Role shortname.
    sortorder: number; // Role sortorder.
};

/**
 * Basic data of a course the user is enrolled in.
 */
export type CoreUserEnrolledCourse = {
    id: number; // Id of the course.
    fullname: string; // Fullname of the course.
    shortname: string; // Shortname of the course.
};

/**
 * Common data returned by user_description function.
 */
export type CoreUserData = {
    id: number; // ID of the user.
    username?: string; // The username.
    firstname?: string; // The first name(s) of the user.
    lastname?: string; // The family name of the user.
    fullname: string; // The fullname of the user.
    email?: string; // An email address - allow email as root@localhost.
    address?: string; // Postal address.
    phone1?: string; // Phone 1.
    phone2?: string; // Phone 2.
    icq?: string; // Icq number.
    skype?: string; // Skype id.
    yahoo?: string; // Yahoo id.
    aim?: string; // Aim id.
    msn?: string; // Msn number.
    department?: string; // Department.
    institution?: string; // Institution.
    idnumber?: string; // An arbitrary ID code number perhaps from the institution.
    interests?: string; // User interests (separated by commas).
    firstaccess?: number; // First access to the site (0 if never).
    lastaccess?: number; // Last access to the site (0 if never).
    auth?: string; // Auth plugins include manual, ldap, etc.
    suspended?: boolean; // Suspend user account, either false to enable user login or true to disable it.
    confirmed?: boolean; // Active user: 1 if confirmed, 0 otherwise.
    lang?: string; // Language code such as "en", must exist on server.
    calendartype?: string; // Calendar type such as "gregorian", must exist on server.
    theme?: string; // Theme name such as "standard", must exist on server.
    timezone?: string; // Timezone code such as Australia/Perth, or 99 for default.
    mailformat?: number; // Mail format code is 0 for plain text, 1 for HTML etc.
    trackforums?: number; // @since 4.4. Whether the user is tracking forums.
    description?: string; // User profile description.
    descriptionformat?: number; // Int format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    city?: string; // Home city of the user.
    url?: string; // URL of the user.
    country?: string; // Home country code of the user, such as AU or CZ.
    profileimageurlsmall: string; // User image profile URL - small version.
    profileimageurl: string; // User image profile URL - big version.
    customfields?: CoreUserProfileField[]; // User custom fields (also known as user profile fields).
    preferences?: CoreUserPreference[]; // Users preferences.
};

/**
 * Data returned by user_summary_exporter.
 */
export type CoreUserSummary = {
    id: number; // Id.
    email: string; // Email.
    idnumber: string; // Idnumber.
    phone1: string; // Phone1.
    phone2: string; // Phone2.
    department: string; // Department.
    institution: string; // Institution.
    fullname: string; // Fullname.
    identity: string; // Identity.
    profileurl: string; // Profileurl.
    profileimageurl: string; // Profileimageurl.
    profileimageurlsmall: string; // Profileimageurlsmall.
};

/**
 * User data returned by core_enrol_get_enrolled_users WS.
 */
export type CoreUserParticipant = CoreUserBasicData & {
    username?: string; // Username policy is defined in Moodle security config.
    firstname?: string; // The first name(s) of the user.
    lastname?: string; // The family name of the user.
    email?: string; // An email address - allow email as root@localhost.
    address?: string; // Postal address.
    phone1?: string; // Phone 1.
    phone2?: string; // Phone 2.
    icq?: string; // Icq number.
    skype?: string; // Skype id.
    yahoo?: string; // Yahoo id.
    aim?: string; // Aim id.
    msn?: string; // Msn number.
    department?: string; // Department.
    institution?: string; // Institution.
    idnumber?: string; // An arbitrary ID code number perhaps from the institution.
    interests?: string; // User interests (separated by commas).
    firstaccess?: number; // First access to the site (0 if never).
    lastaccess?: number; // Last access to the site (0 if never).
    lastcourseaccess?: number | null; // @since 3.7. Last access to the course (0 if never).
    description?: string; // User profile description.
    descriptionformat?: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    city?: string; // Home city of the user.
    url?: string; // URL of the user.
    country?: string; // Home country code of the user, such as AU or CZ.
    profileimageurlsmall?: string; // User image profile URL - small version.
    customfields?: CoreUserProfileField[]; // User custom fields (also known as user profil fields).
    groups?: CoreUserGroup[]; // User groups.
    roles?: CoreUserRole[]; // User roles.
    preferences?: CoreUserPreference[]; // User preferences.
    enrolledcourses?: CoreUserEnrolledCourse[]; // Courses where the user is enrolled.
};

/**
 * User data returned by core_user_get_course_user_profiles WS.
 */
export type CoreUserCourseProfile = CoreUserData & {
    groups?: CoreUserGroup[]; // User groups.
    roles?: CoreUserRole[]; // User roles.
    enrolledcourses?: CoreUserEnrolledCourse[]; // Courses where the user is enrolled.
};

/**
 * User data returned by getProfile.
 */
export type CoreUserProfile = (CoreUserBasicData & Partial<CoreUserData>) | CoreUserCourseProfile;

/**
 * Params of core_user_update_picture WS.
 */
type CoreUserUpdatePictureWSParams = {
    draftitemid: number; // Id of the user draft file to use as image.
    delete?: boolean; // If we should delete the user picture.
    userid?: number; // Id of the user, 0 for current user.
};

/**
 * Data returned by core_user_update_picture WS.
 */
type CoreUserUpdatePictureWSResponse = {
    success: boolean; // True if the image was updated, false otherwise.
    profileimageurl?: string; // New profile user image url.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_enrol_get_enrolled_users WS.
 */
type CoreEnrolGetEnrolledUsersWSParams = {
    courseid: number; // Course id.
    options?: {
        name: string; // Option name.
        value: string; // Option value.
    }[];
};

/**
 * Data returned by core_enrol_get_enrolled_users WS.
 */
type CoreEnrolGetEnrolledUsersWSResponse = CoreUserParticipant[];

/**
 * Params of core_user_get_course_user_profiles WS.
 */
type CoreUserGetCourseUserProfilesWSParams = {
    userlist: {
        userid: number; // Userid.
        courseid: number; // Courseid.
    }[];
};

/**
 * Data returned by core_user_get_course_user_profiles WS.
 */
type CoreUserGetCourseUserProfilesWSResponse = CoreUserCourseProfile[];

/**
 * Params of core_user_get_users_by_field WS.
 */
type CoreUserGetUsersByFieldWSParams = {
    field: string; // The search field can be 'id' or 'idnumber' or 'username' or 'email'.
    values: string[];
};
/**
 * Data returned by core_user_get_users_by_field WS.
 */
type CoreUserGetUsersByFieldWSResponse = CoreUserData[];

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
 * Params of core_user_view_user_list WS.
 */
type CoreUserViewUserListWSParams = {
    courseid: number; // Id of the course, 0 for site.
};

/**
 * Params of core_user_view_user_profile WS.
 */
type CoreUserViewUserProfileWSParams = {
    userid: number; // Id of the user, 0 for current user.
    courseid?: number; // Id of the course, default site course.
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

/**
 * Params of core_enrol_search_users WS.
 */
type CoreEnrolSearchUsersWSParams = {
    courseid: number; // Course id.
    search: string; // Query.
    searchanywhere: boolean; // Find a match anywhere, or only at the beginning.
    page: number; // Page number.
    perpage: number; // Number per page.
    contextid?: number; // @since 4.4. Context ID.
};

/**
 * Data returned by core_enrol_search_users WS.
 */
type CoreEnrolSearchUsersWSResponse = CoreUserData[];
