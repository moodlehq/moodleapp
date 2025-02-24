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

import { CoreCacheUpdateFrequency, DownloadStatus } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreText } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { CoreUrl } from '@singletons/url';
import { CoreObject } from '@singletons/object';
import { CoreWS, CoreWSExternalFile, CoreWSExternalWarning, CoreWSFile, CoreWSPreSets } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CorePath } from '@singletons/path';
import { AddonModScormOffline } from './scorm-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    ADDON_MOD_SCORM_COMPONENT_LEGACY,
    AddonModScormForceAttempt,
    AddonModScormGradingMethod,
    AddonModScormMode,
    AddonModScormAttemptsGradingMethod,
    ADDON_MOD_SCORM_DATA_SENT_EVENT,
    ADDON_MOD_SCORM_GO_OFFLINE_EVENT,
    ADDON_MOD_SCORM_LAUNCH_NEXT_SCO_EVENT,
    ADDON_MOD_SCORM_LAUNCH_PREV_SCO_EVENT,
    ADDON_MOD_SCORM_UPDATE_TOC_EVENT,
} from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

// Private constants.
const VALID_STATUSES = ['notattempted', 'passed', 'completed', 'failed', 'incomplete', 'browsed', 'suspend'];
const STATUSES = {
    'passed': 'passed',
    'completed': 'completed',
    'failed': 'failed',
    'incomplete': 'incomplete',
    'browsed': 'browsed',
    'not attempted': 'notattempted',
    'p': 'passed',
    'c': 'completed',
    'f': 'failed',
    'i': 'incomplete',
    'b': 'browsed',
    'n': 'notattempted',
};
const STATUS_TO_ICON = {
    asset: '', // Empty to show an space.
    browsed: 'moodle-browsed',
    completed: 'fas-check',
    failed: 'fas-xmark',
    incomplete: 'fas-pen-to-square',
    notattempted: 'far-square',
    passed: 'fas-check-double',
    suspend: 'fas-pause',
};

/**
 * Service that provides some features for SCORM.
 */
@Injectable({ providedIn: 'root' })
export class AddonModScormProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModScorm:';

    /**
     * Calculates the SCORM grade based on the grading method and the list of attempts scores.
     * We only treat online attempts to calculate a SCORM grade.
     *
     * @param scorm SCORM.
     * @param onlineAttempts Object with the online attempts.
     * @returns Grade. -1 if no grade.
     */
    calculateScormGrade(scorm: AddonModScormScorm, onlineAttempts: Record<number, AddonModScormAttemptGrade>): number {
        if (!onlineAttempts || !Object.keys(onlineAttempts).length) {
            return -1;
        }

        switch (scorm.whatgrade) {
            case AddonModScormAttemptsGradingMethod.FIRSTATTEMPT:
                return onlineAttempts[1] ? onlineAttempts[1].score : -1;

            case AddonModScormAttemptsGradingMethod.LASTATTEMPT: {
                // Search the last completed attempt number.
                let lastCompleted = 0;
                for (const attemptNumber in onlineAttempts) {
                    if (onlineAttempts[attemptNumber].hasCompletedPassedSCO) {
                        lastCompleted = Math.max(onlineAttempts[attemptNumber].num, lastCompleted);
                    }
                }

                if (lastCompleted > 0) {
                    return onlineAttempts[lastCompleted].score;
                } else if (onlineAttempts[1]) {
                    // If no completed attempt found, use the first attempt for consistency with LMS.
                    return onlineAttempts[1].score;
                }

                return -1;
            }

            case AddonModScormAttemptsGradingMethod.HIGHESTATTEMPT: {
                // Search the highest grade.
                let grade = 0;
                for (const attemptNumber in onlineAttempts) {
                    grade = Math.max(onlineAttempts[attemptNumber].score, grade);
                }

                return grade;
            }

            case AddonModScormAttemptsGradingMethod.AVERAGEATTEMPT: {
                // Calculate the average.
                let sumGrades = 0;
                let total = 0;

                for (const attemptNumber in onlineAttempts) {
                    sumGrades += onlineAttempts[attemptNumber].score;
                    total++;
                }

                return Math.round(sumGrades / total);
            }

            default:
                return -1;
        }
    }

    /**
     * Calculates the size of a SCORM.
     *
     * @param scorm SCORM.
     * @returns Promise resolved with the SCORM size.
     */
    async calculateScormSize(scorm: AddonModScormScorm): Promise<number> {
        if (scorm.packagesize) {
            return scorm.packagesize;
        }

        return CoreWS.getRemoteFileSize(this.getPackageUrl(scorm));
    }

    /**
     * Count the attempts left for the given scorm.
     *
     * @param scorm SCORM.
     * @param attemptsCount Number of attempts performed.
     * @returns Number of attempts left.
     */
    countAttemptsLeft(scorm: AddonModScormScorm, attemptsCount: number): number {
        if (!scorm.maxattempt) {
            return Number.MAX_VALUE; // Unlimited attempts.
        }

        attemptsCount = Number(attemptsCount); // Make sure it's a number.
        if (isNaN(attemptsCount)) {
            return -1;
        }

        return Math.max(scorm.maxattempt - attemptsCount, 0);
    }

    /**
     * Returns the mode and attempt number to use based on mode selected and SCORM data.
     * This function is based on Moodle's scorm_check_mode.
     *
     * @param scorm SCORM.
     * @param mode Selected mode.
     * @param attempt Current attempt.
     * @param newAttempt Whether it should start a new attempt.
     * @param incomplete Whether current attempt is incomplete.
     * @param canSaveTracks Whether the user can save tracks.
     * @returns Mode, attempt number and whether to start a new attempt.
     */
    determineAttemptAndMode(
        scorm: AddonModScormScorm,
        mode: AddonModScormMode,
        attempt: number,
        newAttempt?: boolean,
        incomplete?: boolean,
        canSaveTracks = true,
    ): {mode: AddonModScormMode; attempt: number; newAttempt: boolean} {
        if (!canSaveTracks) {
            return {
                mode: scorm.hidebrowse ? AddonModScormMode.NORMAL : mode,
                attempt,
                newAttempt: false,
            };
        }

        if (mode == AddonModScormMode.BROWSE) {
            if (scorm.hidebrowse) {
                // Prevent Browse mode if hidebrowse is set.
                mode = AddonModScormMode.NORMAL;
            } else {
                // We don't need to check attempts as browse mode is set.
                if (attempt == 0) {
                    attempt = 1;
                    newAttempt = true;
                }

                return {
                    mode: mode,
                    attempt: attempt,
                    newAttempt: !!newAttempt,
                };
            }
        }

        if (scorm.forcenewattempt === AddonModScormForceAttempt.ALWAYS) {
            // This SCORM is configured to force a new attempt on every re-entry.
            return {
                mode: AddonModScormMode.NORMAL,
                attempt: attempt + 1,
                newAttempt: true,
            };
        }

        // Validate user request to start a new attempt.
        if (attempt == 0) {
            newAttempt = true;
        } else if (incomplete) {
            // The option to start a new attempt should never have been presented. Force false.
            newAttempt = false;
        } else if (scorm.forcenewattempt) {
            // A new attempt should be forced for already completed attempts.
            newAttempt = true;
        }

        if (newAttempt && (!scorm.maxattempt || attempt < scorm.maxattempt)) {
            // Create a new attempt. Force mode normal.
            attempt++;
            mode = AddonModScormMode.NORMAL;
        } else {
            if (incomplete) {
                // We can't review an incomplete attempt.
                mode = AddonModScormMode.NORMAL;
            } else {
                // We aren't starting a new attempt and the current one is complete, force review mode.
                mode = AddonModScormMode.REVIEW;
            }
        }

        return {
            mode: mode,
            attempt: attempt,
            newAttempt: !!newAttempt,
        };
    }

    /**
     * Check if TOC should be displayed in the player.
     *
     * @param scorm SCORM.
     * @returns Whether it should display TOC.
     */
    displayTocInPlayer(scorm: AddonModScormScorm): boolean {
        return scorm.hidetoc !== 3;
    }

    /**
     * This is a little language parser for AICC_SCRIPT.
     * Evaluates the expression and returns a boolean answer.
     * See 2.3.2.5.1. Sequencing/Navigation Today - from the SCORM 1.2 spec (CAM).
     *
     * @param prerequisites The AICC_SCRIPT prerequisites expression.
     * @param trackData The tracked user data of each SCO.
     * @returns Whether the prerequisites are fulfilled.
     */
    evalPrerequisites(prerequisites: string, trackData: Record<string, Record<string, AddonModScormDataValue>>): boolean {
        const stack: string[] = []; // List of prerequisites.

        // Expand the amp entities.
        prerequisites = prerequisites.replace(/&amp;/gi, '&');
        // Find all my parsable tokens.
        prerequisites = prerequisites.replace(/(&|\||\(|\)|~)/gi, '\t$1\t');
        // Expand operators.
        prerequisites = prerequisites.replace(/&/gi, '&&');
        prerequisites = prerequisites.replace(/\|/gi, '||');

        // Now - grab all the tokens.
        const elements = prerequisites.trim().split('\t');

        // Process each token to build an expression to be evaluated.
        elements.forEach((element) => {
            element = element.trim();
            if (!element) {
                return;
            }

            if (!element.match(/^(&&|\|\||\(|\))$/gi)) {
                // Create each individual expression.
                // Search for ~ = <> X*{} .

                const re = /^(\d+)\*\{(.+)\}$/; // Sets like 3*{S34, S36, S37, S39}.
                const reOther = /^(.+)(=|<>)(.+)$/; // Other symbols.
                const matches = element.match(re);

                if (matches) {
                    const repeat = Number(matches[1]);
                    const set = matches[2].split(',') || [];
                    let count = 0;

                    set.forEach((setElement) => {
                        setElement = setElement.trim();

                        if (trackData[setElement] !== undefined &&
                                (trackData[setElement].status == 'completed' || trackData[setElement].status == 'passed')) {
                            count++;
                        }
                    });

                    if (count >= repeat) {
                        element = 'true';
                    } else {
                        element = 'false';
                    }
                } else if (element == '~') {
                    // Not maps ~.
                    element = '!';
                } else if (reOther.test(element)) {
                    // Other symbols = | <> .
                    const otherMatches = element.match(reOther) ?? [];
                    element = otherMatches[1]?.trim();

                    if (trackData[element] !== undefined) {
                        let value = otherMatches[3].trim().replace(/('|")/gi, '');
                        let oper: string;

                        if (STATUSES[value] !== undefined) {
                            value = STATUSES[value];
                        }

                        if (otherMatches[2] == '<>') {
                            oper = '!=';
                        } else {
                            oper = '==';
                        }

                        element = '(\'' + trackData[element].status + '\' ' + oper + ' \'' + value + '\')';
                    } else {
                        element = 'false';
                    }
                } else {
                    // Everything else must be an element defined like S45 ...
                    if (trackData[element] !== undefined &&
                            (trackData[element].status == 'completed' || trackData[element].status == 'passed')) {
                        element = 'true';
                    } else {
                        element = 'false';
                    }
                }
            }

            // Add the element to the list of prerequisites.
            stack.push(' ' + element + ' ');
        });

        // eslint-disable-next-line no-eval
        return eval(stack.join('') + ';');
    }

    /**
     * Formats a grade to be displayed.
     *
     * @param scorm SCORM.
     * @param grade Grade.
     * @returns Grade to display.
     */
    formatGrade(scorm: AddonModScormScorm, grade: number): string {
        if (grade === undefined || grade == -1) {
            return Translate.instant('core.none');
        }

        if (scorm.grademethod !== AddonModScormGradingMethod.GRADESCOES && scorm.maxgrade) {
            grade = (grade / scorm.maxgrade) * 100;

            return Translate.instant('core.percentagenumber', { $a: CoreText.roundToDecimals(grade, 2) });
        }

        return String(grade);
    }

    /**
     * Formats a tree-like TOC into an array.
     *
     * @param toc SCORM's TOC (tree format).
     * @param level The level of the TOC we're right now. 0 by default.
     * @returns SCORM's TOC (array format).
     */
    formatTocToArray(toc: AddonModScormTOCTreeSco[], level: number = 0): AddonModScormTOCListSco[] {
        if (!toc || !toc.length) {
            return [];
        }

        let formatted: AddonModScormTOCListSco[] = [];

        toc.forEach((node) => {
            const sco = <AddonModScormTOCListSco> node;
            sco.level = level;
            formatted.push(sco);

            formatted = formatted.concat(this.formatTocToArray(node.children, level + 1));
        });

        return formatted;
    }

    /**
     * Get access information for a given SCORM.
     *
     * @param scormId SCORM ID.
     * @param options Other options.
     * @returns Object with access information.
     * @since 3.7
     */
    async getAccessInformation(
        scormId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModScormGetScormAccessInformationWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        if (!site.wsAvailable('mod_scorm_get_scorm_access_information')) {
            // Access information not available for 3.6 or older sites.
            return {};
        }

        const params: AddonModScormGetScormAccessInformationWSParams = {
            scormid: scormId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAccessInformationCacheKey(scormId),
            component: ADDON_MOD_SCORM_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_scorm_get_scorm_access_information', params, preSets);
    }

    /**
     * Get cache key for access information WS calls.
     *
     * @param scormId SCORM ID.
     * @returns Cache key.
     */
    protected getAccessInformationCacheKey(scormId: number): string {
        return AddonModScormProvider.ROOT_CACHE_KEY + 'accessInfo:' + scormId;
    }

    /**
     * Get the number of attempts done by a user in the given SCORM.
     *
     * @param scormId SCORM ID.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    async getAttemptCount(
        scormId: number,
        options: AddonModScormGetAttemptCountOptions = {},
    ): Promise<AddonModScormAttemptCountResult> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const site = await CoreSites.getSite(options.siteId);
        const userId = options.userId || site.getUserId();

        const [onlineCount, offlineAttempts] = await Promise.all([
            this.getAttemptCountOnline(scormId, options),
            AddonModScormOffline.getAttempts(scormId, options.siteId, userId),
        ]);

        const result: AddonModScormAttemptCountResult = {
            online: [],
            offline: [],
            total: onlineCount,
            lastAttempt: {
                num: onlineCount,
                offline: false,
            },
        };

        // Fill online attempts array.
        for (let i = 1; i <= onlineCount; i++) {
            result.online.push(i);
        }

        // Get only attempt numbers for offline attempts.
        result.offline = offlineAttempts.map((entry) => {
            // Calculate last attempt. We use >= to prioritize offline events if an attempt is both online and offline.
            if (entry.attempt >= result.lastAttempt.num) {
                result.lastAttempt.num = entry.attempt;
                result.lastAttempt.offline = true;
            }

            return entry.attempt;
        });

        // Calculate the total.
        result.offline.forEach((attempt) => {
            // Check if this attempt also exists in online, it might have been copied to local.
            if (result.online.indexOf(attempt) == -1) {
                result.total++;
            }
        });

        return result;
    }

    /**
     * Get cache key for SCORM attempt count WS calls.
     *
     * @param scormId SCORM ID.
     * @param userId User ID. If not defined, current user.
     * @returns Cache key.
     */
    protected getAttemptCountCacheKey(scormId: number, userId: number): string {
        return AddonModScormProvider.ROOT_CACHE_KEY + 'attemptcount:' + scormId + ':' + userId;
    }

    /**
     * Get the number of attempts done by a user in the given SCORM in online.
     *
     * @param scormId SCORM ID.
     * @param options Other options.
     * @returns Promise resolved when the attempt count is retrieved.
     */
    async getAttemptCountOnline(scormId: number, options: AddonModScormGetAttemptCountOptions = {}): Promise<number> {
        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const params: AddonModScormGetScormAttemptCountWSParams = {
            scormid: scormId,
            userid: userId,
            ignoremissingcompletion: options.ignoreMissing,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptCountCacheKey(scormId, userId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_SCORM_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModScormGetScormAttemptCountWSResponse>(
            'mod_scorm_get_scorm_attempt_count',
            params,
            preSets,
        );

        return response.attemptscount;
    }

    /**
     * Get the grade data for a certain attempt.
     * Mostly based on Moodle's scorm_grade_user_attempt.
     *
     * @param scorm SCORM.
     * @param attempt Attempt number.
     * @param offline Whether the attempt is offline.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the grade. If the attempt hasn't reported grade/completion, it will be -1.
     */
    async getAttemptGrade(
        scorm: AddonModScormScorm,
        attempt: number,
        offline?: boolean,
        siteId?: string,
    ): Promise<AddonModScormAttemptGrade> {
        const attemptScore = {
            scos: 0,
            values: 0,
            max: 0,
            sum: 0,
        };

        // Get the user data and use it to calculate the grade.
        const data = await this.getScormUserData(scorm.id, attempt, { offline, cmId: scorm.coursemodule, siteId });

        for (const scoId in data) {
            const sco = data[scoId];
            const userData = sco.userdata;

            if (userData.status == 'completed' || userData.status == 'passed') {
                attemptScore.scos++;
            }

            if (userData.score_raw || (scorm.scormtype !== undefined &&
                        scorm.scormtype == 'sco' && userData.score_raw !== undefined)) {

                const scoreRaw = parseFloat(<string> userData.score_raw);
                attemptScore.values++;
                attemptScore.sum += scoreRaw;
                attemptScore.max = Math.max(scoreRaw, attemptScore.max);
            }
        }

        let score = 0;

        switch (scorm.grademethod) {
            case AddonModScormGradingMethod.GRADEHIGHEST:
                score = attemptScore.max;
                break;

            case AddonModScormGradingMethod.GRADEAVERAGE:
                if (attemptScore.values > 0) {
                    score = attemptScore.sum / attemptScore.values;
                } else {
                    score = 0;
                }
                break;

            case AddonModScormGradingMethod.GRADESUM:
                score = attemptScore.sum;
                break;

            case AddonModScormGradingMethod.GRADESCOES:
                score = attemptScore.scos;
                break;

            default:
                score = attemptScore.max; // Remote Learner GRADEHIGHEST is default.
        }

        return {
            num: attempt,
            score,
            hasCompletedPassedSCO: attemptScore.scos > 0,
        };
    }

    /**
     * Get the list of a organizations defined in a SCORM package.
     *
     * @param scormId SCORM ID.
     * @param options Other options.
     * @returns Promise resolved with the list of organizations.
     */
    async getOrganizations(scormId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModScormOrganization[]> {
        const scos = await this.getScos(scormId, options);

        const organizations: AddonModScormOrganization[] = [];

        scos.forEach((sco) => {
            // Is an organization entry?
            if (sco.organization == '' && sco.parent == '/' && sco.scormtype == '') {
                organizations.push({
                    identifier: sco.identifier,
                    title: sco.title,
                    sortorder: sco.sortorder,
                });
            }
        });

        return organizations;
    }

    /**
     * Get the organization Toc any
     *
     * @param scormId SCORM ID.
     * @param attempt The attempt number (to populate SCO track data).
     * @param options Other options.
     * @returns Promise resolved with the toc object.
     */
    async getOrganizationToc(
        scormId: number,
        attempt: number,
        options: AddonModScormGetScosWithDataOptions = {},
    ): Promise<AddonModScormTOCTreeSco[]> {

        const scos = <AddonModScormTOCTreeSco[]> await this.getScosWithData(scormId, attempt, options);

        const map: Record<string, number> = {};
        const rootScos: AddonModScormTOCTreeSco[] = [];

        scos.forEach((sco, index) => {
            sco.children = [];
            map[sco.identifier] = index;

            if (sco.parent !== '/') {
                if (sco.parent == options.organization) {
                    // It's a root SCO, add it to the root array.
                    rootScos.push(sco);
                } else {
                    // Add this sco to the parent.
                    scos[map[sco.parent]].children.push(sco);
                }
            }
        });

        return rootScos;
    }

    /**
     * Get the package URL of a given SCORM.
     *
     * @param scorm SCORM.
     * @returns Package URL.
     */
    getPackageUrl(scorm: AddonModScormScorm): string {
        if (scorm.packageurl) {
            return scorm.packageurl;
        }
        if (scorm.reference) {
            return scorm.reference;
        }

        return '';
    }

    /**
     * Get the user data for a certain SCORM and attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param options Other options.
     * @returns Promise resolved when the user data is retrieved.
     */
    async getScormUserData(
        scormId: number,
        attempt: number,
        options: AddonModScormGetUserDataOptions = {},
    ): Promise<AddonModScormUserDataMap> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        if (!options.offline) {
            return this.getScormUserDataOnline(scormId, attempt, options);
        }

        // Get SCOs if not provided.
        if (!options.scos) {
            options.scos = await this.getScos(scormId, options);
        }

        return AddonModScormOffline.getScormUserData(scormId, attempt, options.scos, options.siteId);
    }

    /**
     * Get cache key for SCORM user data WS calls.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @returns Cache key.
     */
    protected getScormUserDataCacheKey(scormId: number, attempt: number): string {
        return this.getScormUserDataCommonCacheKey(scormId) + ':' + attempt;
    }

    /**
     * Get common cache key for SCORM user data WS calls.
     *
     * @param scormId SCORM ID.
     * @returns Cache key.
     */
    protected getScormUserDataCommonCacheKey(scormId: number): string {
        return AddonModScormProvider.ROOT_CACHE_KEY + 'userdata:' + scormId;
    }

    /**
     * Get the user data for a certain SCORM and attempt in online.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param options Other options.
     * @returns Promise resolved when the user data is retrieved.
     */
    async getScormUserDataOnline(
        scormId: number,
        attempt: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModScormUserDataMap> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModScormGetScormUserDataWSParams = {
            scormid: scormId,
            attempt: attempt,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getScormUserDataCacheKey(scormId, attempt),
            component: ADDON_MOD_SCORM_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModScormGetScormUserDataWSResponse>('mod_scorm_get_scorm_user_data', params, preSets);

        // Format the response.
        const data: AddonModScormUserDataMap = {};

        response.data.forEach((sco) => {
            data[sco.scoid] = {
                scoid: sco.scoid,
                defaultdata: <Record<string, AddonModScormDataValue>> CoreObject.toKeyValueMap(
                    sco.defaultdata,
                    'element',
                    'value',
                ),
                userdata: <Record<string, AddonModScormDataValue>> CoreObject.toKeyValueMap(sco.userdata, 'element', 'value'),
            };

        });

        return data;
    }

    /**
     * Get cache key for get SCORM scos WS calls.
     *
     * @param scormId SCORM ID.
     * @returns Cache key.
     */
    protected getScosCacheKey(scormId: number): string {
        return AddonModScormProvider.ROOT_CACHE_KEY + 'scos:' + scormId;
    }

    /**
     * Retrieves the list of SCO objects for a given SCORM and organization.
     *
     * @param scormId SCORM ID.
     * @param options Other options.
     * @returns Promise resolved with a list of SCO.
     */
    async getScos(scormId: number, options: AddonModScormOrganizationOptions = {}): Promise<AddonModScormWSSco[]> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const site = await CoreSites.getSite(options.siteId);

        // Don't send the organization to the WS, we'll filter them locally.
        const params: AddonModScormGetScormScoesWSParams = {
            scormid: scormId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getScosCacheKey(scormId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_SCORM_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModScormGetScormScoesWSResponse>('mod_scorm_get_scorm_scoes', params, preSets);

        if (options.organization) {
            // Filter SCOs by organization.
            return response.scoes.filter((sco) => sco.organization == options.organization);
        }

        return response.scoes;
    }

    /**
     * Retrieves the list of SCO objects for a given SCORM and organization, including data about
     * a certain attempt (status, isvisible, ...).
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param options Other options.
     * @returns Promise resolved with a list of SCO objects.
     */
    async getScosWithData(
        scormId: number,
        attempt: number,
        options: AddonModScormGetScosWithDataOptions = {},
    ): Promise<AddonModScormScoWithData[]> {

        // Get organization SCOs.
        const scos = await this.getScos(scormId, options);

        // Get the track data for all the SCOs in the organization for the given attempt.
        // We'll use this data to set SCO data like isvisible, status and so.
        const userDataOptions: AddonModScormGetUserDataOptions = {
            scos,
            ...options, // Include all options.
        };

        const data = await this.getScormUserData(scormId, attempt, userDataOptions);

        const trackDataBySCO: Record<string, Record<string, AddonModScormDataValue>> = {};

        // First populate trackDataBySCO to index by SCO identifier.
        // We want the full list first because it's needed by evalPrerequisites.
        scos.forEach((sco) => {
            trackDataBySCO[sco.identifier] = data[sco.id].userdata;
        });

        const scosWithData: AddonModScormScoWithData[] = scos;

        scosWithData.forEach((sco) => {
            // Add specific SCO information (related to tracked data).
            const scoData = data[sco.id].userdata;

            if (!scoData) {
                return;
            }

            // Check isvisible attribute.
            sco.isvisible = scoData.isvisible === undefined || (!!scoData.isvisible && scoData.isvisible !== 'false');
            // Check pre-requisites status.
            sco.prereq = scoData.prerequisites === undefined ||
                this.evalPrerequisites(<string> scoData.prerequisites, trackDataBySCO);
            // Add status.
            sco.status = (scoData.status === undefined || scoData.status === '') ? 'notattempted' : <string> scoData.status;
            // Exit var.
            sco.exitvar = scoData.exitvar === undefined ? 'cmi.core.exit' : <string> scoData.exitvar;
            sco.exitvalue = <string> scoData[sco.exitvar];
            // Copy score.
            sco.scoreraw = scoData.score_raw;
        });

        return scosWithData;
    }

    /**
     * Given a SCORM and a SCO, returns the full launch URL for the SCO.
     *
     * @param scorm SCORM.
     * @param sco SCO.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the URL.
     */
    async getScoSrc(scorm: AddonModScormScorm, sco: AddonModScormWSSco, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Build the launch URL. Moodle web checks SCORM version, we don't need to, it's always SCORM 1.2.
        let launchUrl = sco.launch;
        const parametersEntry = sco.extradata?.find((entry) => entry.element == 'parameters');
        let parameters = <string | undefined> parametersEntry?.value;

        if (parameters) {
            const connector = launchUrl.indexOf('?') > -1 ? '&' : '?';
            if (parameters.charAt(0) == '?') {
                parameters = parameters.substring(1);
            }

            launchUrl += connector + parameters;
        }

        if (this.isExternalLink(launchUrl)) {
            // It's an online URL.
            return launchUrl;
        }

        const dirPath = await CoreFilepool.getPackageDirUrlByUrl(siteId, scorm.moduleurl ?? '');

        return CorePath.concatenatePaths(dirPath, launchUrl);
    }

    /**
     * Given a SCORM and a SCO, returns the full launch URL for the SCO to be used in an online player.
     *
     * @param scorm SCORM.
     * @param sco SCO.
     * @param options Other options.
     * @returns The URL.
     */
    async getScoSrcForOnlinePlayer(
        scorm: AddonModScormScorm,
        sco: AddonModScormWSSco,
        options: AddonModScormGetScoSrcForOnlinePlayerOptions = {},
    ): Promise<string> {
        const site = await CoreSites.getSite(options.siteId);

        // Use online player.
        return CoreUrl.addParamsToUrl(CorePath.concatenatePaths(site.getURL(), '/mod/scorm/player.php'), {
            a: scorm.id,
            scoid: sco.id,
            display: 'popup',
            mode: options.mode,
            currentorg: options.organization,
            newattempt: options.newAttempt ? 'on' : 'off',
        });
    }

    /**
     * Get the path to the folder where a SCORM is downloaded.
     *
     * @param moduleUrl Module URL (returned by get_course_contents).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the folder path.
     */
    getScormFolder(moduleUrl: string, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        return CoreFilepool.getPackageDirPathByUrl(siteId, moduleUrl);
    }

    /**
     * Gets a list of files to downlaod for a SCORM, using a format similar to module.contents from get_course_contents.
     * It will only return one file: the ZIP package.
     *
     * @param scorm SCORM.
     * @returns File list.
     */
    getScormFileList(scorm: AddonModScormScorm): CoreWSFile[] {
        const files: CoreWSFile[] = [];

        if (!this.useOnlinePlayer(scorm) && !scorm.warningMessage) {
            files.push({
                fileurl: this.getPackageUrl(scorm),
                filepath: '/',
                filename: scorm.reference,
                filesize: scorm.packagesize,
                timemodified: 0,
            });
        }

        return files;
    }

    /**
     * Get the URL and description of the status icon.
     *
     * @param sco SCO.
     * @param incomplete Whether the SCORM is incomplete.
     * @returns Image URL and description.
     */
    getScoStatusIcon(sco: AddonModScormScoWithData, incomplete?: boolean): AddonModScormScoIcon {
        let imageName = '';
        let descName = '';
        let suspendedStr = '';

        const status = sco.status || '';

        if (sco.isvisible) {
            if (VALID_STATUSES.indexOf(status) >= 0) {
                if (sco.scormtype === 'sco') {
                    imageName = status;
                    descName = status;
                } else {
                    imageName = 'asset';
                    descName = 'assetlaunched';
                }

                if (!incomplete) {
                    // Check if SCO is completed or not. If SCORM is incomplete there's no need to check SCO.
                    incomplete = this.isStatusIncomplete(status);
                }

                if (incomplete && sco.exitvalue == 'suspend') {
                    imageName = 'suspend';
                    suspendedStr = ' - ' + Translate.instant('addon.mod_scorm.suspended');
                }
            } else {
                incomplete = true;

                if (sco.scormtype === 'sco') {
                    // Status empty or not valid, use 'notattempted'.
                    imageName = 'notattempted';
                } else {
                    imageName = 'asset';
                }
                descName = imageName;
            }
        }

        if (imageName == '') {
            imageName = 'notattempted';
            descName = 'notattempted';
            suspendedStr = '';
        }

        sco.incomplete = incomplete;

        return {
            icon: STATUS_TO_ICON[imageName],
            description: Translate.instant('addon.mod_scorm.' + descName) + suspendedStr,
        };
    }

    /**
     * Get cache key for SCORM data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getScormDataCacheKey(courseId: number): string {
        return AddonModScormProvider.ROOT_CACHE_KEY + 'scorm:' + courseId;
    }

    /**
     * Get a SCORM with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the SCORM is retrieved.
     */
    protected async getScormByField(
        courseId: number,
        key: string,
        value: unknown,
        options: AddonModScormGetScormOptions = {},
    ): Promise<AddonModScormScorm> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModScormGetScormsByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getScormDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_SCORM_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModScormGetScormsByCoursesWSResponse>(
            'mod_scorm_get_scorms_by_courses',
            params,
            preSets,
        );

        const currentScorm = <AddonModScormScorm> response.scorms.find(scorm => scorm[key] == value);
        if (!currentScorm) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        // If the SCORM isn't available the WS returns a warning and it doesn't return timeopen and timeclosed.
        if (currentScorm.timeopen === undefined) {
            const warning = response.warnings?.find(warning => warning.itemid === currentScorm.id);
            currentScorm.warningMessage = warning?.message;
        }

        if (response.options) {
            const scormOptions = CoreObject.toKeyValueMap(response.options, 'name', 'value');

            if (scormOptions.scormstandard) {
                currentScorm.scormStandard = Number(scormOptions.scormstandard);
            }
        }

        currentScorm.moduleurl = options.moduleUrl;

        return currentScorm;
    }

    /**
     * Get a SCORM by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the SCORM is retrieved.
     */
    getScorm(courseId: number, cmId: number, options: AddonModScormGetScormOptions = {}): Promise<AddonModScormScorm> {
        return this.getScormByField(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a SCORM by SCORM ID.
     *
     * @param courseId Course ID.
     * @param id SCORM ID.
     * @param options Other options.
     * @returns Promise resolved when the SCORM is retrieved.
     */
    getScormById(courseId: number, id: number, options: AddonModScormGetScormOptions = {}): Promise<AddonModScormScorm> {
        return this.getScormByField(courseId, 'id', id, options);
    }

    /**
     * Get a readable SCORM grade method.
     *
     * @param scorm SCORM.
     * @returns Grading method.
     */
    getScormGradeMethod(scorm: AddonModScormScorm): string {
        if (scorm.maxattempt == 1) {
            switch (scorm.grademethod) {
                case AddonModScormGradingMethod.GRADEHIGHEST:
                    return Translate.instant('addon.mod_scorm.gradehighest');

                case AddonModScormGradingMethod.GRADEAVERAGE:
                    return Translate.instant('addon.mod_scorm.gradeaverage');

                case AddonModScormGradingMethod.GRADESUM:
                    return Translate.instant('addon.mod_scorm.gradesum');

                case AddonModScormGradingMethod.GRADESCOES:
                    return Translate.instant('addon.mod_scorm.gradescoes');
                default:
                    return '';
            }
        }

        switch (scorm.whatgrade) {
            case AddonModScormAttemptsGradingMethod.HIGHESTATTEMPT:
                return Translate.instant('addon.mod_scorm.highestattempt');

            case AddonModScormAttemptsGradingMethod.AVERAGEATTEMPT:
                return Translate.instant('addon.mod_scorm.averageattempt');

            case AddonModScormAttemptsGradingMethod.FIRSTATTEMPT:
                return Translate.instant('addon.mod_scorm.firstattempt');

            case AddonModScormAttemptsGradingMethod.LASTATTEMPT:
                return Translate.instant('addon.mod_scorm.lastattempt');
            default:
                return '';
        }
    }

    /**
     * Invalidates access information.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAccessInformation(scormId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(scormId));
    }

    /**
     * Invalidates all the data related to a certain SCORM.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllScormData(scormId: number, siteId?: string, userId?: number): Promise<void> {
        await Promise.all([
            this.invalidateAttemptCount(scormId, siteId, userId),
            this.invalidateScos(scormId, siteId),
            this.invalidateScormUserData(scormId, siteId),
            this.invalidateAccessInformation(scormId, siteId),
        ]);
    }

    /**
     * Invalidates attempt count.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptCount(scormId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getAttemptCountCacheKey(scormId, userId));
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string, userId?: number): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const scorm = await this.getScorm(courseId, moduleId, { siteId });

        await Promise.all([
            this.invalidateAllScormData(scorm.id, siteId, userId),
            CoreFilepool.invalidateFilesByComponent(siteId, ADDON_MOD_SCORM_COMPONENT_LEGACY, moduleId, true),
        ]);
    }

    /**
     * Invalidates SCORM data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateScormData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getScormDataCacheKey(courseId));
    }

    /**
     * Invalidates SCORM user data for all attempts.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateScormUserData(scormId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getScormUserDataCommonCacheKey(scormId));
    }

    /**
     * Invalidates SCORM scos for all organizations.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateScos(scormId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getScosCacheKey(scormId));
    }

    /**
     * Check if a SCORM's attempt is incomplete.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt.
     * @param options Other options.
     * @returns Promise resolved with a boolean: true if incomplete, false otherwise.
     */
    async isAttemptIncomplete(scormId: number, attempt: number, options: AddonModScormOfflineOptions = {}): Promise<boolean> {
        const scos = await this.getScosWithData(scormId, attempt, options);

        return scos.some(sco => sco.isvisible && sco.launch && this.isStatusIncomplete(sco.status));
    }

    /**
     * Given a launch URL, check if it's a external link.
     * Based on Moodle's scorm_external_link.
     *
     * @param link Link to check.
     * @returns Whether it's an external link.
     */
    protected isExternalLink(link: string): boolean {
        link = link.toLowerCase();

        if (link.match(/^https?:\/\//i) && !CoreUrl.isLocalFileUrl(link)) {
            return true;
        } else if (link.substring(0, 4) == 'www.') {
            return true;
        }

        return false;
    }

    /**
     * Check if the given SCORM is closed.
     *
     * @param scorm SCORM to check.
     * @returns Whether the SCORM is closed.
     */
    isScormClosed(scorm: AddonModScormScorm): boolean {
        return !!(scorm.timeclose && CoreTime.timestamp() > scorm.timeclose);
    }

    /**
     * Check if the given SCORM is downloadable.
     *
     * @param scorm SCORM to check.
     * @returns Whether the SCORM is downloadable.
     */
    isScormDownloadable(scorm: AddonModScormScorm): boolean {
        return scorm.protectpackagedownloads !== undefined && scorm.protectpackagedownloads === false;
    }

    /**
     * Check if the given SCORM is open.
     *
     * @param scorm SCORM to check.
     * @returns Whether the SCORM is open.
     */
    isScormOpen(scorm: AddonModScormScorm): boolean {
        return !!(scorm.timeopen && scorm.timeopen > CoreTime.timestamp());
    }

    /**
     * Check if it's a valid SCORM 1.2.
     *
     * @param scorm SCORM to check.
     * @returns Whether the SCORM is valid.
     */
    isScormValidVersion(scorm: AddonModScormScorm): boolean {
        return scorm.version == 'SCORM_1.2';
    }

    /**
     * Check if a SCO status is incomplete.
     *
     * @param status SCO status.
     * @returns Whether it's incomplete.
     */
    isStatusIncomplete(status?: string): boolean {
        return !status || status == 'notattempted' || status == 'incomplete' || status == 'browsed';
    }

    /**
     * Check if a package URL is valid.
     *
     * @param packageUrl Package URL.
     * @returns Whether it's valid.
     */
    isValidPackageUrl(packageUrl: string): boolean {
        if (!packageUrl) {
            return false;
        }
        if (packageUrl.indexOf('imsmanifest.xml') > -1) {
            return false;
        }

        return true;
    }

    /**
     * Report a SCO as being launched.
     *
     * @param scormId SCORM ID.
     * @param scoId SCO ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logLaunchSco(scormId: number, scoId: number, siteId?: string): Promise<void> {
        const params: AddonModScormLaunchScoWSParams = {
            scormid: scormId,
            scoid: scoId,
        };

        return CoreCourseLogHelper.log(
            'mod_scorm_launch_sco',
            params,
            ADDON_MOD_SCORM_COMPONENT_LEGACY,
            scormId,
            siteId,
        );
    }

    /**
     * Report a SCORM as being viewed.
     *
     * @param id Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModScormViewScormWSParams = {
            scormid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_scorm_view_scorm',
            params,
            ADDON_MOD_SCORM_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

    /**
     * Saves a SCORM tracking record.
     *
     * @param scoId Sco ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data to store.
     * @param scorm SCORM.
     * @param offline Whether the attempt is offline.
     * @param userData User data for this attempt and SCO. If not defined, it will be retrieved from DB. Recommended.
     * @returns Promise resolved when data is saved.
     */
    async saveTracks(
        scoId: number,
        attempt: number,
        tracks: AddonModScormDataEntry[],
        scorm: AddonModScormScorm,
        offline?: boolean,
        userData?: AddonModScormUserDataMap,
        siteId?: string,
    ): Promise<void> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        if (offline) {
            if (!userData) {
                userData = await this.getScormUserData(scorm.id, attempt, { offline, cmId: scorm.coursemodule, siteId });
            }

            return AddonModScormOffline.saveTracks(scorm, scoId, attempt, tracks, userData, siteId);
        }

        await this.saveTracksOnline(scorm.id, scoId, attempt, tracks, siteId);

        // Tracks have been saved, update cached user data.
        this.updateUserDataAfterSave(scorm.id, attempt, tracks, { cmId: scorm.coursemodule, siteId });

        CoreEvents.trigger(ADDON_MOD_SCORM_DATA_SENT_EVENT, {
            scormId: scorm.id,
            scoId: scoId,
            attempt: attempt,
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * Saves a SCORM tracking record.
     *
     * @param scormId SCORM ID.
     * @param scoId Sco ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is saved.
     */
    async saveTracksOnline(
        scormId: number,
        scoId: number,
        attempt: number,
        tracks: AddonModScormDataEntry[],
        siteId?: string,
    ): Promise<number[]> {
        if (!tracks || !tracks.length) {
            return []; // Nothing to save.
        }

        const site = await CoreSites.getSite(siteId);

        const params: AddonModScormInsertScormTracksWSParams = {
            scoid: scoId,
            attempt: attempt,
            tracks: tracks,
        };

        CoreSync.blockOperation(ADDON_MOD_SCORM_COMPONENT_LEGACY, scormId, 'saveTracksOnline', site.id);

        try {
            const response = await site.write<AddonModScormInsertScormTracksWSResponse>('mod_scorm_insert_scorm_tracks', params);

            return response.trackids;
        } finally {
            CoreSync.unblockOperation(ADDON_MOD_SCORM_COMPONENT_LEGACY, scormId, 'saveTracksOnline', site.id);
        }
    }

    /**
     * Saves a SCORM tracking record using a synchronous call.
     * Please use this function only if synchronous is a must. It's recommended to use saveTracks.
     *
     * @param scoId Sco ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data to store.
     * @param scorm SCORM.
     * @param offline Whether the attempt is offline.
     * @param userData User data for this attempt and SCO. Required if offline=true.
     * @returns In online returns true if data is inserted, false otherwise.
     *         In offline returns true if data to insert is valid, false otherwise. True doesn't mean that the
     *         data has been stored, this function can return true but the insertion can still fail somehow.
     */
    saveTracksSync(
        scoId: number,
        attempt: number,
        tracks: AddonModScormDataEntry[],
        scorm: AddonModScormScorm,
        offline?: boolean,
        userData?: AddonModScormUserDataMap,
    ): boolean {
        if (offline) {
            return AddonModScormOffline.saveTracksSync(scorm, scoId, attempt, tracks, userData ?? {});
        } else {
            const success = this.saveTracksSyncOnline(scoId, attempt, tracks);

            if (success) {
                // Tracks have been saved, update cached user data.
                this.updateUserDataAfterSave(scorm.id, attempt, tracks, { cmId: scorm.coursemodule });

                CoreEvents.trigger(ADDON_MOD_SCORM_DATA_SENT_EVENT, {
                    scormId: scorm.id,
                    scoId: scoId,
                    attempt: attempt,
                }, CoreSites.getCurrentSiteId());
            }

            return success;
        }
    }

    /**
     * Saves a SCORM tracking record using a synchronous call.
     * Please use this function only if synchronous is a must. It's recommended to use saveTracksOnline.
     *
     * @param scoId Sco ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data.
     * @returns True if success, false otherwise.
     */
    saveTracksSyncOnline(scoId: number, attempt: number, tracks: AddonModScormDataEntry[]): boolean {
        if (!tracks || !tracks.length) {
            return true; // Nothing to save.
        }

        const params: AddonModScormInsertScormTracksWSParams = {
            scoid: scoId,
            attempt: attempt,
            tracks: tracks,
        };
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        const preSets: CoreWSPreSets = {
            siteUrl: currentSite.getURL(),
            wsToken: currentSite.getToken(),
        };
        const wsFunction = 'mod_scorm_insert_scorm_tracks';

        try {
            const response = CoreWS.syncCall<AddonModScormInsertScormTracksWSResponse>(wsFunction, params, preSets);

            return !!(response && response.trackids);
        } catch {
            return false;
        }
    }

    /**
     * Check if the SCORM main file should be downloaded.
     * This function should only be called if the SCORM can be downloaded (not downloaded or outdated).
     *
     * @param scorm SCORM to check.
     * @param isOutdated True if package outdated, false if not downloaded, undefined to calculate it.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if it should be downloaded, false otherwise.
     */
    async shouldDownloadMainFile(scorm: AddonModScormScorm, isOutdated?: boolean, siteId?: string): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const component = ADDON_MOD_SCORM_COMPONENT_LEGACY;

        if (isOutdated === undefined) {
            // Calculate if it's outdated.
            const data = await CorePromiseUtils.ignoreErrors(CoreFilepool.getPackageData(siteId, component, scorm.coursemodule));

            if (!data) {
                // Package not found, not downloaded.
                return false;
            }

            const isOutdated = data.status === DownloadStatus.OUTDATED ||
                    (data.status === DownloadStatus.DOWNLOADING && data.previous === DownloadStatus.OUTDATED);

            // Package needs to be downloaded if it's not outdated (not downloaded) or if the hash has changed.
            return !isOutdated || data.extra != scorm.sha1hash;

        } else if (isOutdated) {
            // The package is outdated, but maybe the file hasn't changed.
            const extra = await CorePromiseUtils.ignoreErrors(CoreFilepool.getPackageExtra(siteId, component, scorm.coursemodule));

            if (!extra) {
                // Package not found, not downloaded.
                return true;
            }

            return scorm.sha1hash != extra;
        } else {
            // Package is not outdated and not downloaded, download the main file.
            return true;
        }
    }

    /**
     * If needed, updates cached user data after saving tracks in online.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data saved.
     * @param options Other options.
     * @returns Promise resolved when updated.
     */
    protected async updateUserDataAfterSave(
        scormId: number,
        attempt: number,
        tracks: AddonModScormDataEntry[],
        options: {cmId?: number; siteId?: string},
    ): Promise<void> {
        if (!tracks || !tracks.length) {
            return;
        }

        // Check if we need to update. We only update if we sent some track with a dot notation.
        const needsUpdate = tracks.some(track => track.element && track.element.indexOf('.') > -1);

        if (!needsUpdate) {
            return;
        }

        await this.getScormUserDataOnline(scormId, attempt, {
            cmId: options.cmId,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId: options.siteId,
        });
    }

    /**
     * Check if a SCORM should use an online player.
     *
     * @param scorm SCORM to check.
     * @returns True if it should use an online player.
     */
    useOnlinePlayer(scorm: AddonModScormScorm): boolean {
        return !this.isScormValidVersion(scorm) || !this.isScormDownloadable(scorm) ||
            !this.isValidPackageUrl(this.getPackageUrl(scorm));
    }

}

export const AddonModScorm = makeSingleton(AddonModScormProvider);

/**
 * Params of mod_scorm_get_scorm_access_information WS.
 */
export type AddonModScormGetScormAccessInformationWSParams = {
    scormid: number; // Scorm instance id.
};

/**
 * Data returned by mod_scorm_get_scorm_access_information WS.
 */
export type AddonModScormGetScormAccessInformationWSResponse = {
    warnings?: CoreWSExternalWarning[];
    canaddinstance?: boolean; // Whether the user has the capability mod/scorm:addinstance allowed.
    canviewreport?: boolean; // Whether the user has the capability mod/scorm:viewreport allowed.
    canskipview?: boolean; // Whether the user has the capability mod/scorm:skipview allowed.
    cansavetrack?: boolean; // Whether the user has the capability mod/scorm:savetrack allowed.
    canviewscores?: boolean; // Whether the user has the capability mod/scorm:viewscores allowed.
    candeleteresponses?: boolean; // Whether the user has the capability mod/scorm:deleteresponses allowed.
    candeleteownresponses?: boolean; // Whether the user has the capability mod/scorm:deleteownresponses allowed.
};

/**
 * Params of mod_scorm_get_scorm_attempt_count WS.
 */
export type AddonModScormGetScormAttemptCountWSParams = {
    scormid: number; // SCORM instance id.
    userid: number; // User id.
    ignoremissingcompletion?: boolean; // Ignores attempts that haven't reported a grade/completion.
};

/**
 * Data returned by mod_scorm_get_scorm_attempt_count WS.
 */
export type AddonModScormGetScormAttemptCountWSResponse = {
    attemptscount: number; // Attempts count.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_scorm_get_scorm_user_data WS.
 */
export type AddonModScormGetScormUserDataWSParams = {
    scormid: number; // Scorm instance id.
    attempt: number; // Attempt number.
};

/**
 * Data returned by mod_scorm_get_scorm_user_data WS.
 */
export type AddonModScormGetScormUserDataWSResponse = {
    data: AddonModScormWSScoUserData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Each entry returned by mod_scorm_get_scorm_user_data WS.
 */
export type AddonModScormWSScoUserData = {
    scoid: number; // Sco id.
    userdata: AddonModScormDataEntry[];
    defaultdata: AddonModScormDataEntry[];
};

/**
 * Data for each data entry returned by mod_scorm_get_scorm_user_data WS.
 */
export type AddonModScormDataEntry = {
    element: string; // Element name.
    value: AddonModScormDataValue; // Element value.
};

/**
 * Possible values for a data value.
 */
export type AddonModScormDataValue = string | number;

/**
 * Map of formatted user data, indexed by SCO id.
 */
export type AddonModScormUserDataMap = Record<number, AddonModScormScoUserData>;

/**
 * User data returned mod_scorm_get_scorm_user_data, but formatted.
 */
export type AddonModScormScoUserData = Omit<AddonModScormWSScoUserData, 'defaultdata'|'userdata'> & {
    defaultdata: Record<string, AddonModScormDataValue>;
    userdata: Record<string, AddonModScormDataValue>;
};

/**
 * Params of mod_scorm_get_scorm_scoes WS.
 */
export type AddonModScormGetScormScoesWSParams = {
    scormid: number; // Scorm instance id.
    organization?: string; // Organization id.
};

/**
 * Data returned by mod_scorm_get_scorm_scoes WS.
 */
export type AddonModScormGetScormScoesWSResponse = {
    scoes: AddonModScormWSSco[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * SCO data returned by mod_scorm_get_scorm_scoes WS.
 */
export type AddonModScormWSSco = {
    id: number; // Sco id.
    scorm: number; // Scorm id.
    manifest: string; // Manifest id.
    organization: string; // Organization id.
    parent: string; // Parent.
    identifier: string; // Identifier.
    launch: string; // Launch file.
    scormtype: string; // Scorm type (asset, sco).
    title: string; // Sco title.
    sortorder: number; // Sort order.
    extradata?: AddonModScormDataEntry[]; // Additional SCO data.
};

/**
 * SCO data with some calculated data.
 */
export type AddonModScormScoWithData = AddonModScormWSSco & {
    isvisible?: boolean;
    prereq?: boolean;
    status?: string;
    exitvar?: string;
    exitvalue?: string;
    scoreraw?: string | number;
    incomplete?: boolean;
};

/**
 * SCO data, including children to build the TOC.
 */
export type AddonModScormTOCTreeSco = AddonModScormScoWithData & {
    children: AddonModScormTOCTreeSco[];
};

/**
 * SCO data, including children to build the TOC.
 */
export type AddonModScormTOCListSco = AddonModScormTOCTreeSco & {
    level: number;
};

/**
 * Params of mod_scorm_get_scorms_by_courses WS.
 */
export type AddonModScormGetScormsByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_scorm_get_scorms_by_courses WS.
 */
export type AddonModScormGetScormsByCoursesWSResponse = {
    options?: AddonModScormOptions[]; // @since v4.3. Scorm options
    scorms: AddonModScormScormWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Scorm options returned by mod_scorm_get_scorms_by_courses WS.
 */
export type AddonModScormOptions = {
    name: string;
    value: string;
};

/**
 * Scorm data returned by mod_scorm_get_scorms_by_courses WS.
 */
export type AddonModScormScormWSData = {
    id: number; // SCORM id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // SCORM name.
    intro: string; // The SCORM intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    packagesize?: number; // SCORM zip package size.
    packageurl?: string; // SCORM zip package URL.
    version?: string; // SCORM version (SCORM_12, SCORM_13, SCORM_AICC).
    maxgrade?: number; // Max grade.
    grademethod?: AddonModScormGradingMethod; // Grade method.
    whatgrade?: AddonModScormAttemptsGradingMethod; // What grade.
    maxattempt?: number; // Maximum number of attemtps.
    forcecompleted?: boolean; // Status current attempt is forced to "completed".
    forcenewattempt?: number; // Controls re-entry behaviour.
    lastattemptlock?: boolean; // Prevents to launch new attempts once finished.
    displayattemptstatus?: number; // How to display attempt status.
    displaycoursestructure?: boolean; // Display contents structure.
    sha1hash?: string; // Package content or ext path hash.
    md5hash?: string; // MD5 Hash of package file.
    revision?: number; // Revison number.
    launch?: number; // First content to launch.
    skipview?: number; // How to skip the content structure page.
    hidebrowse?: boolean; // Disable preview mode?.
    hidetoc?: number; // How to display the SCORM structure in player.
    nav?: number; // Show navigation buttons.
    navpositionleft?: number; // Navigation position left.
    navpositiontop?: number; // Navigation position top.
    auto?: boolean; // Auto continue?.
    popup?: number; // Display in current or new window.
    width?: number; // Frame width.
    height?: number; // Frame height.
    timeopen?: number; // Available from.
    timeclose?: number; // Available to.
    displayactivityname?: boolean; // Display the activity name above the player?.
    scormtype?: string; // SCORM type.
    reference?: string; // Reference to the package.
    protectpackagedownloads?: boolean; // Protect package downloads?.
    updatefreq?: number; // Auto-update frequency for remote packages.
    options?: string; // Additional options.
    completionstatusrequired?: number; // Status passed/completed required?.
    completionscorerequired?: number; // Minimum score required.
    completionstatusallscos?: number; // Require all scos to return completion status.
    autocommit?: boolean; // Save track data automatically?.
    timemodified?: number; // Time of last modification.
    section?: number; // Course section id.
    visible?: boolean; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
};

/**
 * Scorm data with some calculated data
 */
export type AddonModScormScorm = AddonModScormScormWSData & {
    warningMessage?: string;
    moduleurl?: string;
    scormStandard?: number;
};

/**
 * Params of mod_scorm_insert_scorm_tracks WS.
 */
export type AddonModScormInsertScormTracksWSParams = {
    scoid: number; // SCO id.
    attempt: number; // Attempt number.
    tracks: AddonModScormDataEntry[];
};

/**
 * Data returned by mod_scorm_insert_scorm_tracks WS.
 */
export type AddonModScormInsertScormTracksWSResponse = {
    trackids: number[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_scorm_launch_sco WS.
 */
export type AddonModScormLaunchScoWSParams = {
    scormid: number; // SCORM instance id.
    scoid?: number; // SCO id (empty for launching the first SCO).
};

/**
 * Params of mod_scorm_view_scorm WS.
 */
export type AddonModScormViewScormWSParams = {
    scormid: number; // Scorm instance id.
};

/**
 * Options to pass to get SCORM.
 */
export type AddonModScormGetScormOptions = CoreSitesCommonWSOptions & {
    moduleUrl?: string; // Module URL.
};

/**
 * Common options with an organization ID.
 */
export type AddonModScormOrganizationOptions = CoreCourseCommonModWSOptions & {
    organization?: string; // Organization ID.
};

/**
 * Common options with offline boolean.
 */
export type AddonModScormOfflineOptions = CoreCourseCommonModWSOptions & {
    offline?: boolean; // Whether the attempt is offline.
};

/**
 * Options to pass to getAttemptCount.
 */
export type AddonModScormGetAttemptCountOptions = CoreCourseCommonModWSOptions & {
    ignoreMissing?: boolean; // Whether it should ignore attempts that haven't reported a grade/completion.
    userId?: number; // User ID. If not defined use site's current user.
};

/**
 * Options to pass to getScormUserData.
 */
export type AddonModScormGetUserDataOptions = AddonModScormOfflineOptions & {
    scos?: AddonModScormWSSco[]; // SCOs returned by getScos. Recommended if offline=true.
};

/**
 * Options to pass to getScosWithData.
 */
export type AddonModScormGetScosWithDataOptions = AddonModScormOfflineOptions & AddonModScormOrganizationOptions;

/**
 * Result of getAttemptCount.
 */
export type AddonModScormAttemptCountResult = {
    online: number[]; // List of online attempts numbers.
    offline: number[]; // List of offline attempts numbers.
    total: number; // Total of unique attempts.
    lastAttempt: AddonModScormAttempt; // Last attempt in the SCORM: the number and whether it's offline.
};

/**
 * Data for an attempt: number and whether it's offline.
 */
export type AddonModScormAttempt = {
    num: number;
    offline: boolean;
};

/**
 * SCORM organization.
 */
export type AddonModScormOrganization = {
    identifier: string;
    title: string;
    sortorder: number;
};

/**
 * Grade data for an attempt.
 */
export type AddonModScormAttemptGrade = {
    num: number;
    score: number;
    hasCompletedPassedSCO: boolean; // Whether it has at least 1 SCO with status completed or passed.
};

/**
 * Grade for an online attempt.
 */
export type AddonModScormCommonEventData = {
    scormId: number;
    scoId: number;
    attempt: number;
};

/**
 * SCO icon data.
 */
export type AddonModScormScoIcon = {
    icon: string;
    description: string;
};

/**
 * Options to pass to getScoSrcForOnlinePlayer.
 */
export type AddonModScormGetScoSrcForOnlinePlayerOptions = {
    siteId?: string;
    mode?: string; // Navigation mode.
    organization?: string; // Organization ID.
    newAttempt?: boolean; // Whether to start a new attempt.
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_SCORM_LAUNCH_NEXT_SCO_EVENT]: AddonModScormCommonEventData;
        [ADDON_MOD_SCORM_LAUNCH_PREV_SCO_EVENT]: AddonModScormCommonEventData;
        [ADDON_MOD_SCORM_UPDATE_TOC_EVENT]: AddonModScormCommonEventData;
        [ADDON_MOD_SCORM_GO_OFFLINE_EVENT]: AddonModScormCommonEventData;
        [ADDON_MOD_SCORM_DATA_SENT_EVENT]: AddonModScormCommonEventData;
    }

}
