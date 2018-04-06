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

import { Injectable } from '@angular/core';
import { NavController, NavOptions } from 'ionic-angular';
import { AddonModUrlIndexComponent } from '../components/index/index';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModUrlProvider } from './url';
import { AddonModUrlHelperProvider } from './helper';

/**
 * Handler to support url modules.
 */
@Injectable()
export class AddonModUrlModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModUrl';
    modName = 'url';

    constructor(private courseProvider: CoreCourseProvider, private urlProvider: AddonModUrlProvider,
        private urlHelper: AddonModUrlHelperProvider) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean {
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
        const handlerData = {
            icon: this.courseProvider.getModuleIconSrc('url'),
            title: module.name,
            class: 'addon-mod_url-handler',
            showDownloadButton: false,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions): void {
                navCtrl.push('AddonModUrlIndexPage', {module: module, courseId: courseId}, options);
            },
            buttons: [ {
                hidden: !(module.contents && module.contents[0] && module.contents[0].fileurl),
                icon: 'link',
                label: 'core.openinbrowser',
                action: (event: Event, navCtrl: NavController, module: any, courseId: number): void => {
                    this.hideLinkButton(module, courseId).then((hide) => {
                        if (!hide) {
                            this.urlProvider.logView(module.instance).then(() => {
                                this.courseProvider.checkModuleCompletion(courseId, module.completionstatus);
                            });
                            this.urlHelper.open(module.contents[0].fileurl);
                        }
                    });
                }
            } ]
        };

        this.hideLinkButton(module, courseId).then((hideButton) => {
            handlerData.buttons[0].hidden = hideButton;
        });

        return handlerData;
    }

    /**
     * Returns if contents are loaded to show link button.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @return {Promise<boolean>} Resolved when done.
     */
    protected hideLinkButton(module: any, courseId: number): Promise<boolean> {
        return this.courseProvider.loadModuleContents(module, courseId).then(() => {
            return !(module.contents && module.contents[0] && module.contents[0].fileurl);
        });
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     *
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {any} The component to use, undefined if not found.
     */
    getMainComponent(course: any, module: any): any {
        return AddonModUrlIndexComponent;
    }
}
