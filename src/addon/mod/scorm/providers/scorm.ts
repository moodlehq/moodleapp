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
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreWSProvider } from '@providers/ws';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUrlUtils } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModScormOfflineProvider } from './scorm-offline';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreConstants } from '@core/constants';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';

/**
 * Result of getAttemptCount.
 */
export interface AddonModScormAttemptCountResult {
    /**
     * List of online attempts numbers.
     */
    online?: number[];

    /**
     * List of offline attempts numbers.
     */
    offline?: number[];

    /**
     * Total of unique attempts.
     */
    total?: number;

    /**
     * Last attempt in the SCORM: the number and whether it's offline.
     */
    lastAttempt?: {number: number, offline: boolean};
}

/**
 * Service that provides some features for SCORM.
 */
@Injectable()
export class AddonModScormProvider {
    static COMPONENT = 'mmaModScorm';

    // Public constants.
    static GRADESCOES     = 0;
    static GRADEHIGHEST   = 1;
    static GRADEAVERAGE   = 2;
    static GRADESUM       = 3;

    static HIGHESTATTEMPT = 0;
    static AVERAGEATTEMPT = 1;
    static FIRSTATTEMPT   = 2;
    static LASTATTEMPT    = 3;

    static MODEBROWSE = 'browse';
    static MODENORMAL = 'normal';
    static MODEREVIEW = 'review';

    static SCORM_FORCEATTEMPT_NO         = 0;
    static SCORM_FORCEATTEMPT_ONCOMPLETE = 1;
    static SCORM_FORCEATTEMPT_ALWAYS     = 2;

    static SKIPVIEW_NEVER = 0;
    static SKIPVIEW_FIRST = 1;
    static SKIPVIEW_ALWAYS = 2;

    // Events.
    static LAUNCH_NEXT_SCO_EVENT = 'addon_mod_scorm_launch_next_sco';
    static LAUNCH_PREV_SCO_EVENT = 'addon_mod_scorm_launch_prev_sco';
    static UPDATE_TOC_EVENT = 'addon_mod_scorm_update_toc';
    static GO_OFFLINE_EVENT = 'addon_mod_scorm_go_offline';
    static DATA_SENT_EVENT = 'addon_mod_scorm_data_sent';

    // Protected constants.
    protected VALID_STATUSES = ['notattempted', 'passed', 'completed', 'failed', 'incomplete', 'browsed', 'suspend'];
    protected STATUSES = {
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
        'n': 'notattempted'
    };
    protected static STATUS_TO_ICON = {
        assetc: 'fa-file-archive-o',
        asset: 'fa-file-archive-o',
        browsed: 'fa-book',
        completed: 'fa-check-square-o',
        failed: 'fa-times',
        incomplete: 'fa-pencil-square-o',
        minus: 'fa-minus',
        notattempted: 'fa-square-o',
        passed: 'fa-check',
        plus: 'fa-plus',
        popdown: 'fa-window-close-o',
        popup: 'fa-window-restore',
        suspend: 'fa-pause',
        wait: 'fa-clock-o',
    };

    protected ROOT_CACHE_KEY = 'mmaModScorm:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private translate: TranslateService, private sitesProvider: CoreSitesProvider,
            private wsProvider: CoreWSProvider, private textUtils: CoreTextUtilsProvider, private utils: CoreUtilsProvider,
            private filepoolProvider: CoreFilepoolProvider, private scormOfflineProvider: AddonModScormOfflineProvider,
            private timeUtils: CoreTimeUtilsProvider, private syncProvider: CoreSyncProvider,
            private eventsProvider: CoreEventsProvider, private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModScormProvider');
    }

    /**
     * Calculates the SCORM grade based on the grading method and the list of attempts scores.
     * We only treat online attempts to calculate a SCORM grade.
     *
     * @param scorm SCORM.
     * @param onlineAttempts Object with the online attempts. Each attempt must have a property called "grade".
     * @return Grade. -1 if no grade.
     */
    calculateScormGrade(scorm: any, onlineAttempts: any): number {
        if (!onlineAttempts || !Object.keys(onlineAttempts).length) {
            return -1;
        }

        switch (scorm.whatgrade) {
            case AddonModScormProvider.FIRSTATTEMPT:
                return onlineAttempts[1] ? onlineAttempts[1].grade : -1;

            case AddonModScormProvider.LASTATTEMPT:
                // Search the last attempt number.
                let max = 0;
                Object.keys(onlineAttempts).forEach((attemptNumber) => {
                    max = Math.max(Number(attemptNumber), max);
                });

                if (max > 0) {
                    return onlineAttempts[max].grade;
                }

                return -1;

            case AddonModScormProvider.HIGHESTATTEMPT:
                // Search the highest grade.
                let grade = 0;
                for (const attemptNumber in onlineAttempts) {
                    grade = Math.max(onlineAttempts[attemptNumber].grade, grade);
                }

                return grade;

            case AddonModScormProvider.AVERAGEATTEMPT:
                // Calculate the average.
                let sumGrades = 0,
                    total = 0;

                for (const attemptNumber in onlineAttempts) {
                    sumGrades += onlineAttempts[attemptNumber].grade;
                    total++;
                }

                return Math.round(sumGrades / total);

            default:
                return -1;
        }
    }

    /**
     * Calculates the size of a SCORM.
     *
     * @param scorm SCORM.
     * @return Promise resolved with the SCORM size.
     */
    calculateScormSize(scorm: any): Promise<number> {
        if (scorm.packagesize) {
            return Promise.resolve(scorm.packagesize);
        }

        return this.wsProvider.getRemoteFileSize(this.getPackageUrl(scorm));
    }

    /**
     * Count the attempts left for the given scorm.
     *
     * @param scorm SCORM.
     * @param attemptsCount Number of attempts performed.
     * @return Number of attempts left.
     */
    countAttemptsLeft(scorm: any, attemptsCount: number): number {
        if (scorm.maxattempt == 0) {
            return Number.MAX_VALUE; // Unlimited attempts.
        }

        attemptsCount = Number(attemptsCount); // Make sure it's a number.
        if (isNaN(attemptsCount)) {
            return -1;
        }

        return scorm.maxattempt - attemptsCount;
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
     * @return Mode, attempt number and whether to start a new attempt.
     */
    determineAttemptAndMode(scorm: any, mode: string, attempt: number, newAttempt?: boolean, incomplete?: boolean)
            : {mode: string, attempt: number, newAttempt: boolean} {

        if (mode == AddonModScormProvider.MODEBROWSE) {
            if (scorm.hidebrowse) {
                // Prevent Browse mode if hidebrowse is set.
                mode = AddonModScormProvider.MODENORMAL;
            } else {
                // We don't need to check attempts as browse mode is set.
                if (attempt == 0) {
                    attempt = 1;
                    newAttempt = true;
                }

                return {
                    mode: mode,
                    attempt: attempt,
                    newAttempt: newAttempt
                };
            }
        }

        if (scorm.forcenewattempt == AddonModScormProvider.SCORM_FORCEATTEMPT_ALWAYS) {
            // This SCORM is configured to force a new attempt on every re-entry.
            return {
                mode: AddonModScormProvider.MODENORMAL,
                attempt: attempt + 1,
                newAttempt: true
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

        if (newAttempt && (scorm.maxattempt == 0 || attempt < scorm.maxattempt)) {
            // Create a new attempt. Force mode normal.
            attempt++;
            mode = AddonModScormProvider.MODENORMAL;
        } else {
            if (incomplete) {
                // We can't review an incomplete attempt.
                mode = AddonModScormProvider.MODENORMAL;
            } else {
                // We aren't starting a new attempt and the current one is complete, force review mode.
                mode = AddonModScormProvider.MODEREVIEW;
            }
        }

        return {
            mode: mode,
            attempt: attempt,
            newAttempt: newAttempt
        };
    }

    /**
     * Check if TOC should be displayed in the player.
     *
     * @param scorm SCORM.
     * @return Whether it should display TOC.
     */
    displayTocInPlayer(scorm: any): boolean {
        return scorm.hidetoc !== 3;
    }

    /**
     * This is a little language parser for AICC_SCRIPT.
     * Evaluates the expression and returns a boolean answer.
     * See 2.3.2.5.1. Sequencing/Navigation Today - from the SCORM 1.2 spec (CAM).
     *
     * @param prerequisites The AICC_SCRIPT prerequisites expression.
     * @param trackData The tracked user data of each SCO.
     * @return Whether the prerequisites are fulfilled.
     */
    evalPrerequisites(prerequisites: string, trackData: any): boolean {

        const stack = []; // List of prerequisites.

        // Expand the amp entities.
        prerequisites = prerequisites.replace(/&amp;/gi, '&');
        // Find all my parsable tokens.
        prerequisites = prerequisites.replace(/(&|\||\(|\)|\~)/gi, '\t$1\t');
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

                const re = /^(\d+)\*\{(.+)\}$/, // Sets like 3*{S34, S36, S37, S39}.
                    reOther = /^(.+)(\=|\<\>)(.+)$/; // Other symbols.
                let matches;

                if (re.test(element)) {
                    matches = element.match(re);

                    const repeat = matches[1],
                        set = matches[2].split(',');
                    let count = 0;

                    set.forEach((setElement) => {
                        setElement = setElement.trim();

                        if (typeof trackData[setElement] != 'undefined' &&
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
                    matches = element.match(reOther);
                    element = matches[1].trim();

                    if (typeof trackData[element] != 'undefined') {
                        let value = matches[3].trim().replace(/(\'|\")/gi),
                            oper;

                        if (typeof this.STATUSES[value] != 'undefined') {
                            value = this.STATUSES[value];
                        }

                        if (matches[2] == '<>') {
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
                    if (typeof trackData[element] != 'undefined' &&
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

        // tslint:disable: no-eval
        return eval(stack.join('') + ';');
    }

    /**
     * Formats a grade to be displayed.
     *
     * @param scorm SCORM.
     * @param grade Grade.
     * @return Grade to display.
     */
    formatGrade(scorm: any, grade: number): string {
        if (typeof grade == 'undefined' || grade == -1) {
            return this.translate.instant('core.none');
        }

        if (scorm.grademethod !== AddonModScormProvider.GRADESCOES && scorm.maxgrade > 0) {
            grade = (grade / scorm.maxgrade) * 100;

            return this.translate.instant('core.percentagenumber', {$a: this.textUtils.roundToDecimals(grade, 2)});
        }

        return String(grade);
    }

    /**
     * Formats a tree-like TOC into an array.
     *
     * @param toc SCORM's TOC (tree format).
     * @param level The level of the TOC we're right now. 0 by default.
     * @return SCORM's TOC (array format).
     */
    formatTocToArray(toc: any[], level: number = 0): any[] {
        if (!toc || !toc.length) {
            return [];
        }

        let formatted = [];

        toc.forEach((node) => {
            node.level = level;
            formatted.push(node);

            formatted = formatted.concat(this.formatTocToArray(node.children, level + 1));
        });

        return formatted;
    }

    /**
     * Get access information for a given SCORM.
     *
     * @param scormId SCORM ID.
     * @param forceCache True to always get the value from cache. false otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Object with access information.
     * @since 3.7
     */
    getAccessInformation(scormId: number, forceCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.wsAvailable('mod_scorm_get_scorm_access_information')) {
                // Access information not available for 3.6 or older sites.
                return Promise.resolve({});
            }

            const params = {
                scormid: scormId
            };
            const preSets = {
                cacheKey: this.getAccessInformationCacheKey(scormId),
                omitExpires: forceCache
            };

            return site.read('mod_scorm_get_scorm_access_information', params, preSets);
        });
    }

    /**
     * Get cache key for access information WS calls.
     *
     * @param scormId SCORM ID.
     * @return Cache key.
     */
    protected getAccessInformationCacheKey(scormId: number): string {
        return this.ROOT_CACHE_KEY + 'accessInfo:' + scormId;
    }

    /**
     * Get the number of attempts done by a user in the given SCORM.
     *
     * @param scormId SCORM ID.
     * @param ignoreMissing Whether it should ignore attempts without grade/completion. Only for online attempts.
     * @param ignoreCache Whether it should ignore cached data for online attempts.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @return Promise resolved when done.
     */
    getAttemptCount(scormId: number, ignoreMissing?: boolean, ignoreCache?: boolean, siteId?: string, userId?: number)
            : Promise<AddonModScormAttemptCountResult> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const result: AddonModScormAttemptCountResult = {
                    lastAttempt: {
                        number: 0,
                        offline: false
                    }
                },
                promises = [];

            promises.push(this.getAttemptCountOnline(scormId, ignoreMissing, ignoreCache, siteId, userId).then((count) => {

                // Calculate numbers of online attempts.
                result.online = [];

                for (let i = 1; i <= count; i++) {
                    result.online.push(i);
                }

                // Calculate last attempt.
                if (count > result.lastAttempt.number) {
                    result.lastAttempt.number = count;
                    result.lastAttempt.offline = false;
                }
            }));

            promises.push(this.scormOfflineProvider.getAttempts(scormId, siteId, userId).then((attempts) => {
                // Get only attempt numbers.
                result.offline = attempts.map((entry) => {
                    // Calculate last attempt. We use >= to prioritize offline events if an attempt is both online and offline.
                    if (entry.attempt >= result.lastAttempt.number) {
                        result.lastAttempt.number = entry.attempt;
                        result.lastAttempt.offline = true;
                    }

                    return entry.attempt;
                });
            }));

            return Promise.all(promises).then(() => {
                let total = result.online.length;

                result.offline.forEach((attempt) => {
                    // Check if this attempt also exists in online, it might have been copied to local.
                    if (result.online.indexOf(attempt) == -1) {
                        total++;
                    }
                });

                result.total = total;

                return result;
            });
        });
    }

    /**
     * Get cache key for SCORM attempt count WS calls.
     *
     * @param scormId SCORM ID.
     * @param userId User ID. If not defined, current user.
     * @return Cache key.
     */
    protected getAttemptCountCacheKey(scormId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'attemptcount:' + scormId + ':' + userId;
    }

    /**
     * Get the number of attempts done by a user in the given SCORM in online.
     *
     * @param scormId SCORM ID.
     * @param ignoreMissing Whether it should ignore attempts that haven't reported a grade/completion.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @return Promise resolved when the attempt count is retrieved.
     */
    getAttemptCountOnline(scormId: number, ignoreMissing?: boolean, ignoreCache?: boolean, siteId?: string, userId?: number)
            : Promise<number> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    scormid: scormId,
                    userid: userId,
                    ignoremissingcompletion: ignoreMissing ? 1 : 0
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAttemptCountCacheKey(scormId, userId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_scorm_get_scorm_attempt_count', params, preSets).then((response) => {
                if (response && typeof response.attemptscount != 'undefined') {
                    return response.attemptscount;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get the grade for a certain SCORM and attempt.
     * Based on Moodle's scorm_grade_user_attempt.
     *
     * @param scorm SCORM.
     * @param attempt Attempt number.
     * @param offline Whether the attempt is offline.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the grade. If the attempt hasn't reported grade/completion, it will be -1.
     */
    getAttemptGrade(scorm: any, attempt: number, offline?: boolean, siteId?: string): Promise<number> {
        const attemptScore = {
            scos: 0,
            values: 0,
            max: 0,
            sum: 0
        };

        // Get the user data and use it to calculate the grade.
        return this.getScormUserData(scorm.id, attempt, undefined, offline, false, siteId).then((data) => {
            for (const scoId in data) {
                const sco = data[scoId],
                    userData = sco.userdata;

                if (userData.status == 'completed' || userData.status == 'passed') {
                    attemptScore.scos++;
                }

                if (userData.score_raw || (typeof scorm.scormtype != 'undefined' &&
                            scorm.scormtype == 'sco' && typeof userData.score_raw != 'undefined')) {

                    const scoreRaw = parseFloat(userData.score_raw);
                    attemptScore.values++;
                    attemptScore.sum += scoreRaw;
                    attemptScore.max = Math.max(scoreRaw, attemptScore.max);
                }
            }

            let score = 0;

            switch (scorm.grademethod) {
                case AddonModScormProvider.GRADEHIGHEST:
                    score = attemptScore.max;
                    break;

                case AddonModScormProvider.GRADEAVERAGE:
                    if (attemptScore.values > 0) {
                        score = attemptScore.sum / attemptScore.values;
                    } else {
                        score = 0;
                    }
                    break;

                case AddonModScormProvider.GRADESUM:
                    score = attemptScore.sum;
                    break;

                case AddonModScormProvider.GRADESCOES:
                    score = attemptScore.scos;
                    break;

                default:
                    score = attemptScore.max; // Remote Learner GRADEHIGHEST is default.
            }

            return score;
        });
    }

    /**
     * Get the list of a organizations defined in a SCORM package.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of organizations.
     */
    getOrganizations(scormId: number, siteId?: string): Promise<any[]> {
        return this.getScos(scormId, undefined, false, siteId).then((scos) => {
            const organizations = [];

            scos.forEach((sco) => {
                // Is an organization entry?
                if (sco.organization == '' && sco.parent == '/' && sco.scormtype == '') {
                    organizations.push({
                        identifier: sco.identifier,
                        title: sco.title,
                        sortorder: sco.sortorder
                    });
                }
            });

            return organizations;
        });
    }

    /**
     * Get the organization Toc any
     *
     * @param scormId SCORM ID.
     * @param attempt The attempt number (to populate SCO track data).
     * @param organization Organization identifier.
     * @param offline Whether the attempt is offline.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the toc object.
     */
    getOrganizationToc(scormId: number, attempt: number, organization?: string, offline?: boolean, siteId?: string)
            : Promise<any[]> {

        return this.getScosWithData(scormId, attempt, organization, offline, false, siteId).then((scos) => {
            const map = {},
                rootScos = [];

            scos.forEach((sco, index) => {
                sco.children = [];
                map[sco.identifier] = index;

                if (sco.parent !== '/') {
                    if (sco.parent == organization) {
                        // It's a root SCO, add it to the root array.
                        rootScos.push(sco);
                    } else {
                        // Add this sco to the parent.
                        scos[map[sco.parent]].children.push(sco);
                    }
                }
            });

            return rootScos;
        });
    }

    /**
     * Get the package URL of a given SCORM.
     *
     * @param scorm SCORM.
     * @return Package URL.
     */
    getPackageUrl(scorm: any): string {
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
     * @param scos SCOs returned by getScos. Recommended if offline=true.
     * @param offline Whether the attempt is offline.
     * @param ignoreCache Whether it should ignore cached data for online attempts.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the user data is retrieved.
     */
    getScormUserData(scormId: number, attempt: number, scos?: any[], offline?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (offline) {
            // Get SCOs if not provided.
            const promise = scos ? Promise.resolve(scos) : this.getScos(scormId, undefined, undefined, siteId);

            return promise.then((scos) => {
                return this.scormOfflineProvider.getScormUserData(scormId, attempt, scos, siteId);
            });
        } else {
            return this.getScormUserDataOnline(scormId, attempt, ignoreCache, siteId);
        }
    }

    /**
     * Get cache key for SCORM user data WS calls.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @return Cache key.
     */
    protected getScormUserDataCacheKey(scormId: number, attempt: number): string {
        return this.getScormUserDataCommonCacheKey(scormId) + ':' + attempt;
    }

    /**
     * Get common cache key for SCORM user data WS calls.
     *
     * @param scormId SCORM ID.
     * @return Cache key.
     */
    protected getScormUserDataCommonCacheKey(scormId: number): string {
        return this.ROOT_CACHE_KEY + 'userdata:' + scormId;
    }

    /**
     * Get the user data for a certain SCORM and attempt in online.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the user data is retrieved.
     */
    getScormUserDataOnline(scormId: number, attempt: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    scormid: scormId,
                    attempt: attempt
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getScormUserDataCacheKey(scormId, attempt)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_scorm_get_scorm_user_data', params, preSets).then((response) => {
                if (response && response.data) {
                    // Format the response.
                    const data = {};

                    response.data.forEach((sco) => {
                        sco.defaultdata = this.utils.objectToKeyValueMap(sco.defaultdata, 'element', 'value');
                        sco.userdata = this.utils.objectToKeyValueMap(sco.userdata, 'element', 'value');

                        data[sco.scoid] = sco;
                    });

                    return data;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get SCORM scos WS calls.
     *
     * @param scormId SCORM ID.
     * @return Cache key.
     */
    protected getScosCacheKey(scormId: number): string {
        return this.ROOT_CACHE_KEY + 'scos:' + scormId;
    }

    /**
     * Retrieves the list of SCO objects for a given SCORM and organization.
     *
     * @param scormId SCORM ID.
     * @param organization Organization.
     * @param ignoreCache Whether it should ignore cached data (it will always fail if offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with a list of SCO.
     */
    getScos(scormId: number, organization?: string, ignoreCache?: boolean, siteId?: string): Promise<any[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {

            // Don't send the organization to the WS, we'll filter them locally.
            const params = {
                    scormid: scormId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getScosCacheKey(scormId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_scorm_get_scorm_scoes', params, preSets).then((response) => {

                if (response && response.scoes) {
                    if (organization) {
                        // Filter SCOs by organization.
                        return response.scoes.filter((sco) => {
                            return sco.organization == organization;
                        });
                    } else {
                        return response.scoes;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Retrieves the list of SCO objects for a given SCORM and organization, including data about
     * a certain attempt (status, isvisible, ...).
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param organization Organization ID.
     * @param offline Whether the attempt is offline.
     * @param ignoreCache Whether it should ignore cached data for online attempts.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with a list of SCO objects.
     */
    getScosWithData(scormId: number, attempt: number, organization?: string, offline?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<any[]> {

        // Get organization SCOs.
        return this.getScos(scormId, organization, ignoreCache, siteId).then((scos) => {
            // Get the track data for all the SCOs in the organization for the given attempt.
            // We'll use this data to set SCO data like isvisible, status and so.
            return this.getScormUserData(scormId, attempt, scos, offline, ignoreCache, siteId).then((data) => {

                const trackDataBySCO = {};

                // First populate trackDataBySCO to index by SCO identifier.
                // We want the full list first because it's needed by evalPrerequisites.
                scos.forEach((sco) => {
                    trackDataBySCO[sco.identifier] = data[sco.id].userdata;
                });

                scos.forEach((sco) => {
                    // Add specific SCO information (related to tracked data).
                    const scoData = data[sco.id].userdata;

                    if (!scoData) {
                        return;
                    }

                    // Check isvisible attribute.
                    sco.isvisible = typeof scoData.isvisible == 'undefined' || (scoData.isvisible && scoData.isvisible !== 'false');
                    // Check pre-requisites status.
                    sco.prereq = typeof scoData.prerequisites == 'undefined' ||
                                            this.evalPrerequisites(scoData.prerequisites, trackDataBySCO);
                    // Add status.
                    sco.status = (typeof scoData.status == 'undefined' || scoData.status === '') ?
                                            'notattempted' : scoData.status;
                    // Exit var.
                    sco.exitvar = typeof scoData.exitvar == 'undefined' ? 'cmi.core.exit' : scoData.exitvar;
                    sco.exitvalue = scoData[sco.exitvar];

                    // Copy score.
                    sco.score_raw = scoData.score_raw;
                });

                return scos;
            });
        });
    }

    /**
     * Given a SCORM and a SCO, returns the full launch URL for the SCO.
     *
     * @param scorm SCORM.
     * @param sco SCO.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the URL.
     */
    getScoSrc(scorm: any, sco: any, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Build the launch URL. Moodle web checks SCORM version, we don't need to, it's always SCORM 1.2.
        let launchUrl = sco.launch,
            parameters;

        if (sco.extradata && sco.extradata.length) {
            for (let i = 0; i < sco.extradata.length; i++) {
                const entry = sco.extradata[i];

                if (entry.element == 'parameters') {
                    parameters = entry.value;
                    break;
                }
            }
        }

        if (parameters) {
            const connector = launchUrl.indexOf('?') > -1 ? '&' : '?';
            if (parameters.charAt(0) == '?') {
                parameters = parameters.substr(1);
            }

            launchUrl += connector + parameters;
        }

        if (this.isExternalLink(launchUrl)) {
            // It's an online URL.
            return Promise.resolve(launchUrl);
        }

        return this.filepoolProvider.getPackageDirUrlByUrl(siteId, scorm.moduleurl).then((dirPath) => {
            return this.textUtils.concatenatePaths(dirPath, launchUrl);
        });
    }

    /**
     * Get the path to the folder where a SCORM is downloaded.
     *
     * @param moduleUrl Module URL (returned by get_course_contents).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the folder path.
     */
    getScormFolder(moduleUrl: string, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.filepoolProvider.getPackageDirPathByUrl(siteId, moduleUrl);
    }

    /**
     * Gets a list of files to downlaod for a SCORM, using a format similar to module.contents from get_course_contents.
     * It will only return one file: the ZIP package.
     *
     * @param scorm SCORM.
     * @return File list.
     */
    getScormFileList(scorm: any): any[] {
        const files = [];

        if (!this.isScormUnsupported(scorm) && !scorm.warningMessage) {
            files.push({
                fileurl: this.getPackageUrl(scorm),
                filepath: '/',
                filename: scorm.reference,
                filesize: scorm.packagesize,
                type: 'file',
                timemodified: 0
            });
        }

        return files;
    }

    /**
     * Get the URL and description of the status icon.
     *
     * @param sco SCO.
     * @param incomplete Whether the SCORM is incomplete.
     * @return Image URL and description.
     */
    getScoStatusIcon(sco: any, incomplete?: boolean): {icon: string, description: string} {
        let imageName = '',
            descName = '',
            suspendedStr = '';

        const status = sco.status;

        if (sco.isvisible) {
            if (this.VALID_STATUSES.indexOf(status) >= 0) {
                if (sco.scormtype == 'sco') {
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
                    suspendedStr = ' - ' + this.translate.instant('addon.mod_scorm.suspended');
                }
            } else {
                incomplete = true;

                if (sco.scormtype == 'sco') {
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
            icon: AddonModScormProvider.STATUS_TO_ICON[imageName],
            description: this.translate.instant('addon.mod_scorm.' + descName) + suspendedStr
        };
    }

    /**
     * Get cache key for SCORM data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getScormDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'scorm:' + courseId;
    }

    /**
     * Get a SCORM with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param moduleUrl Module URL.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the SCORM is retrieved.
     */
    protected getScormByField(courseId: number, key: string, value: any, moduleUrl?: string, forceCache?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getScormDataCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_scorm_get_scorms_by_courses', params, preSets).then((response) => {
                if (response && response.scorms) {
                    const currentScorm = response.scorms.find((scorm) => {
                        return scorm[key] == value;
                    });

                    if (currentScorm) {
                        // If the SCORM isn't available the WS returns a warning and it doesn't return timeopen and timeclosed.
                        if (typeof currentScorm.timeopen == 'undefined') {
                            for (const i in response.warnings) {
                                const warning = response.warnings[i];
                                if (warning.itemid === currentScorm.id) {
                                    currentScorm.warningMessage = warning.message;
                                    break;
                                }
                            }
                        }

                        currentScorm.moduleurl = moduleUrl;

                        return currentScorm;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a SCORM by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param moduleUrl Module URL.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the SCORM is retrieved.
     */
    getScorm(courseId: number, cmId: number, moduleUrl?: string, forceCache?: boolean, siteId?: string): Promise<any> {
        return this.getScormByField(courseId, 'coursemodule', cmId, moduleUrl, forceCache, siteId);
    }

    /**
     * Get a SCORM by SCORM ID.
     *
     * @param courseId Course ID.
     * @param id SCORM ID.
     * @param moduleUrl Module URL.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the SCORM is retrieved.
     */
    getScormById(courseId: number, id: number, moduleUrl?: string, forceCache?: boolean, siteId?: string): Promise<any> {
        return this.getScormByField(courseId, 'id', id, moduleUrl, forceCache, siteId);
    }

    /**
     * Get a readable SCORM grade method.
     *
     * @param scorm SCORM.
     * @return Grading method.
     */
    getScormGradeMethod(scorm: any): string {
        if (scorm.maxattempt == 1) {
            switch (parseInt(scorm.grademethod, 10)) {
                case AddonModScormProvider.GRADEHIGHEST:
                    return this.translate.instant('addon.mod_scorm.gradehighest');

                case AddonModScormProvider.GRADEAVERAGE:
                    return this.translate.instant('addon.mod_scorm.gradeaverage');

                case AddonModScormProvider.GRADESUM:
                    return this.translate.instant('addon.mod_scorm.gradesum');

                case AddonModScormProvider.GRADESCOES:
                    return this.translate.instant('addon.mod_scorm.gradescoes');
                default:
                    return '';
            }
        } else {
            switch (parseInt(scorm.whatgrade, 10)) {
                case AddonModScormProvider.HIGHESTATTEMPT:
                    return this.translate.instant('addon.mod_scorm.highestattempt');

                case AddonModScormProvider.AVERAGEATTEMPT:
                    return this.translate.instant('addon.mod_scorm.averageattempt');

                case AddonModScormProvider.FIRSTATTEMPT:
                    return this.translate.instant('addon.mod_scorm.firstattempt');

                case AddonModScormProvider.LASTATTEMPT:
                    return this.translate.instant('addon.mod_scorm.lastattempt');
                default:
                    return '';
            }
        }
    }

    /**
     * Invalidates access information.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAccessInformation(scormId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(scormId));
        });
    }

    /**
     * Invalidates all the data related to a certain SCORM.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllScormData(scormId: number, siteId?: string, userId?: number): Promise<any> {
        const promises = [];

        promises.push(this.invalidateAttemptCount(scormId, siteId, userId));
        promises.push(this.invalidateScos(scormId, siteId));
        promises.push(this.invalidateScormUserData(scormId, siteId));
        promises.push(this.invalidateAccessInformation(scormId, siteId));

        return Promise.all(promises);
    }

    /**
     * Invalidates attempt count.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAttemptCount(scormId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getAttemptCountCacheKey(scormId, userId));
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string, userId?: number): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getScorm(courseId, moduleId, undefined, false, siteId).then((scorm) => {
            const promises = [];

            promises.push(this.invalidateAllScormData(scorm.id, siteId, userId));
            promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModScormProvider.COMPONENT,
                    moduleId, true));

            return Promise.all(promises);
        });
    }

    /**
     * Invalidates SCORM data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateScormData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getScormDataCacheKey(courseId));
        });
    }

    /**
     * Invalidates SCORM user data for all attempts.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateScormUserData(scormId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getScormUserDataCommonCacheKey(scormId));
        });
    }

    /**
     * Invalidates SCORM scos for all organizations.
     *
     * @param scormId SCORM ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateScos(scormId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getScosCacheKey(scormId));
        });
    }

    /**
     * Check if a SCORM's attempt is incomplete.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt.
     * @param offline Whether the attempt is offline.
     * @param ignoreCache Whether it should ignore cached data for online attempts.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with a boolean: true if incomplete, false otherwise.
     */
    isAttemptIncomplete(scormId: number, attempt: number, offline?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<boolean> {

        return this.getScosWithData(scormId, attempt, undefined, offline, ignoreCache, siteId).then((scos) => {

            for (const i in scos) {
                const sco = scos[i];

                // Ignore SCOs not visible or without launch URL.
                if (sco.isvisible && sco.launch) {
                    if (this.isStatusIncomplete(sco.status)) {
                        return true;
                    }
                }
            }

            return false;
        });
    }

    /**
     * Given a launch URL, check if it's a external link.
     * Based on Moodle's scorm_external_link.
     *
     * @param link Link to check.
     * @return Whether it's an external link.
     */
    protected isExternalLink(link: string): boolean {
        link = link.toLowerCase();

        if (link.match(/^https?:\/\//i) && !CoreUrlUtils.instance.isLocalFileUrl(link)) {
            return true;
        } else if (link.substr(0, 4) == 'www.') {
            return true;
        }

        return false;
    }

    /**
     * Check if the given SCORM is closed.
     *
     * @param scorm SCORM to check.
     * @return Whether the SCORM is closed.
     */
    isScormClosed(scorm: any): boolean {
        const timeNow = this.timeUtils.timestamp();

        if (scorm.timeclose > 0 && timeNow > scorm.timeclose) {
            return true;
        }

        return false;
    }

    /**
     * Check if the given SCORM is downloadable.
     *
     * @param scorm SCORM to check.
     * @return Whether the SCORM is downloadable.
     */
    isScormDownloadable(scorm: any): boolean {
        return typeof scorm.protectpackagedownloads != 'undefined' && scorm.protectpackagedownloads === false;
    }

    /**
     * Check if the given SCORM is open.
     *
     * @param scorm SCORM to check.
     * @return Whether the SCORM is open.
     */
    isScormOpen(scorm: any): boolean {
        const timeNow = this.timeUtils.timestamp();

        if (scorm.timeopen > 0 && scorm.timeopen > timeNow) {
            return false;
        }

        return true;
    }

    /**
     * Check if a SCORM is unsupported in the app. If it's not, returns the error code to show.
     *
     * @param scorm SCORM to check.
     * @return String with error code if unsupported, undefined if supported.
     */
    isScormUnsupported(scorm: any): string {
        if (!this.isScormValidVersion(scorm)) {
            return 'addon.mod_scorm.errorinvalidversion';
        } else if (!this.isScormDownloadable(scorm)) {
            return 'addon.mod_scorm.errornotdownloadable';
        } else if (!this.isValidPackageUrl(this.getPackageUrl(scorm))) {
            return 'addon.mod_scorm.errorpackagefile';
        }
    }

    /**
     * Check if it's a valid SCORM 1.2.
     *
     * @param scorm SCORM to check.
     * @return Whether the SCORM is valid.
     */
    isScormValidVersion(scorm: any): boolean {
        return scorm.version == 'SCORM_1.2';
    }

    /**
     * Check if a SCO status is incomplete.
     *
     * @param status SCO status.
     * @return Whether it's incomplete.
     */
    isStatusIncomplete(status: any): boolean {
        return !status || status == 'notattempted' || status == 'incomplete' || status == 'browsed';
    }

    /**
     * Check if a package URL is valid.
     *
     * @param packageUrl Package URL.
     * @return Whether it's valid.
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
     * @param name Name of the SCORM.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logLaunchSco(scormId: number, scoId: number, name?: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                scormid: scormId,
                scoid: scoId
            };

            return this.logHelper.logSingle('mod_scorm_launch_sco', params, AddonModScormProvider.COMPONENT, scormId, name,
                    'scorm', {scoid: scoId}, siteId);
        });
    }

    /**
     * Report a SCORM as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the SCORM.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            scormid: id
        };

        return this.logHelper.logSingle('mod_scorm_view_scorm', params, AddonModScormProvider.COMPONENT, id, name, 'scorm', {},
                siteId);
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
     * @return Promise resolved when data is saved.
     */
    saveTracks(scoId: number, attempt: number, tracks: any[], scorm: any, offline?: boolean, userData?: any, siteId?: string)
            : Promise<any> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (offline) {
            const promise = userData ? Promise.resolve(userData) : this.getScormUserData(scorm.id, attempt, undefined, offline,
                    false, siteId);

            return promise.then((userData) => {
                return this.scormOfflineProvider.saveTracks(scorm, scoId, attempt, tracks, userData, siteId);
            });
        } else {
            return this.saveTracksOnline(scorm.id, scoId, attempt, tracks, siteId).then(() => {
                // Tracks have been saved, update cached user data.
                this.updateUserDataAfterSave(scorm.id, attempt, tracks, siteId);

                this.eventsProvider.trigger(AddonModScormProvider.DATA_SENT_EVENT, {
                    scormId: scorm.id,
                    scoId: scoId,
                    attempt: attempt
                }, this.sitesProvider.getCurrentSiteId());
            });
        }
    }

    /**
     * Saves a SCORM tracking record.
     *
     * @param scormId SCORM ID.
     * @param scoId Sco ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is saved.
     */
    saveTracksOnline(scormId: number, scoId: number, attempt: number, tracks: any[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!tracks || !tracks.length) {
                return Promise.resolve(); // Nothing to save.
            }

            const params = {
                scoid: scoId,
                attempt: attempt,
                tracks: tracks
            };

            this.syncProvider.blockOperation(AddonModScormProvider.COMPONENT, scormId, 'saveTracksOnline', site.id);

            return site.write('mod_scorm_insert_scorm_tracks', params).then((response) => {
                if (response && response.trackids) {
                    return response.trackids;
                }

                return Promise.reject(null);
            }).finally(() => {
                this.syncProvider.unblockOperation(AddonModScormProvider.COMPONENT, scormId, 'saveTracksOnline', site.id);
            });
        });
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
     * @return In online returns true if data is inserted, false otherwise.
     *         In offline returns true if data to insert is valid, false otherwise. True doesn't mean that the
     *         data has been stored, this function can return true but the insertion can still fail somehow.
     */
    saveTracksSync(scoId: number, attempt: number, tracks: any[], scorm: any, offline?: boolean, userData?: any): boolean {
        if (offline) {
            return this.scormOfflineProvider.saveTracksSync(scorm, scoId, attempt, tracks, userData);
        } else {
            const success = this.saveTracksSyncOnline(scoId, attempt, tracks);

            if (success) {
                // Tracks have been saved, update cached user data.
                this.updateUserDataAfterSave(scorm.id, attempt, tracks);

                this.eventsProvider.trigger(AddonModScormProvider.DATA_SENT_EVENT, {
                    scormId: scorm.id,
                    scoId: scoId,
                    attempt: attempt
                }, this.sitesProvider.getCurrentSiteId());
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
     * @return True if success, false otherwise.
     */
    saveTracksSyncOnline(scoId: number, attempt: number, tracks: any[]): boolean {
        const params = {
                scoid: scoId,
                attempt: attempt,
                tracks: tracks
            },
            currentSite = this.sitesProvider.getCurrentSite(),
            preSets = {
                siteUrl: currentSite.getURL(),
                wsToken: currentSite.getToken()
            };
        let wsFunction = 'mod_scorm_insert_scorm_tracks',
            response;

        if (!tracks || !tracks.length) {
            return true; // Nothing to save.
        }

        // Check if the method is available, use a prefixed version if possible.
        if (!currentSite.wsAvailable(wsFunction, false)) {
            if (currentSite.wsAvailable(CoreConstants.WS_PREFIX + wsFunction, false)) {
                wsFunction = CoreConstants.WS_PREFIX + wsFunction;
            } else {
                this.logger.error('WS function "' + wsFunction + '" is not available, even in compatibility mode.');

                return false;
            }
        }

        response = this.wsProvider.syncCall(wsFunction, params, preSets);
        if (response && !response.error && response.trackids) {
            return true;
        }

        return false;
    }

    /**
     * Check if the SCORM main file should be downloaded.
     * This function should only be called if the SCORM can be downloaded (not downloaded or outdated).
     *
     * @param scorm SCORM to check.
     * @param isOutdated True if package outdated, false if not downloaded, undefined to calculate it.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if it should be downloaded, false otherwise.
     */
    shouldDownloadMainFile(scorm: any, isOutdated?: boolean, siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const component = AddonModScormProvider.COMPONENT;

        if (typeof isOutdated == 'undefined') {

            // Calculate if it's outdated.
            return this.filepoolProvider.getPackageData(siteId, component, scorm.coursemodule).then((data) => {
                const isOutdated = data.status == CoreConstants.OUTDATED ||
                        (data.status == CoreConstants.DOWNLOADING && data.previous == CoreConstants.OUTDATED);

                // Package needs to be downloaded if it's not outdated (not downloaded) or if the hash has changed.
                return !isOutdated || data.extra != scorm.sha1hash;
            }).catch(() => {
                // Package not found, not downloaded.
                return true;
            });
        } else if (isOutdated) {

            // The package is outdated, but maybe the file hasn't changed.
            return this.filepoolProvider.getPackageExtra(siteId, component, scorm.coursemodule).then((extra) => {
                return scorm.sha1hash != extra;
            }).catch(() => {
                // Package not found, not downloaded.
                return true;
            });
        } else {
            // Package is not outdated and not downloaded, download the main file.
            return Promise.resolve(true);
        }
    }

    /**
     * If needed, updates cached user data after saving tracks in online.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param tracks Tracking data saved.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when updated.
     */
    protected updateUserDataAfterSave(scormId: number, attempt: number, tracks: any[], siteId?: string): Promise<any> {
        if (!tracks || !tracks.length) {
            return Promise.resolve();
        }

        // Check if we need to update. We only update if we sent some track with a dot notation.
        let needsUpdate = false;
        for (let i = 0, len = tracks.length; i < len; i++) {
            const track = tracks[i];
            if (track.element && track.element.indexOf('.') > -1) {
                needsUpdate = true;
                break;
            }
        }

        if (needsUpdate) {
            return this.getScormUserDataOnline(scormId, attempt, true, siteId);
        }

        return Promise.resolve();
    }
}
