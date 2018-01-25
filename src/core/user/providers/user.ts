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
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSite } from '../../../classes/site';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider } from '../../../providers/utils/utils';

/**
 * Service to provide user functionalities.
 */
@Injectable()
export class CoreUserProvider {
    public static PROFILE_REFRESHED = 'CoreUserProfileRefreshed';
    public static PROFILE_PICTURE_UPDATED = 'CoreUserProfilePictureUpdated';
    protected ROOT_CACHE_KEY = 'mmUser:';

    // Variables for database.
    protected USERS_TABLE = 'users';
    protected tablesSchema = [
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
            ]
        }
    ];

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('CoreUserProvider');
        this.sitesProvider.createTablesFromSchema(this.tablesSchema);
    }

    /**
     * Change the given user profile picture.
     *
     * @param  {number} draftItemId New picture draft item id.
     * @param  {number} userId      User ID.
     * @return {Promise<string>}       Promise resolve with the new profileimageurl
     */
    changeProfilePicture(draftItemId: number, userId: number): Promise<string> {
        var data = {
            'draftitemid': draftItemId,
            'delete': 0,
            'userid': userId
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

        let promises = [];

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Invalidate WS calls.
        promises.push(this.invalidateUserCache(userId, siteId));

        promises.push(this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(this.USERS_TABLE, { id: userId });
        }));

        return Promise.all(promises);
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
    getProfile(userId: number, courseId?: number, forceLocal = false, siteId?: string): Promise<any> {
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
    protected getUserCacheKey(userId): string {
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
            return site.getDb().getRecord(this.USERS_TABLE, {id: userId});
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
            let presets = {
                    cacheKey: this.getUserCacheKey(userId)
                },
                wsName, data;

            // Determine WS and data to use.
            if (courseId && courseId != site.getSiteHomeId()) {
                this.logger.debug(`Get participant with ID '${userId}' in course '${courseId}`);
                wsName = 'core_user_get_course_user_profiles';
                data = {
                    "userlist[0][userid]": userId,
                    "userlist[0][courseid]": courseId
                };
            } else {
                this.logger.debug(`Get user with ID '${userId}'`);
                wsName = 'core_user_get_users_by_field';
                data = {
                    'field': 'id',
                    'values[0]': userId
                };
            }

            return site.read(wsName, data, presets).then((users) => {
                if (users.length == 0) {
                    return Promise.reject('Cannot retrieve user info.');
                }

                var user = users.shift();
                if (user.country) {
                    user.country = this.utils.getCountryName(user.country);
                }
                this.storeUser(user.id, user.fullname, user.profileimageurl);
                return user;
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
    invalidateUserCache(userId: number, siteId?: string) : Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserCacheKey(userId));
        });
    };

    /**
     * Check if update profile picture is disabled in a certain site.
     *
     * @param  {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean}       True if disabled, false otherwise.
     */
    isUpdatePictureDisabledInSite(site?: CoreSite) : boolean {
        site = site || this.sitesProvider.getCurrentSite();
        return site.isFeatureDisabled('$mmUserDelegate_picture');
    };


    /**
     * Log User Profile View in Moodle.
     * @param  {number}       userId   User ID.
     * @param  {number}       [courseId] Course ID.
     * @return {Promise<any>}          Promise resolved when done.
     */
    logView(userId: number, courseId?: number) : Promise<any> {
        let params = {
            userid: userId
        };

        if (courseId) {
            params['courseid'] = courseId;
        }
        return this.sitesProvider.getCurrentSite().write('core_user_view_user_profile', params);
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
            let userRecord = {
                id: userId,
                fullname: fullname,
                profileimageurl: avatar
            };

            return site.getDb().insertOrUpdateRecord(this.USERS_TABLE, userRecord, {id: userId});
        });
    }
}
