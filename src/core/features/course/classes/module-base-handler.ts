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

import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreCourse } from '../services/course';
import { CoreCourseModuleData } from '../services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '../services/module-delegate';

/**
 * Base module handler to be registered.
 */
export class CoreModuleHandlerBase implements Partial<CoreCourseModuleHandler> {

    protected pageName = '';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getData(
        module: CoreCourseModuleData,
        courseId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        sectionId?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        forCoursePage?: boolean, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<CoreCourseModuleHandlerData> | CoreCourseModuleHandlerData {
        return {
            icon: this.getIconSrc(module, module.modicon),
            title: module.name,
            class: 'addon-mod_' + module.modname + '-handler',
            showDownloadButton: true,
            hasCustomCmListItem: false,
            action: async (
                event: Event,
                module: CoreCourseModuleData,
                courseId: number,
                options?: CoreNavigationOptions,
            ): Promise<void> => {
                await this.openActivityPage(module, courseId, options);
            },
        };
    }

    /**
     * Opens the activity page.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param options Options for the navigation.
     * @returns Promise resolved when done.
     */
    async openActivityPage(module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions): Promise<void> {
        if (!CoreCourse.moduleHasView(module)) {
            return;
        }

        options = options || {};
        options.params = options.params || {};
        Object.assign(options.params, { module });

        const routeParams = '/' + courseId + '/' + module.id;

        await CoreNavigator.navigateToSitePath(this.pageName + routeParams, options);
    }

    /**
     * @inheritdoc
     */
    getIconSrc(module?: CoreCourseModuleData, modicon?: string): Promise<string | undefined> | string | undefined {
        if (!module) {
            return modicon;
        }

        return CoreCourse.getModuleIconSrc(module.modname, modicon);
    }

}
