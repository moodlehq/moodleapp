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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { MAIN_MENU_HOME_PAGE_NAME } from '@features/mainmenu/constants';
import { CORE_COURSES_DASHBOARD_PAGE_NAME } from '@features/courses/constants';
import { CoreCoursesDashboard } from '../dashboard';

/**
 * Handler to treat links to dashboard.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesDashboardLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreCoursesDashboardLinkHandler';
    pattern = /\/my\/?$/;

    /**
     * @inheritdoc
     */
    getActions(): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId): Promise<void> => {
                // Use redirect to select the tab.
                await CoreNavigator.navigateToSitePath(
                    `/${MAIN_MENU_HOME_PAGE_NAME}/${CORE_COURSES_DASHBOARD_PAGE_NAME}`,
                    {
                        siteId,
                        preferCurrentTab: false,
                    },
                );
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string): Promise<boolean> {
        return CoreCoursesDashboard.isAvailable(siteId);
    }

}

export const CoreCoursesDashboardLinkHandler = makeSingleton(CoreCoursesDashboardLinkHandlerService);
