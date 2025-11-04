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
import { ADDON_BLOCK_MYOVERVIEW_BLOCK_NAME } from '../constants';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockMyOverviewHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockMyOverview';
    blockName = ADDON_BLOCK_MYOVERVIEW_BLOCK_NAME;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return (CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.6')) ||
            !CoreCourses.isMyCoursesDisabledInSite();
    }

    /**
     * @inheritdoc
     */
    async getDisplayData(): Promise<CoreBlockHandlerData> {
        const { AddonBlockMyOverviewComponent } = await import('../components/myoverview/myoverview');

        return {
            title: 'addon.block_myoverview.pluginname',
            class: 'addon-block-myoverview',
            component: AddonBlockMyOverviewComponent,
        };
    }

}

export const AddonBlockMyOverviewHandler = makeSingleton(AddonBlockMyOverviewHandlerService);
