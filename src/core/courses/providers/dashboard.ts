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
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite } from '@classes/site';
import { AddonBlockTimelineProvider } from '@addon/block/timeline/providers/timeline';

/**
 * Service that provides some features regarding course overview.
 */
@Injectable()
export class CoreCoursesDashboardProvider {

    constructor(private sitesProvider: CoreSitesProvider, private timelineProvider: AddonBlockTimelineProvider) { }

    /**
     * Returns whether or not My Overview is available for a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if available, resolved with false or rejected otherwise.
     */
    isAvailable(siteId?: string): Promise<boolean> {
        return this.timelineProvider.isAvailable(siteId);
    }

    /**
     * Check if My Overview is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_CoreCourses');
    }

    /**
     * Check if My Overview is available and not disabled.
     *
     * @return {Promise<boolean>} Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabled(): Promise<boolean> {
        if (!this.isDisabledInSite()) {
            return this.isAvailable().catch(() => {
                return false;
            });
        }

        return Promise.resolve(false);
    }
}
