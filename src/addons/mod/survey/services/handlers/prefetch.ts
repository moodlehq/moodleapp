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

import { AsyncInstance, asyncInstance } from '@/core/utils/async-instance';
import {
    ADDON_MOD_SURVEY_COMPONENT,
    ADDON_MOD_SURVEY_COMPONENT_LEGACY,
    ADDON_MOD_SURVEY_MODNAME,
    ADDON_MOD_SURVEY_PREFETCH_UPDATE_NAMES,
} from '@addons/mod/survey/constants';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseModulePrefetchHandler } from '@features/course/services/module-prefetch-delegate';
import type { AddonModSurveyPrefetchHandlerLazyService } from './prefetch-lazy';

let prefetchHandlerInstance: AsyncInstance<
    AddonModSurveyPrefetchHandlerLazyService,
    AddonModSurveyPrefetchHandlerService
> | null = null;

export class AddonModSurveyPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = ADDON_MOD_SURVEY_COMPONENT;
    modName = ADDON_MOD_SURVEY_MODNAME;
    component = ADDON_MOD_SURVEY_COMPONENT_LEGACY;
    updatesNames = ADDON_MOD_SURVEY_PREFETCH_UPDATE_NAMES;

}

/**
 * Get prefetch handler instance.
 *
 * @returns Prefetch handler.
 */
export function getPrefetchHandlerInstance(): CoreCourseModulePrefetchHandler {
    if (!prefetchHandlerInstance) {
        prefetchHandlerInstance = asyncInstance(async () => {
            const { AddonModSurveyPrefetchHandler } = await import('./prefetch-lazy');

            return AddonModSurveyPrefetchHandler.instance;
        });

        prefetchHandlerInstance.setEagerInstance(new AddonModSurveyPrefetchHandlerService());
        prefetchHandlerInstance.setLazyMethods(['sync']);
        prefetchHandlerInstance.setLazyOverrides([
            'prefetch',
            'isEnabled',
            'invalidateModule',
            'invalidateContent',
            'getIntroFiles',
        ]);
    }

    return prefetchHandlerInstance;
}
