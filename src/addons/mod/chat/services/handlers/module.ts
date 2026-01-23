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
import { ADDON_MOD_CHAT_MODNAME, ADDON_MOD_CHAT_PAGE_NAME } from '../../constants';
import { ModFeature, ModPurpose } from '@addons/mod/constants';

/**
 * Handler to support chat modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChatModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModChat';
    modName = ADDON_MOD_CHAT_MODNAME;
    protected pageName = ADDON_MOD_CHAT_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.GROUPS]: true,
        [ModFeature.GROUPINGS]: true,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.GRADE_HAS_GRADE]: false,
        [ModFeature.GRADE_OUTCOMES]: true,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.COMMUNICATION,
    };

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        // Disabled for Aspire School - chat not appropriate for K-12 students
        return false;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { AddonModChatIndexComponent } = await import('../../components/index');

        return AddonModChatIndexComponent;
    }

}

export const AddonModChatModuleHandler = makeSingleton(AddonModChatModuleHandlerService);
