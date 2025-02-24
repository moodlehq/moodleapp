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
import { CoreSitePluginsModuleHandler } from '@features/siteplugins/classes/handlers/module-handler';
import { makeSingleton } from '@singletons';
import { AddonModBBBIndexComponent } from '../../components/index';
import { AddonModBBB } from '../bigbluebuttonbn';
import { ADDON_MOD_BBB_COMPONENT, ADDON_MOD_BBB_MODNAME, ADDON_MOD_BBB_PAGE_NAME } from '../../constants';

/**
 * Handler to support Big Blue Button activities.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBBBModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = ADDON_MOD_BBB_COMPONENT;
    modName = ADDON_MOD_BBB_MODNAME;
    protected pageName = ADDON_MOD_BBB_PAGE_NAME;
    protected sitePluginHandler?: CoreSitePluginsModuleHandler;

    supportedFeatures = {
        [CoreConstants.FEATURE_GROUPS]: true,
        [CoreConstants.FEATURE_GROUPINGS]: true,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: false,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: true,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
        [CoreConstants.FEATURE_MOD_PURPOSE]: ModPurpose.MOD_PURPOSE_COMMUNICATION,
    };

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        const enabled = await AddonModBBB.isPluginEnabled();

        if (enabled) {
            delete this.sitePluginHandler;
            this.name = ADDON_MOD_BBB_COMPONENT;

            return true;
        }

        const { CoreSitePlugins } = await import('@features/siteplugins/services/siteplugins');

        // Native support not available in this site. Check if it's supported by site plugin.
        this.sitePluginHandler = CoreSitePlugins.getModuleHandlerInstance(this.modName);
        // Change the handler name to be able to retrieve the plugin data in component.
        this.name = this.sitePluginHandler?.name || this.name;

        return !!this.sitePluginHandler;
    }

    /**
     * @inheritdoc
     */
    async getData(
        module: CoreCourseModuleData,
        courseId: number,
        sectionId?: number,
        forCoursePage?: boolean,
    ): Promise<CoreCourseModuleHandlerData> {
        if (this.sitePluginHandler) {
            return this.sitePluginHandler.getData(module, courseId, sectionId, forCoursePage);
        }

        const data = await super.getData(module, courseId, sectionId, forCoursePage);

        data.showDownloadButton = false;

        return data;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        if (this.sitePluginHandler) {
            return this.sitePluginHandler.getMainComponent();
        }

        return AddonModBBBIndexComponent;
    }

}

export const AddonModBBBModuleHandler = makeSingleton(AddonModBBBModuleHandlerService);
