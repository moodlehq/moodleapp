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
import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';

/**
 * Handler to support folder modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFolderModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_folder';

    name = 'AddonModFolder';
    modName = 'folder';
    protected pageName = AddonModFolderModuleHandlerService.PAGE_NAME;

    supportedFeatures = {
        [CoreConstants.FEATURE_MOD_ARCHETYPE]: CoreConstants.MOD_ARCHETYPE_RESOURCE,
        [CoreConstants.FEATURE_GROUPS]: false,
        [CoreConstants.FEATURE_GROUPINGS]: false,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: false,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: false,
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

        if (module.description) {
            // Module description can contain the folder contents if it's inline, remove it.
            const descriptionElement = CoreDomUtils.convertToElement(module.description);

            Array.from(descriptionElement.querySelectorAll('.foldertree, .folderbuttons, .tertiary-navigation'))
                .forEach(element => element.remove());

            module.description = descriptionElement.innerHTML;
        }

        // @todo Temporary fix to open inline folders. We should use a more generic solution.
        data.action = async (event, module, courseId, options): Promise<void> => {
            options = options || {};
            options.params = options.params || {};
            Object.assign(options.params, { module });

            const routeParams = '/' + courseId + '/' + module.id;

            await CoreNavigator.navigateToSitePath(this.pageName + routeParams, options);
        };

        return data;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown> | undefined> {
        const { AddonModFolderIndexComponent } = await import('../../components/index');

        return AddonModFolderIndexComponent;
    }

}
export const AddonModFolderModuleHandler = makeSingleton(AddonModFolderModuleHandlerService);
