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
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
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

    supportedFeatures = {
        [CoreConstants.FEATURE_MOD_ARCHETYPE]: CoreConstants.MOD_ARCHETYPE_RESOURCE,
        [CoreConstants.FEATURE_GROUPS]: false,
        [CoreConstants.FEATURE_GROUPINGS]: false,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: false,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: false,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true
    };

    constructor(private courseProvider: CoreCourseProvider, private urlProvider: AddonModUrlProvider,
        private urlHelper: AddonModUrlHelperProvider, private domUtils: CoreDomUtilsProvider,
        private contentLinksHelper: CoreContentLinksHelperProvider) { }

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
            icon: this.courseProvider.getModuleIconSrc(this.modName, module.modicon),
            title: module.name,
            class: 'addon-mod_url-handler',
            showDownloadButton: false,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions, params?: any): void {
                const modal = handler.domUtils.showModalLoading();

                // First of all, make sure module contents are loaded.
                handler.courseProvider.loadModuleContents(module, courseId, undefined, false, false, undefined, handler.modName)
                        .then(() => {
                    // Check if the URL can be handled by the app. If so, always open it directly.
                    return handler.contentLinksHelper.canHandleLink(module.contents[0].fileurl, courseId, undefined, true);
                }).then((canHandle) => {
                    if (canHandle) {
                        // URL handled by the app, open it directly.
                        return true;
                    }

                    // Not handled by the app, check the display type.
                    if (handler.urlProvider.isGetUrlWSAvailable()) {
                        return handler.urlProvider.getUrl(courseId, module.id).catch(() => {
                            // Ignore errors.
                        }).then((url) => {
                            const displayType = handler.urlProvider.getFinalDisplayType(url);

                            return displayType == CoreConstants.RESOURCELIB_DISPLAY_OPEN ||
                                   displayType == CoreConstants.RESOURCELIB_DISPLAY_POPUP;
                        });
                    } else {
                        return false;
                    }

                }).then((shouldOpen) => {
                    if (shouldOpen) {
                        handler.openUrl(module, courseId);
                    } else {
                        const pageParams = {module: module, courseId: courseId};
                        if (params) {
                            Object.assign(pageParams, params);
                        }
                        navCtrl.push('AddonModUrlIndexPage', pageParams, options);
                    }
                }).finally(() => {
                    modal.dismiss();
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
                    this.courseProvider.getModuleIconSrc(this.modName, module.modicon);
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
            return !(module.contents && module.contents[0] && module.contents[0].fileurl);
        }).catch(() => {
            // Module contents could not be loaded, most probably device is offline.
            return true;
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
        this.urlProvider.logView(module.instance, module.name).then(() => {
            this.courseProvider.checkModuleCompletion(courseId, module.completiondata);
        }).catch(() => {
            // Ignore errors.
        });
        this.urlHelper.open(module.contents[0].fileurl);
    }
}
