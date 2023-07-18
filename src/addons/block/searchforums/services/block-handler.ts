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
import { CoreBlockOnlyTitleComponent } from '@features/block/components/only-title-block/only-title-block';
import { CoreBlockBaseHandler } from '@features/block/classes/base-block-handler';
import { makeSingleton } from '@singletons';
import { FORUM_SEARCH_PAGE_NAME } from '@addons/mod/forum/forum.module';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreSearchGlobalSearch } from '@features/search/services/global-search';

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
        const enabled = await CoreSearchGlobalSearch.isEnabled();

        if (!enabled) {
            return false;
        }

        const forumSearchAreas = ['mod_forum-activity', 'mod_forum-post'];
        const searchAreas = await CoreSearchGlobalSearch.getSearchAreas();

        return searchAreas.some(({ id }) => forumSearchAreas.includes(id));
    }

    /**
     * @inheritdoc
     */
    getDisplayData(block: CoreCourseBlock, contextLevel: string, instanceId: number): CoreBlockHandlerData | undefined {
        if (contextLevel !== 'course') {
            return;
        }

        return {
            title: 'addon.block_searchforums.pluginname',
            class: 'addon-block-search-forums',
            component: CoreBlockOnlyTitleComponent,
            link: FORUM_SEARCH_PAGE_NAME,
            linkParams: { courseId: instanceId },
        };
    }

}

export const AddonBlockSearchForumsHandler = makeSingleton(AddonBlockSearchForumsHandlerService);
