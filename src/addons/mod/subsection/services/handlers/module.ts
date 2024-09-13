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

import { CoreConstants, ModPurpose } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import {
    CoreCourseModuleDelegate,
    CoreCourseModuleHandler,
    CoreCourseModuleHandlerData,
} from '@features/course/services/module-delegate';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { AddonModSubsection } from '../subsection';

/**
 * Handler to support subsection modules.
 *
 * This is merely to disable the siteplugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModSubsectionModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModSubsection';
    modName = 'subsection';

    supportedFeatures = {
        [CoreConstants.FEATURE_MOD_ARCHETYPE]: CoreConstants.MOD_ARCHETYPE_RESOURCE,
        [CoreConstants.FEATURE_GROUPS]: false,
        [CoreConstants.FEATURE_GROUPINGS]: false,
        [CoreConstants.FEATURE_MOD_INTRO]: false,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: false,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: false,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: false,
        [CoreConstants.FEATURE_MOD_PURPOSE]: ModPurpose.MOD_PURPOSE_CONTENT,
    };

    /**
     * @inheritdoc
     */
    getData(module: CoreCourseModuleData): CoreCourseModuleHandlerData {
        return {
            icon: CoreCourseModuleDelegate.getModuleIconSrc(module.modname, module.modicon),
            title: module.name,
            a11yTitle: '',
            class: 'addon-mod-subsection-handler',
            hasCustomCmListItem: true,
            action: async(event, module) => {
                try {
                    await AddonModSubsection.openSubsection(module.section, module.course);
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'Error opening subsection.');
                }
            },
        };
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<undefined> {
        // There's no need to implement this because subsection cannot be used in singleactivity course format.
        return;
    }

    /**
     * @inheritdoc
     */
    getIconSrc(): string {
        return '';
    }

}
export const AddonModSubsectionModuleHandler = makeSingleton(AddonModSubsectionModuleHandlerService);
