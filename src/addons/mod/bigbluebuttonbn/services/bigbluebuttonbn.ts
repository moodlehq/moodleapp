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
import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';

const ROOT_CACHE_KEY = 'AddonModBBB:';

/**
 * Service that provides some features for Big Blue Button activity.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBBBService {

    static readonly COMPONENT = 'mmaModBigBlueButtonBN';

    /**
     * End a meeting.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async endMeeting(
        id: number,
        groupId: number = 0,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModBBBEndMeetingWSParams = {
            bigbluebuttonbnid: id,
            groupid: groupId,
        };

        await site.write('mod_bigbluebuttonbn_end_meeting', params);
    }

    /**
     * Get a BBB activity.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @return Promise resolved when the activity is retrieved.
     */
    async getBBB(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModBBBData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModBBBGetBigBlueButtonBNsByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getBBBsCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModBBBService.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModBBBGetBigBlueButtonBNsByCoursesWSResponse>(
            'mod_bigbluebuttonbn_get_bigbluebuttonbns_by_courses',
            params,
            preSets,
        );

        const bbb = response.bigbluebuttonbns.find((bbb) => bbb.coursemodule == cmId);
        if (bbb) {
            return bbb;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get cache key for get BBB WS call.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getBBBsCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'bbb:' + courseId;
    }

    /**
     * Get join URL for a BBB activity.
     *
     * @param cmId Course module ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of messages.
     */
    async getJoinUrl(
        cmId: number,
        groupId: number = 0,
        siteId?: string,
    ): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModBBBGetJoinUrlWSParams = {
            cmid: cmId,
            groupid: groupId,
        };

        // Don't use cache.
        const response = await site.write<AddonModBBBGetJoinUrlWSResponse>(
            'mod_bigbluebuttonbn_get_join_url',
            params,
        );

        if (response.warnings?.length) {
            throw new CoreWSError(response.warnings[0]);
        }

        if (!response.join_url) {
            // Shouldn't happen, if there are no warning the app should always receive the URL.
            throw new CoreError(
                Translate.instant('addon.mod_bigbluebuttonbn.view_error_unable_join_studentview_error_unable_join_student'),
            );
        }

        return response.join_url;
    }

    /**
     * Get meeting info for a BBB activity.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param options Other options.
     * @return Promise resolved with the list of messages.
     */
    async getMeetingInfo(
        id: number,
        groupId: number = 0,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModBBBMeetingInfoWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModBBBMeetingInfoWSParams = {
            bigbluebuttonbnid: id,
            groupid: groupId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getMeetingInfoCacheKey(id, groupId),
            component: AddonModBBBService.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return await site.read<AddonModBBBMeetingInfoWSResponse>(
            'mod_bigbluebuttonbn_meeting_info',
            params,
            preSets,
        );
    }

    /**
     * Get cache key for meeting info WS call.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @return Cache key.
     */
    protected getMeetingInfoCacheKey(id: number, groupId: number = 0): string {
        return this.getMeetingInfoCacheKeyPrefix(id) + groupId;
    }

    /**
     * Get cache key prefix for meeting info WS call.
     *
     * @param id BBB ID.
     * @return Cache key prefix.
     */
    protected getMeetingInfoCacheKeyPrefix(id: number): string {
        return ROOT_CACHE_KEY + 'meetingInfo:' + id + ':';
    }

    /**
     * Report a BBB as being viewed.
     *
     * @param id BBB instance ID.
     * @param name Name of the BBB.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    async logView(id: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModBBBViewBigBlueButtonBNWSParams = {
            bigbluebuttonbnid: id,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_bigbluebuttonbn_view_bigbluebuttonbn',
            params,
            AddonModBBBService.COMPONENT,
            id,
            name,
            'bigbluebuttonbn',
            {},
            siteId,
        );
    }

    /**
     * Invalidate BBBs.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateBBBs(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getBBBsCacheKey(courseId));
    }

    /**
     * Invalidate meeting info for a certain group.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateMeetingInfo(id: number, groupId: number = 0, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getMeetingInfoCacheKey(id, groupId));
    }

    /**
     * Invalidate meeting info for all groups.
     *
     * @param id BBB ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAllGroupsMeetingInfo(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getMeetingInfoCacheKeyPrefix(id));
    }

    /**
     * Returns whether or not the BBB plugin is enabled for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if enabled, resolved with false or rejected otherwise.
     * @since 4.0, but the WebServices were backported to the plugin so it can be supported in older versions.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_bigbluebuttonbn_meeting_info');
    }

}

export const AddonModBBB = makeSingleton(AddonModBBBService);

/**
 * Params of mod_bigbluebuttonbn_get_bigbluebuttonbns_by_courses WS.
 */
export type AddonModBBBGetBigBlueButtonBNsByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_bigbluebuttonbn_get_bigbluebuttonbns_by_courses WS.
 */
export type AddonModBBBGetBigBlueButtonBNsByCoursesWSResponse = {
    bigbluebuttonbns: AddonModBBBData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * BBB data returned by mod_bigbluebuttonbn_get_bigbluebuttonbns_by_courses.
 */
export type AddonModBBBData = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Name.
    intro: string; // Description.
    meetingid: string; // Meeting id.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    timemodified: number; // Last time the instance was modified.
    section: number; // Course section id.
    visible: number; // Module visibility.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
};

/**
 * Params of mod_bigbluebuttonbn_meeting_info WS.
 */
export type AddonModBBBMeetingInfoWSParams = {
    bigbluebuttonbnid: number; // Bigbluebuttonbn instance id.
    groupid?: number; // Bigbluebuttonbn group id.
    updatecache?: boolean; // Update cache ?.
};

/**
 * Data returned by mod_bigbluebuttonbn_meeting_info WS.
 */
export type AddonModBBBMeetingInfoWSResponse = {
    cmid: number; // CM id.
    userlimit: number; // User limit.
    bigbluebuttonbnid: string; // Bigbluebuttonbn instance id.
    meetingid: string; // Meeting id.
    openingtime?: number; // Opening time.
    closingtime?: number; // Closing time.
    statusrunning?: boolean; // Status running.
    statusclosed?: boolean; // Status closed.
    statusopen?: boolean; // Status open.
    statusmessage?: string; // Status message.
    startedat?: number; // Started at.
    moderatorcount?: number; // Moderator count.
    participantcount?: number; // Participant count.
    moderatorplural?: boolean; // Several moderators ?.
    participantplural?: boolean; // Several participants ?.
    canjoin: boolean; // Can join.
    ismoderator: boolean; // Is moderator.
    presentations: {
        url: string; // Presentation URL.
        iconname: string; // Icon name.
        icondesc: string; // Icon text.
        name: string; // Presentation name.
    }[];
    joinurl: string; // Join URL.
};

/**
 * Params of mod_bigbluebuttonbn_get_join_url WS.
 */
export type AddonModBBBGetJoinUrlWSParams = {
    cmid: number; // Course module id.
    groupid?: number; // Bigbluebuttonbn group id.
};

/**
 * Data returned by mod_bigbluebuttonbn_get_join_url WS.
 */
export type AddonModBBBGetJoinUrlWSResponse = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    join_url?: string; // Can join session.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_bigbluebuttonbn_view_bigbluebuttonbn WS.
 */
export type AddonModBBBViewBigBlueButtonBNWSParams = {
    bigbluebuttonbnid: number; // Bigbluebuttonbn instance id.
};

/**
 * Params of mod_bigbluebuttonbn_end_meeting WS.
 */
export type AddonModBBBEndMeetingWSParams = {
    bigbluebuttonbnid: number; // Bigbluebuttonbn instance id.
    groupid?: number; // Bigbluebuttonbn group id.
};
