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
import { CoreSite } from '@classes/sites/site';
import { makeSingleton } from '@singletons';
import { CORE_COURSES_MENU_FEATURE_NAME, CoreCoursesMyPageName } from '../constants';
import { CoreCoursesDashboard } from './dashboard';

/**
 * Service that provides some features regarding my courses feature.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesMyService {

    /**
     * Returns whether my courses feature is available in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if available, resolved with false or rejected otherwise.
     */
    async isAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        if (this.isDisabledInSite(site)) {
            return false;
        }

        // Since 5.2.
        const enabled = await site.getBooleanConfig('enablemycourses', false, true);
        if (!enabled) {
            return false;
        }

        siteId = siteId || site.getId();
        if (site.isVersionGreaterEqualThan('4.0')) {
            return await CoreCoursesDashboard.hasBlocks(siteId, CoreCoursesMyPageName.COURSES);
        }

        const { CoreSiteHome } = await import('@features/sitehome/services/sitehome');

        // Dashboard cannot be disabled on 3.5 or 3.6 so it will never show this tab.
        const [dashboardEnabled, siteHomeEnabled] = await Promise.all([
            CoreCoursesDashboard.isAvailable(siteId),
            CoreSiteHome.isAvailable(siteId),
        ]);

        return !dashboardEnabled && !siteHomeEnabled;
    }

    /**
     * Check if My courses is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDisabledInSite(site);
    }

    /**
     * Check if My courses is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        // @TODO: Check why the component name does not match the disabled feature name.
        return !site || site.isFeatureDisabled(CORE_COURSES_MENU_FEATURE_NAME);
    }

}
export const CoreCoursesMy = makeSingleton(CoreCoursesMyService);
