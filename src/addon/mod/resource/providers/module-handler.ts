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
import { TranslateService } from '@ngx-translate/core';
import { AddonModResourceProvider } from './resource';
import { AddonModResourceHelperProvider } from './helper';
import { AddonModResourceIndexComponent } from '../components/index/index';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreConstants } from '@core/constants';

/**
 * Handler to support resource modules.
 */
@Injectable()
export class AddonModResourceModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModResource';
    modName = 'resource';

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

    protected statusObserver;

    constructor(protected resourceProvider: AddonModResourceProvider, private courseProvider: CoreCourseProvider,
            protected mimetypeUtils: CoreMimetypeUtilsProvider, private resourceHelper: AddonModResourceHelperProvider,
            protected prefetchDelegate: CoreCourseModulePrefetchDelegate, protected textUtils: CoreTextUtilsProvider,
            protected translate: TranslateService, protected timeUtils: CoreTimeUtilsProvider) {
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.resourceProvider.isPluginEnabled();
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
        const updateStatus = (status: string): void => {
            handlerData.buttons[0].hidden = status !== CoreConstants.DOWNLOADED ||
                this.resourceHelper.isDisplayedInIframe(module);
        };

        const handlerData: CoreCourseModuleHandlerData = {
            icon: this.courseProvider.getModuleIconSrc(this.modName, module.modicon),
            title: module.name,
            class: 'addon-mod_resource-handler',
            showDownloadButton: true,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions, params?: any): void {
                const pageParams = {module: module, courseId: courseId};
                if (params) {
                    Object.assign(pageParams, params);
                }
                navCtrl.push('AddonModResourceIndexPage', pageParams, options);
            },
            updateStatus: updateStatus.bind(this),
            buttons: [ {
                hidden: true,
                icon: 'document',
                label: 'addon.mod_resource.openthefile',
                action: (event: Event, navCtrl: NavController, module: any, courseId: number): void => {
                    this.hideOpenButton(module, courseId).then((hide) => {
                        if (!hide) {
                            this.resourceHelper.openModuleFile(module, courseId);
                        }
                    });
                }
            } ]
        };

        this.getResourceData(module, courseId, handlerData).then((data) => {
            handlerData.icon = data.icon;
            handlerData.extraBadge = data.extra;
            handlerData.extraBadgeColor = 'light';
        });

        return handlerData;
    }

    /**
     * Returns if contents are loaded to show open button.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @return {Promise<boolean>} Resolved when done.
     */
    protected hideOpenButton(module: any, courseId: number): Promise<boolean> {
        let promise;

        if (module.contentsinfo) {
            // No need to load contents.
            promise = Promise.resolve();
        } else {
            promise = this.courseProvider.loadModuleContents(module, courseId, undefined, false, false, undefined, this.modName);
        }

        return promise.then(() => {
            return this.prefetchDelegate.getModuleStatus(module, courseId).then((status) => {
                return status !== CoreConstants.DOWNLOADED || this.resourceHelper.isDisplayedInIframe(module);
            });
        });
    }

    /**
     * Returns the activity icon and data.
     *
     * @param {any} module        The module object.
     * @param {number} courseId   The course ID.
     * @return {Promise<any>}     Resource data.
     */
    protected getResourceData(module: any, courseId: number, handlerData: CoreCourseModuleHandlerData): Promise<any> {
        const promises = [];
        let infoFiles = [],
            options: any = {};

        // Check if the button needs to be shown or not.
        promises.push(this.hideOpenButton(module, courseId).then((hideOpenButton) => {
            handlerData.buttons[0].hidden = hideOpenButton;
        }));

        if (typeof module.customdata != 'undefined') {
            options = this.textUtils.unserialize(this.textUtils.parseJSON(module.customdata));
        } else if (this.resourceProvider.isGetResourceWSAvailable()) {
            // Get the resource data.
            promises.push(this.resourceProvider.getResourceData(courseId, module.id).then((info) => {
                infoFiles = info.contentfiles;
                options = this.textUtils.unserialize(info.displayoptions);
            }));
        }

        return Promise.all(promises).then(() => {
            const files = module.contents && module.contents.length ? module.contents : infoFiles,
                resourceData = {
                    icon: '',
                    extra: ''
                },
                extra = [];

            if (module.contentsinfo) {
                // No need to use the list of files.
                const mimetype = module.contentsinfo.mimetypes[0];
                if (mimetype) {
                    resourceData.icon = this.mimetypeUtils.getMimetypeIcon(mimetype);
                }
                resourceData.extra = this.textUtils.cleanTags(module.afterlink);

            } else if (files && files.length) {
                const file = files[0];

                resourceData.icon = this.mimetypeUtils.getFileIcon(file.filename);

                if (options.showsize) {
                    let size;
                    if (options.filedetails) {
                        size = options.filedetails.size;
                    } else {
                        size = files.reduce((result, file) => {
                            return result + file.filesize;
                        }, 0);
                    }

                    extra.push(this.textUtils.bytesToSize(size, 1));
                }

                if (options.showtype) {
                    // We should take it from options.filedetails.size if avalaible but it's already translated.
                    extra.push(this.mimetypeUtils.getMimetypeDescription(file));
                }

                if (options.showdate) {
                    if (options.filedetails && options.filedetails.modifieddate) {
                        extra.push(this.translate.instant('addon.mod_resource.modifieddate',
                            {$a: this.timeUtils.userDate(options.filedetails.modifieddate * 1000, 'core.strftimedatetimeshort') }));
                    } else if (options.filedetails && options.filedetails.uploadeddate) {
                        extra.push(this.translate.instant('addon.mod_resource.uploadeddate',
                            {$a: this.timeUtils.userDate(options.filedetails.uploadeddate * 1000, 'core.strftimedatetimeshort') }));
                    } else if (file.timemodified > file.timecreated + CoreConstants.SECONDS_MINUTE * 5) {
                        /* Modified date may be up to several minutes later than uploaded date just because
                           teacher did not submit the form promptly. Give teacher up to 5 minutes to do it. */
                        extra.push(this.translate.instant('addon.mod_resource.modifieddate',
                            {$a: this.timeUtils.userDate(file.timemodified * 1000, 'core.strftimedatetimeshort') }));
                    } else {
                        extra.push(this.translate.instant('addon.mod_resource.uploadeddate',
                            {$a: this.timeUtils.userDate(file.timecreated * 1000, 'core.strftimedatetimeshort') }));
                    }
                }

                if (resourceData.icon == '') {
                    resourceData.icon = this.courseProvider.getModuleIconSrc(this.modName, module.modicon);
                }
                resourceData.extra += extra.join(' ');
            } else {
                // No files, just set the icon.
                resourceData.icon = this.courseProvider.getModuleIconSrc(this.modName, module.modicon);
            }

            return resourceData;
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
        return AddonModResourceIndexComponent;
    }
}
