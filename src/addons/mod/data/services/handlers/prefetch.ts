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
    ADDON_MOD_DATA_COMPONENT,
    ADDON_MOD_DATA_COMPONENT_LEGACY,
    ADDON_MOD_DATA_MODNAME,
} from '@addons/mod/data/constants';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseModulePrefetchHandler } from '@features/course/services/module-prefetch-delegate';
import type { AddonModDataPrefetchHandlerLazyService } from '@addons/mod/data/services/handlers/prefetch-lazy';

export class AddonModDataPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = ADDON_MOD_DATA_COMPONENT;
    modName = ADDON_MOD_DATA_MODNAME;
    component = ADDON_MOD_DATA_COMPONENT_LEGACY;
    updatesNames = /^configuration$|^.*files$|^entries$|^gradeitems$|^outcomes$|^comments$|^ratings/;

}

/**
 * Get prefetch handler instance.
 *
 * @returns Prefetch handler.
 */
export function getPrefetchHandlerInstance(): CoreCourseModulePrefetchHandler {
    const lazyHandler = asyncInstance<
        AddonModDataPrefetchHandlerLazyService,
        AddonModDataPrefetchHandlerService
    >(async () => {
        const { AddonModDataPrefetchHandler } = await import('./prefetch-lazy');

        return AddonModDataPrefetchHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModDataPrefetchHandlerService());
    lazyHandler.setLazyMethods(['sync']);
    lazyHandler.setLazyOverrides([
        'getFiles',
        'getIntroFiles',
        'invalidateContent',
        'invalidateModule',
        'isDownloadable',
        'prefetch',
    ]);

    return lazyHandler;
}
