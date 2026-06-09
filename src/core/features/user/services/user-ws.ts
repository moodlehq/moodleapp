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

import { CoreCacheUpdateFrequency } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreUserDescriptionExporter, CoreUserCourseProfile, CoreUserParticipant } from './user';
import { CORE_USER_PARTICIPANTS_LIST_LIMIT } from '../constants';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalWarning } from '@services/ws';
import { CoreSite } from '@classes/sites/site';

/**
 * Service to provide user web service functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserWSService {

    protected static readonly ROOT_CACHE_KEY = 'mmUser:';

    /**
     * Get course user profiles from WS.
     *
     * @param userId User ID.
     * @param courseId Course ID to get course profile, undefined or 0 to get site profile.
     * @param wsOptions Options to pass to the WS.
     * @returns Promise resolve when the user is retrieved.
     */
    async getCourseUserProfiles(
        userId: number,
        courseId: number,
        wsOptions: CoreSitesCommonWSOptions = {},
    ): Promise<CoreUserGetCourseUserProfilesWSResponse> {
        const site = await CoreSites.getSite(wsOptions.siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserCacheKey(userId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(wsOptions.readingStrategy),
        };

        const params: CoreUserGetCourseUserProfilesWSParams = {
            userlist: [
                {
                    userid: userId,
                    courseid: courseId,
                },
            ],
        };

        return site.read<CoreUserGetCourseUserProfilesWSResponse>('core_user_get_course_user_profiles', params, preSets);
    }

    /**
     * Get user profile from WS.
     *
     * @param userId User ID.
     * @param wsOptions Options to pass to the WS.
     * @returns Promise resolve when the user is retrieved.
     */
    async getUsersByField(
        userId: number,
        wsOptions: CoreSitesCommonWSOptions = {},
    ): Promise<CoreUserGetUsersByFieldWSResponse> {
        const site = await CoreSites.getSite(wsOptions.siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserCacheKey(userId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(wsOptions.readingStrategy),
        };

        const params: CoreUserGetUsersByFieldWSParams = {
            field: 'id',
            values: [String(userId)],
        };

        return site.read<CoreUserGetUsersByFieldWSResponse>('core_user_get_users_by_field', params, preSets);

    }

    /**
     * Get cache key for a user WS call.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getUserCacheKey(userId: number): string {
        return `${CoreUserWSService.ROOT_CACHE_KEY}data:${userId}`;
    }

    /**
     * Invalidates user WS calls.
     *
     * @param userId User ID.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidateUserCache(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserCacheKey(userId));
    }

    /**
     * Get enrolled users for a certain course.
     *
     * @param courseId ID of the course.
     * @param limitFrom Position of the first participant to get.
     * @param limitNumber Number of participants to get.
     * @param sortBy Sort by. Can be 'firstname', 'lastname', 'email' or 'siteorder' (default).
     * @param wsOptions Options to pass to the WS.
     * @returns Promise resolved when the participants are retrieved.
     */
    async getEnrolledUsers(
        courseId: number,
        limitFrom = 0,
        limitNumber = CORE_USER_PARTICIPANTS_LIST_LIMIT,
        sortBy = 'siteorder',
        wsOptions: CoreSitesCommonWSOptions = {},
    ): Promise<CoreEnrolGetEnrolledUsersWSResponse> {
        const site = await CoreSites.getSite(wsOptions.siteId);

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
                    value: sortBy,
                },
            ],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getParticipantsListCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(wsOptions.readingStrategy),
        };

        return site.read<CoreEnrolGetEnrolledUsersWSResponse>('core_enrol_get_enrolled_users', params, preSets);
    }

    /**
     * Get cache key for participant list WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getParticipantsListCacheKey(courseId: number): string {
        return `${CoreUserWSService.ROOT_CACHE_KEY}list:${courseId}`;
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
     * Check if WS to search participants is available in site.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether it's available.
     * @since 3.8
     */
    isEnrolSearchUsersAvailable(site?: CoreSite): boolean {
        site = site ?? CoreSites.getCurrentSite();

        return !!site?.wsAvailable('core_enrol_search_users');
    }

    /**
     * Search participants in a certain course.
     *
     * @param courseId ID of the course.
     * @param search The string to search.
     * @param searchAnywhere Whether to find a match anywhere or only at the beginning.
     * @param page Page to get.
     * @param perPage Number of participants to get.
     * @param wsOptions Options to pass to the WS.
     * @returns Promise resolved when the participants are retrieved.
     * @since 3.8
     */
    async enrolSearchUsers(
        courseId: number,
        search: string,
        searchAnywhere = true,
        page = 0,
        perPage = CORE_USER_PARTICIPANTS_LIST_LIMIT,
        wsOptions: CoreSitesCommonWSOptions = {},
    ): Promise<CoreEnrolSearchUsersWSResponse> {
        const site = await CoreSites.getSite(wsOptions.siteId);

        const params: CoreEnrolSearchUsersWSParams = {
            courseid: courseId,
            search: search,
            searchanywhere: searchAnywhere,
            page: page,
            perpage: perPage,
        };

        const preSets: CoreSiteWSPreSets = {
            getFromCache: false, // Always try to get updated data. If it fails, it will get it from cache.
        };

        return site.read<CoreEnrolSearchUsersWSResponse>('core_enrol_search_users', params, preSets);
    }

    /**
     * Change the given user profile picture.
     *
     * @param userId User ID.
     * @param draftItemId New picture draft item id. If not provided, the picture will be deleted.
     * @param wsOptions Options to pass to the WS.
     * @returns Update result.
     */
    async updatePicture(
        userId: number,
        draftItemId: number,
        wsOptions: CoreSitesCommonWSOptions = {},
    ): Promise<CoreUserUpdatePictureWSResponse> {
        const site = await CoreSites.getSite(wsOptions.siteId);

        const params: CoreUserUpdatePictureWSParams = {
            draftitemid: draftItemId,
            delete: !draftItemId,
            userid: userId,
        };

        return site.write<CoreUserUpdatePictureWSResponse>('core_user_update_picture', params);
    }

    /**
     * Log User Profile View in Moodle.
     *
     * @param userId User ID.
     * @param courseId Course ID.
     * @param siteId Site Id. If not defined, use current site.
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
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved when done.
     */
    async logParticipantsView(courseId: number, siteId?: string): Promise<CoreStatusWithWarningsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreUserViewUserListWSParams = {
            courseid: courseId,
        };

        return site.write('core_user_view_user_list', params);
    }

}
export const CoreUserWS = makeSingleton(CoreUserWSService);

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
type CoreUserGetUsersByFieldWSResponse = CoreUserDescriptionExporter[];

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
type CoreEnrolSearchUsersWSResponse = CoreUserDescriptionExporter[];

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
