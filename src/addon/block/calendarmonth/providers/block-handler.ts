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

import { Injectable, Injector } from '@angular/core';
import { CoreBlockHandlerData } from '@core/block/providers/delegate';
import { CoreBlockOnlyTitleComponent } from '@core/block/components/only-title-block/only-title-block';
import { CoreBlockBaseHandler } from '@core/block/classes/base-block-handler';
import { AddonCalendarProvider } from '@addon/calendar/providers/calendar';

/**
 * Block handler.
 */
@Injectable()
export class AddonBlockCalendarMonthHandler extends CoreBlockBaseHandler {
    name = 'AddonBlockCalendarMonth';
    blockName = 'calendar_month';

    constructor(private calendarProvider: AddonCalendarProvider) {
        super();
    }

    /**
     * Returns the data needed to render the block.
     *
     * @param {Injector} injector Injector.
     * @param {any} block The block to render.
     * @param {string} contextLevel The context where the block will be used.
     * @param {number} instanceId The instance ID associated with the context level.
     * @return {CoreBlockHandlerData|Promise<CoreBlockHandlerData>} Data or promise resolved with the data.
     */
    getDisplayData(injector: Injector, block: any, contextLevel: string, instanceId: number)
            : CoreBlockHandlerData | Promise<CoreBlockHandlerData> {

        let link = 'AddonCalendarListPage';
        const linkParams: any = contextLevel == 'course' ? { courseId: instanceId } : {};

        if (this.calendarProvider.canViewMonthInSite()) {
            link = 'AddonCalendarIndexPage';
        }

        return {
            title: 'addon.block_calendarmonth.pluginname',
            class: 'addon-block-calendar-month',
            component: CoreBlockOnlyTitleComponent,
            link: link,
            linkParams: linkParams
        };
    }
}
