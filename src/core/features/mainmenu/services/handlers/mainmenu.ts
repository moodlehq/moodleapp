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
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '../mainmenu-delegate';

/**
 * Handler to add Home into main menu.
 */
Injectable();
export class CoreHomeMainMenuHandler implements CoreMainMenuHandler {

    name = 'CoreHome';
    priority = 1100;

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async isEnabledForSite(siteId?: string): Promise<boolean> {
        // @todo
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fa-home',
            title: 'core.mainmenu.home',
            page: 'home',
            // @todo: subPage? The page can change due to core-tabs.
            class: 'core-home-handler',
        };
    }

}
