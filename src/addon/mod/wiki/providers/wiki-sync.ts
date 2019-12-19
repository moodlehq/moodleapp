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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { AddonModWikiProvider } from './wiki';
import { AddonModWikiOfflineProvider } from './wiki-offline';

/**
 * Data returned by a subwiki sync.
 */
export interface AddonModWikiSyncSubwikiResult {
    /**
     * List of warnings.
     */
    warnings: string[];

    /**
     * Whether data was updated in the site.
     */
    updated: boolean;

    /**
     * List of created pages.
     */
    created: {pageId: number, title: string}[];

    /**
     * List of discarded pages.
     */
    discarded: {title: string, warning: string}[];
}

/**
 * Data returned by a wiki sync.
 */
export interface AddonModWikiSyncWikiResult {
    /**
     * List of warnings.
     */
    warnings: string[];

    /**
     * Whether data was updated in the site.
     */
    updated: boolean;

    /**
     * List of subwikis.
     */
    subwikis: {[subwikiId: number]: {
        created: {pageId: number, title: string}[],
        discarded: {title: string, warning: string}[]
    }};

    /**
     * Site ID.
     */
    siteId: string;
}

/**
 * Service to sync wikis.
 */
@Injectable()
export class AddonModWikiSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_wiki_autom_synced';
    static MANUAL_SYNCED = 'addon_mod_wiki_manual_synced';

    protected componentTranslate: string;

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider, translate: TranslateService,
            courseProvider: CoreCourseProvider, private eventsProvider: CoreEventsProvider,
            private wikiProvider: AddonModWikiProvider, private wikiOfflineProvider: AddonModWikiOfflineProvider,
            private utils: CoreUtilsProvider, private groupsProvider: CoreGroupsProvider, timeUtils: CoreTimeUtilsProvider,
            private logHelper: CoreCourseLogHelperProvider) {

        super('AddonModWikiSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils);

        this.componentTranslate = courseProvider.translateModuleName('wiki');
    }

    /**
     * Get a string to identify a subwiki. If it doesn't have a subwiki ID it will be identified by wiki ID, user ID and group ID.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param userId User ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param groupId Group ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @return Identifier.
     */
    getSubwikiBlockId(subwikiId: number, wikiId?: number, userId?: number, groupId?: number): string {
        subwikiId = this.wikiOfflineProvider.convertToPositiveNumber(subwikiId);

        if (subwikiId && subwikiId > 0) {
            return String(subwikiId);
        }

        wikiId = this.wikiOfflineProvider.convertToPositiveNumber(wikiId);
        if (wikiId) {
            userId = this.wikiOfflineProvider.convertToPositiveNumber(userId);
            groupId = this.wikiOfflineProvider.convertToPositiveNumber(groupId);

            return wikiId + ':' + userId + ':' + groupId;
        }
    }

    /**
     * Try to synchronize all the wikis in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllWikis(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all wikis', this.syncAllWikisFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all wikis on a site.
     *
     * @param siteId Site ID to sync.
     * @param force Wether to force sync not depending on last execution.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllWikisFunc(siteId: string, force?: boolean): Promise<any> {
        // Get all the pages created in offline.
        return this.wikiOfflineProvider.getAllNewPages(siteId).then((pages) => {
            const promises = [],
                subwikis = {};

            // Get subwikis to sync.
            pages.forEach((page) => {
                const index = this.getSubwikiBlockId(page.subwikiid, page.wikiid, page.userid, page.groupid);
                subwikis[index] = page;
            });

            // Sync all subwikis.
            for (const id in subwikis) {
                const subwiki = subwikis[id];

                const promise = force ? this.syncSubwiki(subwiki.subwikiid, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId)
                    : this.syncSubwikiIfNeeded(subwiki.subwikiid, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId);

                promises.push(promise.then((result) => {

                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModWikiSyncProvider.AUTO_SYNCED, {
                            siteId: siteId,
                            subwikiId: subwiki.subwikiid,
                            wikiId: subwiki.wikiid,
                            userId: subwiki.userid,
                            groupId: subwiki.groupid,
                            created: result.created,
                            discarded: result.discarded,
                            warnings: result.warnings
                        });
                    }
                }));
            }

            return Promise.all(promises);
        });
    }

    /**
     * Sync a subwiki only if a certain time has passed since the last time.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param userId User ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param groupId Group ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when subwiki is synced or doesn't need to be synced.
     */
    syncSubwikiIfNeeded(subwikiId: number, wikiId?: number, userId?: number, groupId?: number, siteId?: string)
            : Promise<void | AddonModWikiSyncSubwikiResult> {

        const blockId = this.getSubwikiBlockId(subwikiId, wikiId, userId, groupId);

        return this.isSyncNeeded(blockId, siteId).then((needed) => {
            if (needed) {
                return this.syncSubwiki(subwikiId, wikiId, userId, groupId, siteId);
            }
        });
    }

    /**
     * Synchronize a subwiki.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param userId User ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param groupId Group ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    syncSubwiki(subwikiId: number, wikiId?: number, userId?: number, groupId?: number, siteId?: string)
            : Promise<AddonModWikiSyncSubwikiResult> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const result: AddonModWikiSyncSubwikiResult = {
                warnings: [],
                updated: false,
                created: [],
                discarded: []
            },
            subwikiBlockId = this.getSubwikiBlockId(subwikiId, wikiId, userId, groupId);

        if (this.isSyncing(subwikiBlockId, siteId)) {
            // There's already a sync ongoing for this subwiki, return the promise.
            return this.getOngoingSync(subwikiBlockId, siteId);
        }

        // Verify that subwiki isn't blocked.
        if (this.syncProvider.isBlocked(AddonModWikiProvider.COMPONENT, subwikiBlockId, siteId)) {
            this.logger.debug('Cannot sync subwiki ' + subwikiBlockId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync subwiki ' + subwikiBlockId);

        // Get offline responses to be sent.
        const syncPromise = this.wikiOfflineProvider.getSubwikiNewPages(subwikiId, wikiId, userId, groupId, siteId).catch(() => {
            // No offline data found, return empty array.
            return [];
        }).then((pages) => {
            if (!pages || !pages.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(this.translate.instant('core.networkerrormsg'));
            }

            const promises = [];

            // Send the pages.
            pages.forEach((page) => {
                promises.push(this.wikiProvider.newPageOnline(page.title, page.cachedcontent, subwikiId, wikiId, userId, groupId,
                        siteId).then((pageId) => {

                    result.updated = true;

                    // Add page to created pages array.
                    result.created.push({
                        pageId: pageId,
                        title: page.title
                    });

                    // Delete the local page.
                    return this.wikiOfflineProvider.deleteNewPage(page.title, subwikiId, wikiId, userId, groupId, siteId);
                }).catch((error) => {
                    if (this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means that the page cannot be submitted. Delete it.
                        return this.wikiOfflineProvider.deleteNewPage(page.title, subwikiId, wikiId, userId, groupId, siteId)
                                .then(() => {

                            result.updated = true;

                            // Page deleted, add the page to discarded pages and add a warning.
                            const warning = this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.translate.instant('addon.mod_wiki.wikipage'),
                                name: page.title,
                                error: this.textUtils.getErrorMessageFromError(error)
                            });

                            result.discarded.push({
                                title: page.title,
                                warning: warning
                            });

                            result.warnings.push(warning);
                        });
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }
                }));
            });

            return Promise.all(promises);
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(subwikiBlockId, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the warnings.
            return result;
        });

        return this.addOngoingSync(subwikiBlockId, syncPromise, siteId);
    }

    /**
     * Tries to synchronize a wiki.
     *
     * @param wikiId Wiki ID.
     * @param courseId Course ID.
     * @param cmId Wiki course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    syncWiki(wikiId: number, courseId?: number, cmId?: number, siteId?: string): Promise<AddonModWikiSyncWikiResult> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Sync offline logs.
        return this.logHelper.syncIfNeeded(AddonModWikiProvider.COMPONENT, wikiId, siteId).catch(() => {
            // Ignore errors.
         }).then(() => {
            // Sync is done at subwiki level, get all the subwikis.
            return this.wikiProvider.getSubwikis(wikiId);
        }).then((subwikis) => {
            const promises = [],
                result: AddonModWikiSyncWikiResult = {
                    warnings: [],
                    updated: false,
                    subwikis: {},
                    siteId: siteId
                };

            subwikis.forEach((subwiki) => {
                promises.push(this.syncSubwiki(subwiki.id, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId).then((data) => {
                    if (data && data.updated) {
                        result.warnings = result.warnings.concat(data.warnings);
                        result.updated = true;
                        result.subwikis[subwiki.id] = {
                            created: data.created,
                            discarded: data.discarded
                        };
                    }
                }));
            });

            return Promise.all(promises).then(() => {
                const promises = [];

                if (result.updated) {
                    // Something has changed, invalidate data.
                    if (wikiId) {
                        promises.push(this.wikiProvider.invalidateSubwikis(wikiId));
                        promises.push(this.wikiProvider.invalidateSubwikiPages(wikiId));
                        promises.push(this.wikiProvider.invalidateSubwikiFiles(wikiId));
                    }
                    if (courseId) {
                        promises.push(this.wikiProvider.invalidateWikiData(courseId));
                    }
                    if (cmId) {
                        promises.push(this.groupsProvider.invalidateActivityAllowedGroups(cmId));
                        promises.push(this.groupsProvider.invalidateActivityGroupMode(cmId));
                    }
                }

                return Promise.all(promises).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return result;
                });
            });
        });
    }
}
