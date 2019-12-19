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

import { Injectable, Injector } from '@angular/core';
import { CoreBlockHandlerData } from '@core/block/providers/delegate';
import { CoreBlockOnlyTitleComponent } from '@core/block/components/only-title-block/only-title-block';
import { CoreBlockBaseHandler } from '@core/block/classes/base-block-handler';
import { AddonCalendarProvider } from '@addon/calendar/providers/calendar';

/**
 * Block handler.
 */
@Injectable()
export class AddonBlockCalendarUpcomingHandler extends CoreBlockBaseHandler {
    name = 'AddonBlockCalendarUpcoming';
    blockName = 'calendar_upcoming';

    constructor(private calendarProvider: AddonCalendarProvider) {
        super();
    }

    /**
     * Returns the data needed to render the block.
     *
     * @param injector Injector.
     * @param block The block to render.
     * @param contextLevel The context where the block will be used.
     * @param instanceId The instance ID associated with the context level.
     * @return Data or promise resolved with the data.
     */
    getDisplayData(injector: Injector, block: any, contextLevel: string, instanceId: number)
            : CoreBlockHandlerData | Promise<CoreBlockHandlerData> {

        let link = 'AddonCalendarListPage';
        const linkParams: any = contextLevel == 'course' ? { courseId: instanceId } : {};

        if (this.calendarProvider.canViewMonthInSite()) {
            link = 'AddonCalendarIndexPage';
            linkParams.upcoming = true;
        }

        return {
            title: 'addon.block_calendarupcoming.pluginname',
            class: 'addon-block-calendar-upcoming',
            component: CoreBlockOnlyTitleComponent,
            link: link,
            linkParams: linkParams
        };
    }
}
