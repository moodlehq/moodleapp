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

import { CoreConstants } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { makeSingleton } from '@singletons';

/**
 * Handler to support label modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLabelModuleHandlerService implements CoreCourseModuleHandler {

    name = 'AddonModLabel';
    modName = 'label';

    supportedFeatures = {
        [CoreConstants.FEATURE_MOD_ARCHETYPE]: CoreConstants.MOD_ARCHETYPE_RESOURCE,
        [CoreConstants.FEATURE_IDNUMBER]: true,
        [CoreConstants.FEATURE_GROUPS]: false,
        [CoreConstants.FEATURE_GROUPINGS]: false,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: false,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: false,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: false,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
    };

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getData(module: CoreCourseWSModule): CoreCourseModuleHandlerData {
        // Remove the description from the module so it isn't rendered twice.
        const title = module.description || '';
        module.description = '';

        return {
            icon: '',
            title: title,
            a11yTitle: '',
            class: 'addon-mod-label-handler',
        };
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<undefined> {
        // There's no need to implement this because label cannot be used in singleactivity course format.
        return;
    }

    /**
     * @inheritdoc
     */
    async manualCompletionAlwaysShown(): Promise<boolean> {
        return true;
    }

}
export const AddonModLabelModuleHandler = makeSingleton(AddonModLabelModuleHandlerService);
