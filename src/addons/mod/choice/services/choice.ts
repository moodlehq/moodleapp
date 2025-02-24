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
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreNetwork } from '@services/network';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModChoiceOffline } from './choice-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { ADDON_MOD_CHOICE_COMPONENT_LEGACY, AddonModChoiceShowResults } from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreSite } from '@classes/sites/site';

/**
 * Service that provides some features for choices.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChoiceProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModChoice:';

    /**
     * Check if groups are supported in a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether groups are supported.
     */
    async areGroupsSupported(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.areGroupsSupportedInSite(site);
    }

    /**
     * Check if groups are supported in a site.
     *
     * @param site Site.
     * @returns Whether groups are supported.
     */
    protected areGroupsSupportedInSite(site: CoreSite): boolean {
        return site.isVersionGreaterEqualThan('5.0');
    }

    /**
     * Check if results can be seen by a student. The student can see the results if:
     *     - they're always published, OR
     *     - they're published after the choice is closed and it's closed, OR
     *     - they're published after answering and the user has answered.
     *
     * @param choice Choice to check.
     * @param hasAnswered True if user has answered the choice, false otherwise.
     * @param timeNow Current time in seconds.
     * @returns True if the students can see the results.
     */
    canStudentSeeResults(choice: AddonModChoiceChoice, hasAnswered: boolean, timeNow: number): boolean {
        if (!this.choiceHasBeenOpened(choice, timeNow)) {
            return false;
        }

        const choiceClosed = this.choiceHasBeenClosed(choice, timeNow);

        return choice.showresults === AddonModChoiceShowResults.SHOWRESULTS_ALWAYS ||
            choice.showresults === AddonModChoiceShowResults.SHOWRESULTS_AFTER_ANSWER && hasAnswered ||
            choice.showresults === AddonModChoiceShowResults.SHOWRESULTS_AFTER_CLOSE && choiceClosed;
    }

    /**
     * Check if a choice has been opened.
     *
     * @param choice Choice to check.
     * @param timeNow Current time in seconds.
     * @returns True if the choice open dated has passed, false otherwise.
     */
    choiceHasBeenOpened(choice: AddonModChoiceChoice, timeNow: number): boolean {
        return !choice.timeopen || timeNow > choice.timeopen;
    }

    /**
     * Check if a choice has been closed.
     *
     * @param choice Choice to check.
     * @param timeNow Current time in seconds.
     * @returns True if the choice close dated has passed, false otherwise.
     */
    choiceHasBeenClosed(choice: AddonModChoiceChoice, timeNow: number): boolean {
        return !!choice.timeclose && timeNow > choice.timeclose;
    }

    /**
     * Delete responses from a choice.
     *
     * @param choiceId Choice ID.
     * @param name Choice name.
     * @param courseId Course ID the choice belongs to.
     * @param responses IDs of the answers. If not defined, delete all the answers of the current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if response was sent to server, false if stored in device.
     */
    async deleteResponses(
        choiceId: number,
        name: string,
        courseId: number,
        responses: number[] = [],
        siteId?: string,
    ): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModChoiceOffline.saveResponse(choiceId, name, courseId, responses, true, siteId);

            return false;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        await AddonModChoiceOffline.deleteResponse(choiceId, siteId);

        try {
            await this.deleteResponsesOnline(choiceId, responses, siteId);

            return true;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
    }

    /**
     * Delete responses from a choice. It will fail if offline or cannot connect.
     *
     * @param choiceId Choice ID.
     * @param responses IDs of the answers. If not defined, delete all the answers of the current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when responses are successfully deleted.
     */
    async deleteResponsesOnline(choiceId: number, responses?: number[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModChoiceDeleteChoiceResponsesWSParams = {
            choiceid: choiceId,
            responses: responses,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('mod_choice_delete_choice_responses', params);

        // Other errors ocurring.
        if (response.status === false) {
            if (response.warnings?.[0]) {
                throw new CoreWSError(response.warnings[0]);
            }

            throw new CoreError('Cannot delete responses.');
        }

        // Invalidate related data.
        await CorePromiseUtils.ignoreErrors(Promise.all([
            this.invalidateOptions(choiceId, site.id),
            this.invalidateResults(choiceId, site.id),
        ]));
    }

    /**
     * Get cache key for choice data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getChoiceDataCacheKey(courseId: number): string {
        return AddonModChoiceProvider.ROOT_CACHE_KEY + 'choice:' + courseId;
    }

    /**
     * Get cache key for choice options WS calls.
     *
     * @param choiceId Choice ID.
     * @returns Cache key.
     */
    protected getChoiceOptionsCacheKey(choiceId: number): string {
        return AddonModChoiceProvider.ROOT_CACHE_KEY + 'options:' + choiceId;
    }

    /**
     * Get cache key for choice results WS calls.
     *
     * @param choiceId Choice ID.
     * @returns Cache key.
     */
    protected getChoiceResultsCacheKey(choiceId: number): string {
        return AddonModChoiceProvider.ROOT_CACHE_KEY + 'results:' + choiceId;
    }

    /**
     * Get a choice with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the choice is retrieved.
     */
    protected async getChoiceByDataKey(
        courseId: number,
        key: string,
        value: unknown,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModChoiceChoice> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModChoiceGetChoicesByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getChoiceDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_CHOICE_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModChoiceGetChoicesByCoursesWSResponse>(
            'mod_choice_get_choices_by_courses',
            params,
            preSets,
        );

        const currentChoice = response.choices.find((choice) => choice[key] == value);
        if (currentChoice) {
            return currentChoice;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get a choice by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the choice is retrieved.
     */
    getChoice(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModChoiceChoice> {
        return this.getChoiceByDataKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a choice by ID.
     *
     * @param courseId Course ID.
     * @param choiceId Choice ID.
     * @param options Other options.
     * @returns Promise resolved when the choice is retrieved.
     */
    getChoiceById(courseId: number, choiceId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModChoiceChoice> {
        return this.getChoiceByDataKey(courseId, 'id', choiceId, options);
    }

    /**
     * Get choice options.
     *
     * @param choiceId Choice ID.
     * @param options Other options.
     * @returns Promise resolved with choice options.
     */
    async getOptions(choiceId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModChoiceOption[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModChoiceGetChoiceOptionsWSParams = {
            choiceid: choiceId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getChoiceOptionsCacheKey(choiceId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_CHOICE_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModChoiceGetChoiceOptionsWSResponse>(
            'mod_choice_get_choice_options',
            params,
            preSets,
        );

        return response.options;
    }

    /**
     * Get choice results.
     *
     * @param choiceId Choice ID.
     * @param options Other options.
     * @returns Promise resolved with choice results.
     */
    async getResults(choiceId: number, options: AddonModChoiceGetResultsOptions = {}): Promise<AddonModChoiceResult[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModChoiceGetChoiceResultsWSParams = {
            choiceid: choiceId,
        };
        if (this.areGroupsSupportedInSite(site) && options.groupId !== undefined) {
            params.groupid = options.groupId;
        }

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getChoiceOptionsCacheKey(choiceId),
            component: ADDON_MOD_CHOICE_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModChoiceGetChoiceResultsWSResponse>(
            'mod_choice_get_choice_results',
            params,
            preSets,
        );

        return response.options;
    }

    /**
     * Invalidate choice data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateChoiceData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getChoiceDataCacheKey(courseId));
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const choice = await this.getChoice(courseId, moduleId);

        await Promise.all([
            this.invalidateChoiceData(courseId),
            this.invalidateOptions(choice.id),
            this.invalidateResults(choice.id),
            CoreFilepool.invalidateFilesByComponent(siteId, ADDON_MOD_CHOICE_COMPONENT_LEGACY, moduleId),
        ]);
    }

    /**
     * Invalidate choice options.
     *
     * @param choiceId Choice ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateOptions(choiceId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getChoiceOptionsCacheKey(choiceId));
    }

    /**
     * Invalidate choice results.
     *
     * @param choiceId Choice ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateResults(choiceId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getChoiceResultsCacheKey(choiceId));
    }

    /**
     * Report the choice as being viewed.
     *
     * @param id Choice ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModChoiceViewChoiceWSParams = {
            choiceid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_choice_view_choice',
            params,
            ADDON_MOD_CHOICE_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

    /**
     * Send a response to a choice to Moodle.
     *
     * @param choiceId Choice ID.
     * @param name Choice name.
     * @param courseId Course ID the choice belongs to.
     * @param responses IDs of selected options.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if response was sent to server, false if stored in device.
     */
    async submitResponse(choiceId: number, name: string, courseId: number, responses: number[], siteId?: string): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModChoiceOffline.saveResponse(choiceId, name, courseId, responses, false, siteId);

            return false;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a response to be sent to the server, discard it first.
        await AddonModChoiceOffline.deleteResponse(choiceId, siteId);

        try {
            await this.submitResponseOnline(choiceId, responses, siteId);

            return true;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store it offline.
            return storeOffline();
        }
    }

    /**
     * Send a response to a choice to Moodle. It will fail if offline or cannot connect.
     *
     * @param choiceId Choice ID.
     * @param responses IDs of selected options.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when responses are successfully submitted.
     */
    async submitResponseOnline(choiceId: number, responses: number[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModChoiceSubmitChoiceResponseWSParams = {
            choiceid: choiceId,
            responses: responses,
        };

        await site.write('mod_choice_submit_choice_response', params);

        // Invalidate related data.
        await CorePromiseUtils.ignoreErrors(Promise.all([
            this.invalidateOptions(choiceId, siteId),
            this.invalidateResults(choiceId, siteId),
        ]));
    }

}

export const AddonModChoice = makeSingleton(AddonModChoiceProvider);

/**
 * Params of mod_choice_get_choices_by_courses WS.
 */
export type AddonModChoiceGetChoicesByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_choice_get_choices_by_courses WS.
 */
export type AddonModChoiceGetChoicesByCoursesWSResponse = {
    choices: AddonModChoiceChoice[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Choice returned by mod_choice_get_choices_by_courses.
 */
export type AddonModChoiceChoice = {
    id: number; // Choice instance id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Choice name.
    intro: string; // The choice intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    publish?: boolean; // If choice is published.
    showresults?: AddonModChoiceShowResults; // 0 never, 1 after answer, 2 after close, 3 always.
    display?: number; // Display mode (vertical, horizontal).
    allowupdate?: boolean; // Allow update.
    allowmultiple?: boolean; // Allow multiple choices.
    showunanswered?: boolean; // Show users who not answered yet.
    includeinactive?: boolean; // Include inactive users.
    limitanswers?: boolean; // Limit unswers.
    timeopen?: number; // Date of opening validity.
    timeclose?: number; // Date of closing validity.
    showpreview?: boolean; // Show preview before timeopen.
    timemodified?: number; // Time of last modification.
    completionsubmit?: boolean; // Completion on user submission.
    showavailable?: boolean; // Show available spaces. @since 3.10
    section?: number; // Course section id.
    visible?: boolean; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
};

/**
 * Params of mod_choice_delete_choice_responses WS.
 */
export type AddonModChoiceDeleteChoiceResponsesWSParams = {
    choiceid: number; // Choice instance id.
    responses?: number[]; // Array of response ids, empty for deleting all the current user responses.
};

/**
 * Params of mod_choice_get_choice_options WS.
 */
export type AddonModChoiceGetChoiceOptionsWSParams = {
    choiceid: number; // Choice instance id.
};

/**
 * Data returned by mod_choice_get_choice_options WS.
 */
export type AddonModChoiceGetChoiceOptionsWSResponse = {
    options: AddonModChoiceOption[]; // Options.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Option returned by mod_choice_get_choice_options.
 */
export type AddonModChoiceOption = {
    id: number; // Option id.
    text: string; // Text of the choice.
    maxanswers: number; // Maximum number of answers.
    displaylayout: boolean; // True for horizontal, otherwise vertical.
    countanswers: number; // Number of answers.
    checked: boolean; // We already answered.
    disabled: boolean; // Option disabled.
};

/**
 * Params of mod_choice_get_choice_results WS.
 */
export type AddonModChoiceGetChoiceResultsWSParams = {
    choiceid: number; // Choice instance id.
    groupid?: number; // @since 5.0. Group ID. 0 for all participants, empty for active group.
};

/**
 * Data returned by mod_choice_get_choice_results WS.
 */
export type AddonModChoiceGetChoiceResultsWSResponse = {
    options: AddonModChoiceResult[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result returned by mod_choice_get_choice_results.
 */
export type AddonModChoiceResult = {
    id: number; // Choice instance id.
    text: string; // Text of the choice.
    maxanswer: number; // Maximum number of answers.
    userresponses: {
        userid: number; // User id.
        fullname: string; // User full name.
        profileimageurl: string; // Profile user image url.
        answerid?: number; // Answer id.
        timemodified?: number; // Time of modification.
    }[];
    numberofuser: number; // Number of users answers.
    percentageamount: number; // Percentage of users answers.
};

/**
 * Params of mod_choice_view_choice WS.
 */
export type AddonModChoiceViewChoiceWSParams = {
    choiceid: number; // Choice instance id.
};

/**
 * Params of mod_choice_submit_choice_response WS.
 */
export type AddonModChoiceSubmitChoiceResponseWSParams = {
    choiceid: number; // Choice instance id.
    responses: number[]; // Array of response ids.
};

/**
 * Options of getResults function.
 */
export type AddonModChoiceGetResultsOptions = CoreCourseCommonModWSOptions & {
    groupId?: number; // Group id.
};
