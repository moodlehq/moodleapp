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

import { Injector } from '@angular/core';
import { NavController, NavOptions } from 'ionic-angular';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CoreSitePluginsModuleIndexComponent } from '../../components/module-index/module-index';

/**
 * Handler to support a module using a site plugin.
 */
export class CoreSitePluginsModuleHandler extends CoreSitePluginsBaseHandler implements CoreCourseModuleHandler {
    priority: number;

    constructor(name: string, public modName: string, protected handlerSchema: any) {
        super(name);
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
        const hasOffline = !!(this.handlerSchema.offlinefunctions && Object.keys(this.handlerSchema.offlinefunctions).length),
            showDowloadButton = this.handlerSchema.downloadbutton;

        return {
            title: module.name,
            icon: this.handlerSchema.displaydata.icon,
            class: this.handlerSchema.displaydata.class,
            showDownloadButton: typeof showDowloadButton != 'undefined' ? showDowloadButton : hasOffline,
            action: (event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions): void => {
                event.preventDefault();
                event.stopPropagation();

                navCtrl.push('CoreSitePluginsModuleIndexPage', {
                    title: module.name,
                    module: module,
                    courseId: courseId
                }, options);
            }
        };
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
        return CoreSitePluginsModuleIndexComponent;
    }
}
