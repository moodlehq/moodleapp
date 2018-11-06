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
import { CoreCoursesProvider } from './courses';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@core/mainmenu/providers/delegate';
import { CoreCoursesMyOverviewProvider } from '../providers/my-overview';

/**
 * Handler to add My Courses or My Overview into main menu.
 */
@Injectable()
export class CoreCoursesMainMenuHandler implements CoreMainMenuHandler {
    name = 'CoreCourses';
    priority = 1100;
    isOverviewEnabled: boolean;

    constructor(private coursesProvider: CoreCoursesProvider, private myOverviewProvider: CoreCoursesMyOverviewProvider) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean | Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        // Check if my overview is enabled.
        return this.myOverviewProvider.isEnabled().then((enabled) => {
            this.isOverviewEnabled = enabled;
            if (enabled) {
                return true;
            }

            // My overview not enabled, check if my courses is enabled.
            return !this.coursesProvider.isMyCoursesDisabledInSite();
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreMainMenuHandlerData} Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        if (this.isOverviewEnabled) {
            return {
                icon: 'home',
                title: 'core.courses.courseoverview',
                page: 'CoreCoursesMyOverviewPage',
                class: 'core-courseoverview-handler'
            };
        } else {
            return {
                icon: 'fa-graduation-cap',
                title: 'core.courses.mycourses',
                page: 'CoreCoursesMyCoursesPage',
                class: 'core-mycourses-handler'
            };
        }
    }
}
