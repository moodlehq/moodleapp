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

import { ModFeature, ModPurpose } from '@addons/mod/constants';
import { ADDON_MOD_WORKSHOP_MODNAME, ADDON_MOD_WORKSHOP_PAGE_NAME } from '@addons/mod/workshop/constants';
import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleHandler } from '@features/course/services/module-delegate';
import { makeSingleton } from '@singletons';
import { AddonModWorkshop } from '../workshop';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreSitesReadingStrategy } from '@services/sites';

/**
 * Handler to support workshop modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWorkshopModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModWorkshop';
    modName = ADDON_MOD_WORKSHOP_MODNAME;
    protected pageName = ADDON_MOD_WORKSHOP_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.GROUPS]: true,
        [ModFeature.GROUPINGS]: true,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.GRADE_HAS_GRADE]: true,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.PLAGIARISM]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.ASSESSMENT,
    };

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { AddonModWorkshopIndexComponent } = await import('../../components/index');

        return AddonModWorkshopIndexComponent;
    }

    /**
     * @inheritdoc
     */
    async getModuleForcedLang(module: CoreCourseModuleData): Promise<string | undefined> {
        const mod = await AddonModWorkshop.getWorkshop(
            module.course,
            module.id,
            { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        return mod?.lang;
    }

}
export const AddonModWorkshopModuleHandler = makeSingleton(AddonModWorkshopModuleHandlerService);
