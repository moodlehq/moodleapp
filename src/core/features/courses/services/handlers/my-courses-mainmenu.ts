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
import { CoreSiteInfoUserHomepage } from '@classes/site';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreSiteHomeHomeHandler } from '@features/sitehome/services/handlers/sitehome-home';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreCourses } from '../courses';
import { CoreDashboardHomeHandler } from './dashboard-home';

/**
 * Handler to add my courses into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesMyCoursesMainMenuHandlerService implements CoreMainMenuHandler {

    static readonly PAGE_NAME = 'courses';

    name = 'CoreCoursesMyCourses';
    priority = 900;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        const site = CoreSites.getRequiredCurrentSite();

        const siteId = site.getId();
        const disabled = await CoreCourses.isMyCoursesDisabled(siteId);

        if (disabled) {
            return false;
        }

        if (site.isVersionGreaterEqualThan('4.0')) {
            return true;
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
        const site = CoreSites.getCurrentSite();

        const displayMyCourses = site?.getInfo() && site?.getInfo()?.userhomepage === CoreSiteInfoUserHomepage.HOMEPAGE_MYCOURSES;

        return {
            title: 'core.courses.mycourses',
            page: CoreCoursesMyCoursesMainMenuHandlerService.PAGE_NAME,
            class: 'core-courses-my-courses-handler',
            icon: 'fas-graduation-cap',
            priority: displayMyCourses ? this.priority + 200 : this.priority,
        };
    }

}

export const CoreCoursesMyCoursesHomeHandler = makeSingleton(CoreCoursesMyCoursesMainMenuHandlerService);
