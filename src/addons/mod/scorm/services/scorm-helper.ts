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
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@singletons/utils';
import { makeSingleton, Translate } from '@singletons';
import {
    AddonModScorm,
    AddonModScormAttempt,
    AddonModScormAttemptCountResult,
    AddonModScormDataValue,
    AddonModScormGetScosWithDataOptions,
    AddonModScormScoIcon,
    AddonModScormScorm,
    AddonModScormScoWithData,
    AddonModScormTOCListSco,
    AddonModScormUserDataMap,
} from './scorm';
import { AddonModScormOffline } from './scorm-offline';
import { AddonModScormMode } from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';

// List of elements we want to ignore when copying attempts (they're calculated).
const elementsToIgnore = [
    'status', 'score_raw', 'total_time', 'session_time', 'student_id', 'student_name', 'credit', 'mode', 'entry',
];

/**
 * Helper service that provides some features for SCORM.
 */
@Injectable({ providedIn: 'root' })
export class AddonModScormHelperProvider {

    /**
     * Show a confirm dialog if needed. If SCORM doesn't have size, try to calculate it.
     *
     * @param scorm SCORM to download.
     * @param isOutdated True if package outdated, false if not outdated, undefined to calculate it.
     * @returns Promise resolved if the user confirms or no confirmation needed.
     */
    async confirmDownload(scorm: AddonModScormScorm, isOutdated?: boolean): Promise<void> {
        // Check if file should be downloaded.
        const download = await AddonModScorm.shouldDownloadMainFile(scorm, isOutdated);

        if (!download) {
            // No need to download main file, no need to confirm.
            return;
        }

        let size = scorm.packagesize;

        if (!size) {
            // We don't have package size, try to calculate it.
            size = await AddonModScorm.calculateScormSize(scorm);

            // Store it so we don't have to calculate it again when using the same object.
            scorm.packagesize = size;
        }

        return CoreAlerts.confirmDownloadSize({ size: size, total: true });
    }

    /**
     * Creates a new offline attempt based on an existing online attempt.
     *
     * @param scorm SCORM.
     * @param attempt Number of the online attempt.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the attempt is created.
     */
    async convertAttemptToOffline(scorm: AddonModScormScorm, attempt: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Get data from the online attempt.
        const onlineData = await CorePromiseUtils.ignoreErrors(
            AddonModScorm.getScormUserData(scorm.id, attempt, { cmId: scorm.coursemodule, siteId }),
        );

        if (!onlineData) {
            // Shouldn't happen.
            throw new CoreError(Translate.instant('addon.mod_scorm.errorcreateofflineattempt'));
        }

        // The SCORM API might have written some data to the offline attempt already.
        // We don't want to override it with cached online data.
        const offlineData = await CorePromiseUtils.ignoreErrors(
            AddonModScormOffline.getScormUserData(scorm.id, attempt, undefined, siteId),
        );

        const dataToStore = CoreUtils.clone(onlineData);

        // Filter the data to copy.
        for (const scoId in dataToStore) {
            const sco = dataToStore[scoId];

            // Delete calculated data.
            elementsToIgnore.forEach((el) => {
                delete sco.userdata[el];
            });

            // Don't override offline data.
            if (offlineData && offlineData[sco.scoid] && offlineData[sco.scoid].userdata) {
                const scoUserData: Record<string, AddonModScormDataValue> = {};

                for (const element in sco.userdata) {
                    if (!offlineData[sco.scoid].userdata[element]) {
                        // This element is not stored in offline, we can save it.
                        scoUserData[element] = sco.userdata[element];
                    }
                }

                sco.userdata = scoUserData;
            }
        }

        await AddonModScormOffline.createNewAttempt(scorm, attempt, dataToStore, onlineData, siteId);
    }

    /**
     * Creates a new offline attempt.
     *
     * @param scorm SCORM.
     * @param newAttempt Number of the new attempt.
     * @param lastOnline Number of the last online attempt.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the attempt is created.
     */
    async createOfflineAttempt(scorm: AddonModScormScorm, newAttempt: number, lastOnline: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Try to get data from online attempts.
        const userData = await CorePromiseUtils.ignoreErrors(
            this.searchOnlineAttemptUserData(scorm.id, lastOnline, { cmId: scorm.coursemodule, siteId }),
        );

        if (!userData) {
            throw new CoreError(Translate.instant('addon.mod_scorm.errorcreateofflineattempt'));
        }

        // We're creating a new attempt, remove all the user data that is not needed for a new attempt.
        for (const scoId in userData) {
            const sco = userData[scoId];
            const filtered: Record<string, AddonModScormDataValue> = {};

            for (const element in sco.userdata) {
                if (element.indexOf('.') == -1 && elementsToIgnore.indexOf(element) == -1) {
                    // The element doesn't use a dot notation, probably SCO data.
                    filtered[element] = sco.userdata[element];
                }
            }

            sco.userdata = filtered;
        }

        return AddonModScormOffline.createNewAttempt(scorm, newAttempt, userData, undefined, siteId);
    }

    /**
     * Determines the attempt to continue/review. It will be:
     * - The last incomplete online attempt if it hasn't been continued in offline and all offline attempts are complete.
     * - The attempt with highest number without surpassing max attempts otherwise.
     *
     * @param scorm SCORM object.
     * @param attempts Attempts count.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the attempt data.
     */
    async determineAttemptToContinue(
        scorm: AddonModScormScorm,
        attempts: AddonModScormAttemptCountResult,
        siteId?: string,
    ): Promise<AddonModScormAttempt> {

        let lastOnline: number | undefined;

        // Get last online attempt.
        if (attempts.online.length) {
            lastOnline = Math.max.apply(Math, attempts.online);
        }

        if (!lastOnline) {
            return this.getLastBeforeMax(scorm, attempts);
        }

        // Check if last online incomplete.
        const hasOffline = attempts.offline.indexOf(lastOnline) > -1;

        const incomplete = await AddonModScorm.isAttemptIncomplete(scorm.id, lastOnline, {
            offline: hasOffline,
            cmId: scorm.coursemodule,
            siteId,
        });

        if (incomplete) {
            return {
                num: lastOnline,
                offline: hasOffline,
            };
        } else {
            return this.getLastBeforeMax(scorm, attempts);
        }
    }

    /**
     * Get the first SCO to load in a SCORM: the first valid and incomplete SCO.
     *
     * @param scormId Scorm ID.
     * @param attempt Attempt number.
     * @param options Other options.
     * @returns Promise resolved with the first SCO.
     */
    async getFirstSco(
        scormId: number,
        attempt: number,
        options: AddonModScormGetFirstScoOptions = {},
    ): Promise<AddonModScormScoWithData | undefined> {

        const mode = options.mode || AddonModScormMode.NORMAL;
        const isNormalMode = mode === AddonModScormMode.NORMAL;

        let scos = options.toc;
        if (!scos || !scos.length) {
            // SCORM doesn't have a TOC. Get all the scos.
            scos = await AddonModScorm.getScosWithData(scormId, attempt, options);
        }

        // Search the first valid SCO.
        // In browse/review mode return the first visible sco. In normal mode, first incomplete sco.
        const sco = scos.find(sco => sco.isvisible && sco.launch && sco.prereq &&
            (!isNormalMode || AddonModScorm.isStatusIncomplete(sco.status)));

        // If no "valid" SCO, load the first one. In web it loads the first child because the toc contains the organization SCO.
        return sco || scos[0];
    }

    /**
     * Get the last attempt (number and whether it's offline).
     * It'll be the highest number as long as it doesn't surpass the max number of attempts.
     *
     * @param scorm SCORM object.
     * @param attempts Attempts count.
     * @returns Last attempt data.
     */
    protected getLastBeforeMax(
        scorm: AddonModScormScorm,
        attempts: AddonModScormAttemptCountResult,
    ): AddonModScormAttempt {
        if (scorm.maxattempt && attempts.lastAttempt.num > scorm.maxattempt) {
            return {
                num: scorm.maxattempt,
                offline: attempts.offline.indexOf(scorm.maxattempt) > -1,
            };
        } else {
            return {
                num: attempts.lastAttempt.num,
                offline: attempts.lastAttempt.offline,
            };
        }
    }

    /**
     * Given a TOC in array format and a scoId, return the next available SCO.
     *
     * @param toc SCORM's TOC.
     * @param scoId SCO ID.
     * @returns Next SCO.
     */
    getNextScoFromToc(toc: AddonModScormScoWithData[], scoId: number): AddonModScormScoWithData | undefined {
        const currentTocIndex = toc.findIndex((item) => item.id == scoId);

        // We found the current SCO. Now search the next visible SCO with fulfilled prerequisites.
        for (let j = currentTocIndex + 1; j < toc.length; j++) {
            if (toc[j].isvisible && toc[j].prereq && toc[j].launch) {
                return toc[j];
            }
        }
    }

    /**
     * Given a TOC in array format and a scoId, return the previous available SCO.
     *
     * @param toc SCORM's TOC.
     * @param scoId SCO ID.
     * @returns Previous SCO.
     */
    getPreviousScoFromToc(toc: AddonModScormScoWithData[], scoId: number): AddonModScormScoWithData | undefined {
        const currentTocIndex = toc.findIndex((item) => item.id == scoId);

        // We found the current SCO. Now let's search the previous visible SCO with fulfilled prerequisites.
        for (let j = currentTocIndex - 1; j >= 0; j--) {
            if (toc[j].isvisible && toc[j].prereq && toc[j].launch) {
                return toc[j];
            }
        }
    }

    /**
     * Given a TOC in array format and a scoId, return the SCO.
     *
     * @param toc SCORM's TOC.
     * @param scoId SCO ID.
     * @returns SCO.
     */
    getScoFromToc(toc: AddonModScormScoWithData[], scoId: number): AddonModScormScoWithData | undefined {
        return toc.find(sco => sco.id == scoId);
    }

    /**
     * Get SCORM TOC, formatted.
     *
     * @param scormId Scorm ID.
     * @param lastAttempt Last attempt number.
     * @param incomplete Whether last attempt is incomplete.
     * @param options Options.
     * @returns Promise resolved with the TOC.
     */
    async getToc(
        scormId: number,
        lastAttempt: number,
        incomplete: boolean,
        options: AddonModScormGetScosWithDataOptions = {},
    ): Promise<AddonModScormTOCScoWithIcon[]> {
        const toc = await AddonModScorm.getOrganizationToc(scormId, lastAttempt, options);

        const tocArray = <AddonModScormTOCScoWithIcon[]> AddonModScorm.formatTocToArray(toc);

        // Get images for each SCO.
        tocArray.forEach((sco) => {
            sco.icon = AddonModScorm.getScoStatusIcon(sco, incomplete);
        });

        return tocArray;
    }

    /**
     * Searches user data for an online attempt. If the data can't be retrieved, re-try with the previous online attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Online attempt to get the data.
     * @param options Other options.
     * @returns Promise resolved with user data.
     */
    async searchOnlineAttemptUserData(
        scormId: number,
        attempt: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModScormUserDataMap> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        try {
            return await AddonModScorm.getScormUserData(scormId, attempt, options);
        } catch (error) {
            if (attempt <= 0) {
                // No more attempts to try.
                throw error;
            }

            try {
                // We couldn't retrieve the data. Try again with the previous online attempt.
                return await this.searchOnlineAttemptUserData(scormId, attempt - 1, options);
            } catch {
                // Couldn't retrieve previous attempts data either.
                throw error;
            }
        }
    }

}

export const AddonModScormHelper = makeSingleton(AddonModScormHelperProvider);

/**
 * Options to pass to getFirstSco.
 */
export type AddonModScormGetFirstScoOptions = CoreCourseCommonModWSOptions & {
    toc?: AddonModScormScoWithData[]; // SCORM's TOC. If not provided, it will be calculated.
    organization?: string; // Organization to use.
    mode?: string; // Mode.
    offline?: boolean; // Whether the attempt is offline.
};

/**
 * TOC SCO with icon.
 */
export type AddonModScormTOCScoWithIcon = AddonModScormTOCListSco & {
    icon?: AddonModScormScoIcon;
};
