// (C) Copyright 2015 Martin Dougiamas
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
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModScormProvider, AddonModScormAttemptCountResult } from './scorm';
import { AddonModScormOfflineProvider } from './scorm-offline';

/**
 * Helper service that provides some features for SCORM.
 */
@Injectable()
export class AddonModScormHelperProvider {

    // List of elements we want to ignore when copying attempts (they're calculated).
    protected elementsToIgnore = ['status', 'score_raw', 'total_time', 'session_time', 'student_id', 'student_name', 'credit',
                        'mode', 'entry'];

    constructor(private sitesProvider: CoreSitesProvider, private translate: TranslateService,
            private domUtils: CoreDomUtilsProvider, private utils: CoreUtilsProvider,
            private scormProvider: AddonModScormProvider, private scormOfflineProvider: AddonModScormOfflineProvider) { }

    /**
     * Show a confirm dialog if needed. If SCORM doesn't have size, try to calculate it.
     *
     * @param {any} scorm SCORM to download.
     * @param {boolean} [isOutdated] True if package outdated, false if not outdated, undefined to calculate it.
     * @return {Promise<any>} Promise resolved if the user confirms or no confirmation needed.
     */
    confirmDownload(scorm: any, isOutdated?: boolean): Promise<any> {
        // Check if file should be downloaded.
        return this.scormProvider.shouldDownloadMainFile(scorm, isOutdated).then((download) => {
            if (download) {
                let subPromise;

                if (!scorm.packagesize) {
                    // We don't have package size, try to calculate it.
                    subPromise = this.scormProvider.calculateScormSize(scorm).then((size) => {
                        // Store it so we don't have to calculate it again when using the same object.
                        scorm.packagesize = size;

                        return size;
                    });
                } else {
                    subPromise = Promise.resolve(scorm.packagesize);
                }

                return subPromise.then((size) => {
                    return this.domUtils.confirmDownloadSize({size: size, total: true});
                });
            }
        });
    }

    /**
     * Creates a new offline attempt based on an existing online attempt.
     *
     * @param {any} scorm SCORM.
     * @param {number} attempt Number of the online attempt.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the attempt is created.
     */
    convertAttemptToOffline(scorm: any, attempt: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get data from the online attempt.
        return this.scormProvider.getScormUserData(scorm.id, attempt, undefined, false, false, siteId).then((onlineData) => {
            // The SCORM API might have written some data to the offline attempt already.
            // We don't want to override it with cached online data.
            return this.scormOfflineProvider.getScormUserData(scorm.id, attempt, undefined, siteId).catch(() => {
                // Ignore errors.
            }).then((offlineData) => {
                const dataToStore = this.utils.clone(onlineData);

                // Filter the data to copy.
                for (const scoId in dataToStore) {
                    const sco = dataToStore[scoId];

                    // Delete calculated data.
                    this.elementsToIgnore.forEach((el) => {
                        delete sco.userdata[el];
                    });

                    // Don't override offline data.
                    if (offlineData && offlineData[sco.scoid] && offlineData[sco.scoid].userdata) {
                        const scoUserData = {};

                        for (const element in sco.userdata) {
                            if (!offlineData[sco.scoid].userdata[element]) {
                                // This element is not stored in offline, we can save it.
                                scoUserData[element] = sco.userdata[element];
                            }
                        }

                        sco.userdata = scoUserData;
                    }
                }

                return this.scormOfflineProvider.createNewAttempt(scorm, attempt, dataToStore, onlineData, siteId);
            });
        }).catch(() => {
            // Shouldn't happen.
            return Promise.reject(this.translate.instant('addon.mod_scorm.errorcreateofflineattempt'));
        });
    }

    /**
     * Creates a new offline attempt.
     *
     * @param {any} scorm SCORM.
     * @param {number} newAttempt Number of the new attempt.
     * @param {number} lastOnline Number of the last online attempt.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the attempt is created.
     */
    createOfflineAttempt(scorm: any, newAttempt: number, lastOnline: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Try to get data from online attempts.
        return this.searchOnlineAttemptUserData(scorm.id, lastOnline, siteId).then((userData) => {
            // We're creating a new attempt, remove all the user data that is not needed for a new attempt.
            for (const scoId in userData) {
                const sco = userData[scoId],
                    filtered = {};

                for (const element in sco.userdata) {
                    if (element.indexOf('.') == -1 && this.elementsToIgnore.indexOf(element) == -1) {
                        // The element doesn't use a dot notation, probably SCO data.
                        filtered[element] = sco.userdata[element];
                    }
                }

                sco.userdata = filtered;
            }

            return this.scormOfflineProvider.createNewAttempt(scorm, newAttempt, userData, undefined, siteId);
        }).catch(() => {
            return Promise.reject(this.translate.instant('addon.mod_scorm.errorcreateofflineattempt'));
        });
    }

    /**
     * Determines the attempt to continue/review. It will be:
     * - The last incomplete online attempt if it hasn't been continued in offline and all offline attempts are complete.
     * - The attempt with highest number without surpassing max attempts otherwise.
     *
     * @param {any} scorm SCORM object.
     * @param {AddonModScormAttemptCountResult} attempts Attempts count.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{number: number, offline: boolean}>} Promise resolved with the attempt data.
     */
    determineAttemptToContinue(scorm: any, attempts: AddonModScormAttemptCountResult, siteId?: string)
            : Promise<{number: number, offline: boolean}> {

        let lastOnline;

        // Get last online attempt.
        if (attempts.online.length) {
            lastOnline = Math.max.apply(Math, attempts.online);
        }

        if (lastOnline) {
            // Check if last online incomplete.
            const hasOffline = attempts.offline.indexOf(lastOnline) > -1;

            return this.scormProvider.isAttemptIncomplete(scorm.id, lastOnline, hasOffline, false, siteId).then((incomplete) => {
                if (incomplete) {
                    return {
                        number: lastOnline,
                        offline: hasOffline
                    };
                } else {
                    return this.getLastBeforeMax(scorm, attempts);
                }
            });
        } else {
            return Promise.resolve(this.getLastBeforeMax(scorm, attempts));
        }
    }

    /**
     * Get the first SCO to load in a SCORM: the first valid and incomplete SCO.
     *
     * @param {number} scormId Scorm ID.
     * @param {number} attempt Attempt number.
     * @param {any[]} [toc] SCORM's TOC. If not provided, it will be calculated.
     * @param {string} [organization] Organization to use.
     * @param {boolean} [offline] Whether the attempt is offline.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the first SCO.
     */
    getFirstSco(scormId: number, attempt: number, toc?: any[], organization?: string, offline?: boolean, siteId?: string)
            : Promise<any> {

        let promise;
        if (toc && toc.length) {
            promise = Promise.resolve(toc);
        } else {
            // SCORM doesn't have a TOC. Get all the scos.
            promise = this.scormProvider.getScosWithData(scormId, attempt, organization, offline, false, siteId);
        }

        return promise.then((scos) => {
            // Search the first valid SCO.
            for (let i = 0; i < scos.length; i++) {
                const sco = scos[i];

                // Return the first valid and incomplete SCO.
                if (sco.isvisible && sco.prereq && sco.launch && this.scormProvider.isStatusIncomplete(sco.status)) {
                    return sco;
                }
            }
        });
    }

    /**
     * Get the last attempt (number and whether it's offline).
     * It'll be the highest number as long as it doesn't surpass the max number of attempts.
     *
     * @param {any} scorm SCORM object.
     * @param {AddonModScormAttemptCountResult} attempts Attempts count.
     * @return {{number: number, offline: boolean}} Last attempt data.
     */
    protected getLastBeforeMax(scorm: any, attempts: AddonModScormAttemptCountResult): {number: number, offline: boolean} {
        if (scorm.maxattempt != 0 && attempts.lastAttempt.number > scorm.maxattempt) {
            return {
                number: scorm.maxattempt,
                offline: attempts.offline.indexOf(scorm.maxattempt) > -1
            };
        } else {
            return {
                number: attempts.lastAttempt.number,
                offline: attempts.lastAttempt.offline
            };
        }
    }

    /**
     * Given a TOC in array format and a scoId, return the next available SCO.
     *
     * @param {any[]} toc SCORM's TOC.
     * @param {number} scoId SCO ID.
     * @return {any} Next SCO.
     */
    getNextScoFromToc(toc: any, scoId: number): any {
        for (let i = 0; i < toc.length; i++) {
            if (toc[i].id == scoId) {
                // We found the current SCO. Now let's search the next visible SCO with fulfilled prerequisites.
                for (let j = i + 1; j < toc.length; j++) {
                    if (toc[j].isvisible && toc[j].prereq && toc[j].launch) {
                        return toc[j];
                    }
                }
                break;
            }
        }
    }

    /**
     * Given a TOC in array format and a scoId, return the previous available SCO.
     *
     * @param {any[]} toc SCORM's TOC.
     * @param {number} scoId SCO ID.
     * @return {any} Previous SCO.
     */
    getPreviousScoFromToc(toc: any, scoId: number): any {
        for (let i = 0; i < toc.length; i++) {
            if (toc[i].id == scoId) {
                // We found the current SCO. Now let's search the previous visible SCO with fulfilled prerequisites.
                for (let j = i - 1; j >= 0; j--) {
                    if (toc[j].isvisible && toc[j].prereq && toc[j].launch) {
                        return toc[j];
                    }
                }
                break;
            }
        }
    }

    /**
     * Given a TOC in array format and a scoId, return the SCO.
     *
     * @param {any[]} toc SCORM's TOC.
     * @param {number} scoId SCO ID.
     * @return {any} SCO.
     */
    getScoFromToc(toc: any[], scoId: number): any {
        for (let i = 0; i < toc.length; i++) {
            if (toc[i].id == scoId) {
                return toc[i];
            }
        }
    }

    /**
     * Searches user data for an online attempt. If the data can't be retrieved, re-try with the previous online attempt.
     *
     * @param {number} scormId SCORM ID.
     * @param {number} attempt Online attempt to get the data.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with user data.
     */
    searchOnlineAttemptUserData(scormId: number, attempt: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.scormProvider.getScormUserData(scormId, attempt, undefined, false, false, siteId).catch(() => {
            if (attempt > 0) {
                // We couldn't retrieve the data. Try again with the previous online attempt.
                return this.searchOnlineAttemptUserData(scormId, attempt - 1, siteId);
            } else {
                // No more attempts to try. Reject
                return Promise.reject(null);
            }
        });
    }
}
