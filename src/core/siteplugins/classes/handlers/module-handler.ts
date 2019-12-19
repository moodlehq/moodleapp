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

import { Injector } from '@angular/core';
import { NavController, NavOptions } from 'ionic-angular';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CoreSitePluginsModuleIndexComponent } from '../../components/module-index/module-index';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';

/**
 * Handler to support a module using a site plugin.
 */
export class CoreSitePluginsModuleHandler extends CoreSitePluginsBaseHandler implements CoreCourseModuleHandler {
    priority: number;
    supportedFeatures: {[name: string]: any};
    supportsFeature: (feature: string) => any;

    protected logger: any;

    constructor(name: string,
            public modName: string,
            protected plugin: any,
            protected handlerSchema: any,
            protected initResult: any,
            protected sitePluginsProvider: CoreSitePluginsProvider,
            loggerProvider: CoreLoggerProvider) {
        super(name);

        this.logger = loggerProvider.getInstance('CoreSitePluginsModuleHandler');
        this.supportedFeatures = handlerSchema.supportedfeatures;

        if (initResult && initResult.jsResult && initResult.jsResult.supportsFeature) {
            // The init result defines a function to check if a feature is supported, use it.
            this.supportsFeature = initResult.jsResult.supportsFeature.bind(initResult.jsResult);
        }
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @param forCoursePage Whether the data will be used to render the course page.
     * @return Data to render the module.
     */
    getData(module: any, courseId: number, sectionId: number, forCoursePage: boolean): CoreCourseModuleHandlerData {
        const callMethod = forCoursePage && this.handlerSchema.coursepagemethod;

        if (module.noviewlink && !callMethod) {
            // The module doesn't link to a new page (similar to label). Only display the description.
            const title = module.description;
            module.description = '';

            return {
                icon: this.handlerSchema.displaydata.icon,
                title: title,
                a11yTitle: '',
                class: this.handlerSchema.displaydata.class
            };
        }

        const hasOffline = !!(this.handlerSchema.offlinefunctions && Object.keys(this.handlerSchema.offlinefunctions).length),
            showDowloadButton = this.handlerSchema.downloadbutton,
            handlerData: CoreCourseModuleHandlerData = {
                title: module.name,
                icon: this.handlerSchema.displaydata.icon,
                class: this.handlerSchema.displaydata.class,
                showDownloadButton: typeof showDowloadButton != 'undefined' ? showDowloadButton : hasOffline,
            };

        if (this.handlerSchema.method) {
            // There is a method, add an action.
            handlerData.action = (event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions)
                    : void => {
                event.preventDefault();
                event.stopPropagation();

                navCtrl.push('CoreSitePluginsModuleIndexPage', {
                    title: module.name,
                    module: module,
                    courseId: courseId
                }, options);
            };
        }

        if (callMethod && module.visibleoncoursepage !== 0) {
            // Call the method to get the course page template.
            handlerData.loading = true;

            const args = {
                    courseid: courseId,
                    cmid: module.id
                };

            this.sitePluginsProvider.getContent(this.plugin.component, this.handlerSchema.coursepagemethod, args).then((result) => {
                // Use the html returned.
                handlerData.title = result.templates && result.templates[0] ? result.templates[0].html : '';
                module.description = '';
            }).catch((error) => {
                this.logger.error('Error calling course page method:', error);
            }).finally(() => {
                handlerData.loading = false;
            });
        }

        return handlerData;
    }

    /**
     * Get the icon src for the module.
     *
     * @return The icon src.
     */
    getIconSrc(): string {
        return this.handlerSchema.displaydata.icon;
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param course The course object.
     * @param module The module object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getMainComponent(injector: Injector, course: any, module: any): any | Promise<any> {
        return CoreSitePluginsModuleIndexComponent;
    }
}
