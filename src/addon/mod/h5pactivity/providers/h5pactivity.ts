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
import { CoreUtils } from '@providers/utils/utils';
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
    static TRACK_COMPONENT = 'mod_h5pactivity'; // Component for tracking.

    protected ROOT_CACHE_KEY = 'mmaModH5PActivity:';

    /**
     * Format an attempt's data.
     *
     * @param attempt Attempt to format.
     */
    protected formatAttempt(attempt: AddonModH5PActivityWSAttempt): AddonModH5PActivityAttempt {
        const formattedAttempt: AddonModH5PActivityAttempt = attempt;

        formattedAttempt.timecreated = attempt.timecreated * 1000; // Convert to milliseconds.
        formattedAttempt.timemodified = attempt.timemodified * 1000; // Convert to milliseconds.
        formattedAttempt.success = typeof formattedAttempt.success == 'undefined' ? null : formattedAttempt.success;

        if (!attempt.duration) {
            formattedAttempt.durationReadable = '-';
            formattedAttempt.durationCompact = '-';
        } else {
            formattedAttempt.durationReadable = CoreTimeUtils.instance.formatTime(attempt.duration);
            formattedAttempt.durationCompact = CoreTimeUtils.instance.formatDurationShort(attempt.duration);
        }

        return formattedAttempt;
    }

    /**
     * Format attempt data and results.
     *
     * @param attempt Attempt and results to format.
     */
    protected formatAttemptResults(attempt: AddonModH5PActivityWSAttemptResults): AddonModH5PActivityAttemptResults {
        const formattedAttempt: AddonModH5PActivityAttemptResults = this.formatAttempt(attempt);

        formattedAttempt.results = formattedAttempt.results.map((result) => {
            return this.formatResult(result);
        });

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

        formatted.attempts = formatted.attempts.map((attempt) => {
            return this.formatAttempt(attempt);
        });

        if (formatted.scored) {

            formatted.scored.attempts = formatted.scored.attempts.map((attempt) => {
                return this.formatAttempt(attempt);
            });
        }

        return formatted;
    }

    /**
     * Format an attempt's result.
     *
     * @param result Result to format.
     */
    protected formatResult(result: AddonModH5PActivityWSResult): AddonModH5PActivityWSResult {
        result.timecreated = result.timecreated * 1000; // Convert to milliseconds.

        return result;
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
     * Get attempt results for all user attempts.
     *
     * @param id Activity ID.
     * @param options Other options.
     * @return Promise resolved with the results of the attempt.
     */
    async getAllAttemptsResults(id: number, options?: AddonModH5PActivityGetAttemptResultsOptions)
            : Promise<AddonModH5PActivityAttemptsResults> {

        const userAttempts = await AddonModH5PActivity.instance.getUserAttempts(id, options);

        const attemptIds = userAttempts.attempts.map((attempt) => {
            return attempt.id;
        });

        if (attemptIds.length) {
            // Get all the attempts with a single call.
            return AddonModH5PActivity.instance.getAttemptsResults(id, attemptIds, options);
        } else {
            // No attempts.
            return {
                activityid: id,
                attempts: [],
                warnings: [],
            };
        }
    }

    /**
     * Get cache key for results WS calls.
     *
     * @param id Instance ID.
     * @param attemptsIds Attempts IDs.
     * @return Cache key.
     */
    protected getAttemptResultsCacheKey(id: number, attemptsIds: number[]): string {
        return this.getAttemptResultsCommonCacheKey(id) + ':' + JSON.stringify(attemptsIds);
    }

    /**
     * Get common cache key for results WS calls.
     *
     * @param id Instance ID.
     * @return Cache key.
     */
    protected getAttemptResultsCommonCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'results:' + id;
    }

    /**
     * Get attempt results.
     *
     * @param id Activity ID.
     * @param attemptId Attempt ID.
     * @param options Other options.
     * @return Promise resolved with the results of the attempt.
     */
    async getAttemptResults(id: number, attemptId: number, options?: AddonModH5PActivityGetAttemptResultsOptions)
            : Promise<AddonModH5PActivityAttemptResults> {

        options = options || {};

        const site = await CoreSites.instance.getSite(options.siteId);

        const params = {
            h5pactivityid: id,
            attemptids: [attemptId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptResultsCacheKey(id, params.attemptids),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        if (options.forceCache) {
            preSets.omitExpires = true;
        } else if (options.ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        try {
            const response: AddonModH5PActivityGetResultsResult = await site.read('mod_h5pactivity_get_results', params, preSets);

            if (response.warnings[0]) {
                throw response.warnings[0]; // Cannot view attempt.
            }

            return this.formatAttemptResults(response.attempts[0]);
        } catch (error) {
            if (CoreUtils.instance.isWebServiceError(error)) {
                throw error;
            }

            // Check if the full list of results is cached. If so, get the results from there.
            options.forceCache = true;

            const attemptsResults = await AddonModH5PActivity.instance.getAllAttemptsResults(id, options);

            const attempt = attemptsResults.attempts.find((attempt) => {
                return attempt.id == attemptId;
            });

            if (!attempt) {
                throw error;
            }

            return attempt;
        }
    }

    /**
     * Get attempts results.
     *
     * @param id Activity ID.
     * @param attemptsIds Attempts IDs.
     * @param options Other options.
     * @return Promise resolved with all the attempts.
     */
    async getAttemptsResults(id: number, attemptsIds: number[], options?: AddonModH5PActivityGetAttemptResultsOptions)
            : Promise<AddonModH5PActivityAttemptsResults> {

        options = options || {};

        const site = await CoreSites.instance.getSite(options.siteId);

        const params = {
            h5pactivityid: id,
            attemptids: attemptsIds,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptResultsCommonCacheKey(id),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        if (options.forceCache) {
            preSets.omitExpires = true;
        } else if (options.ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const response: AddonModH5PActivityGetResultsResult = await site.read('mod_h5pactivity_get_results', params, preSets);

        response.attempts = response.attempts.map((attempt) => {
            return this.formatAttemptResults(attempt);
        });

        return response;
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
     * Get an H5P activity by context ID.
     *
     * @param courseId Course ID.
     * @param contextId Context ID.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the activity data.
     */
    getH5PActivityByContextId(courseId: number, contextId: number, forceCache?: boolean, siteId?: string)
            : Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'context', contextId, forceCache, siteId);
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

        if (options.forceCache) {
            preSets.omitExpires = true;
        } else if (options.ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const response: AddonModH5PActivityGetAttemptsResult = await site.read('mod_h5pactivity_get_attempts', params, preSets);

        if (response.warnings[0]) {
            throw response.warnings[0]; // Cannot view user attempts.
        }

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
     * Invalidates all attempts results for H5P activity.
     *
     * @param id Activity ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAllResults(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.instance.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptResultsCommonCacheKey(id));
    }

    /**
     * Invalidates results of a certain attempt for H5P activity.
     *
     * @param id Activity ID.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAttemptResults(id: number, attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.instance.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptResultsCacheKey(id, [attemptId]));
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
    context: number; // Context ID.
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
 * Result of WS mod_h5pactivity_get_results.
 */
export type AddonModH5PActivityGetResultsResult = {
    activityid: number; // Activity course module ID.
    attempts: AddonModH5PActivityWSAttemptResults[]; // The complete attempts list.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Attempts data for a user as returned by the WS mod_h5pactivity_get_attempts.
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
 * Attempt data as returned by the WS mod_h5pactivity_get_attempts.
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
 * Attempt and results data as returned by the WS mod_h5pactivity_get_results.
 */
export type AddonModH5PActivityWSAttemptResults = AddonModH5PActivityWSAttempt & {
    results?: AddonModH5PActivityWSResult[]; // The results of the attempt.
};

/**
 * Attempt result data as returned by the WS mod_h5pactivity_get_results.
 */
export type AddonModH5PActivityWSResult = {
    id: number; // ID of the context.
    attemptid: number; // ID of the H5P attempt.
    subcontent: string; // Subcontent identifier.
    timecreated: number; // Result creation.
    interactiontype: string; // Interaction type.
    description: string; // Result description.
    content?: string; // Result extra content.
    rawscore: number; // Result score value.
    maxscore: number; // Result max score.
    duration?: number; // Result duration in seconds.
    completion?: number; // Result completion.
    success?: number; // Result success.
    optionslabel?: string; // Label used for result options.
    correctlabel?: string; // Label used for correct answers.
    answerlabel?: string; // Label used for user answers.
    track?: boolean; // If the result has valid track information.
    options?: { // The statement options.
        description: string; // Option description.
        id: number; // Option identifier.
        correctanswer: AddonModH5PActivityWSResultAnswer; // The option correct answer.
        useranswer: AddonModH5PActivityWSResultAnswer; // The option user answer.
    }[];
};

/**
 * Result answer as returned by the WS mod_h5pactivity_get_results.
 */
export type AddonModH5PActivityWSResultAnswer = {
    answer?: string; // Option text value.
    correct?: boolean; // If has to be displayed as correct.
    incorrect?: boolean; // If has to be displayed as incorrect.
    text?: boolean; // If has to be displayed as simple text.
    checked?: boolean; // If has to be displayed as a checked option.
    unchecked?: boolean; // If has to be displayed as a unchecked option.
    pass?: boolean; // If has to be displayed as passed.
    fail?: boolean; // If has to be displayed as failed.
};

/**
 * User attempts data with some calculated data.
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
 * Attempts results with some calculated data.
 */
export type AddonModH5PActivityAttemptsResults = {
    activityid: number; // Activity course module ID.
    attempts: AddonModH5PActivityAttemptResults[]; // The complete attempts list.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Attempt with some calculated data.
 */
export type AddonModH5PActivityAttempt = AddonModH5PActivityWSAttempt & {
    durationReadable?: string; // Duration in a human readable format.
    durationCompact?: string; // Duration in a "short" human readable format.
};

/**
 * Attempt and results data with some calculated data.
 */
export type AddonModH5PActivityAttemptResults = AddonModH5PActivityAttempt & {
    results?: AddonModH5PActivityWSResult[]; // The results of the attempt.
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
 * Options to pass to getAttemptResults function.
 */
export type AddonModH5PActivityGetAttemptResultsOptions = {
    forceCache?: boolean; // Whether to force cache. If not cached, it will call the WS.
    ignoreCache?: boolean; // Whether to ignore cache. Will fail if offline or server down.
    siteId?: string; // Site ID. If not defined, current site.
    userId?: number; // User ID. If not defined, user of the site.
};

/**
 * Options to pass to getAttempts function.
 */
export type AddonModH5PActivityGetAttemptsOptions = AddonModH5PActivityGetAttemptResultsOptions;
