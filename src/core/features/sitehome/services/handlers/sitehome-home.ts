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
import { CoreMainMenuHomeHandler, CoreMainMenuHomeHandlerToDisplay } from '@features/mainmenu/services/home-delegate';
import { CoreSiteHome } from '../sitehome';
import { makeSingleton } from '@singletons';

/**
 * Handler to add site home into home page.
 */
@Injectable({ providedIn: 'root' })
export class CoreSiteHomeHomeHandlerService implements CoreMainMenuHomeHandler {

    static readonly PAGE_NAME = 'site';

    name = 'CoreSiteHomeDashboard';
    priority = 1200;

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
        return CoreSiteHome.isAvailable(siteId);
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHomeHandlerToDisplay {
        const site = CoreSites.getCurrentSite();
        const displaySiteHome = site?.getInfo() && site?.getInfo()?.userhomepage === 0;

        return {
            title: 'core.sitehome.sitehome',
            page: CoreSiteHomeHomeHandlerService.PAGE_NAME,
            class: 'core-sitehome-dashboard-handler',
            icon: 'fas-home',
            selectPriority: displaySiteHome ? 1100 : 900,
        };
    }

}

export const CoreSiteHomeHomeHandler = makeSingleton(CoreSiteHomeHomeHandlerService);
