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

import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { ADDON_MOD_CHAT_PREFETCH_COMPONENT, ADDON_MOD_CHAT_PREFETCH_MODNAME, ADDON_MOD_CHAT_PREFETCH_NAME } from '../../constants';
import { CoreCourseModulePrefetchHandler } from '@features/course/services/module-prefetch-delegate';
import { asyncInstance } from '@/core/utils/async-instance';
import type { AddonModChatPrefetchHandlerLazyService } from './prefetch-lazy';

export class AddonModChatPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = ADDON_MOD_CHAT_PREFETCH_NAME;
    modName = ADDON_MOD_CHAT_PREFETCH_MODNAME;
    component = ADDON_MOD_CHAT_PREFETCH_COMPONENT;

}

/**
 * Get prefetch handler instance.
 *
 * @returns Prefetch handler.
 */
export function getPrefetchHandlerInstance(): CoreCourseModulePrefetchHandler {
    const lazyHandler = asyncInstance<
        AddonModChatPrefetchHandlerLazyService,
        AddonModChatPrefetchHandlerService
    >(async () => {
        const { AddonModChatPrefetchHandler } = await import('./prefetch-lazy');

        return AddonModChatPrefetchHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModChatPrefetchHandlerService());
    lazyHandler.setLazyMethods([]);
    lazyHandler.setLazyOverrides([
        'prefetch',
        'invalidateModule',
        'invalidateContent',
    ]);

    return lazyHandler;
}
