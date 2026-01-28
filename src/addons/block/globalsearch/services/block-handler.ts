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
import { makeSingleton } from '@singletons';
import { CoreCourseBlock } from '@features/course/services/course';
import { CORE_SEARCH_PAGE_NAME } from '@features/search/constants';
import { CoreSearchGlobalSearch } from '@features/search/services/global-search';
import { ContextLevel } from '@/core/constants';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockGlobalSearchHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockGlobalSearch';
    blockName = 'globalsearch';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return CoreSearchGlobalSearch.isEnabled();
    }

    /**
     * @inheritdoc
     */
    async getDisplayData(
        block: CoreCourseBlock,
        contextLevel: ContextLevel,
        instanceId: number,
    ): Promise<CoreBlockHandlerData | undefined> {
        const isCourseSearch = contextLevel === ContextLevel.COURSE;

        const { CoreBlockOnlyTitleComponent } = await import('@features/block/components/only-title-block/only-title-block');

        return {
            title: isCourseSearch ? 'core.search' : 'addon.block_globalsearch.pluginname',
            class: 'addon-block-globalsearch',
            component: CoreBlockOnlyTitleComponent,
            link: CORE_SEARCH_PAGE_NAME,
            linkParams: isCourseSearch ? { courseId: instanceId } : {},
        };
    }

}

export const AddonBlockGlobalSearchHandler = makeSingleton(AddonBlockGlobalSearchHandlerService);
