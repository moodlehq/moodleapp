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
import { CoreDashboardHomeHandler } from '@features/courses/services/handlers/dashboard-home';
import { CoreSiteHomeHomeHandler } from '@features/sitehome/services/handlers/sitehome-home';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '../mainmenu-delegate';

/**
 * Handler to add Home into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreMainMenuHomeHandlerService implements CoreMainMenuHandler {

    static readonly PAGE_NAME = 'home';

    name = 'CoreHome';
    priority = 1000;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        const siteId = CoreSites.getCurrentSiteId();

        const dashboardEnabled = await CoreDashboardHomeHandler.isEnabledForSite(siteId);
        const siteHomeEnabled = await CoreSiteHomeHomeHandler.isEnabledForSite(siteId);

        return dashboardEnabled || siteHomeEnabled;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fas-gauge-high',
            title: 'core.mainmenu.home',
            page: CoreMainMenuHomeHandlerService.PAGE_NAME,
            class: 'core-home-handler',
        };
    }

}

export const CoreMainMenuHomeHandler = makeSingleton(CoreMainMenuHomeHandlerService);
