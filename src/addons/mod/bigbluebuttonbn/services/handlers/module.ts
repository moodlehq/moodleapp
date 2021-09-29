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
import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { makeSingleton } from '@singletons';
import { AddonModBBBIndexComponent } from '../../components/index';
import { AddonModBBB } from '../bigbluebuttonbn';

export const ADDON_MOD_BBB_MAIN_MENU_PAGE_NAME = 'mod_bigbluebuttonbn';

/**
 * Handler to support Big Blue Button activities.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBBBModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModBBB';
    modName = 'bigbluebuttonbn';
    protected pageName = ADDON_MOD_BBB_MAIN_MENU_PAGE_NAME;

    supportedFeatures = {
        [CoreConstants.FEATURE_GROUPS]: true,
        [CoreConstants.FEATURE_GROUPINGS]: true,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: false,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: true,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
    };

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonModBBB.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    getData(
        module: CoreCourseAnyModuleData,
        courseId: number,
        sectionId?: number,
        forCoursePage?: boolean,
    ): CoreCourseModuleHandlerData {
        const data = super.getData(module, courseId, sectionId, forCoursePage);

        data.showDownloadButton = false;

        return data;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        return AddonModBBBIndexComponent;
    }

}

export const AddonModBBBModuleHandler = makeSingleton(AddonModBBBModuleHandlerService);
