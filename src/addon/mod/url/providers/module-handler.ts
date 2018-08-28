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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModUrlIndexComponent } from '../components/index/index';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModUrlProvider } from './url';
import { AddonModUrlHelperProvider } from './helper';
import { CoreConstants } from '@core/constants';

/**
 * Handler to support url modules.
 */
@Injectable()
export class AddonModUrlModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModUrl';
    modName = 'url';

    constructor(private courseProvider: CoreCourseProvider, private urlProvider: AddonModUrlProvider,
        private urlHelper: AddonModUrlHelperProvider, private domUtils: CoreDomUtilsProvider) { }

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
        // tslint:disable: no-this-assignment
        const handler = this;
        const handlerData = {
            icon: this.courseProvider.getModuleIconSrc(this.modName),
            title: module.name,
            class: 'addon-mod_url-handler',
            showDownloadButton: false,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions): void {
                // Check if we need to open the URL directly.
                let promise;

                if (handler.urlProvider.isGetUrlWSAvailable()) {
                    const modal = handler.domUtils.showModalLoading();

                    promise = handler.urlProvider.getUrl(courseId, module.id).catch(() => {
                        // Ignore errors.
                    }).then((url) => {
                        modal.dismiss();

                        const displayType = handler.urlProvider.getFinalDisplayType(url);

                        return displayType == CoreConstants.RESOURCELIB_DISPLAY_OPEN ||
                               displayType == CoreConstants.RESOURCELIB_DISPLAY_POPUP;
                    });
                } else {
                    promise = Promise.resolve(false);
                }

                return promise.then((shouldOpen) => {
                    if (shouldOpen) {
                        handler.openUrl(module, courseId);
                    } else {
                        navCtrl.push('AddonModUrlIndexPage', {module: module, courseId: courseId}, options);
                    }
                });
            },
            buttons: [ {
                hidden: true, // Hide it until we calculate if it should be displayed or not.
                icon: 'link',
                label: 'core.openinbrowser',
                action: (event: Event, navCtrl: NavController, module: any, courseId: number): void => {
                    handler.openUrl(module, courseId);
                }
            } ]
        };

        this.hideLinkButton(module, courseId).then((hideButton) => {
            handlerData.buttons[0].hidden = hideButton;

            if (module.contents && module.contents[0]) {
                // Calculate the icon to use.
                handlerData.icon = this.urlProvider.guessIcon(module.contents[0].fileurl) ||
                        this.courseProvider.getModuleIconSrc(this.modName);
            }
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
        return this.courseProvider.loadModuleContents(module, courseId, undefined, false, false, undefined, this.modName)
                .then(() => {

            if (!module.contents || !module.contents[0] || !module.contents[0].fileurl) {
                // No module contents, hide the button.
                return true;
            }

            if (!this.urlProvider.isGetUrlWSAvailable()) {
                return false;
            }

            // Get the URL data.
            return this.urlProvider.getUrl(courseId, module.id).then((url) => {
                const displayType = this.urlProvider.getFinalDisplayType(url);

                // Don't display the button if the URL should be embedded.
                return displayType == CoreConstants.RESOURCELIB_DISPLAY_EMBED ||
                        displayType == CoreConstants.RESOURCELIB_DISPLAY_FRAME;
            });
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

    /**
     * Open the URL.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     */
    protected openUrl(module: any, courseId: number): void {
        this.urlProvider.logView(module.instance).then(() => {
            this.courseProvider.checkModuleCompletion(courseId, module.completionstatus);
        });
        this.urlHelper.open(module.contents[0].fileurl);
    }
}
