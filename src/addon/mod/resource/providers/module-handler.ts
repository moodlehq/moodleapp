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
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreConstants } from '@core/constants';
import * as moment from 'moment';

/**
 * Handler to support resource modules.
 */
@Injectable()
export class AddonModResourceModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModResource';
    modName = 'resource';

    protected statusObserver;

    constructor(protected resourceProvider: AddonModResourceProvider, private courseProvider: CoreCourseProvider,
            protected mimetypeUtils: CoreMimetypeUtilsProvider, private resourceHelper: AddonModResourceHelperProvider,
            protected prefetchDelegate: CoreCourseModulePrefetchDelegate, protected textUtils: CoreTextUtilsProvider,
            protected translate: TranslateService) {
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
            icon: this.courseProvider.getModuleIconSrc(this.modName),
            title: module.name,
            class: 'addon-mod_resource-handler',
            showDownloadButton: true,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions): void {
                navCtrl.push('AddonModResourceIndexPage', {module: module, courseId: courseId}, options);
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
        return this.courseProvider.loadModuleContents(module, courseId, undefined, false, false, undefined, this.modName)
                .then(() => {
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
        let resourceInfo;

        // Check if the button needs to be shown or not. This also loads the module contents.
        promises.push(this.hideOpenButton(module, courseId).then((hideOpenButton) => {
            handlerData.buttons[0].hidden = hideOpenButton;
        }));

        // Get the resource data.
        promises.push(this.resourceProvider.getResourceData(courseId, module.id).then((info) => {
            resourceInfo = info;
        }));

        return Promise.all(promises).then(() => {
            const files = module.contents && module.contents.length ? module.contents : resourceInfo.contentfiles,
                resourceData = {
                    icon: '',
                    extra: ''
                },
                options = this.textUtils.unserialize(resourceInfo.displayoptions),
                extra = [];

            if (files && files.length) {
                const file = files[0];
                resourceData.icon = this.mimetypeUtils.getFileIcon(file.filename);

                if (options.showsize) {
                    const size = files.reduce((result, file) => {
                        return result + file.filesize;
                    }, 0);
                    extra.push(this.textUtils.bytesToSize(size, 1));
                }
                if (options.showtype) {
                    extra.push(this.mimetypeUtils.getMimetypeDescription(file));
                }

                if (options.showdate) {
                    /* Modified date may be up to several minutes later than uploaded date just because
                       teacher did not submit the form promptly. Give teacher up to 5 minutes to do it. */
                    if (file.timemodified > file.timecreated + CoreConstants.SECONDS_MINUTE * 5) {
                        extra.push(this.translate.instant('addon.mod_resource.modifieddate',
                            {$a: moment(file.timemodified * 1000).format('LLL')}));
                    } else {
                        extra.push(this.translate.instant('addon.mod_resource.uploadeddate',
                            {$a: moment(file.timecreated * 1000).format('LLL')}));
                    }
                }
            }

            if (resourceData.icon == '') {
                resourceData.icon = this.courseProvider.getModuleIconSrc(this.modName);
            }

            resourceData.extra += extra.join(' ');

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
