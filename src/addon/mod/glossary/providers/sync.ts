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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModGlossaryProvider } from './glossary';
import { AddonModGlossaryHelperProvider } from './helper';
import { AddonModGlossaryOfflineProvider } from './offline';

/**
 * Service to sync glossaries.
 */
@Injectable()
export class AddonModGlossarySyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_glossary_autom_synced';

    protected componentTranslate: string;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            courseProvider: CoreCourseProvider,
            private eventsProvider: CoreEventsProvider,
            loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            syncProvider: CoreSyncProvider,
            textUtils: CoreTextUtilsProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private utils: CoreUtilsProvider,
            private glossaryProvider: AddonModGlossaryProvider,
            private glossaryHelper: AddonModGlossaryHelperProvider,
            private glossaryOffline: AddonModGlossaryOfflineProvider) {

        super('AddonModGlossarySyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate);

        this.componentTranslate = courseProvider.translateModuleName('glossary');
    }

    /**
     * Try to synchronize all the glossaries in a certain site or in all sites.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllGlossaries(siteId?: string): Promise<any> {
        return this.syncOnSites('all glossaries', this.syncAllGlossariesFunc.bind(this), [], siteId);
    }

    /**
     * Sync all glossaries on a site.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllGlossariesFunc(siteId?: string): Promise<any> {
        // Sync all new entries
        return this.glossaryOffline.getAllNewEntries(siteId).then((entries) => {
            const promises = {};

            // Do not sync same glossary twice.
            for (const i in entries) {
                const entry = entries[i];

                if (typeof promises[entry.glossaryid] != 'undefined') {
                    continue;
                }

                promises[entry.glossaryid] = this.syncGlossaryEntriesIfNeeded(entry.glossaryid, entry.userid, siteId)
                        .then((result) => {
                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModGlossarySyncProvider.AUTO_SYNCED, {
                            glossaryId: entry.glossaryid,
                            userId: entry.userid,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            }

            // Promises will be an object so, convert to an array first;
            return Promise.all(this.utils.objectToArray(promises));
        });
    }

    /**
     * Sync a glossary only if a certain time has passed since the last time.
     *
     * @param  {number} glossaryId Glossary ID.
     * @param  {number} userId     User the entry belong to.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the glossary is synced or if it doesn't need to be synced.
     */
    syncGlossaryEntriesIfNeeded(glossaryId: number, userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getGlossarySyncId(glossaryId, userId);

        return this.isSyncNeeded(syncId, siteId).then((needed) => {
            if (needed) {
                return this.syncGlossaryEntries(glossaryId, userId, siteId);
            }
        });
    }

    /**
     * Synchronize all offline entries of a glossary.
     *
     * @param  {number} glossaryId Glossary ID to be synced.
     * @param  {number} [userId]   User the entries belong to.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved if sync is successful, rejected otherwise.
     */
    syncGlossaryEntries(glossaryId: number, userId?: number, siteId?: string): Promise<any> {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getGlossarySyncId(glossaryId, userId);
        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this glossary, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        // Verify that glossary isn't blocked.
        if (this.syncProvider.isBlocked(AddonModGlossaryProvider.COMPONENT, syncId, siteId)) {
            this.logger.debug('Cannot sync glossary ' + glossaryId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync glossary ' + glossaryId + ' for user ' + userId);

        let courseId;
        const result = {
            warnings: [],
            updated: false
        };

        // Get offline responses to be sent.
        const syncPromise = this.glossaryOffline.getGlossaryNewEntries(glossaryId, siteId, userId).catch(() => {
            // No offline data found, return empty object.
            return [];
        }).then((entries) => {
            if (!entries.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            const promises = [];

            entries.forEach((data) => {
                let promise;

                courseId = data.courseid;

                // First of all upload the attachments (if any).
                promise = this.uploadAttachments(glossaryId, data, siteId).then((itemId) => {
                    // Now try to add the entry.
                    return this.glossaryProvider.addEntryOnline(
                            glossaryId, data.concept, data.definition, data.options, itemId, siteId);
                });

                promises.push(promise.then(() => {
                    result.updated = true;

                    return this.deleteAddEntry(glossaryId, data.concept, data.timecreated, siteId);
                }).catch((error) => {
                    if (this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                        result.updated = true;

                        return this.deleteAddEntry(glossaryId, data.concept, data.timecreated, siteId).then(() => {
                            // Responses deleted, add a warning.
                            result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.componentTranslate,
                                name: data.concept,
                                error: error.error
                            }));
                        });
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }
                }));
            });

            return Promise.all(promises);
        }).then(() => {
            if (result.updated && courseId) {
                // Data has been sent to server. Now invalidate the WS calls.
                return this.glossaryProvider.getGlossaryById(courseId, glossaryId).then((glossary) => {
                    return this.glossaryProvider.invalidateGlossaryEntries(glossary, true);
                }).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(syncId, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the warnings.
            return result;
        });

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Delete a new entry.
     *
     * @param  {number} glossaryId  Glossary ID.
     * @param  {string} concept     Glossary entry concept.
     * @param  {number} timeCreated Time to allow duplicated entries.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved when deleted.
     */
   protected deleteAddEntry(glossaryId: number, concept: string, timeCreated: number, siteId?: string): Promise<any> {
       const promises = [];

       promises.push(this.glossaryOffline.deleteNewEntry(glossaryId, concept, timeCreated, siteId));
       promises.push(this.glossaryHelper.deleteStoredFiles(glossaryId, concept, timeCreated, siteId).catch(() => {
           // Ignore errors, maybe there are no files.
       }));

       return Promise.all(promises);
   }

    /**
     * Upload attachments of an offline entry.
     *
     * @param  {number} glossaryId Glossary ID.
     * @param  {any}    entry      Offline entry.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with draftid if uploaded, resolved with 0 if nothing to upload.
     */
    protected uploadAttachments(glossaryId: number, entry: any, siteId?: string): Promise<number> {
        if (entry.attachments) {
            // Has some attachments to sync.
            let files = entry.attachments.online || [];
            let promise;

            if (entry.attachments.offline) {
                // Has offline files.
                promise = this.glossaryHelper.getStoredFiles(glossaryId, entry.concept, entry.timecreated, siteId).then((atts) => {
                    files = files.concat(atts);
                }).catch(() => {
                    // Folder not found, no files to add.
                });
            } else {
                promise = Promise.resolve(0);
            }

            return promise.then(() => {
                return this.uploaderProvider.uploadOrReuploadFiles(files, AddonModGlossaryProvider.COMPONENT, glossaryId, siteId);
            });
        }

        // No attachments, resolve.
        return Promise.resolve(0);
    }

    /**
     * Get the ID of a glossary sync.
     *
     * @param  {number} glossaryId Glossary ID.
     * @param  {number} [userId]   User the entries belong to.. If not defined, current user.
     * @return {string}            Sync ID.
     */
    protected getGlossarySyncId(glossaryId: number, userId?: number): string {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();

        return 'glossary#' + glossaryId + '#' + userId;
    }
}
