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
import { CoreDatabaseTable } from '@classes/database/database-table';
import { makeSingleton } from '@singletons';
import { asyncInstance } from '../utils/async-instance';
import {
    APP_SCHEMA,
    CORE_APP_BADGE_TABLE_NAME,
    CORE_APP_BADGE_TABLE_PRIMARY_KEYS,
    CoreAppBadgeDBPrimaryKeys,
    CoreAppBadgeDBRecord,
} from './database/app-badge';
import { CoreDatabaseTableProxy, CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import { MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT } from '@features/mainmenu/constants';
import { CoreEvents } from '@static/events';
import { CoreAppDB } from './app-db';
import { CoreLogger } from '@static/logger';
import { Badge } from '@capawesome/capacitor-badge';
import { CorePlatform } from './platform';
import { CoreSites } from './sites';

/**
 * Service to manage the app badge.
 */
@Injectable({ providedIn: 'root' })
export class CoreAppBadgeService {

    protected badgesTable =
        asyncInstance<CoreDatabaseTable<CoreAppBadgeDBRecord, CoreAppBadgeDBPrimaryKeys>>();

    protected logger = CoreLogger.getInstance('CoreAppBadgeService');
    protected badgeCounterHandlers: Record<string, string> = {};

    /**
     * Initialize the service.
     */
    async initialize(): Promise<void> {
        await this.initializeDatabase();

        CoreEvents.on(CoreEvents.SITE_DELETED, async (site) => {
            try {
                await this.deleteSiteCounters(site.getId());
            } catch (error) {
                this.logger.warn('Can\'t clean site counters', error);
            }
        });

        CoreEvents.on(MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT, (data) => {
            this.updateAddonCounter(data.handler, data.value, data.siteId);
        });
    }

    /**
     * Initialize database.
     */
    protected async initializeDatabase(): Promise<void> {
        await CoreAppDB.createTablesFromSchema(APP_SCHEMA);

        const database = CoreAppDB.getDB();
        const badgesTable = CoreDatabaseTableProxy.createInstance<
            CoreAppBadgeDBRecord,
            CoreAppBadgeDBPrimaryKeys
        >(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            database,
            CORE_APP_BADGE_TABLE_NAME,
            [...CORE_APP_BADGE_TABLE_PRIMARY_KEYS],
        );

        await badgesTable.initialize();

        this.badgesTable.setInstance(badgesTable);
    }

    /**
     * Delete all counters for a given site.
     *
     * @param siteId Site ID.
     */
    protected async deleteSiteCounters(siteId: string): Promise<void> {
        try {
            await this.badgesTable.delete({ siteId });
        } finally {
            await this.updateAppCounter();
        }
    }

    /**
     * Update Counter for an addon. It will update the refered siteId counter and the total badge.
     * It will return the updated addon counter.
     *
     * @param addon Registered addon name to set the badge number.
     * @param counter The number to be stored.
     * @param siteId Site ID. If not defined, use current site.
     */
    protected async updateAddonCounter(addon: string, counter: number, siteId?: string): Promise<void> {
        if (!this.isBadgeCounterHandlerRegistered(addon)) {
            return;
        }

        siteId = siteId ?? CoreSites.getCurrentSiteId();

        await this.saveBadgeCounter(counter, siteId, addon);
        await this.updateSiteCounter(siteId);
    }

    /**
     * Update total badge counter of the app.
     */
    protected async updateAppCounter(): Promise<void> {
        // Set the app badge only on mobile.
        if (!CorePlatform.isMobile()) {
            return;
        }

        const sitesIds = await CoreSites.getSitesIds();

        const counters = await Promise.all(sitesIds.map((siteId) => this.getBadgeCounter(siteId)));

        const total = counters.reduce((previous, counter) => previous + counter, 0);

        await Badge.set({
            count: total,
        });
    }

    /**
     * Update counter for a site using the stored addon data. It will update the total badge application number.
     * It will return the updated site counter.
     *
     * @param siteId Site ID.
     */
    protected async updateSiteCounter(siteId: string): Promise<void> {
        const addons = this.badgeCounterHandlers;

        const counters = await Promise.all(
            Object.keys(addons).map((addon) => this.getBadgeCounter(siteId, addon)),
        );

        const total = counters.reduce((previous, counter) => previous + counter, 0);

        // Save the counter on site.
        await this.saveBadgeCounter(total, siteId);

        await this.updateAppCounter();
    }

    /**
     * Get the addon/site badge counter from the database.
     *
     * @param siteId Site ID.
     * @param component Registered component name. If not defined it will get the site total.
     * @returns Promise resolved with the stored badge counter for the component or site or 0 if none.
     */
    protected async getBadgeCounter(siteId: string, component = 'site'): Promise<number> {
        try {
            const entry = await this.badgesTable.getOne({ siteId, component });

            return entry?.counter || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Get site counter from the database.
     *
     * @param siteId Site ID.
     * @returns Promise resolved with the stored badge counter for the site. Or 0 if none.
     */
    async getSiteCounter(siteId: string): Promise<number> {
        return this.getBadgeCounter(siteId);
    }

    /**
     * Save the addon/site badge counter on the database.
     *
     * @param counter The number to be stored.
     * @param siteId Site ID.
     * @param component Registered component name. If not defined it will store the site total.
     */
    protected async saveBadgeCounter(counter: number, siteId: string, component = 'site'): Promise<void> {
        await this.badgesTable.insert({
            siteId,
            component,
            counter,
        });
    }

    /**
     * Register a push notifications handler for update badge counter.
     *
     * @param name Handler's name.
     */
    registerBadgeCounterHandler(name: string): void {
        if (this.isBadgeCounterHandlerRegistered(name)) {
            this.logger.log(`Handler '${name}' as badge counter handler already registered.`);

            return;
        }

        this.logger.debug(`Registered handler '${name}' as badge counter handler.`);
        this.badgeCounterHandlers[name] = name;
    }

    /**
     * Check if a counter handler is present.
     *
     * @param name Handler's name.
     * @returns If handler name is present.
     */
    protected isBadgeCounterHandlerRegistered(name: string): boolean {
        return this.badgeCounterHandlers[name] !== undefined;
    }

}
export const CoreAppBadge = makeSingleton(CoreAppBadgeService);
