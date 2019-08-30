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
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonCalendarProvider } from './calendar';

/**
 * Content links handler for calendar view page.
 */
@Injectable()
export class AddonCalendarViewLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonCalendarViewLinkHandler';
    pattern = /\/calendar\/view\.php/;

    protected SUPPORTED_VIEWS = ['month', 'mini', 'minithree', 'day', 'upcoming', 'upcoming_mini'];

    constructor(private linkHelper: CoreContentLinksHelperProvider, private calendarProvider: AddonCalendarProvider) {
        super();
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId, navCtrl?): void => {
                if (!params.view || params.view == 'month' || params.view == 'mini' || params.view == 'minithree') {
                    // Monthly view, open the calendar tab.
                    const stateParams: any = {
                            courseId: params.course
                        },
                        timestamp = params.time ? params.time * 1000 : Date.now();

                    const date = new Date(timestamp);
                    stateParams.year = date.getFullYear();
                    stateParams.month = date.getMonth() + 1;

                    this.linkHelper.goInSite(navCtrl, 'AddonCalendarIndexPage', stateParams, siteId); // @todo: Add checkMenu param.

                } else if (params.view == 'day') {
                    // Daily view, open the page.
                    const stateParams: any = {
                            courseId: params.course
                        },
                        timestamp = params.time ? params.time * 1000 : Date.now();

                    const date = new Date(timestamp);
                    stateParams.year = date.getFullYear();
                    stateParams.month = date.getMonth() + 1;
                    stateParams.day = date.getDate();

                    this.linkHelper.goInSite(navCtrl, 'AddonCalendarDayPage', stateParams, siteId);

                } else if (params.view == 'upcoming' || params.view == 'upcoming_mini') {
                     // Upcoming view, open the calendar tab.
                    const stateParams: any = {
                            courseId: params.course,
                            upcoming: true,
                        };

                    this.linkHelper.goInSite(navCtrl, 'AddonCalendarIndexPage', stateParams, siteId); // @todo: Add checkMenu param.

                }
            }
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        if (params.view && this.SUPPORTED_VIEWS.indexOf(params.view) == -1) {
            // This type of view isn't supported in the app.
            return false;
        }

        return this.calendarProvider.isDisabled(siteId).then((disabled) => {
            if (disabled) {
                return false;
            }

            return this.calendarProvider.canViewMonth(siteId);
        });
    }
}
