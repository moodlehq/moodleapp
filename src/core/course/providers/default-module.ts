// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable, Injector } from '@angular/core';
import { NavController, NavOptions } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from './module-delegate';
import { CoreCourseProvider } from './course';

/**
 * Default handler used when the module doesn't have a specific implementation.
 */
@Injectable()
export class CoreCourseModuleDefaultHandler implements CoreCourseModuleHandler {
    name = 'CoreCourseModuleDefault';
    modName = 'default';

    constructor(private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @param {number} sectionId The section ID.
     * @return {CoreCourseModuleHandlerData} Data to render the module.
     */
    getData(module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData {
        // Return the default data.
        const defaultData: CoreCourseModuleHandlerData = {
            icon: this.courseProvider.getModuleIconSrc(module.modname, module.modicon),
            title: module.name,
            class: 'core-course-default-handler core-course-module-' + module.modname + '-handler',
            action: (event: Event, navCtrl: NavController, module: any, courseId: number, options?: NavOptions): void => {
                event.preventDefault();
                event.stopPropagation();

                navCtrl.push('CoreCourseUnsupportedModulePage', { module: module }, options);
            }
        };

        if (module.url) {
            defaultData.buttons = [{
                icon: 'open',
                label: 'core.openinbrowser',
                action: (e: Event): void => {
                    e.preventDefault();
                    e.stopPropagation();

                    this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(module.url);
                }
            }];
        }

        return defaultData;
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getMainComponent(injector: Injector, course: any, module: any): any | Promise<any> {
        // We can't inject CoreCourseUnsupportedModuleComponent here due to circular dependencies.
        // Don't return anything, by default it will use CoreCourseUnsupportedModuleComponent.
    }

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @return {boolean} Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity(): boolean {
        return true;
    }
}
