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
import { CoreBlockHandlerData } from '@features/block/services/block-delegate';
import { CoreBlockBaseHandler } from '@features/block/classes/base-block-handler';
import { CoreCourseBlock } from '@features/course/services/course';
import { Params } from '@angular/router';
import { makeSingleton } from '@singletons';
import { ContextLevel } from '@/core/constants';
import { ADDON_CALENDAR_PAGE_NAME } from '@addons/calendar/constants';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockCalendarMonthHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockCalendarMonth';
    blockName = 'calendar_month';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        // Aspire School: Disable calendar month block - using quick action instead
        return false;
    }

    /**
     * Returns the data needed to render the block.
     *
     * @param block The block to render.
     * @param contextLevel The context where the block will be used.
     * @param instanceId The instance ID associated with the context level.
     * @returns Data or promise resolved with the data.
     */
    async getDisplayData(block: CoreCourseBlock, contextLevel: ContextLevel, instanceId: number): Promise<CoreBlockHandlerData> {
        const linkParams: Params = contextLevel === ContextLevel.COURSE ? { courseId: instanceId } : {};

        const { CoreBlockOnlyTitleComponent } = await import('@features/block/components/only-title-block/only-title-block');

        return {
            title: 'addon.block_calendarmonth.pluginname',
            class: 'addon-block-calendar-month',
            component: CoreBlockOnlyTitleComponent,
            link: ADDON_CALENDAR_PAGE_NAME,
            linkParams: linkParams,
            navOptions: {
                preferCurrentTab: false,
            },
        };
    }

}

export const AddonBlockCalendarMonthHandler = makeSingleton(AddonBlockCalendarMonthHandlerService);
