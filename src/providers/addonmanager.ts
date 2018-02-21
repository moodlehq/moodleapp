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
import { CoreEventsProvider } from './events';
import { CoreLoggerProvider } from './logger';
import { CoreSitesProvider } from './sites';
import { CoreSiteWSPreSets } from '../classes/site';
import { CoreUtilsProvider } from './utils/utils';
import { CoreSiteAddonsProvider } from '../core/siteaddons/providers/siteaddons';
import { CoreSiteAddonsHelperProvider } from '../core/siteaddons/providers/helper';

/**
 * Provider with some helper functions regarding addons.
 */
@Injectable()
export class CoreAddonManagerProvider {

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            private siteAddonsProvider: CoreSiteAddonsProvider, private siteAddonsHelperProvider: CoreSiteAddonsHelperProvider,
            private utils: CoreUtilsProvider) {
        logger = logger.getInstance('CoreAddonManagerProvider');

        // Fetch the addons on login.
        eventsProvider.on(CoreEventsProvider.LOGIN, () => {
            const siteId = this.sitesProvider.getCurrentSiteId();
            this.fetchSiteAddons(siteId).then((addons) => {
                // Addons fetched, check that site hasn't changed.
                if (siteId == this.sitesProvider.getCurrentSiteId() && addons.length) {
                    // Site is still the same. Load the addons and trigger the event.
                    this.loadSiteAddons(addons).then(() => {
                        eventsProvider.trigger(CoreEventsProvider.SITE_ADDONS_LOADED, {}, siteId);
                    });

                }
            });
        });

        // Unload addons on logout if any.
        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            // @todo: Unload site addons.
        });
    }

    /**
     * Fetch site addons.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved when done. Returns the list of addons to load.
     */
    fetchSiteAddons(siteId?: string): Promise<any[]> {
        const addons = [];

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!this.siteAddonsProvider.isGetContentAvailable(site)) {
                // Cannot load site addons, so there's no point to fetch them.
                return addons;
            }

            // Get the list of addons. Try not to use cache.
            return site.read('tool_mobile_get_plugins_supporting_mobile', {}, { getFromCache: false }).then((data) => {
                data.plugins.forEach((addon: any) => {
                    // Check if it's a site addon and it's enabled.
                    if (this.siteAddonsHelperProvider.isSiteAddonEnabled(addon, site)) {
                        addons.push(addon);
                    }
                });

                return addons;
            });
        });
    }

    /**
     * Load site addons.
     *
     * @param {any[]} addons The addons to load.
     * @return {Promise<any>} Promise resolved when loaded.
     */
    loadSiteAddons(addons: any[]): Promise<any> {
        const promises = [];

        addons.forEach((addon) => {
            promises.push(this.siteAddonsHelperProvider.loadSiteAddon(addon));
        });

        return this.utils.allPromises(promises);
    }
}
