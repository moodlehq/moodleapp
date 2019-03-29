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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';

/**
 * Service to handle offline wiki.
 */
@Injectable()
export class AddonModWikiOfflineProvider {

    protected logger;

    // Variables for database.
    static NEW_PAGES_TABLE = 'addon_mod_wiki_new_pages_store';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModWikiOfflineProvider',
        version: 1,
        tables: [
                {
                name: AddonModWikiOfflineProvider.NEW_PAGES_TABLE,
                columns: [
                    {
                        name: 'wikiid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'subwikiid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'groupid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'title',
                        type: 'TEXT'
                    },
                    {
                        name: 'cachedcontent',
                        type: 'TEXT'
                    },
                    {
                        name: 'contentformat',
                        type: 'TEXT'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'caneditpage',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['wikiid', 'subwikiid', 'userid', 'groupid', 'title']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider) {
        this.logger = logger.getInstance('AddonModWikiOfflineProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Convert a value to a positive number. If not a number or less than 0, 0 will be returned.
     *
     * @param {any} value Value to convert.
     * @return {number} Converted value.
     */
    convertToPositiveNumber(value: any): number {
        value = parseInt(value, 10);

        return value > 0 ? value : 0;
    }

    /**
     * Delete a new page.
     *
     * @param {string} title Title of the page.
     * @param {number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param {number} [wikiId] Wiki ID. Optional, will be used create subwiki if not informed.
     * @param {number} [userId] User ID. Optional, will be used create subwiki if not informed.
     * @param {number} [groupId] Group ID. Optional, will be used create subwiki if not informed.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if deleted, rejected if failure.
     */
    deleteNewPage(title: string, subwikiId?: number, wikiId?: number, userId?: number, groupId?: number, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            subwikiId = this.convertToPositiveNumber(subwikiId);
            wikiId = this.convertToPositiveNumber(wikiId);
            userId = this.convertToPositiveNumber(userId);
            groupId = this.convertToPositiveNumber(groupId);

            return site.getDb().deleteRecords(AddonModWikiOfflineProvider.NEW_PAGES_TABLE, {
                subwikiid: subwikiId,
                wikiid: wikiId,
                userid: userId,
                groupid: groupId,
                title: title
            });
        });
    }

    /**
     * Get all the stored new pages from all the wikis.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with pages.
     */
    getAllNewPages(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getAllRecords(AddonModWikiOfflineProvider.NEW_PAGES_TABLE);
        });
    }

    /**
     * Get a stored new page.
     *
     * @param {string} title Title of the page.
     * @param {number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param {number} [wikiId] Wiki ID. Optional, will be used create subwiki if not informed.
     * @param {number} [userId] User ID. Optional, will be used create subwiki if not informed.
     * @param {number} [groupId] Group ID. Optional, will be used create subwiki if not informed.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with page.
     */
    getNewPage(title: string, subwikiId?: number, wikiId?: number, userId?: number, groupId?: number, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            subwikiId = this.convertToPositiveNumber(subwikiId);
            wikiId = this.convertToPositiveNumber(wikiId);
            userId = this.convertToPositiveNumber(userId);
            groupId = this.convertToPositiveNumber(groupId);

            return site.getDb().getRecord(AddonModWikiOfflineProvider.NEW_PAGES_TABLE, {
                subwikiid: subwikiId,
                wikiid: wikiId,
                userid: userId,
                groupid: groupId,
                title: title
            });
        });
    }

    /**
     * Get all the stored new pages from a certain subwiki.
     *
     * @param {number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param {number} [wikiId] Wiki ID. Optional, will be used create subwiki if not informed.
     * @param {number} [userId] User ID. Optional, will be used create subwiki if not informed.
     * @param {number} [groupId] Group ID. Optional, will be used create subwiki if not informed.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with pages.
     */
    getSubwikiNewPages(subwikiId?: number, wikiId?: number, userId?: number, groupId?: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            subwikiId = this.convertToPositiveNumber(subwikiId);
            wikiId = this.convertToPositiveNumber(wikiId);
            userId = this.convertToPositiveNumber(userId);
            groupId = this.convertToPositiveNumber(groupId);

            return site.getDb().getRecords(AddonModWikiOfflineProvider.NEW_PAGES_TABLE, {
                subwikiid: subwikiId,
                wikiid: wikiId,
                userid: userId,
                groupid: groupId
            });
        });
    }

    /**
     * Get all the stored new pages from a list of subwikis.
     *
     * @param {any[]} subwikis List of subwiki.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with pages.
     */
    getSubwikisNewPages(subwikis: any[], siteId?: string): Promise<any[]> {
        const promises = [];
        let pages = [];

        subwikis.forEach((subwiki) => {
            promises.push(this.getSubwikiNewPages(subwiki.id, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId)
                    .then((subwikiPages) => {
                pages = pages.concat(subwikiPages);
            }));
        });

        return Promise.all(promises).then(() => {
            return pages;
        });
    }

    /**
     * Save a new page to be sent later.
     *
     * @param {string} title Title of the page.
     * @param {string} content Content of the page.
     * @param {number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param {number} [wikiId] Wiki ID. Optional, will be used create subwiki if not informed.
     * @param {number} [userId] User ID. Optional, will be used create subwiki if not informed.
     * @param {number} [groupId] Group ID. Optional, will be used create subwiki if not informed.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if stored, rejected if failure.
     */
    saveNewPage(title: string, content: string, subwikiId?: number, wikiId?: number, userId?: number, groupId?: number,
            siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const now = new Date().getTime(),
                entry = {
                    title: title,
                    cachedcontent: content,
                    subwikiid: this.convertToPositiveNumber(subwikiId),
                    wikiid: this.convertToPositiveNumber(wikiId),
                    userid: this.convertToPositiveNumber(userId),
                    groupid: this.convertToPositiveNumber(groupId),
                    contentformat: 'html',
                    timecreated: now,
                    timemodified: now,
                    caneditpage: 1
                };

            return site.getDb().insertRecord(AddonModWikiOfflineProvider.NEW_PAGES_TABLE, entry);
        });
    }

    /**
     * Check if a list of subwikis have offline data stored.
     *
     * @param {any[]} subwikis List of subwikis.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return{Promise<boolean>} Promise resolved with boolean: whether it has offline data.
     */
    subwikisHaveOfflineData(subwikis: any[], siteId?: string): Promise<boolean> {
        return this.getSubwikisNewPages(subwikis, siteId).then((pages) => {
            return !!pages.length;
        }).catch(() => {
            // Error, return false.
            return false;
        });
    }
}
