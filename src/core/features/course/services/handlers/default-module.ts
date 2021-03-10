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

import { CoreSites } from '@services/sites';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '../module-delegate';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseWSModule } from '../course';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseModule } from '../course-helper';
import { CoreCourseUnsupportedModuleComponent } from '@features/course/components/unsupported-module/unsupported-module';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';

/**
 * Default handler used when the module doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseModuleDefaultHandler implements CoreCourseModuleHandler {

    name = 'CoreCourseModuleDefault';
    modName = 'default';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @return Data to render the module.
     */
    getData(
        module: CoreCourseAnyModuleData,
        courseId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        sectionId?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        forCoursePage?: boolean, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): CoreCourseModuleHandlerData {
        // Return the default data.
        const defaultData: CoreCourseModuleHandlerData = {
            icon: CoreCourse.getModuleIconSrc(module.modname, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'core-course-default-handler core-course-module-' + module.modname + '-handler',
            action: (event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions) => {
                event.preventDefault();
                event.stopPropagation();

                options = options || {};
                options.params = { module };

                CoreNavigator.navigateToSitePath('course/' + courseId + '/unsupported-module', options);
            },
        };

        if ('url' in module && module.url) {
            defaultData.buttons = [{
                icon: 'fas-external-link-alt',
                label: 'core.openinbrowser',
                action: (e: Event): void => {
                    e.preventDefault();
                    e.stopPropagation();

                    CoreSites.getCurrentSite()!.openInBrowserWithAutoLoginIfSameSite(module.url!);
                },
            }];
        }

        return defaultData;
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course object.
     * @param module The module object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getMainComponent(course: CoreCourseAnyCourseData, module: CoreCourseWSModule): Promise<Type<unknown> | undefined> {
        return CoreCourseUnsupportedModuleComponent;
    }

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @return Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity(): boolean {
        return true;
    }

}
