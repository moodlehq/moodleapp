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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModScormProvider, AddonModScormAttemptCountResult } from './scorm';

/**
 * Helper service that provides some features for SCORM.
 */
@Injectable()
export class AddonModScormHelperProvider {

    protected div = document.createElement('div'); // A div element to search in HTML code.

    constructor(private domUtils: CoreDomUtilsProvider, private scormProvider: AddonModScormProvider) { }

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
}
