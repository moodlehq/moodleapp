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

import { CoreConstants, ModPurpose } from '@/core/constants';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { makeSingleton } from '@singletons';
import { AddonModLtiHelper } from '../lti-helper';
import { AddonModLtiIndexComponent } from '../../components/index';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourse } from '@features/course/services/course';

/**
 * Handler to support LTI modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLtiModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_lti';

    name = 'AddonModLti';
    modName = 'lti';
    protected pageName = AddonModLtiModuleHandlerService.PAGE_NAME;

    supportedFeatures = {
        [CoreConstants.FEATURE_GROUPS]: false,
        [CoreConstants.FEATURE_GROUPINGS]: false,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: true,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: true,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
        [CoreConstants.FEATURE_MOD_PURPOSE]: ModPurpose.MOD_PURPOSE_CONTENT,
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

                CoreCourse.storeModuleViewed(courseId, module.id);
            },
        };

        return data;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        return AddonModLtiIndexComponent;
    }

    /**
     * @inheritdoc
     */
    getIconSrc(module?: CoreCourseModuleData | undefined, modicon?: string | undefined): string | undefined {
        return module?.modicon ?? modicon ?? CoreCourse.getModuleIconSrc(this.modName);
    }

}

export const AddonModLtiModuleHandler = makeSingleton(AddonModLtiModuleHandlerService);
