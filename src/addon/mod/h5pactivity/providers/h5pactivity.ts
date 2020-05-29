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

import { CoreSites } from '@providers/sites';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';
import { CoreTimeUtils } from '@providers/utils/time';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreCourseLogHelper } from '@core/course/providers/log-helper';
import { CoreH5P } from '@core/h5p/providers/h5p';
import { CoreH5PDisplayOptions } from '@core/h5p/classes/core';

import { makeSingleton, Translate } from '@singletons/core.singletons';

/**
 * Service that provides some features for H5P activity.
 */
@Injectable()
export class AddonModH5PActivityProvider {
    static COMPONENT = 'mmaModH5PActivity';

    protected ROOT_CACHE_KEY = 'mmaModH5PActivity:';

    /**
     * Format an attempt's data.
     *
     * @param attempt Attempt to format.
     */
    protected formatAttempt(attempt: AddonModH5PActivityWSAttempt): AddonModH5PActivityAttempt {
        const formattedAttempt: AddonModH5PActivityAttempt = attempt;

        formattedAttempt.timemodified = attempt.timemodified * 1000; // Convert to milliseconds.
        formattedAttempt.durationReadable = CoreTimeUtils.instance.formatTime(attempt.duration);
        formattedAttempt.durationCompact = CoreTimeUtils.instance.formatDurationShort(attempt.duration);

        return formattedAttempt;
    }

    /**
     * Format the attempts of a user.
     *
     * @param data Data to format.
     * @return Formatted data.
     */
    protected formatUserAttempts(data: AddonModH5PActivityWSUserAttempts): AddonModH5PActivityUserAttempts {
        const formatted: AddonModH5PActivityUserAttempts = data;

        for (const i in formatted.attempts) {
            formatted.attempts[i] = this.formatAttempt(formatted.attempts[i]);
        }

        if (formatted.scored) {
            for (const i in formatted.scored.attempts) {
                formatted.scored.attempts[i] = this.formatAttempt(formatted.scored.attempts[i]);
            }
        }

        return formatted;
    }

    /**
     * Get cache key for access information WS calls.
     *
     * @param id H5P activity ID.
     * @return Cache key.
     */
    protected getAccessInformationCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'accessInfo:' + id;
    }

    /**
     * Get access information for a given H5P activity.
     *
     * @param id H5P activity ID.
     * @param forceCache True to always get the value from cache. false otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the data.
     */
    async getAccessInformation(id: number, forceCache?: boolean, siteId?: string): Promise<AddonModH5PActivityAccessInfo> {

        const site = await CoreSites.instance.getSite(siteId);

        const params = {
            h5pactivityid: id,
        };
        const preSets = {
            cacheKey: this.getAccessInformationCacheKey(id),
            omitExpires: forceCache,
        };

        return site.read('mod_h5pactivity_get_h5pactivity_access_information', params, preSets);
    }

    /**
     * Get deployed file from an H5P activity instance.
     *
     * @param h5pActivity Activity instance.
     * @param options Options
     * @return Promise resolved with the file.
     */
    async getDeployedFile(h5pActivity: AddonModH5PActivityData, options?: AddonModH5PActivityGetDeployedFileOptions)
            : Promise<CoreWSExternalFile> {

        if (h5pActivity.deployedfile) {
            // File already deployed and still valid, use this one.
            return h5pActivity.deployedfile;
        } else {
            if (!h5pActivity.package || !h5pActivity.package[0]) {
                // Shouldn't happen.
                throw 'No H5P package found.';
            }

            options = options || {};

            // Deploy the file in the server.
            return CoreH5P.instance.getTrustedH5PFile(h5pActivity.package[0].fileurl, options.displayOptions,
                    options.ignoreCache, options.siteId);
        }
    }

    /**
     * Get cache key for H5P activity data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getH5PActivityDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'h5pactivity:' + courseId;
    }

    /**
     * Get an H5P activity with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param moduleUrl Module URL.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the activity data.
     */
    protected async getH5PActivityByField(courseId: number, key: string, value: any, forceCache?: boolean, siteId?: string)
            : Promise<AddonModH5PActivityData> {

        const site = await CoreSites.instance.getSite(siteId);

        const params = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getH5PActivityDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };

        if (forceCache) {
            preSets.omitExpires = true;
        }

        const response: AddonModH5PActivityGetByCoursesResult =
                await site.read('mod_h5pactivity_get_h5pactivities_by_courses', params, preSets);

        if (response && response.h5pactivities) {
            const currentActivity = response.h5pactivities.find((h5pActivity) => {
                return h5pActivity[key] == value;
            });

            if (currentActivity) {
                return currentActivity;
            }
        }

        throw Translate.instance.instant('addon.mod_h5pactivity.errorgetactivity');
    }

    /**
     * Get an H5P activity by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the activity data.
     */
    getH5PActivity(courseId: number, cmId: number, forceCache?: boolean, siteId?: string): Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'coursemodule', cmId, forceCache, siteId);
    }

    /**
     * Get an H5P activity by instance ID.
     *
     * @param courseId Course ID.
     * @param id Instance ID.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the activity data.
     */
    getH5PActivityById(courseId: number, id: number, forceCache?: boolean, siteId?: string): Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'id', id, forceCache, siteId);
    }

    /**
     * Get cache key for attemps WS calls.
     *
     * @param id Instance ID.
     * @param userIds User IDs.
     * @return Cache key.
     */
    protected getUserAttemptsCacheKey(id: number, userIds: number[]): string {
        return this.getUserAttemptsCommonCacheKey(id) + ':' + JSON.stringify(userIds);
    }

    /**
     * Get common cache key for attempts WS calls.
     *
     * @param id Instance ID.
     * @return Cache key.
     */
    protected getUserAttemptsCommonCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'attempts:' + id;
    }

    /**
     * Get attempts of a certain user.
     *
     * @param id Activity ID.
     * @param options Other options.
     * @return Promise resolved with the attempts of the user.
     */
    async getUserAttempts(id: number, options?: AddonModH5PActivityGetAttemptsOptions): Promise<AddonModH5PActivityUserAttempts> {

        options = options || {};

        const site = await CoreSites.instance.getSite(options.siteId);

        const params = {
            h5pactivityid: id,
            userids: [options.userId || site.getUserId()],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserAttemptsCacheKey(id, params.userids),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        if (options.ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const response: AddonModH5PActivityGetAttemptsResult = await site.read('mod_h5pactivity_get_attempts', params, preSets);

        return this.formatUserAttempts(response.usersattempts[0]);
    }

    /**
     * Invalidates access information.
     *
     * @param id H5P activity ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAccessInformation(id: number, siteId?: string): Promise<void> {

        const site = await CoreSites.instance.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(id));
    }

    /**
     * Invalidates H5P activity data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateActivityData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.instance.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getH5PActivityDataCacheKey(courseId));
    }

    /**
     * Invalidates all users attempts for H5P activity.
     *
     * @param id Activity ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAllUserAttempts(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.instance.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserAttemptsCommonCacheKey(id));
    }

    /**
     * Invalidates attempts of a certain user for H5P activity.
     *
     * @param id Activity ID.
     * @param userId User ID. If not defined, current user in the site.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateUserAttempts(id: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.instance.getSite(siteId);

        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getUserAttemptsCacheKey(id, [userId]));
    }

    /**
     * Delete launcher.
     *
     * @return Promise resolved when the launcher file is deleted.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.instance.getSite(siteId);

        return site.wsAvailable('mod_h5pactivity_get_h5pactivities_by_courses');
    }

    /**
     * Report an H5P activity as being viewed.
     *
     * @param id H5P activity ID.
     * @param name Name of the activity.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<void> {
        const params = {
            h5pactivityid: id,
        };

        return CoreCourseLogHelper.instance.logSingle(
            'mod_h5pactivity_view_h5pactivity',
            params,
            AddonModH5PActivityProvider.COMPONENT,
            id,
            name,
            'h5pactivity',
            {},
            siteId
        );
    }
}

export class AddonModH5PActivity extends makeSingleton(AddonModH5PActivityProvider) {}

/**
 * Basic data for an H5P activity, exported by Moodle class h5pactivity_summary_exporter.
 */
export type AddonModH5PActivityData = {
    id: number; // The primary key of the record.
    course: number; // Course id this h5p activity is part of.
    name: string; // The name of the activity module instance.
    timecreated?: number; // Timestamp of when the instance was added to the course.
    timemodified?: number; // Timestamp of when the instance was last modified.
    intro: string; // H5P activity description.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    grade?: number; // The maximum grade for submission.
    displayoptions: number; // H5P Button display options.
    enabletracking: number; // Enable xAPI tracking.
    grademethod: number; // Which H5P attempt is used for grading.
    contenthash?: string; // Sha1 hash of file content.
    coursemodule: number; // Coursemodule.
    introfiles: CoreWSExternalFile[];
    package: CoreWSExternalFile[];
    deployedfile?: {
        filename?: string; // File name.
        filepath?: string; // File path.
        filesize?: number; // File size.
        fileurl?: string; // Downloadable file url.
        timemodified?: number; // Time modified.
        mimetype?: string; // File mime type.
    };
};

/**
 * Result of WS mod_h5pactivity_get_h5pactivities_by_courses.
 */
export type AddonModH5PActivityGetByCoursesResult = {
    h5pactivities: AddonModH5PActivityData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_h5pactivity_get_h5pactivity_access_information.
 */
export type AddonModH5PActivityAccessInfo = {
    warnings?: CoreWSExternalWarning[];
    canview?: boolean; // Whether the user has the capability mod/h5pactivity:view allowed.
    canaddinstance?: boolean; // Whether the user has the capability mod/h5pactivity:addinstance allowed.
    cansubmit?: boolean; // Whether the user has the capability mod/h5pactivity:submit allowed.
    canreviewattempts?: boolean; // Whether the user has the capability mod/h5pactivity:reviewattempts allowed.
};

/**
 * Result of WS mod_h5pactivity_get_attempts.
 */
export type AddonModH5PActivityGetAttemptsResult = {
    activityid: number; // Activity course module ID.
    usersattempts: AddonModH5PActivityWSUserAttempts[]; // The complete users attempts list.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Attempts data for a user as returned by the WS.
 */
export type AddonModH5PActivityWSUserAttempts = {
    userid: number; // The user id.
    attempts: AddonModH5PActivityWSAttempt[]; // The complete attempts list.
    scored?: { // Attempts used to grade the activity.
        title: string; // Scored attempts title.
        grademethod: string; // Scored attempts title.
        attempts: AddonModH5PActivityWSAttempt[]; // List of the grading attempts.
    };
};

/**
 * Attempt data as returned by the WS.
 */
export type AddonModH5PActivityWSAttempt = {
    id: number; // ID of the context.
    h5pactivityid: number; // ID of the H5P activity.
    userid: number; // ID of the user.
    timecreated: number; // Attempt creation.
    timemodified: number; // Attempt modified.
    attempt: number; // Attempt number.
    rawscore: number; // Attempt score value.
    maxscore: number; // Attempt max score.
    duration: number; // Attempt duration in seconds.
    completion?: number; // Attempt completion.
    success?: number; // Attempt success.
    scaled: number; // Attempt scaled.
};

/**
 * Attempts data with some calculated data.
 */
export type AddonModH5PActivityUserAttempts = {
    userid: number; // The user id.
    attempts: AddonModH5PActivityAttempt[]; // The complete attempts list.
    scored?: { // Attempts used to grade the activity.
        title: string; // Scored attempts title.
        grademethod: string; // Scored attempts title.
        attempts: AddonModH5PActivityAttempt[]; // List of the grading attempts.
    };
};

/**
 * Attempt with some calculated data.
 */
export type AddonModH5PActivityAttempt = AddonModH5PActivityWSAttempt & {
    durationReadable?: string; // Duration in a human readable format.
    durationCompact?: string; // Duration in a "short" human readable format.
};

/**
 * Options to pass to getDeployedFile function.
 */
export type AddonModH5PActivityGetDeployedFileOptions = {
    displayOptions?: CoreH5PDisplayOptions; // Display options
    ignoreCache?: boolean; // Whether to ignore cache. Will fail if offline or server down.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to getAttempts function.
 */
export type AddonModH5PActivityGetAttemptsOptions = {
    ignoreCache?: boolean; // Whether to ignore cache. Will fail if offline or server down.
    siteId?: string; // Site ID. If not defined, current site.
    userId?: number; // User ID. If not defined, user of the site.
};
