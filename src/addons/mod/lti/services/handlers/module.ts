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

import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { makeSingleton } from '@singletons';
import { AddonModLtiHelper } from '../lti-helper';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { ADDON_MOD_LTI_PAGE_NAME } from '../../constants';
import { ModFeature, ModPurpose } from '@addons/mod/constants';

/**
 * Handler to support LTI modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLtiModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModLti';
    modName = 'lti';
    protected pageName = ADDON_MOD_LTI_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.GROUPS]: false,
        [ModFeature.GROUPINGS]: false,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.GRADE_HAS_GRADE]: true,
        [ModFeature.GRADE_OUTCOMES]: true,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.OTHER,
    };

    /**
     * @inheritdoc
     */
    async getData(
        module: CoreCourseModuleData,
        courseId: number,
        sectionId?: number,
        forCoursePage?: boolean,
    ): Promise<CoreCourseModuleHandlerData> {
        const data = await super.getData(module, courseId, sectionId, forCoursePage);
        data.showDownloadButton = false;
        data.button = {
            icon: 'fas-up-right-from-square',
            label: 'addon.mod_lti.launchactivity',
            action: (event: Event, module: CoreCourseModuleData, courseId: number): void => {
                // Launch the LTI.
                AddonModLtiHelper.getDataAndLaunch(courseId, module);

                CoreCourseModuleHelper.storeModuleViewed(courseId, module.id);
            },
        };

        return data;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { AddonModLtiIndexComponent } = await import('../../components/index');

        return AddonModLtiIndexComponent;
    }

    /**
     * @inheritdoc
     */
    getIconSrc(module?: CoreCourseModuleData | undefined, modicon?: string | undefined): string | undefined {
        return module?.modicon ?? modicon ?? CoreCourseModuleHelper.getModuleIconSrc(this.modName);
    }

}

export const AddonModLtiModuleHandler = makeSingleton(AddonModLtiModuleHandlerService);
