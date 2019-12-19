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
import { AddonCalendarProvider } from './calendar';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@core/mainmenu/providers/delegate';

/**
 * Handler to inject an option into main menu.
 */
@Injectable()
export class AddonCalendarMainMenuHandler implements CoreMainMenuHandler {
    name = 'AddonCalendar';
    priority = 900;

    constructor(private calendarProvider: AddonCalendarProvider) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return !this.calendarProvider.isCalendarDisabledInSite();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'calendar',
            title: 'addon.calendar.calendar',
            page: this.calendarProvider.canViewMonthInSite() ? 'AddonCalendarIndexPage' : 'AddonCalendarListPage',
            class: 'addon-calendar-handler'
        };
    }
}
