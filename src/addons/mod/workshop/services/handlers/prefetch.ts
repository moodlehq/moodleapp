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
    ADDON_MOD_WORKSHOP_PREFETCH_COMPONENT,
    ADDON_MOD_WORKSHOP_PREFETCH_MODNAME,
    ADDON_MOD_WORKSHOP_PREFETCH_NAME,
    ADDON_MOD_WORKSHOP_PREFETCH_UPDATE_NAMES,
} from '@addons/mod/workshop/constants';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseModulePrefetchHandler } from '@features/course/services/module-prefetch-delegate';
import type { AddonModWorkshopPrefetchHandlerLazyService } from './prefetch-lazy';

export class AddonModWorkshopPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = ADDON_MOD_WORKSHOP_PREFETCH_NAME;
    modName = ADDON_MOD_WORKSHOP_PREFETCH_MODNAME;
    component = ADDON_MOD_WORKSHOP_PREFETCH_COMPONENT;
    updatesNames = ADDON_MOD_WORKSHOP_PREFETCH_UPDATE_NAMES;

}

/**
 * Get prefetch handler instance.
 *
 * @returns Prefetch handler.
 */
export function getPrefetchHandlerInstance(): CoreCourseModulePrefetchHandler {
    const lazyHandler = asyncInstance<
        AddonModWorkshopPrefetchHandlerLazyService,
        AddonModWorkshopPrefetchHandlerService
    >(async () => {
        const { AddonModWorkshopPrefetchHandler } = await import('./prefetch-lazy');

        return AddonModWorkshopPrefetchHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModWorkshopPrefetchHandlerService());
    lazyHandler.setLazyMethods(['sync']);
    lazyHandler.setLazyOverrides([
        'getFiles',
        'invalidateContent',
        'isDownloadable',
        'prefetch',
    ]);

    return lazyHandler;
}
