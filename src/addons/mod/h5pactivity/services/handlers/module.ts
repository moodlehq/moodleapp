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
import { AddonModH5PActivity } from '../h5pactivity';
import { ADDON_MOD_H5PACTIVITY_PAGE_NAME } from '../../constants';
import { ModFeature, ModPurpose } from '@addons/mod/constants';

/**
 * Handler to support H5P activities.
 */
@Injectable({ providedIn: 'root' })
export class AddonModH5PActivityModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModH5PActivity';
    modName = 'h5pactivity';
    protected pageName = ADDON_MOD_H5PACTIVITY_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.GROUPS]: true,
        [ModFeature.GROUPINGS]: true,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.MODEDIT_DEFAULT_COMPLETION]: true,
        [ModFeature.GRADE_HAS_GRADE]: true,
        [ModFeature.GRADE_OUTCOMES]: true,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.INTERACTIVECONTENT,
    };

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModH5PActivity.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { AddonModH5PActivityIndexComponent } = await import('../../components/index');

        return AddonModH5PActivityIndexComponent;
    }

}

export const AddonModH5PActivityModuleHandler = makeSingleton(AddonModH5PActivityModuleHandlerService);
