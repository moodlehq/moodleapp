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
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreMainMenuHomeHandler, CoreMainMenuHomeHandlerToDisplay } from '@features/mainmenu/services/home-delegate';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreCoursesDashboard } from '../dashboard';
import { CORE_COURSES_DASHBOARD_PAGE_NAME } from '@features/courses/constants';

/**
 * Handler to add dashboard into home page.
 */
@Injectable({ providedIn: 'root' })
export class CoreDashboardHomeHandlerService implements CoreMainMenuHomeHandler {

    name = 'CoreCoursesDashboard';
    priority = 1200;
    logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreDashboardHomeHandlerService');
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    isEnabled(): Promise<boolean> {
        return this.isEnabledForSite();
    }

    /**
     * Check if the handler is enabled on a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether or not the handler is enabled on a site level.
     */
    async isEnabledForSite(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        // Check if blocks and 3.6 dashboard is enabled.
        const [blocksDisabled, dashboardDisabled, dashboardAvailable, dashboardConfig] = await Promise.all([
            CoreBlockDelegate.areBlocksDisabled(site.getId()),
            CoreCoursesDashboard.isDisabled(site.getId()),
            CoreCoursesDashboard.isAvailable(site.getId()),
            CorePromiseUtils.ignoreErrors(site.getConfig('enabledashboard'), '1'),
        ]);
        const dashboardEnabled = !dashboardDisabled && dashboardConfig !== '0';

        if (dashboardAvailable && dashboardEnabled && !blocksDisabled) {
            try {
                const blocks = await CoreCoursesDashboard.getDashboardBlocks(undefined, siteId);

                return CoreBlockDelegate.hasSupportedBlock(blocks.mainBlocks) ||
                    CoreBlockDelegate.hasSupportedBlock(blocks.sideBlocks);
            } catch (error) {
                // Error getting blocks, assume it's enabled.
                this.logger.error('Error getting Dashboard blocks', error);

                return true;
            }
        }

        // Dashboard is enabled but not available, we will fake blocks.
        return dashboardEnabled && !blocksDisabled;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHomeHandlerToDisplay {
        return {
            title: 'core.courses.mymoodle',
            page: CORE_COURSES_DASHBOARD_PAGE_NAME,
            class: 'core-courses-dashboard-handler',
            icon: 'fas-gauge-high',
        };
    }

}

export const CoreDashboardHomeHandler = makeSingleton(CoreDashboardHomeHandlerService);
