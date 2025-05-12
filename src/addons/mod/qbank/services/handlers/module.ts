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
import { Injectable } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_QBANK_MODNAME } from '../../constants';

/**
 * Handler to support qbank modules.
 * Qbank modules aren't supported in the app, this handler is used to hide them.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQbankModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModQbank';
    modName = ADDON_MOD_QBANK_MODNAME;

    supportedFeatures = {
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.PUBLISHES_QUESTIONS]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.USES_QUESTIONS]: true,
        [ModFeature.CAN_DISPLAY]: false,
        [ModFeature.CAN_UNINSTALL]: false,
        [ModFeature.COMMENT]: false,
        [ModFeature.COMPLETION_HAS_RULES]: false,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: false,
        [ModFeature.CONTROLS_GRADE_VISIBILITY]: false,
        [ModFeature.GRADE_OUTCOMES]: false,
        [ModFeature.MODEDIT_DEFAULT_COMPLETION]: false,
        [ModFeature.MOD_PURPOSE]: ModPurpose.CONTENT,
        [ModFeature.NO_VIEW_LINK]: true,
    };

    /**
     * @inheritdoc
     */
    getData(module: CoreCourseModuleData): CoreCourseModuleHandlerData {
        // This module is not displayed, return the minimum data to fulfill the interface.
        return {
            title: module.name,
        };
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<undefined> {
        return;
    }

}
export const AddonModQbankModuleHandler = makeSingleton(AddonModQbankModuleHandlerService);
