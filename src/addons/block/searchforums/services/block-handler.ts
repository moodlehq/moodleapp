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
import { ADDON_MOD_FORUM_SEARCH_PAGE_NAME } from '@addons/mod/forum/constants';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreSearchGlobalSearch } from '@features/search/services/global-search';
import { ContextLevel } from '@/core/constants';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockSearchForumsHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockSearchForums';
    blockName = 'search_forums';

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
    ): Promise<undefined | CoreBlockHandlerData> {
        if (contextLevel !== ContextLevel.COURSE) {
            return;
        }

        const forumSearchAreas = ['mod_forum-activity', 'mod_forum-post'];
        const searchAreas = await CoreSearchGlobalSearch.getSearchAreas();

        if (!searchAreas.some(({ id }) => forumSearchAreas.includes(id))) {
            return;
        }

        const { CoreBlockOnlyTitleComponent } = await import('@features/block/components/only-title-block/only-title-block');

        return {
            title: 'addon.block_searchforums.pluginname',
            class: 'addon-block-search-forums',
            component: CoreBlockOnlyTitleComponent,
            link: ADDON_MOD_FORUM_SEARCH_PAGE_NAME,
            linkParams: { courseId: instanceId },
        };
    }

}

export const AddonBlockSearchForumsHandler = makeSingleton(AddonBlockSearchForumsHandlerService);
