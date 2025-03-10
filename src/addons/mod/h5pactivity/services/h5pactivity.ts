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

import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreWSExternalWarning, CoreWSExternalFile, CoreWSFile } from '@services/ws';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreH5PDisplayOptions } from '@features/h5p/classes/core';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { makeSingleton, Translate } from '@singletons/index';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreError } from '@classes/errors/error';
import { CoreTime } from '@singletons/time';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
    ADDON_MOD_H5PACTIVITY_USERS_PER_PAGE,
    AddonModH5PActivityGradeMethod,
} from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreFileHelper } from '@services/file-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreH5PMissingDependencyDBRecord } from '@features/h5p/services/database/h5p';
import { CoreTextFormat } from '@singletons/text';

/**
 * Service that provides some features for H5P activity.
 */
@Injectable({ providedIn: 'root' })
export class AddonModH5PActivityProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModH5PActivity:';

    /**
     * Check if a certain site allows viewing list of users and their attempts.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Whether can view users.
     * @since 3.11
     */
    async canGetUsersAttempts(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.canGetUsersAttemptsInSite(site);
    }

    /**
     * Check if a certain site allows viewing list of users and their attempts.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether can view users.
     * @since 3.11
     */
    canGetUsersAttemptsInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.wsAvailable('mod_h5pactivity_get_user_attempts');
    }

    /**
     * Format an attempt's data.
     *
     * @param attempt Attempt to format.
     * @returns Formatted attempt.
     */
    protected formatAttempt(attempt: AddonModH5PActivityWSAttempt): AddonModH5PActivityAttempt {
        const formattedAttempt: AddonModH5PActivityAttempt = attempt;

        formattedAttempt.timecreated = attempt.timecreated * 1000; // Convert to milliseconds.
        formattedAttempt.timemodified = attempt.timemodified * 1000; // Convert to milliseconds.
        formattedAttempt.success = formattedAttempt.success ?? null;

        if (!attempt.duration) {
            formattedAttempt.durationReadable = '-';
            formattedAttempt.durationCompact = '-';
        } else {
            formattedAttempt.durationReadable = CoreTime.formatTime(attempt.duration, 3);
            formattedAttempt.durationCompact = CoreTime.formatTimeShort(attempt.duration);
        }

        return formattedAttempt;
    }

    /**
     * Format attempt data and results.
     *
     * @param attempt Attempt and results to format.
     * @returns Attemp data and results.
     */
    protected formatAttemptResults(attempt: AddonModH5PActivityWSAttemptResults): AddonModH5PActivityAttemptResults {
        const formattedAttempt: AddonModH5PActivityAttemptResults = this.formatAttempt(attempt);

        formattedAttempt.results = formattedAttempt.results?.map((result) => this.formatResult(result));

        return formattedAttempt;
    }

    /**
     * Format the attempts of a user.
     *
     * @param data Data to format.
     * @returns Formatted data.
     */
    protected formatUserAttempts(data: AddonModH5PActivityWSUserAttempts): AddonModH5PActivityUserAttempts {
        const formatted: AddonModH5PActivityUserAttempts = data;

        formatted.attempts = formatted.attempts.map((attempt) => this.formatAttempt(attempt));

        if (formatted.scored) {
            formatted.scored.attempts = formatted.scored.attempts.map((attempt) => this.formatAttempt(attempt));
        }

        return formatted;
    }

    /**
     * Format an attempt's result.
     *
     * @param result Result to format.
     * @returns Attempts results
     */
    protected formatResult(result: AddonModH5PActivityWSResult): AddonModH5PActivityWSResult {
        result.timecreated = result.timecreated * 1000; // Convert to milliseconds.

        return result;
    }

    /**
     * Get cache key for access information WS calls.
     *
     * @param id H5P activity ID.
     * @returns Cache key.
     */
    protected getAccessInformationCacheKey(id: number): string {
        return AddonModH5PActivityProvider.ROOT_CACHE_KEY + 'accessInfo:' + id;
    }

    /**
     * Get access information for a given H5P activity.
     *
     * @param id H5P activity ID.
     * @param options Other options.
     * @returns Promise resolved with the data.
     */
    async getAccessInformation(id: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModH5PActivityAccessInfo> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModH5pactivityGetH5pactivityAccessInformationWSParams = {
            h5pactivityid: id,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAccessInformationCacheKey(id),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_h5pactivity_get_h5pactivity_access_information', params, preSets);
    }

    /**
     * Get attempt results for all user attempts.
     *
     * @param id Activity ID.
     * @param options Other options.
     * @returns Promise resolved with the results of the attempt.
     */
    async getAllAttemptsResults(
        id: number,
        options?: AddonModH5PActivityGetAttemptResultsOptions,
    ): Promise<AddonModH5PActivityAttemptsResults> {

        const userAttempts = await this.getUserAttempts(id, options);

        const attemptIds = userAttempts.attempts.map((attempt) => attempt.id);

        if (attemptIds.length) {
            // Get all the attempts with a single call.
            return this.getAttemptsResults(id, attemptIds, options);
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
     * Get all pages of users attempts.
     *
     * @param id Activity ID.
     * @param options Other options.
     * @returns Promise resolved with the list of user.
     */
    async getAllUsersAttempts(
        id: number,
        options?: AddonModH5PActivityGetAllUsersAttemptsOptions,
    ): Promise<AddonModH5PActivityUserAttempts[]> {

        const optionsWithPage: AddonModH5PActivityGetAllUsersAttemptsOptions = {
            ...options,
        };
        optionsWithPage.page = 0;
        let canLoadMore = true;
        let users: AddonModH5PActivityUserAttempts[] = [];

        while (canLoadMore) {
            try {
                const result = await this.getUsersAttempts(id, optionsWithPage);

                optionsWithPage.page = optionsWithPage.page + 1;
                users = users.concat(result.users);
                canLoadMore = result.canLoadMore;
            } catch (error) {
                if (optionsWithPage.dontFailOnError) {
                    return users;
                }

                throw error;
            }
        }

        return users;
    }

    /**
     * Get list of users and their attempts.
     *
     * @param id H5P Activity ID.
     * @param options Options.
     * @returns Promise resolved with list of users and whether can load more attempts.
     * @since 3.11
     */
    async getUsersAttempts(
        id: number,
        options?: AddonModH5PActivityGetUsersAttemptsOptions,
    ): Promise<{users: AddonModH5PActivityUserAttempts[]; canLoadMore: boolean}> {
        options = options || {};
        options.page = options.page || 0;
        options.perPage = options.perPage ?? ADDON_MOD_H5PACTIVITY_USERS_PER_PAGE;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModH5pactivityGetUserAttemptsWSParams = {
            h5pactivityid: id,
            page: options.page,
            perpage: options.perPage === 0 ? 0 : options.perPage + 1, // Get 1 more to be able to know if there are more to load.
            sortorder: options.sortOrder,
            firstinitial: options.firstInitial,
            lastinitial: options.lastInitial,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUsersAttemptsCacheKey(id, options),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModH5pactivityGetUserAttemptsWSResponse>(
            'mod_h5pactivity_get_user_attempts',
            params,
            preSets,
        );

        if (response.warnings?.[0]) {
            throw new CoreWSError(response.warnings[0]);
        }

        let canLoadMore = false;
        if (options.perPage > 0) {
            canLoadMore = response.usersattempts.length > options.perPage;
            response.usersattempts = response.usersattempts.slice(0, options.perPage);
        }

        return {
            canLoadMore: canLoadMore,
            users: response.usersattempts.map(userAttempts => this.formatUserAttempts(userAttempts)),
        };
    }

    /**
     * Get cache key for get users attempts WS calls.
     *
     * @param id Instance ID.
     * @param options Get attempts options.
     * @returns Cache key.
     */
    protected getUsersAttemptsCacheKey(id: number, options: AddonModH5PActivityGetUsersAttemptsOptions): string {
        return this.getUsersAttemptsCommonCacheKey(id) + `:${options.page}:${options.perPage}` +
            `:${options.sortOrder || ''}:${options.firstInitial || ''}:${options.lastInitial || ''}`;
    }

    /**
     * Get common cache key for get users attempts WS calls.
     *
     * @param id Instance ID.
     * @returns Cache key.
     */
    protected getUsersAttemptsCommonCacheKey(id: number): string {
        return AddonModH5PActivityProvider.ROOT_CACHE_KEY + 'userAttempts:' + id;
    }

    /**
     * Get cache key for results WS calls.
     *
     * @param id Instance ID.
     * @param attemptsIds Attempts IDs.
     * @returns Cache key.
     */
    protected getAttemptResultsCacheKey(id: number, attemptsIds: number[]): string {
        return this.getAttemptResultsCommonCacheKey(id) + ':' + JSON.stringify(attemptsIds);
    }

    /**
     * Get common cache key for results WS calls.
     *
     * @param id Instance ID.
     * @returns Cache key.
     */
    protected getAttemptResultsCommonCacheKey(id: number): string {
        return AddonModH5PActivityProvider.ROOT_CACHE_KEY + 'results:' + id;
    }

    /**
     * Get attempt results.
     *
     * @param id Activity ID.
     * @param attemptId Attempt ID.
     * @param options Other options.
     * @returns Promise resolved with the results of the attempt.
     */
    async getAttemptResults(
        id: number,
        attemptId: number,
        options?: AddonModH5PActivityGetAttemptResultsOptions,
    ): Promise<AddonModH5PActivityAttemptResults> {

        options = options || {};

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModH5pactivityGetResultsWSParams = {
            h5pactivityid: id,
        };
        params.attemptids = [attemptId];

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptResultsCacheKey(id, params.attemptids),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        try {
            const response = await site.read<AddonModH5pactivityGetResultsWSResponse>(
                'mod_h5pactivity_get_results',
                params,
                preSets,
            );

            if (response.warnings?.[0]) {
                throw new CoreWSError(response.warnings[0]); // Cannot view attempt.
            }

            return this.formatAttemptResults(response.attempts[0]);
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                throw error;
            }

            // Check if the full list of results is cached. If so, get the results from there.
            const cacheOptions: AddonModH5PActivityGetAttemptResultsOptions = {
                ...options, // Include all the original options.
                readingStrategy: CoreSitesReadingStrategy.ONLY_CACHE,
            };

            const attemptsResults = await AddonModH5PActivity.getAllAttemptsResults(id, cacheOptions);

            const attempt = attemptsResults.attempts.find((attempt) => attempt.id == attemptId);

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
     * @returns Promise resolved with all the attempts.
     */
    async getAttemptsResults(
        id: number,
        attemptsIds: number[],
        options?: AddonModH5PActivityGetAttemptResultsOptions,
    ): Promise<AddonModH5PActivityAttemptsResults> {

        options = options || {};

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModH5pactivityGetResultsWSParams = {
            h5pactivityid: id,
            attemptids: attemptsIds,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptResultsCommonCacheKey(id),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModH5pactivityGetResultsWSResponse>(
            'mod_h5pactivity_get_results',
            params,
            preSets,
        );

        response.attempts = response.attempts.map((attempt) => this.formatAttemptResults(attempt));

        return response;
    }

    /**
     * Get deployed file from an H5P activity instance.
     *
     * @param h5pActivity Activity instance.
     * @param options Options
     * @returns Promise resolved with the file.
     */
    async getDeployedFile(
        h5pActivity: AddonModH5PActivityData,
        options?: AddonModH5PActivityGetDeployedFileOptions,
    ): Promise<CoreWSFile> {

        if (h5pActivity.deployedfile) {
            // File already deployed and still valid, use this one.
            return h5pActivity.deployedfile;
        }

        if (!h5pActivity.package || !h5pActivity.package[0]) {
            // Shouldn't happen.
            throw new CoreError('No H5P package found.');
        }

        options = options || {};

        // Deploy the file in the server.
        return CoreH5P.getTrustedH5PFile(
            h5pActivity.package[0].fileurl,
            options.displayOptions,
            options.ignoreCache,
            options.siteId,
        );
    }

    /**
     * Get cache key for H5P activity data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getH5PActivityDataCacheKey(courseId: number): string {
        return AddonModH5PActivityProvider.ROOT_CACHE_KEY + 'h5pactivity:' + courseId;
    }

    /**
     * Get an H5P activity with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved with the activity data.
     */
    protected async getH5PActivityByField(
        courseId: number,
        key: string,
        value: unknown,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModH5PActivityData> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModH5pactivityGetByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getH5PActivityDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModH5pactivityGetByCoursesWSResponse>(
            'mod_h5pactivity_get_h5pactivities_by_courses',
            params,
            preSets,
        );

        const currentActivity = response.h5pactivities.find((h5pActivity) => h5pActivity[key] == value);

        if (currentActivity) {
            return {
                ...currentActivity,
                ...response.h5pglobalsettings,
            };
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get an H5P activity by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved with the activity data.
     */
    getH5PActivity(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get an H5P activity by context ID.
     *
     * @param courseId Course ID.
     * @param contextId Context ID.
     * @param options Other options.
     * @returns Promise resolved with the activity data.
     */
    getH5PActivityByContextId(
        courseId: number,
        contextId: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'context', contextId, options);
    }

    /**
     * Get an H5P activity by instance ID.
     *
     * @param courseId Course ID.
     * @param id Instance ID.
     * @param options Other options.
     * @returns Promise resolved with the activity data.
     */
    getH5PActivityById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'id', id, options);
    }

    /**
     * Get missing dependencies for a certain H5P activity.
     *
     * @param componentId Component ID.
     * @param deployedFile File to check.
     * @param siteId Site ID. If not defined, current site.
     * @returns Missing dependencies, empty if no missing dependencies.
     */
    async getMissingDependencies(
        componentId: number,
        deployedFile: CoreWSFile,
        siteId?: string,
    ): Promise<CoreH5PMissingDependencyDBRecord[]> {
        const fileUrl = CoreFileHelper.getFileUrl(deployedFile);

        const missingDependencies =
            await CoreH5P.h5pFramework.getMissingDependenciesForComponent(
                ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
                componentId,
                siteId,
            );
        if (!missingDependencies.length) {
            return [];
        }

        // The activity had missing dependencies, but the package could have changed (e.g. the teacher fixed it).
        // Check which of the dependencies apply to the current package.
        const fileId = await CoreH5P.h5pFramework.getFileIdForMissingDependencies(fileUrl, siteId);

        const filteredMissingDependencies = missingDependencies.filter(dependency =>
            dependency.fileid === fileId && dependency.filetimemodified === deployedFile.timemodified);
        if (filteredMissingDependencies.length > 0) {
            return filteredMissingDependencies;
        }

        // Package has changed, delete previous missing dependencies.
        await CorePromiseUtils.ignoreErrors(
            CoreH5P.h5pFramework.deleteMissingDependenciesForComponent(ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY, componentId, siteId),
        );

        return [];
    }

    /**
     * Get cache key for attemps WS calls.
     *
     * @param id Instance ID.
     * @param userIds User IDs.
     * @returns Cache key.
     */
    protected getUserAttemptsCacheKey(id: number, userIds: number[]): string {
        return this.getUserAttemptsCommonCacheKey(id) + ':' + JSON.stringify(userIds);
    }

    /**
     * Get common cache key for attempts WS calls.
     *
     * @param id Instance ID.
     * @returns Cache key.
     */
    protected getUserAttemptsCommonCacheKey(id: number): string {
        return AddonModH5PActivityProvider.ROOT_CACHE_KEY + 'attempts:' + id;
    }

    /**
     * Get attempts of a certain user.
     *
     * @param id Activity ID.
     * @param options Other options.
     * @returns Promise resolved with the attempts of the user.
     */
    async getUserAttempts(
        id: number,
        options: AddonModH5PActivityGetAttemptsOptions = {},
    ): Promise<AddonModH5PActivityUserAttempts> {

        const site = await CoreSites.getSite(options.siteId);
        const userId = options.userId || site.getUserId();

        try {
            const params: AddonModH5pactivityGetAttemptsWSParams = {
                h5pactivityid: id,
            };
            params.userids = [userId];

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getUserAttemptsCacheKey(id, params.userids),
                updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
                component: ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
                componentId: options.cmId,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            const response = await site.read<AddonModH5pactivityGetAttemptsWSResponse>(
                'mod_h5pactivity_get_attempts',
                params,
                preSets,
            );

            if (response.warnings?.[0]) {
                throw new CoreWSError(response.warnings[0]); // Cannot view user attempts.
            }

            return this.formatUserAttempts(response.usersattempts[0]);
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                throw error;
            }

            try {
                // Check if the full list of users is cached. If so, get the user attempts from there.
                const users = await this.getAllUsersAttempts(id, {
                    ...options,
                    readingStrategy: CoreSitesReadingStrategy.ONLY_CACHE,
                    dontFailOnError: true,
                });

                const user = users.find(user => user.userid === userId);
                if (!user) {
                    throw error;
                }

                return this.formatUserAttempts(user);
            } catch {
                throw error;
            }
        }

    }

    /**
     * Check if a package has missing dependencies.
     *
     * @param componentId Component ID.
     * @param deployedFile File to check.
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether the package has missing dependencies.
     */
    async hasMissingDependencies(componentId: number, deployedFile: CoreWSFile, siteId?: string): Promise<boolean> {
        const missingDependencies = await this.getMissingDependencies(componentId, deployedFile, siteId);

        return missingDependencies.length > 0;
    }

    /**
     * Invalidates access information.
     *
     * @param id H5P activity ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateAccessInformation(id: number, siteId?: string): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(id));
    }

    /**
     * Invalidates H5P activity data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateActivityData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getH5PActivityDataCacheKey(courseId));
    }

    /**
     * Invalidates all attempts results for H5P activity.
     *
     * @param id Activity ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateAllResults(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptResultsCommonCacheKey(id));
    }

    /**
     * Invalidates results of a certain attempt for H5P activity.
     *
     * @param id Activity ID.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateAttemptResults(id: number, attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptResultsCacheKey(id, [attemptId]));
    }

    /**
     * Invalidates list of users for H5P activity.
     *
     * @param id Activity ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateAllUsersAttempts(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getUsersAttemptsCommonCacheKey(id));
    }

    /**
     * Invalidates attempts of a certain user for H5P activity.
     *
     * @param id Activity ID.
     * @param userId User ID. If not defined, current user in the site.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateUserAttempts(id: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getUserAttemptsCacheKey(id, [userId]));
    }

    /**
     * Delete launcher.
     *
     * @returns Promise resolved when the launcher file is deleted.
     * @since 3.9
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_h5pactivity_get_h5pactivities_by_courses');
    }

    /**
     * Check if save state is enabled for a certain activity.
     *
     * @param h5pActivity Activity.
     * @param accessInfo Access info.
     * @returns Whether save state is enabled.
     */
    isSaveStateEnabled(h5pActivity: AddonModH5PActivityData, accessInfo?: AddonModH5PActivityAccessInfo): boolean {
        return !!(h5pActivity.enabletracking && h5pActivity.enablesavestate && (!accessInfo || accessInfo.cansubmit));
    }

    /**
     * Report an H5P activity as being viewed.
     *
     * @param id H5P activity ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModH5PActivityViewH5pactivityWSParams = {
            h5pactivityid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_h5pactivity_view_h5pactivity',
            params,
            ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

    /**
     * Report an H5P activity report as being viewed.
     *
     * @param id H5P activity ID.
     * @param options Options.
     * @returns Promise resolved when the WS call is successful.
     */
    async logViewReport(id: number, options: AddonModH5PActivityViewReportOptions = {}): Promise<void> {
        const site = await CoreSites.getSite(options.siteId);

        if (!site.wsAvailable('mod_h5pactivity_log_report_viewed')) {
            // Site doesn't support the WS, stop. Added in Moodle 3.11.
            return;
        }

        const params: AddonModH5PActivityLogReportViewedWSParams = {
            h5pactivityid: id,
            userid: options.userId,
            attemptid: options.attemptId,
        };

        return CoreCourseLogHelper.log(
            'mod_h5pactivity_log_report_viewed',
            params,
            ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
            id,
            site.getId(),
        );
    }

}

export const AddonModH5PActivity = makeSingleton(AddonModH5PActivityProvider);

/**
 * Basic data for an H5P activity, exported by Moodle class h5pactivity_summary_exporter.
 */
export type AddonModH5PActivityWSData = {
    id: number; // The primary key of the record.
    course: number; // Course id this h5p activity is part of.
    name: string; // The name of the activity module instance.
    timecreated?: number; // Timestamp of when the instance was added to the course.
    timemodified?: number; // Timestamp of when the instance was last modified.
    intro: string; // H5P activity description.
    introformat: CoreTextFormat; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    grade?: number; // The maximum grade for submission.
    displayoptions: number; // H5P Button display options.
    enabletracking: number; // Enable xAPI tracking.
    grademethod: AddonModH5PActivityGradeMethod; // Which H5P attempt is used for grading.
    contenthash?: string; // Sha1 hash of file content.
    coursemodule: number; // Coursemodule.
    context: number; // Context ID.
    introfiles: CoreWSExternalFile[];
    package: CoreWSExternalFile[];
    deployedfile?: {
        filename?: string; // File name.
        filepath?: string; // File path.
        filesize?: number; // File size.
        fileurl: string; // Downloadable file url.
        timemodified?: number; // Time modified.
        mimetype?: string; // File mime type.
    };
};

/**
 * Basic data for an H5P activity, with some calculated data.
 */
export type AddonModH5PActivityData = AddonModH5PActivityWSData & Partial<AddonModH5pactivityGlobalSettings>;

/**
 * Global settings for H5P activities.
 */
export type AddonModH5pactivityGlobalSettings = {
    enablesavestate: boolean; // Whether saving state is enabled.
    savestatefreq?: number; // How often (in seconds) the state is saved.
};

/**
 * Params of mod_h5pactivity_get_h5pactivities_by_courses WS.
 */
export type AddonModH5pactivityGetByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_h5pactivity_get_h5pactivities_by_courses WS.
 */
export type AddonModH5pactivityGetByCoursesWSResponse = {
    h5pactivities: AddonModH5PActivityWSData[];
    h5pglobalsettings?: AddonModH5pactivityGlobalSettings;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_h5pactivity_get_h5pactivity_access_information WS.
 */
export type AddonModH5pactivityGetH5pactivityAccessInformationWSParams = {
    h5pactivityid: number; // H5p activity instance id.
};

/**
 * Data returned by mod_h5pactivity_get_h5pactivity_access_information WS.
 */
export type AddonModH5pactivityGetH5pactivityAccessInformationWSResponse = {
    warnings?: CoreWSExternalWarning[];
    canview?: boolean; // Whether the user has the capability mod/h5pactivity:view allowed.
    canaddinstance?: boolean; // Whether the user has the capability mod/h5pactivity:addinstance allowed.
    cansubmit?: boolean; // Whether the user has the capability mod/h5pactivity:submit allowed.
    canreviewattempts?: boolean; // Whether the user has the capability mod/h5pactivity:reviewattempts allowed.
};

/**
 * Result of WS mod_h5pactivity_get_h5pactivity_access_information.
 */
export type AddonModH5PActivityAccessInfo = AddonModH5pactivityGetH5pactivityAccessInformationWSResponse;

/**
 * Params of mod_h5pactivity_get_attempts WS.
 */
export type AddonModH5pactivityGetAttemptsWSParams = {
    h5pactivityid: number; // H5p activity instance id.
    userids?: number[]; // User ids.
};

/**
 * Data returned by mod_h5pactivity_get_attempts WS.
 */
export type AddonModH5pactivityGetAttemptsWSResponse = {
    activityid: number; // Activity course module ID.
    usersattempts: AddonModH5PActivityWSUserAttempts[]; // The complete users attempts list.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_h5pactivity_get_results WS.
 */
export type AddonModH5pactivityGetResultsWSParams = {
    h5pactivityid: number; // H5p activity instance id.
    attemptids?: number[]; // Attempt ids.
};

/**
 * Data returned by mod_h5pactivity_get_results WS.
 */
export type AddonModH5pactivityGetResultsWSResponse = {
    activityid: number; // Activity course module ID.
    attempts: AddonModH5PActivityWSAttemptResults[]; // The complete attempts list.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Attempts results with some calculated data.
 */
export type AddonModH5PActivityAttemptsResults = Omit<AddonModH5pactivityGetResultsWSResponse, 'attempts'> & {
    attempts: AddonModH5PActivityAttemptResults[]; // The complete attempts list.
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
    success?: number | null; // Attempt success.
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
    success?: number | null; // Result success.
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
export type AddonModH5PActivityUserAttempts = Omit<AddonModH5PActivityWSUserAttempts, 'attempts'|'scored'> & {
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
export type AddonModH5PActivityGetAttemptResultsOptions = CoreCourseCommonModWSOptions & {
    userId?: number; // User ID. If not defined, user of the site.
};

/**
 * Options to pass to getAttempts function.
 */
export type AddonModH5PActivityGetAttemptsOptions = AddonModH5PActivityGetAttemptResultsOptions;

/**
 * Params of mod_h5pactivity_view_h5pactivity WS.
 */
export type AddonModH5PActivityViewH5pactivityWSParams = {
    h5pactivityid: number; // H5P activity instance id.
};

/**
 * Params of mod_h5pactivity_log_report_viewed WS.
 */
export type AddonModH5PActivityLogReportViewedWSParams = {
    h5pactivityid: number; // H5P activity instance id.
    userid?: number | null; // The user id to log attempt (null means only current user).
    attemptid?: number | null; // The attempt id.
};

/**
 * Options for logViewReport.
 */
export type AddonModH5PActivityViewReportOptions = {
    userId?: number; // User ID being viewed. Undefined for current user or when viewing an attempt.
    attemptId?: number; // Attempt ID being viewed. Undefined if no attempt.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Params of mod_h5pactivity_get_user_attempts WS.
 */
export type AddonModH5pactivityGetUserAttemptsWSParams = {
    h5pactivityid: number; // H5p activity instance id.
    sortorder?: string; // Sort by this element: id, firstname.
    page?: number; // Current page.
    perpage?: number; // Items per page.
    firstinitial?: string; // Users whose first name starts with firstinitial.
    lastinitial?: string; // Users whose last name starts with lastinitial.
};

/**
 * Data returned by mod_h5pactivity_get_user_attempts WS.
 */
export type AddonModH5pactivityGetUserAttemptsWSResponse = {
    activityid: number; // Activity course module ID.
    usersattempts: AddonModH5PActivityWSUserAttempts[]; // The complete users attempts list.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Options for getUsersAttempts.
 */
export type AddonModH5PActivityGetUsersAttemptsOptions = CoreCourseCommonModWSOptions & {
    sortOrder?: string; // Sort by this element: id, firstname.
    page?: number; // Current page. Defaults to 0.
    perPage?: number; // Items per page. Defaults to USERS_PER_PAGE.
    firstInitial?: string; // Users whose first name starts with firstInitial.
    lastInitial?: string; // Users whose last name starts with lastInitial.
};

/**
 * Options for getAllUsersAttempts.
 */
export type AddonModH5PActivityGetAllUsersAttemptsOptions = AddonModH5PActivityGetUsersAttemptsOptions & {
    dontFailOnError?: boolean; // If true the function will return the users it's able to retrieve, until a call fails.
};

/**
 * Data to be sent using xAPI.
 */
export type AddonModH5PActivityXAPIBasicData = {
    action: string;
    component: string;
    context: string;
    environment: string;
};

/**
 * Statements data to be sent using xAPI.
 */
export type AddonModH5PActivityXAPIStatementsData = AddonModH5PActivityXAPIBasicData & {
    statements: AddonModH5PActivityStatement[];
};

/**
 * States data to be sent using xAPI.
 */
export type AddonModH5PActivityXAPIStateData = AddonModH5PActivityXAPIBasicData & {
    activityId: string;
    agent: Record<string, unknown>;
    stateId: string;
};

/**
 * Post state data to be sent using xAPI.
 */
export type AddonModH5PActivityXAPIPostStateData = AddonModH5PActivityXAPIStateData & {
    stateData: string;
};

/**
 * xAPI statement.
 */
export type AddonModH5PActivityStatement = {
    actor: Record<string, string>;
    context: Record<string, unknown>;
    object: {
        id: string;
        definition: Record<string, unknown>;
        objectType: string;
    };
    result: {
        completion: boolean;
        duration: string;
        score: {
            min: number;
            max: number;
            raw: number;
            scaled: number;
        };
        success?: boolean;
        response?: string;
    };
    verb: {
        id: string;
        display: Record<string, string>;
    };
    timestamp?: string;
};
