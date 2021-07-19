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
import { CoreMainMenuHomeHandler, CoreMainMenuHomeHandlerToDisplay } from '@features/mainmenu/services/home-delegate';
import { CoreSiteHomeHomeHandler } from '@features/sitehome/services/handlers/sitehome-home';
import { makeSingleton } from '@singletons';
import { CoreCourses } from '../courses';
import { CoreDashboardHomeHandler } from './dashboard-home';

/**
 * Handler to add my courses into home page.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesMyCoursesHomeHandlerService implements CoreMainMenuHomeHandler {

    static readonly PAGE_NAME = 'courses';

    name = 'CoreCoursesMyCourses';
    priority = 900;

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): Promise<boolean> {
        return this.isEnabledForSite();
    }

    /**
     * Check if the handler is enabled on a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Whether or not the handler is enabled on a site level.
     */
    async isEnabledForSite(siteId?: string): Promise<boolean> {
        const disabled = await CoreCourses.isMyCoursesDisabled(siteId);

        if (disabled) {
            return false;
        }

        const dashboardEnabled = await CoreDashboardHomeHandler.isEnabledForSite(siteId);
        const siteHomeEnabled = await CoreSiteHomeHomeHandler.isEnabledForSite(siteId);

        return !dashboardEnabled && !siteHomeEnabled;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHomeHandlerToDisplay {
        return {
            title: 'core.courses.mycourses',
            page: CoreCoursesMyCoursesHomeHandlerService.PAGE_NAME,
            class: 'core-courses-my-courses-handler',
            icon: 'fas-graduation-cap',
            selectPriority: 900,
        };
    }

}

export const CoreCoursesMyCoursesHomeHandler = makeSingleton(CoreCoursesMyCoursesHomeHandlerService);
