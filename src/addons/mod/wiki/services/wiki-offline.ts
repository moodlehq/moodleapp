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
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonModWikiPageDBRecord, NEW_PAGES_TABLE_NAME } from './database/wiki';
import { AddonModWikiSubwiki } from './wiki';

/**
 * Service to handle offline wiki.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiOfflineProvider {

    /**
     * Convert a value to a positive number. If not a number or less than 0, 0 will be returned.
     *
     * @param value Value to convert.
     * @returns Converted value.
     */
    convertToPositiveNumber(value: string | number | undefined): number {
        value = Number(value);

        return value > 0 ? value : 0;
    }

    /**
     * Delete a new page.
     *
     * @param title Title of the page.
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used create subwiki if not informed.
     * @param userId User ID. Optional, will be used create subwiki if not informed.
     * @param groupId Group ID. Optional, will be used create subwiki if not informed.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteNewPage(
        title: string,
        subwikiId?: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWikiPageDBRecord> = {
            title,
            ...this.getSubwikiConditions(subwikiId, wikiId, userId, groupId),
        };

        await site.getDb().deleteRecords(NEW_PAGES_TABLE_NAME, conditions);
    }

    /**
     * Get all the stored new pages from all the wikis.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with pages.
     */
    async getAllNewPages(siteId?: string): Promise<AddonModWikiPageDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getAllRecords(NEW_PAGES_TABLE_NAME);
    }

    /**
     * Get a stored new page.
     *
     * @param title Title of the page.
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used create subwiki if not informed.
     * @param userId User ID. Optional, will be used create subwiki if not informed.
     * @param groupId Group ID. Optional, will be used create subwiki if not informed.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with page.
     */
    async getNewPage(
        title: string,
        subwikiId?: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
    ): Promise<AddonModWikiPageDBRecord> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWikiPageDBRecord> = {
            title,
            ...this.getSubwikiConditions(subwikiId, wikiId, userId, groupId),
        };

        return site.getDb().getRecord(NEW_PAGES_TABLE_NAME, conditions);
    }

    /**
     * Get the conditions to identify a subwiki in the database.
     *
     * @param subwikiId Subwiki ID.
     * @param wikiId Wiki ID.
     * @param userId User ID.
     * @param groupId Group ID.
     * @returns The conditions to identify a subwiki in the database.
     */
    protected getSubwikiConditions(
        subwikiId?: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
    ): Partial<AddonModWikiPageDBRecord> {
        const conditions: Partial<AddonModWikiPageDBRecord> = {};

        if (subwikiId) {
            // Subwiki ID provided, no need to check the other parameters since subwiki ID is unique and offline pages
            // might not have all the parameters stored.
            conditions.subwikiid = this.convertToPositiveNumber(subwikiId);
        } else {
            conditions.wikiid = this.convertToPositiveNumber(wikiId);
            conditions.userid = this.convertToPositiveNumber(userId);
            conditions.groupid = this.convertToPositiveNumber(groupId);
        }

        return conditions;
    }

    /**
     * Get all the stored new pages from a certain subwiki.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used create subwiki if not informed.
     * @param userId User ID. Optional, will be used create subwiki if not informed.
     * @param groupId Group ID. Optional, will be used create subwiki if not informed.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with pages.
     */
    async getSubwikiNewPages(
        subwikiId?: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
    ): Promise<AddonModWikiPageDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NEW_PAGES_TABLE_NAME, this.getSubwikiConditions(subwikiId, wikiId, userId, groupId));
    }

    /**
     * Get all the stored new pages from a list of subwikis.
     *
     * @param subwikis List of subwiki.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with pages.
     */
    async getSubwikisNewPages(subwikis: AddonModWikiSubwiki[], siteId?: string): Promise<AddonModWikiPageDBRecord[]> {
        let pages: AddonModWikiPageDBRecord[] = [];

        await Promise.all(subwikis.map(async (subwiki) => {
            const subwikiPages = await this.getSubwikiNewPages(subwiki.id, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId);

            pages = pages.concat(subwikiPages);
        }));

        return pages;
    }

    /**
     * Save a new page to be sent later.
     *
     * @param title Title of the page.
     * @param content Content of the page.
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used create subwiki if not informed.
     * @param userId User ID. Optional, will be used create subwiki if not informed.
     * @param groupId Group ID. Optional, will be used create subwiki if not informed.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async saveNewPage(
        title: string,
        content: string,
        subwikiId?: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const now = Date.now();
        const entry: AddonModWikiPageDBRecord = {
            title: title,
            cachedcontent: content,
            subwikiid: this.convertToPositiveNumber(subwikiId),
            wikiid: this.convertToPositiveNumber(wikiId),
            userid: this.convertToPositiveNumber(userId),
            groupid: this.convertToPositiveNumber(groupId),
            contentformat: 'html',
            timecreated: now,
            timemodified: now,
            caneditpage: 1,
        };

        await site.getDb().insertRecord(NEW_PAGES_TABLE_NAME, entry);
    }

    /**
     * Check if a list of subwikis have offline data stored.
     *
     * @param subwikis List of subwikis.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it has offline data.
     */
    async subwikisHaveOfflineData(subwikis: AddonModWikiSubwiki[], siteId?: string): Promise<boolean> {
        try {
            const pages = await this.getSubwikisNewPages(subwikis, siteId);

            return !!pages.length;
        } catch {
            // Error, return false.
            return false;
        }
    }

}

export const AddonModWikiOffline = makeSingleton(AddonModWikiOfflineProvider);
