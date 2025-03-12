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

import { asyncInstance } from '@/core/utils/async-instance';
import {
    ADDON_MOD_WIKI_COMPONENT,
    ADDON_MOD_WIKI_COMPONENT_LEGACY,
    ADDON_MOD_WIKI_MODNAME,
} from '@addons/mod/wiki/constants';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseModulePrefetchHandler } from '@features/course/services/module-prefetch-delegate';
import type { AddonModWikiPrefetchHandlerLazyService } from '@addons/mod/wiki/services/handlers/prefetch-lazy';

export class AddonModWikiPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = ADDON_MOD_WIKI_COMPONENT;
    modName = ADDON_MOD_WIKI_MODNAME;
    component = ADDON_MOD_WIKI_COMPONENT_LEGACY;
    updatesNames = /^.*files$|^pages$/;

}

/**
 * Get prefetch handler instance.
 *
 * @returns Prefetch handler.
 */
export function getPrefetchHandlerInstance(): CoreCourseModulePrefetchHandler {
    const lazyHandler = asyncInstance<
        AddonModWikiPrefetchHandlerLazyService,
        AddonModWikiPrefetchHandlerService
    >(async () => {
        const { AddonModWikiPrefetchHandler } = await import('./prefetch-lazy');

        return AddonModWikiPrefetchHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModWikiPrefetchHandlerService());
    lazyHandler.setLazyMethods(['sync']);
    lazyHandler.setLazyOverrides([
        'getFiles',
        'getDownloadSize',
        'invalidateContent',
        'prefetch',
    ]);

    return lazyHandler;
}
