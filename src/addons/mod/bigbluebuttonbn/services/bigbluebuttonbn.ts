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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { ADDON_MOD_BBB_COMPONENT } from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';

/**
 * Service that provides some features for Big Blue Button activity.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBBBService {

    protected static readonly ROOT_CACHE_KEY = 'AddonModBBB:';

    /**
     * End a meeting.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
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
     * @returns Promise resolved when the activity is retrieved.
     */
    async getBBB(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModBBBData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModBBBGetBigBlueButtonBNsByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getBBBsCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_BBB_COMPONENT,
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
     * @returns Cache key.
     */
    protected getBBBsCacheKey(courseId: number): string {
        return AddonModBBBService.ROOT_CACHE_KEY + 'bbb:' + courseId;
    }

    /**
     * Get join URL for a BBB activity.
     *
     * @param cmId Course module ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of messages.
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
     * @returns Promise resolved with the list of messages.
     */
    async getMeetingInfo(
        id: number,
        groupId: number = 0,
        options: AddonModBBBGetMeetingInfoOptions = {},
    ): Promise<AddonModBBBMeetingInfo> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModBBBMeetingInfoWSParams = {
            bigbluebuttonbnid: id,
            groupid: groupId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getMeetingInfoCacheKey(id, groupId),
            getCacheUsingCacheKey: true,
            uniqueCacheKey: true,
            component: ADDON_MOD_BBB_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };
        if (options.updateCache) {
            params.updatecache = true;
            preSets.getFromCache = false;
        }

        const meetingInfo = await site.read<AddonModBBBMeetingInfoWSResponse>(
            'mod_bigbluebuttonbn_meeting_info',
            params,
            preSets,
        );

        return {
            ...meetingInfo,
            features: meetingInfo.features ? CoreUtils.objectToKeyValueMap(meetingInfo.features, 'name', 'isenabled') : undefined,
        };
    }

    /**
     * Get cache key for meeting info WS call.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @returns Cache key.
     */
    protected getMeetingInfoCacheKey(id: number, groupId: number = 0): string {
        return this.getMeetingInfoCacheKeyPrefix(id) + groupId;
    }

    /**
     * Get cache key prefix for meeting info WS call.
     *
     * @param id BBB ID.
     * @returns Cache key prefix.
     */
    protected getMeetingInfoCacheKeyPrefix(id: number): string {
        return AddonModBBBService.ROOT_CACHE_KEY + 'meetingInfo:' + id + ':';
    }

    /**
     * Get meeting info for a BBB activity.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param options Other options.
     * @returns Promise resolved with the list of messages.
     */
    async getRecordings(
        id: number,
        groupId: number = 0,
        options: AddonModBBBGetMeetingInfoOptions = {},
    ): Promise<AddonModBBBRecordingsTableData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModBBBGetRecordingsWSParams = {
            bigbluebuttonbnid: id,
            groupid: groupId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getRecordingsCacheKey(id, groupId),
            component: ADDON_MOD_BBB_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<AddonModBBBGetRecordingsWSResponse>(
            'mod_bigbluebuttonbn_get_recordings',
            params,
            preSets,
        );

        if (result.warnings?.length) {
            throw new CoreWSError(result.warnings[0]);
        } else if (!result.tabledata) {
            throw new CoreError('Cannot retrieve recordings.');
        }

        return {
            ...result.tabledata,
            parsedData: CoreText.parseJSON(result.tabledata?.data, []),
        };
    }

    /**
     * Get cache key for get recordings WS call.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @returns Cache key.
     */
    protected getRecordingsCacheKey(id: number, groupId: number = 0): string {
        return this.getRecordingsCacheKeyPrefix(id) + groupId;
    }

    /**
     * Get cache key prefix for get recordings WS call.
     *
     * @param id BBB ID.
     * @returns Cache key prefix.
     */
    protected getRecordingsCacheKeyPrefix(id: number): string {
        return AddonModBBBService.ROOT_CACHE_KEY + 'recordings:' + id + ':';
    }

    /**
     * Report a BBB as being viewed.
     *
     * @param id BBB instance ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModBBBViewBigBlueButtonBNWSParams = {
            bigbluebuttonbnid: id,
        };

        await CoreCourseLogHelper.log(
            'mod_bigbluebuttonbn_view_bigbluebuttonbn',
            params,
            ADDON_MOD_BBB_COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Invalidate BBBs.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllGroupsMeetingInfo(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getMeetingInfoCacheKeyPrefix(id));
    }

    /**
     * Invalidate recordings for a certain group.
     *
     * @param id BBB ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateRecordings(id: number, groupId: number = 0, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getRecordingsCacheKey(id, groupId));
    }

    /**
     * Invalidate recordings for all groups.
     *
     * @param id BBB ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllGroupsRecordings(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getRecordingsCacheKeyPrefix(id));
    }

    /**
     * Returns whether or not the BBB plugin is enabled for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if enabled, resolved with false or rejected otherwise.
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
    features?: { // Enabled features. @since 4.1.
        name: string;
        isenabled: boolean;
    }[];
};

/**
 * Meeting info with some calculated data.
 */
export type AddonModBBBMeetingInfo = Omit<AddonModBBBMeetingInfoWSResponse, 'features'> & {
    features?: Record<string, boolean>;
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

/**
 * Options for getMeetingInfo.
 */
export type AddonModBBBGetMeetingInfoOptions = CoreCourseCommonModWSOptions & {
    updateCache?: boolean;
};

/**
 * Params of mod_bigbluebuttonbn_get_recordings WS.
 */
export type AddonModBBBGetRecordingsWSParams = {
    bigbluebuttonbnid: number; // Bigbluebuttonbn instance id.
    tools?: string; // A set of enabled tools.
    groupid?: number; // Group ID.
};

/**
 * Data returned by mod_bigbluebuttonbn_get_recordings WS.
 */
export type AddonModBBBGetRecordingsWSResponse = {
    status: boolean; // Whether the fetch was successful.
    tabledata?: AddonModBBBRecordingsWSTableData;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Table data returned by mod_bigbluebuttonbn_get_recordings WS.
 */
export type AddonModBBBRecordingsWSTableData = {
    activity: string;
    ping_interval: number; // eslint-disable-line @typescript-eslint/naming-convention
    locale: string;
    profile_features: string[]; // eslint-disable-line @typescript-eslint/naming-convention
    columns: {
        key: string;
        label: string;
        width: string;
        type?: string; // Column type.
        sortable?: boolean; // Whether this column is sortable.
        allowHTML?: boolean; // Whether this column contains HTML.
        formatter?: string; // Formatter name.
    }[];
    data: string;
};

/**
 * Recordings table data with some calculated data.
 */
export type AddonModBBBRecordingsTableData = AddonModBBBRecordingsWSTableData & {
    parsedData: Record<string, string|number|boolean>[];
};

/**
 * Recording playback types.
 */
export enum AddonModBBBRecordingPlaybackTypes {
    NOTES = 'notes',
    PODCAST = 'podcast',
    PRESENTATION = 'presentation',
    SCREENSHARE = 'screenshare',
    STATISTICS = 'statistics',
    VIDEO = 'video',
}
