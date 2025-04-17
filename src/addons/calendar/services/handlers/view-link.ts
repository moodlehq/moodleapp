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
import { Params } from '@angular/router';

import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonCalendar } from '../calendar';
import moment from 'moment-timezone';

const SUPPORTED_VIEWS = ['month', 'mini', 'minithree', 'day', 'upcoming', 'upcoming_mini'];

/**
 * Content links handler for calendar view page.
 */
@Injectable({ providedIn: 'root' })
export class AddonCalendarViewLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonCalendarViewLinkHandler';
    pattern = /\/calendar\/view\.php/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId?: string): Promise<void> => {
                if (!params.view || params.view == 'month' || params.view == 'mini' || params.view == 'minithree') {
                    // Monthly view, open the calendar tab.
                    const stateParams: Params = {
                        courseId: params.course,
                    };
                    const timestamp = params.time ? Number(params.time) * 1000 : Date.now();

                    const momentInstance = moment(timestamp);
                    stateParams.year = momentInstance.year();
                    stateParams.month = momentInstance.month() + 1;

                    await CoreNavigator.navigateToSitePath('/calendar/index', {
                        params: stateParams,
                        siteId,
                        preferCurrentTab: false,
                    });

                } else if (params.view == 'day') {
                    // Daily view, open the page.
                    const stateParams: Params = {
                        courseId: params.course,
                    };
                    const timestamp = params.time ? Number(params.time) * 1000 : Date.now();

                    const momentInstance = moment(timestamp);
                    stateParams.year = momentInstance.year();
                    stateParams.month = momentInstance.month() + 1;
                    stateParams.day = momentInstance.date();

                    await CoreNavigator.navigateToSitePath('/calendar/day', { params: stateParams, siteId });

                } else if (params.view == 'upcoming' || params.view == 'upcoming_mini') {
                    // Upcoming view, open the calendar tab.
                    const stateParams: Params = {
                        courseId: params.course,
                        upcoming: true,
                    };

                    await CoreNavigator.navigateToSitePath('/calendar/index', {
                        params: stateParams,
                        siteId,
                        preferCurrentTab: false,
                    });

                }
            },
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @returns Whether the handler is enabled for the URL and site.
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (params.view && SUPPORTED_VIEWS.indexOf(params.view) == -1) {
            // This type of view isn't supported in the app.
            return false;
        }

        const disabled = await AddonCalendar.isDisabled(siteId);

        return !disabled;
    }

}

export const AddonCalendarViewLinkHandler = makeSingleton(AddonCalendarViewLinkHandlerService);
