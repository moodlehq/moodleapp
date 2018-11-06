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
import { CoreSiteHomeProvider } from './sitehome';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@core/mainmenu/providers/delegate';
import { CoreCoursesMyOverviewProvider } from '@core/courses/providers/my-overview';

/**
 * Handler to add Site Home into main menu.
 */
@Injectable()
export class CoreSiteHomeMainMenuHandler implements CoreMainMenuHandler {
    name = 'CoreSiteHome';
    priority = 1200;
    isOverviewEnabled: boolean;

    constructor(private siteHomeProvider: CoreSiteHomeProvider, private myOverviewProvider: CoreCoursesMyOverviewProvider) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        // Check if my overview is enabled.
        return this.myOverviewProvider.isEnabled().then((enabled) => {
            if (enabled) {
                // My overview is enabled, Site Home will be inside the overview page.
                return false;
            }

            // My overview not enabled, check if site home is enabled.
            return this.siteHomeProvider.isAvailable();
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreMainMenuHandlerData} Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'home',
            title: 'core.sitehome.sitehome',
            page: 'CoreSiteHomeIndexPage',
            class: 'core-sitehome-handler'
        };
    }
}
