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
import { CoreSiteInfoUserHomepage } from '@classes/sites/unauthenticated-site';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreSiteHomeHomeHandler } from '@features/sitehome/services/handlers/sitehome-home';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreCourses } from '../courses';
import { CoreDashboardHomeHandler } from './dashboard-home';
import { CORE_COURSES_MYCOURSES_PAGE_NAME, CoreCoursesMyPageName } from '@features/courses/constants';
import { CoreCoursesDashboard } from '../dashboard';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';

/**
 * Handler to add my courses into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesMyCoursesMainMenuHandlerService implements CoreMainMenuHandler {

    name = 'CoreCoursesMyCourses';
    priority = 900;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        const site = CoreSites.getRequiredCurrentSite();

        const disabled = CoreCourses.isMyCoursesDisabledInSite(site);

        if (disabled) {
            return false;
        }

        const siteId = site.getId();

        if (site.isVersionGreaterEqualThan('4.0')) {
            const blocks = await CoreCoursesDashboard.getDashboardBlocks(
                undefined,
                siteId,
                CoreCoursesMyPageName.COURSES,
            );

            return CoreBlockDelegate.hasSupportedBlock(blocks.mainBlocks) ||
                CoreBlockDelegate.hasSupportedBlock(blocks.sideBlocks);
        }

        // Dashboard cannot be disabled on 3.5 or 3.6 so it will never show this tab.
        const dashboardEnabled = await CoreDashboardHomeHandler.isEnabledForSite(siteId);
        const siteHomeEnabled = await CoreSiteHomeHomeHandler.isEnabledForSite(siteId);

        return !dashboardEnabled && !siteHomeEnabled;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuHandlerData {
        const userHomePage = CoreSites.getCurrentSite()?.getInfo()?.userhomepage;

        const displayMyCourses = userHomePage === CoreSiteInfoUserHomepage.HOMEPAGE_MYCOURSES ||
            userHomePage === CoreSiteInfoUserHomepage.HOMEPAGE_URL;

        return {
            title: 'core.courses.mycourses',
            page: CORE_COURSES_MYCOURSES_PAGE_NAME,
            class: 'core-courses-my-courses-handler',
            icon: 'fas-graduation-cap',
            priority: displayMyCourses ? this.priority + 200 : this.priority,
        };
    }

}

export const CoreCoursesMyCoursesHomeHandler = makeSingleton(CoreCoursesMyCoursesMainMenuHandlerService);
