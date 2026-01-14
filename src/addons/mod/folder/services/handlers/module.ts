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
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreNavigator } from '@services/navigator';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_FOLDER_MODNAME, ADDON_MOD_FOLDER_PAGE_NAME } from '../../constants';
import { ModFeature, ModArchetype, ModPurpose } from '@addons/mod/constants';
import { AddonModFolder } from '../folder';
import { CoreSitesReadingStrategy } from '@services/sites';

/**
 * Handler to support folder modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFolderModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModFolder';
    modName = ADDON_MOD_FOLDER_MODNAME;
    protected pageName = ADDON_MOD_FOLDER_PAGE_NAME;

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
        [ModFeature.MOD_PURPOSE]: ModPurpose.CONTENT,
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
            const descriptionElement = convertTextToHTMLElement(module.description);

            Array.from(descriptionElement.querySelectorAll('.foldertree, .folderbuttons, .tertiary-navigation'))
                .forEach(element => element.remove());

            module.description = descriptionElement.innerHTML;
        }

        // @todo Temporary fix to open inline folders. We should use a more generic solution.
        data.action = async (event, module, courseId, options): Promise<void> => {
            options = options || {};
            options.params = options.params || {};
            Object.assign(options.params, { module });

            const routeParams = `/${courseId}/${module.id}`;

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

    /**
     * @inheritdoc
     */
    async getModuleForcedLang(module: CoreCourseModuleData): Promise<string | undefined> {
        const mod = await AddonModFolder.getFolder(
            module.course,
            module.id,
            { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        return mod?.lang;
    }

}
export const AddonModFolderModuleHandler = makeSingleton(AddonModFolderModuleHandlerService);
