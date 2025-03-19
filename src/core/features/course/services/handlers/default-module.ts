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
import { CoreCourseModuleData } from '../course-helper';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreCourseModuleHelper } from '../course-module-helper';

/**
 * Default handler used when the module doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseModuleDefaultHandler implements CoreCourseModuleHandler {

    name = 'CoreCourseModuleDefault';
    modName = 'default';
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
    ): CoreCourseModuleHandlerData {
        // Return the default data.
        const defaultData: CoreCourseModuleHandlerData = {
            icon: CoreCourseModuleHelper.getModuleIconSrc(module.modname, module.modicon),
            title: module.name,
            class: `core-course-default-handler core-course-module-${module.modname}-handler`,
            action: async (event: Event, module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions) => {
                event.preventDefault();
                event.stopPropagation();

                await this.openActivityPage(module, courseId, options);
            },
        };

        if ('url' in module && module.url) {
            const url = module.url;

            defaultData.button = {
                icon: 'fas-up-right-from-square',
                label: 'core.openinbrowser',
                action: (e: Event): void => {
                    e.preventDefault();
                    e.stopPropagation();

                    CoreSites.getRequiredCurrentSite().openInBrowserWithAutoLogin(url);
                },
            };
        }

        return defaultData;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { CoreCourseUnsupportedModuleComponent } =
            await import('@features/course/components/unsupported-module/unsupported-module');

        return CoreCourseUnsupportedModuleComponent;
    }

    /**
     * @inheritdoc
     */
    displayRefresherInSingleActivity(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    async openActivityPage(module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions): Promise<void> {
        options = options || {};
        options.params = options.params || {};
        Object.assign(options.params, { module });

        await CoreNavigator.navigateToSitePath(`course/${courseId}/${module.id}/module-preview`, options);
    }

}
