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
import { CoreEventsProvider } from './events';
import { CoreSitesProvider, CoreSiteSchema } from './sites';

/*
 * Service that provides some features regarding synchronization.
*/
@Injectable()
export class CoreSyncProvider {

    // Variables for the database.
    protected SYNC_TABLE = 'sync';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreSyncProvider',
        version: 1,
        tables: [
            {
                name: this.SYNC_TABLE,
                columns: [
                    {
                        name: 'component',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'id',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'time',
                        type: 'INTEGER'
                    },
                    {
                        name: 'warnings',
                        type: 'TEXT'
                    }
                ],
                primaryKeys: ['component', 'id']
            }
        ]
    };

    // Store blocked sync objects.
    protected blockedItems: { [siteId: string]: { [blockId: string]: { [operation: string]: boolean } } } = {};

    constructor(eventsProvider: CoreEventsProvider, private sitesProvider: CoreSitesProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);

        // Unblock all blocks on logout.
        eventsProvider.on(CoreEventsProvider.LOGOUT, (data) => {
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
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

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
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncBlockId(component, id);
        if (this.blockedItems[siteId]) {
            delete this.blockedItems[siteId][uniqueId];
        }
    }

    /**
     * Returns a sync record.
     * @param component Component name.
     * @param id Unique ID per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Record if found or reject.
     */
    getSyncRecord(component: string, id: string | number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecord(this.SYNC_TABLE, { component: component, id: id });
        });
    }

    /**
     * Inserts or Updates info of a sync record.
     * @param component Component name.
     * @param id Unique ID per component.
     * @param data Data that updates the record.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with done.
     */
    insertOrUpdateSyncRecord(component: string, id: string | number, data: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            data.component = component;
            data.id = id;

            return db.insertRecord(this.SYNC_TABLE, data);
        });
    }

    /**
     * Convenience function to create unique identifiers for a component and id.
     *
     * @param component Component name.
     * @param id Unique ID per component.
     * @return Unique sync id.
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
     * @return Whether it's blocked.
     */
    isBlocked(component: string, id: string | number, siteId?: string): boolean {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

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
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncBlockId(component, id);

        if (this.blockedItems[siteId] && this.blockedItems[siteId][uniqueId]) {
            delete this.blockedItems[siteId][uniqueId][operation];
        }
    }
}
