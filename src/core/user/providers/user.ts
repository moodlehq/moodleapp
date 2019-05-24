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

import { Injectable } from '@angular/core';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CoreUserOfflineProvider } from './offline';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';

/**
 * Service to provide user functionalities.
 */
@Injectable()
export class CoreUserProvider {
    static PARTICIPANTS_LIST_LIMIT = 50; // Max of participants to retrieve in each WS call.
    static PROFILE_REFRESHED = 'CoreUserProfileRefreshed';
    static PROFILE_PICTURE_UPDATED = 'CoreUserProfilePictureUpdated';
    protected ROOT_CACHE_KEY = 'mmUser:';

    // Variables for database.
    protected USERS_TABLE = 'users';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreUserProvider',
        version: 1,
        canBeCleared: [ this.USERS_TABLE ],
        tables: [
            {
                name: this.USERS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'fullname',
                        type: 'TEXT'
                    },
                    {
                        name: 'profileimageurl',
                        type: 'TEXT'
                    }
                ],
            }
        ]
    };

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private filepoolProvider: CoreFilepoolProvider, private appProvider: CoreAppProvider,
            private userOffline: CoreUserOfflineProvider, private pushNotificationsProvider: CorePushNotificationsProvider) {
        this.logger = logger.getInstance('CoreUserProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Change the given user profile picture.
     *
     * @param  {number} draftItemId New picture draft item id.
     * @param  {number} userId      User ID.
     * @return {Promise<string>}       Promise resolve with the new profileimageurl
     */
    changeProfilePicture(draftItemId: number, userId: number): Promise<string> {
        const data = {
            draftitemid: draftItemId,
            delete: 0,
            userid: userId
        };

        return this.sitesProvider.getCurrentSite().write('core_user_update_picture', data).then((result) => {
            if (!result.success) {
                return Promise.reject(null);
            }

            return result.profileimageurl;
        });
    }

    /**
     * Store user basic information in local DB to be retrieved if the WS call fails.
     *
     * @param  {number} userId  User ID.
     * @param {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>}   Promise resolve when the user is deleted.
     */
    deleteStoredUser(userId: number, siteId?: string): Promise<any> {
        if (isNaN(userId)) {
            return Promise.reject(null);
        }

        const promises = [];

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Invalidate WS calls.
        promises.push(this.invalidateUserCache(userId, siteId));

        promises.push(this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(this.USERS_TABLE, { id: userId });
        }));

        return Promise.all(promises);
    }

    /**
     * Get participants for a certain course.
     *
     * @param  {number} courseId    ID of the course.
     * @param  {number} limitFrom   Position of the first participant to get.
     * @param  {number} limitNumber Number of participants to get.
     * @param  {string} [siteId]    Site Id. If not defined, use current site.
     * @param  {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<{participants: any[], canLoadMore: boolean}>} Promise resolved when the participants are retrieved.
     */
    getParticipants(courseId: number, limitFrom: number = 0, limitNumber: number = CoreUserProvider.PARTICIPANTS_LIST_LIMIT,
            siteId?: string, ignoreCache?: boolean): Promise<{participants: any[], canLoadMore: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            this.logger.debug(`Get participants for course '${courseId}' starting at '${limitFrom}'`);

            const data = {
                    courseid: courseId,
                    options: [
                        {
                            name: 'limitfrom',
                            value: limitFrom
                        },
                        {
                            name: 'limitnumber',
                            value: limitNumber
                        },
                        {
                            name: 'sortby',
                            value: 'siteorder'
                        }
                    ]
                }, preSets: any = {
                    cacheKey: this.getParticipantsListCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_enrol_get_enrolled_users', data, preSets).then((users) => {
                const canLoadMore = users.length >= limitNumber;
                this.storeUsers(users, siteId);

                return { participants: users, canLoadMore: canLoadMore };
            });
        });
    }

    /**
     * Get cache key for participant list WS calls.
     *
     * @param  {number} courseId Course ID.
     * @return {string}          Cache key.
     */
    protected getParticipantsListCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'list:' + courseId;
    }

    /**
     * Get user profile. The type of profile retrieved depends on the params.
     *
     * @param  {number} userId      User's ID.
     * @param  {number} [courseId]  Course ID to get course profile, undefined or 0 to get site profile.
     * @param  {boolean} [forceLocal] True to retrieve the user data from local DB, false to retrieve it from WS.
     * @param {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>}            Promise resolved with the user data.
     */
    getProfile(userId: number, courseId?: number, forceLocal: boolean = false, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (forceLocal) {
            return this.getUserFromLocalDb(userId, siteId).catch(() => {
                return this.getUserFromWS(userId, courseId, siteId);
            });
        }

        return this.getUserFromWS(userId, courseId, siteId).catch(() => {
            return this.getUserFromLocalDb(userId, siteId);
        });
    }

    /**
     * Get cache key for a user WS call.
     *
     * @param  {number} userId User ID.
     * @return {string}        Cache key.
     */
    protected getUserCacheKey(userId: number): string {
        return this.ROOT_CACHE_KEY + 'data:' + userId;
    }

    /**
     * Get user basic information from local DB.
     *
     * @param {number} userId User ID.
     * @param {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>}   Promise resolve when the user is retrieved.
     */
    protected getUserFromLocalDb(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(this.USERS_TABLE, { id: userId });
        });
    }

    /**
     * Get user profile from WS.
     *
     * @param {number} userId         User ID.
     * @param {number} [courseId] Course ID to get course profile, undefined or 0 to get site profile.
     * @param {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>}           Promise resolve when the user is retrieved.
     */
    protected getUserFromWS(userId: number, courseId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const presets = {
                    cacheKey: this.getUserCacheKey(userId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };
            let wsName, data;

            // Determine WS and data to use.
            if (courseId && courseId != site.getSiteHomeId()) {
                this.logger.debug(`Get participant with ID '${userId}' in course '${courseId}`);
                wsName = 'core_user_get_course_user_profiles';
                data = {
                    userlist: [
                        {
                            userid: userId,
                            courseid: courseId
                        }
                    ]
                };
            } else {
                this.logger.debug(`Get user with ID '${userId}'`);
                wsName = 'core_user_get_users_by_field';
                data = {
                    field: 'id',
                    values: [userId]
                };
            }

            return site.read(wsName, data, presets).then((users) => {
                if (users.length == 0) {
                    return Promise.reject('Cannot retrieve user info.');
                }

                const user = users.shift();
                if (user.country) {
                    user.country = this.utils.getCountryName(user.country);
                }
                this.storeUser(user.id, user.fullname, user.profileimageurl);

                return user;
            });

        });
    }

    /**
     * Get a user preference (online or offline).
     *
     * @param {string} name Name of the preference.
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {string} Preference value or null if preference not set.
     */
    getUserPreference(name: string, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.userOffline.getPreference(name, siteId).catch(() => {
            return null;
        }).then((preference) => {
            if (preference && !this.appProvider.isOnline()) {
                // Offline, return stored value.
                return preference.value;
            }

            return this.getUserPreferenceOnline(name, siteId).then((wsValue) => {
                if (preference && preference.value != preference.onlinevalue && preference.onlinevalue == wsValue) {
                    // Sync is pending for this preference, return stored value.
                    return preference.value;
                }

                return this.userOffline.setPreference(name, wsValue, wsValue).then(() => {
                    return wsValue;
                });
            });
        });
    }

    /**
     * Get cache key for a user preference WS call.
     *
     * @param {string} name Preference name.
     * @return {string} Cache key.
     */
    protected getUserPreferenceCacheKey(name: string): string {
        return this.ROOT_CACHE_KEY + 'preference:' + name;
    }

    /**
     * Get a user preference online.
     *
     * @param {string} name Name of the preference.
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {string} Preference value or null if preference not set.
     */
    getUserPreferenceOnline(name: string, siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = { name };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getUserPreferenceCacheKey(data.name),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            return site.read('core_user_get_user_preferences', data, preSets).then((result) => {
                return result.preferences[0] ? result.preferences[0].value : null;
            });
        });
    }

    /**
     * Invalidates user WS calls.
     *
     * @param {number} userId User ID.
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<any>}       Promise resolved when the data is invalidated.
     */
    invalidateUserCache(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserCacheKey(userId));
        });
    }

    /**
     * Invalidates participant list for a certain course.
     *
     * @param  {number} courseId Course ID.
     * @param  {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<any>}         Promise resolved when the list is invalidated.
     */
    invalidateParticipantsList(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getParticipantsListCacheKey(courseId));
        });
    }

    /**
     * Invalidate user preference.
     *
     * @param {string} name Name of the preference.
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateUserPreference(name: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserPreferenceCacheKey(name));
        });
    }

    /**
     * Check if course participants is disabled in a certain site.
     *
     * @param  {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>}     Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isParticipantsDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isParticipantsDisabledInSite(site);
        });
    }

    /**
     * Check if course participants is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isParticipantsDisabledInSite(site?: any): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreCourseOptionsDelegate_CoreUserParticipants');
    }

    /**
     * Returns whether or not participants is enabled for a certain course.
     *
     * @param {number} courseId Course ID.
     * @param  {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<any>}    Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabledForCourse(courseId: number, siteId?: string): Promise<any> {
        if (!courseId) {
            return Promise.reject(null);
        }

        // Retrieving one participant will fail if browsing users is disabled by capabilities.
        return this.utils.promiseWorks(this.getParticipants(courseId, 0, 1, siteId));
    }

    /**
     * Check if update profile picture is disabled in a certain site.
     *
     * @param  {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean}       True if disabled, false otherwise.
     */
    isUpdatePictureDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreUserDelegate_picture');
    }

    /**
     * Log User Profile View in Moodle.
     * @param  {number}       userId   User ID.
     * @param  {number}       [courseId] Course ID.
     * @param  {string}       [name] Name of the user.
     * @return {Promise<any>}          Promise resolved when done.
     */
    logView(userId: number, courseId?: number, name?: string): Promise<any> {
        const params = {
                userid: userId
            },
            wsName = 'core_user_view_user_profile';

        if (courseId) {
            params['courseid'] = courseId;
        }

        this.pushNotificationsProvider.logViewEvent(userId, name, 'user', wsName, {courseid: courseId});

        return this.sitesProvider.getCurrentSite().write(wsName, params);
    }

    /**
     * Log Participants list view in Moodle.
     * @param  {number}       courseId Course ID.
     * @return {Promise<any>}          Promise resolved when done.
     */
    logParticipantsView(courseId?: number): Promise<any> {
        const params = {
            courseid: courseId
        };

        this.pushNotificationsProvider.logViewListEvent('user', 'core_user_view_user_list', params);

        return this.sitesProvider.getCurrentSite().write('core_user_view_user_list', params);
    }

    /**
     * Prefetch user profiles and their images from a certain course. It prevents duplicates.
     *
     * @param {number[]} userIds List of user IDs.
     * @param {number} [courseId] Course the users belong to.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when prefetched.
     */
    prefetchProfiles(userIds: number[], courseId?: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const treated = {},
            promises = [];

        userIds.forEach((userId) => {
            if (userId === null) {
                return;
            }

            userId = Number(userId); // Make sure it's a number.

            // Prevent repeats and errors.
            if (!isNaN(userId) && !treated[userId] && userId > 0) {
                treated[userId] = true;

                promises.push(this.getProfile(userId, courseId, false, siteId).then((profile) => {
                    if (profile.profileimageurl) {
                        this.filepoolProvider.addToQueueByUrl(siteId, profile.profileimageurl);
                    }
                }));
            }
        });

        return Promise.all(promises);
    }

    /**
     * Store user basic information in local DB to be retrieved if the WS call fails.
     *
     * @param {number} userId   User ID.
     * @param {string} fullname User full name.
     * @param {string} avatar   User avatar URL.
     * @param  {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>}         Promise resolve when the user is stored.
     */
    protected storeUser(userId: number, fullname: string, avatar: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const userRecord = {
                id: userId,
                fullname: fullname,
                profileimageurl: avatar
            };

            return site.getDb().insertRecord(this.USERS_TABLE, userRecord);
        });
    }

    /**
     * Store users basic information in local DB.
     *
     * @param  {any[]} users     Users to store. Fields stored: id, fullname, profileimageurl.
     * @param  {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>}        Promise resolve when the user is stored.
     */
    storeUsers(users: any[], siteId?: string): Promise<any> {
        const promises = [];

        users.forEach((user) => {
            if (typeof user.id != 'undefined' && !isNaN(parseInt(user.id, 10))) {
                promises.push(this.storeUser(parseInt(user.id, 10), user.fullname, user.profileimageurl, siteId));
            }
        });

        return Promise.all(promises);
    }

    /**
     * Set a user preference (online or offline).
     *
     * @param {string} name Name of the preference.
     * @param {string} value Value of the preference.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved on success.
     */
    setUserPreference(name: string, value: string, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let isOnline = this.appProvider.isOnline();
        let promise: Promise<any>;

        if (isOnline) {
            const preferences = [{type: name, value}];
            promise = this.updateUserPreferences(preferences, undefined, undefined, siteId).catch((error) => {
                // Preference not saved online.
                isOnline = false;

                return Promise.reject(error);
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.finally(() => {
            // Update stored online value if saved online.
            const onlineValue = isOnline ? value : undefined;

            return Promise.all([
                this.userOffline.setPreference(name, value, onlineValue),
                this.invalidateUserPreference(name).catch(() => {
                    // Ignore error.
                })
            ]);
        });
    }

    /**
     * Update a preference for a user.
     *
     * @param  {string} name     Preference name.
     * @param  {any} value       Preference new value.
     * @param  {number} [userId] User ID. If not defined, site's current user.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if success.
     */
    updateUserPreference(name: string, value: any, userId?: number, siteId?: string): Promise<any> {
        const preferences = [
            {
                type: name,
                value: value
            }
        ];

        return this.updateUserPreferences(preferences, undefined, userId, siteId);
    }

    /**
     * Update some preferences for a user.
     *
     * @param  {{name: string, value: string}[]} preferences List of preferences.
     * @param  {boolean} [disableNotifications] Whether to disable all notifications. Undefined to not update this value.
     * @param  {number} [userId]                User ID. If not defined, site's current user.
     * @param  {string} [siteId]                Site ID. If not defined, current site.
     * @return {Promise<any>}                   Promise resolved if success.
     */
    updateUserPreferences(preferences: {type: string, value: string}[], disableNotifications?: boolean, userId?: number,
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const data = {
                    userid: userId,
                    preferences: preferences
                },
                preSets = {
                    responseExpected: false
                };

            if (typeof disableNotifications != 'undefined') {
                data['emailstop'] = disableNotifications ? 1 : 0;
            }

            return site.write('core_user_update_user_preferences', data, preSets);
        });
    }
}
