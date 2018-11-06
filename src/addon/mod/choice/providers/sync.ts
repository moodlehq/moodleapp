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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModChoiceOfflineProvider } from './offline';
import { AddonModChoiceProvider } from './choice';
import { CoreEventsProvider } from '@providers/events';
import { TranslateService } from '@ngx-translate/core';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreSyncProvider } from '@providers/sync';

/**
 * Service to sync choices.
 */
@Injectable()
export class AddonModChoiceSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_choice_autom_synced';
    protected componentTranslate: string;

    constructor(protected sitesProvider: CoreSitesProvider, loggerProvider: CoreLoggerProvider,
            protected appProvider: CoreAppProvider, private choiceOffline: AddonModChoiceOfflineProvider,
            private eventsProvider: CoreEventsProvider,  private choiceProvider: AddonModChoiceProvider,
            translate: TranslateService, private utils: CoreUtilsProvider, protected textUtils: CoreTextUtilsProvider,
            courseProvider: CoreCourseProvider, syncProvider: CoreSyncProvider) {
        super('AddonModChoiceSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate);
        this.componentTranslate = courseProvider.translateModuleName('choice');
    }

    /**
     * Get the ID of a choice sync.
     *
     * @param  {number} choiceId Choice ID.
     * @param  {number} userId   User the responses belong to.
     * @return {string} Sync ID.
     */
    protected getSyncId(choiceId: number, userId: number): string {
        return choiceId + '#' + userId;
    }

    /**
     * Try to synchronize all the choices in a certain site or in all sites.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllChoices(siteId?: string): Promise<any> {
        return this.syncOnSites('choices', this.syncAllChoicesFunc.bind(this), undefined, siteId);
    }

    /**
     * Sync all pending choices on a site.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllChoicesFunc(siteId?: string): Promise<any> {
        return this.choiceOffline.getResponses(siteId).then((responses) => {
            const promises = [];

            // Sync all responses.
            responses.forEach((response) => {
                promises.push(this.syncChoiceIfNeeded(response.choiceid, response.userid, siteId).then((result) => {
                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModChoiceSyncProvider.AUTO_SYNCED, {
                            choiceId: response.choiceid,
                            userId: response.userid,
                            warnings: result.warnings
                        }, siteId);
                    }
                }));
            });
        });
    }

    /**
     * Sync an choice only if a certain time has passed since the last time.
     *
     * @param  {number} choiceId Choice ID to be synced.
     * @param  {number} userId   User the answers belong to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the choice is synced or it doesn't need to be synced.
     */
    syncChoiceIfNeeded(choiceId: number, userId: number, siteId?: string): Promise<any> {
        const syncId = this.getSyncId(choiceId, userId);

        return this.isSyncNeeded(syncId, siteId).then((needed) => {
            if (needed) {
                return this.syncChoice(choiceId, userId, siteId);
            }
        });
    }

    /**
     * Synchronize a choice.
     *
     * @param  {number} choiceId Choice ID to be synced.
     * @param  {number} userId   User the answers belong to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected otherwise.
     */
    syncChoice(choiceId: number, userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getSyncId(choiceId, userId);
        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        this.logger.debug(`Try to sync choice '${choiceId}' for user '${userId}'`);

        let courseId;
        const result = {
            warnings: [],
            updated: false
        };

        // Get offline responses to be sent.
        const syncPromise = this.choiceOffline.getResponse(choiceId, siteId, userId).catch(() => {
            // No offline data found, return empty object.
            return {};
        }).then((data) => {
            if (!data.choiceid) {
                // Nothing to sync.
                return;
            }

            if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            courseId = data.courseid;

            // Send the responses.
            let promise;

            if (data.deleting) {
                // A user has deleted some responses.
                promise = this.choiceProvider.deleteResponsesOnline(choiceId, data.responses, siteId);
            } else {
                // A user has added some responses.
                promise = this.choiceProvider.submitResponseOnline(choiceId, data.responses, siteId);
            }

            return promise.then(() => {
                result.updated = true;

                return this.choiceOffline.deleteResponse(choiceId, siteId, userId);
            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                    result.updated = true;

                    return this.choiceOffline.deleteResponse(choiceId, siteId, userId).then(() => {
                        // Responses deleted, add a warning.
                        result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                            component: this.componentTranslate,
                            name: data.name,
                            error: error.error
                        }));
                    });
                }

                // Couldn't connect to server, reject.
                return Promise.reject(error);
            });
        }).then(() => {
            if (courseId) {
                const promises = [
                    this.choiceProvider.invalidateChoiceData(courseId),
                    choiceId ? this.choiceProvider.invalidateOptions(choiceId) : Promise.resolve(),
                    choiceId ? this.choiceProvider.invalidateResults(choiceId) : Promise.resolve(),
                ];

                // Data has been sent to server, update choice data.
                return Promise.all(promises).then(() => {
                    return this.choiceProvider.getChoiceById(courseId, choiceId, siteId);
                }).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(syncId, siteId);
        }).then(() => {
            // All done, return the warnings.
            return result;
        });

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }
}
