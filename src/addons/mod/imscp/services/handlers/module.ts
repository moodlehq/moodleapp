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

import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleHandler } from '@features/course/services/module-delegate';
import { makeSingleton } from '@singletons';
import { AddonModImscp } from '../imscp';
import { ADDON_MOD_IMSCP_MODNAME, ADDON_MOD_IMSCP_PAGE_NAME } from '../../constants';
import { ModFeature, ModArchetype, ModPurpose } from '@addons/mod/constants';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreSitesReadingStrategy } from '@services/sites';

/**
 * Handler to support IMSCP modules.
 */
@Injectable( { providedIn: 'root' })
export class AddonModImscpModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModImscp';
    modName = ADDON_MOD_IMSCP_MODNAME;
    protected pageName = ADDON_MOD_IMSCP_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.MOD_ARCHETYPE]: ModArchetype.RESOURCE,
        [ModFeature.GROUPS]: false,
        [ModFeature.GROUPINGS]: false,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.GRADE_HAS_GRADE]: false,
        [ModFeature.GRADE_OUTCOMES]: false,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.INTERACTIVECONTENT,
    };

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModImscp.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { AddonModImscpIndexComponent } = await import('../../components/index');

        return AddonModImscpIndexComponent;
    }

    /**
     * @inheritdoc
     */
    async getModuleForcedLang(module: CoreCourseModuleData): Promise<string | undefined> {
        const mod = await AddonModImscp.getImscp(
            module.course,
            module.id,
            { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        return mod?.lang;
    }

}
export const AddonModImscpModuleHandler = makeSingleton(AddonModImscpModuleHandlerService);
