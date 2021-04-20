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
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonModChatIndexComponent } from '../../components/index';
import { AddonModChat } from '../chat';

/**
 * Handler to support chat modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChatModuleHandlerService implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_chat';

    name = 'AddonModChat';
    modName = 'chat';

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
        return true;
    }

    /**
     * @inheritdoc
     */
    getData(module: CoreCourseAnyModuleData): CoreCourseModuleHandlerData {
        const data: CoreCourseModuleHandlerData = {
            icon: CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'addon-mod_chat-handler',
            action(event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions): void {
                options = options || {};
                options.params = options.params || {};
                Object.assign(options.params, { module });
                const routeParams = '/' + courseId + '/' + module.id;

                CoreNavigator.navigateToSitePath(AddonModChatModuleHandlerService.PAGE_NAME + routeParams, options);
            },
        };

        this.checkDownloadButton(data);

        return data;
    }

    /**
     * Check whether download button should be displayed.
     *
     * @param data Handler data.
     */
    protected async checkDownloadButton(data: CoreCourseModuleHandlerData): Promise<void> {
        data.showDownloadButton = await AddonModChat.areSessionsAvailable();
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        return AddonModChatIndexComponent;
    }

}

export const AddonModChatModuleHandler = makeSingleton(AddonModChatModuleHandlerService);
