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
import { makeSingleton } from '@singletons';
import { CoreCoursesDashboard } from '../dashboard';
import { CORE_COURSES_DASHBOARD_PAGE_NAME } from '@features/courses/constants';

/**
 * Handler to add dashboard into home page.
 */
@Injectable({ providedIn: 'root' })
export class CoreDashboardHomeHandlerService implements CoreMainMenuHomeHandler {

    name = 'CoreCoursesDashboard';
    priority = 1200;

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return CoreCoursesDashboard.isAvailable();
    }

    /**
     * @inheritdoc
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
