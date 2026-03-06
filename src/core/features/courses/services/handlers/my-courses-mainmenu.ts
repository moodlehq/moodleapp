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
import { CoreMainMenuHandler, CoreMainMenuPageNavHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import {
    CORE_COURSES_MY_COURSES_COMPONENT_NAME,
    CORE_COURSES_MYCOURSES_PAGE_NAME,
} from '@features/courses/constants';
import { CoreCoursesMy } from '../my';

/**
 * Handler to add my courses into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesMyCoursesMainMenuHandlerService implements CoreMainMenuHandler {

    // @todo: Check why the component name does not match the disabled feature name.
    name = CORE_COURSES_MY_COURSES_COMPONENT_NAME;
    priority = 900;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return CoreCoursesMy.isAvailable();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuPageNavHandlerData {
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
