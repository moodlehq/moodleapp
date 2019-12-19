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
import { CoreSitesProvider } from '@providers/sites';
import { CoreCoursesProvider } from './courses';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@core/mainmenu/providers/delegate';
import { CoreCoursesDashboardProvider } from '../providers/dashboard';
import { CoreSiteHomeProvider } from '@core/sitehome/providers/sitehome';
import { AddonBlockTimelineProvider } from '@addon/block/timeline/providers/timeline';
import { CoreBlockDelegate } from '@core/block/providers/delegate';

/**
 * Handler to add Dashboard into main menu.
 */
@Injectable()
export class CoreDashboardMainMenuHandler implements CoreMainMenuHandler {
    name = 'CoreHome'; // This handler contains several different features, so we use a generic name like "CoreHome".
    priority = 1100;

    constructor(private coursesProvider: CoreCoursesProvider, private dashboardProvider: CoreCoursesDashboardProvider,
        private siteHomeProvider: CoreSiteHomeProvider, private timelineProvider: AddonBlockTimelineProvider,
        private blockDelegate: CoreBlockDelegate, private sitesProvider: CoreSitesProvider) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.isEnabledForSite();
    }

    /**
     * Check if the handler is enabled on a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabledForSite(siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];
        let blocksEnabled,
            dashboardAvailable;

        // Check if blocks and 3.6 dashboard is enabled.
        promises.push(this.blockDelegate.areBlocksDisabled(siteId).then((disabled) => {
            blocksEnabled = !disabled;
        }));

        promises.push(this.dashboardProvider.isAvailable().then((available) => {
            dashboardAvailable = available;
        }));

        // Check if 3.6 dashboard is enabled.
        return Promise.all(promises).then(() => {
            if (dashboardAvailable && blocksEnabled) {
                return true;
            }

            // Check if my overview is enabled.
            return this.timelineProvider.isAvailable().then((enabled) => {
                if (enabled && blocksEnabled) {
                    return true;
                }

                return this.siteHomeProvider.isAvailable().then((enabled) => {
                    // Show in case siteHome is enabled.
                    if (enabled) {
                        return true;
                    }

                    // My overview not enabled, check if my courses is enabled.
                    return !this.coursesProvider.isMyCoursesDisabledInSite();
                });
            });
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'home',
            title: 'core.courses.mymoodle',
            page: 'CoreCoursesDashboardPage',
            class: 'core-dashboard-handler'
        };
    }
}
