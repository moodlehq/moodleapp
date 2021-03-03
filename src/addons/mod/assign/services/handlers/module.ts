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
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { AddonModAssignIndexComponent } from '../../components/index';
import { makeSingleton } from '@singletons';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { AddonModAssign } from '../assign';

/**
 * Handler to support assign modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignModuleHandlerService implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_assign';

    name = 'AddonModAssign';
    modName = 'assign';

    supportedFeatures = {
        [CoreConstants.FEATURE_GROUPS]: true,
        [CoreConstants.FEATURE_GROUPINGS]: true,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_COMPLETION_HAS_RULES]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: true,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: true,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
        [CoreConstants.FEATURE_ADVANCED_GRADING]: true,
        [CoreConstants.FEATURE_PLAGIARISM]: true,
        [CoreConstants.FEATURE_COMMENT]: true,
    };

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return AddonModAssign.isPluginEnabled();
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param module The module object.
     * @return Data to render the module.
     */
    getData(module: CoreCourseAnyModuleData): CoreCourseModuleHandlerData {
        return {
            icon: CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'addon-mod_assign-handler',
            showDownloadButton: true,
            action(event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions): void {
                options = options || {};
                options.params = options.params || {};
                Object.assign(options.params, { module });
                const routeParams = '/' + courseId + '/' + module.id;

                CoreNavigator.navigateToSitePath(AddonModAssignModuleHandlerService.PAGE_NAME + routeParams, options);
            },
        };
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     *
     * @return The component to use, undefined if not found.
     */
    async getMainComponent(): Promise<Type<unknown> | undefined> {
        return AddonModAssignIndexComponent;
    }

}
export const AddonModAssignModuleHandler = makeSingleton(AddonModAssignModuleHandlerService);
