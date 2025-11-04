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

import { ModFeature, ModArchetype, ModPurpose } from '@addons/mod/constants';
import { Injectable } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_LABEL_MODNAME } from '../../constants';

/**
 * Handler to support label modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLabelModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModLabel';
    modName = ADDON_MOD_LABEL_MODNAME;

    supportedFeatures = {
        [ModFeature.IDNUMBER]: true,
        [ModFeature.GROUPS]: false,
        [ModFeature.GROUPINGS]: false,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: false,
        [ModFeature.GRADE_HAS_GRADE]: false,
        [ModFeature.GRADE_OUTCOMES]: false,
        [ModFeature.MOD_ARCHETYPE]: ModArchetype.RESOURCE,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.NO_VIEW_LINK]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.CONTENT,
    };

    /**
     * @inheritdoc
     */
    getData(module: CoreCourseModuleData): CoreCourseModuleHandlerData {
        // Remove the description from the module so it isn't rendered twice.
        const title = module.description || '';
        module.description = '';

        return {
            icon: this.getIconSrc(),
            title,
            a11yTitle: '',
            class: 'addon-mod-label-handler',
            hasCustomCmListItem: true,
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

    /**
     * @inheritdoc
     */
    getIconSrc(): string {
        return '';
    }

}
export const AddonModLabelModuleHandler = makeSingleton(AddonModLabelModuleHandlerService);
