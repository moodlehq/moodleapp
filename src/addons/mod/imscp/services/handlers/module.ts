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
import { AddonModImscpIndexComponent } from '../../components/index';
import { AddonModImscp } from '../imscp';

/**
 * Handler to support IMSCP modules.
 */
@Injectable( { providedIn: 'root' })
export class AddonModImscpModuleHandlerService implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_imscp';

    name = 'AddonModImscp';
    modName = 'imscp';

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
    };

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModImscp.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    getData(module: CoreCourseAnyModuleData): CoreCourseModuleHandlerData {
        return {
            icon: CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'addon-mod_imscp-handler',
            showDownloadButton: true,
            action(event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions): void {
                options = options || {};
                options.params = options.params || {};
                Object.assign(options.params, { module });
                const routeParams = '/' + courseId + '/' + module.id;

                CoreNavigator.navigateToSitePath(AddonModImscpModuleHandlerService.PAGE_NAME + routeParams, options);
            },
        };
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown> | undefined> {
        return AddonModImscpIndexComponent;
    }

}
export const AddonModImscpModuleHandler = makeSingleton(AddonModImscpModuleHandlerService);
