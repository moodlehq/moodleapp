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

import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { makeSingleton } from '@singletons';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreSites } from '@services/sites';

/**
 * Handler to add financial overview tab to main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreFinancialMainMenuHandlerService implements CoreMainMenuHandler {

    static readonly PAGE_NAME = 'financial';

    name = 'CoreFinancial';
    priority = 350; // Lower priority than main tabs but higher than More

    /**
     * Check if the handler is enabled for a user on a site.
     *
     * @returns Whether the handler is enabled.
     */
    async isEnabled(): Promise<boolean> {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return false;
        }

        try {
            // Check if we're currently using a mentee token (parent viewing as child)
            const originalToken = await site.getLocalSiteConfig<string>(`CoreUserParent:originalToken:${site.getId()}`);
            if (originalToken && originalToken !== '') {
                // We're a parent viewing as child, show the financial tab
                return true;
            }

            // Otherwise, check if user has children (mentees)
            const mentees = await CoreUserParent.getMentees(site.getId());
            // Show if user has any mentees/children
            return mentees && mentees.length > 0;
        } catch (error) {
            // If there's an error, still show the tab and let the page handle it
            return true;
        }
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fas-dollar-sign',
            title: 'core.financial',
            page: CoreFinancialMainMenuHandlerService.PAGE_NAME,
            class: 'core-financial-handler',
        };
    }

}

export const CoreFinancialMainMenuHandler = makeSingleton(CoreFinancialMainMenuHandlerService);