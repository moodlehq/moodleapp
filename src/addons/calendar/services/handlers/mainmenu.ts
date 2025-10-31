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
import { AddonCalendar } from '../calendar';
import { makeSingleton } from '@singletons';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { ADDON_CALENDAR_PAGE_NAME, ADDONS_CALENDAR_COMPONENT_NAME } from '@addons/calendar/constants';

/**
 * Handler to inject an option into main menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonCalendarMainMenuHandlerService implements CoreMainMenuHandler {

    name = ADDONS_CALENDAR_COMPONENT_NAME;
    priority = 550;

    /**
     * Check if the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return !AddonCalendar.isCalendarDisabledInSite();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'far-calendar',
            title: 'addon.calendar.calendar',
            page: ADDON_CALENDAR_PAGE_NAME,
            class: 'addon-calendar-handler',
        };
    }

}

export const AddonCalendarMainMenuHandler = makeSingleton(AddonCalendarMainMenuHandlerService);
