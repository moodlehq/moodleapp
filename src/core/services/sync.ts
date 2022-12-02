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
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { SYNC_TABLE_NAME, CoreSyncRecord } from '@services/database/sync';

/*
 * Service that provides some features regarding synchronization.
*/
@Injectable({ providedIn: 'root' })
export class CoreSyncProvider {

    // Store blocked sync objects.
    protected blockedItems: { [siteId: string]: { [blockId: string]: { [operation: string]: boolean } } } = {};

    constructor() {
        // Unblock all blocks on logout.
        CoreEvents.on(CoreEvents.LOGOUT, (data: {siteId: string}) => {
            this.clearAllBlocks(data.siteId);
        });
    }

    /**
     * Block a component and ID so it cannot be synchronized.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @param operation Operation name. If not defined, a default text is used.
     * @param siteId Site ID. If not defined, current site.
     */
    blockOperation(component: string, id: string | number, operation?: string, siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncBlockId(component, id);

        if (!this.blockedItems[siteId]) {
            this.blockedItems[siteId] = {};
        }

        if (!this.blockedItems[siteId][uniqueId]) {
            this.blockedItems[siteId][uniqueId] = {};
        }

        operation = operation || '-';

        this.blockedItems[siteId][uniqueId][operation] = true;
    }

    /**
     * Clear all blocks for a site or all sites.
     *
     * @param siteId If set, clear the blocked objects only for this site. Otherwise clear them for all sites.
     */
    clearAllBlocks(siteId?: string): void {
        if (siteId) {
            delete this.blockedItems[siteId];
        } else {
            this.blockedItems = {};
        }
    }

    /**
     * Clear all blocks for a certain component.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @param siteId Site ID. If not defined, current site.
     */
    clearBlocks(component: string, id: string | number, siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncBlockId(component, id);
        if (this.blockedItems[siteId]) {
            delete this.blockedItems[siteId][uniqueId];
        }
    }

    /**
     * Returns a sync record.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @param siteId Site ID. If not defined, current site.
     * @returns Record if found or reject.
     */
    async getSyncRecord(component: string, id: string | number, siteId?: string): Promise<CoreSyncRecord> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getRecord(SYNC_TABLE_NAME, { component: component, id: String(id) });
    }

    /**
     * Inserts or Updates info of a sync record.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @param data Data that updates the record.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with done.
     */
    async insertOrUpdateSyncRecord(
        component: string,
        id: string | number,
        data: Partial<CoreSyncRecord>,
        siteId?: string,
    ): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);

        data.component = component;
        data.id = String(id);

        await db.insertRecord(SYNC_TABLE_NAME, data);
    }

    /**
     * Convenience function to create unique identifiers for a component and id.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @returns Unique sync id.
     */
    protected getUniqueSyncBlockId(component: string, id: string | number): string {
        return component + '#' + id;
    }

    /**
     * Check if a component is blocked.
     * One block can have different operations. Here we check how many operations are being blocking the object.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether it's blocked.
     */
    isBlocked(component: string, id: string | number, siteId?: string): boolean {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!this.blockedItems[siteId]) {
            return false;
        }

        const uniqueId = this.getUniqueSyncBlockId(component, id);
        if (!this.blockedItems[siteId][uniqueId]) {
            return false;
        }

        return Object.keys(this.blockedItems[siteId][uniqueId]).length > 0;
    }

    /**
     * Unblock an operation on a component and ID.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @param operation Operation name. If not defined, a default text is used.
     * @param siteId Site ID. If not defined, current site.
     */
    unblockOperation(component: string, id: string | number, operation?: string, siteId?: string): void {
        operation = operation || '-';
        siteId = siteId || CoreSites.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncBlockId(component, id);

        if (this.blockedItems[siteId] && this.blockedItems[siteId][uniqueId]) {
            delete this.blockedItems[siteId][uniqueId][operation];
        }
    }

}

export const CoreSync = makeSingleton(CoreSyncProvider);
