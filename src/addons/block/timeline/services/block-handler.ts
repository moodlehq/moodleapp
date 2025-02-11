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
import { CoreSites } from '@services/sites';
import { CoreBlockHandlerData } from '@features/block/services/block-delegate';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreBlockBaseHandler } from '@features/block/classes/base-block-handler';
import { makeSingleton } from '@singletons';
import { CoreCoursesDashboard } from '@features/courses/services/dashboard';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockTimelineHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockTimeline';
    blockName = 'timeline';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        const enabled = !CoreCoursesDashboard.isDisabledInSite();
        const currentSite = CoreSites.getCurrentSite();

        return enabled && ((currentSite && currentSite.isVersionGreaterEqualThan('3.6')) ||
            !CoreCourses.isMyCoursesDisabledInSite());
    }

    /**
     * @inheritdoc
     */
    async getDisplayData(): Promise<CoreBlockHandlerData> {
        const { AddonBlockTimelineComponent } = await import('../components/timeline/timeline');

        return {
            title: 'addon.block_timeline.pluginname',
            class: 'addon-block-timeline',
            component: AddonBlockTimelineComponent,
        };
    }

}

export const AddonBlockTimelineHandler = makeSingleton(AddonBlockTimelineHandlerService);
