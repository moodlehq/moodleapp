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

import { CoreConstants } from '@/core/constants';
import { Injectable, Type } from '@angular/core';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseModuleContentFile } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreFileHelper } from '@services/file-helper';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModResourceIndexComponent } from '../../components/index';
import { AddonModResource, AddonModResourceCustomData } from '../resource';
import { AddonModResourceHelper } from '../resource-helper';

/**
 * Handler to support resource modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourceModuleHandlerService implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_resource';

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
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
    };

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModResource.isPluginEnabled();
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @return Data to render the module.
     */
    getData(module: CoreCourseAnyModuleData, courseId: number): CoreCourseModuleHandlerData {
        const updateStatus = (status: string): void => {
            handlerData.buttons![0].hidden = status !== CoreConstants.DOWNLOADED ||
                AddonModResourceHelper.isDisplayedInIframe(module);
        };
        const openWithPicker = CoreFileHelper.defaultIsOpenWithPicker();

        const handlerData: CoreCourseModuleHandlerData = {
            icon: CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'addon-mod_resource-handler',
            showDownloadButton: true,
            action(event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions): void {
                options = options || {};
                options.params = options.params || {};
                Object.assign(options.params, { module });
                const routeParams = '/' + courseId + '/' + module.id;

                CoreNavigator.navigateToSitePath(AddonModResourceModuleHandlerService.PAGE_NAME + routeParams, options);
            },
            updateStatus: updateStatus.bind(this),
            buttons: [{
                hidden: true,
                icon: openWithPicker ? 'fas-share-square' : 'fas-file',
                label: module.name + ': ' + Translate.instant(openWithPicker ? 'core.openwith' : 'addon.mod_resource.openthefile'),
                action: async (event: Event, module: CoreCourseModule, courseId: number): Promise<void> => {
                    const hide = await this.hideOpenButton(module, courseId);
                    if (!hide) {
                        AddonModResourceHelper.openModuleFile(module, courseId);
                    }
                },
            }],
        };

        this.getResourceData(module, courseId, handlerData).then((data) => {
            handlerData.icon = data.icon;
            handlerData.extraBadge = data.extra;
            handlerData.extraBadgeColor = 'light';

            return;
        }).catch(() => {
            // Ignore errors.
        });

        return handlerData;
    }

    /**
     * Returns if contents are loaded to show open button.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @return Resolved when done.
     */
    protected async hideOpenButton(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        if (!('contentsinfo' in module) || !module.contentsinfo) {
            await CoreCourse.loadModuleContents(module, courseId, undefined, false, false, undefined, this.modName);
        }

        const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(module, courseId);

        return status !== CoreConstants.DOWNLOADED || AddonModResourceHelper.isDisplayedInIframe(module);
    }

    /**
     * Returns the activity icon and data.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @return Resource data.
     */
    protected async getResourceData(
        module: CoreCourseAnyModuleData,
        courseId: number,
        handlerData: CoreCourseModuleHandlerData,
    ): Promise<AddonResourceHandlerData> {
        const promises: Promise<void>[] = [];
        let infoFiles: CoreWSFile[] = [];
        let options: AddonModResourceCustomData = {};

        // Check if the button needs to be shown or not.
        promises.push(this.hideOpenButton(module, courseId).then((hideOpenButton) => {
            handlerData.buttons![0].hidden = hideOpenButton;

            return;
        }));

        if ('customdata' in module && typeof module.customdata != 'undefined') {
            options = CoreTextUtils.unserialize(CoreTextUtils.parseJSON(module.customdata));
        } else if (AddonModResource.isGetResourceWSAvailable()) {
            // Get the resource data.
            promises.push(AddonModResource.getResourceData(courseId, module.id).then((info) => {
                infoFiles = info.contentfiles;
                options = CoreTextUtils.unserialize(info.displayoptions);

                return;
            }));
        }

        await Promise.all(promises);

        const files: (CoreCourseModuleContentFile | CoreWSFile)[] = module.contents && module.contents.length
            ? module.contents
            : infoFiles;

        const resourceData: AddonResourceHandlerData = {
            icon: '',
            extra: '',
        };
        const extra: string[] = [];

        if ('contentsinfo' in module && module.contentsinfo) {
            // No need to use the list of files.
            const mimetype = module.contentsinfo.mimetypes[0];
            if (mimetype) {
                resourceData.icon = CoreMimetypeUtils.getMimetypeIcon(mimetype);
            }
            resourceData.extra = CoreTextUtils.cleanTags(module.afterlink);

        } else if (files && files.length) {
            const file = files[0];

            resourceData.icon = CoreMimetypeUtils.getFileIcon(file.filename || '');

            if (options.showsize) {
                const size = options.filedetails
                    ? options.filedetails.size
                    : files.reduce((result, file) => result + (file.filesize || 0), 0);

                extra.push(CoreTextUtils.bytesToSize(size, 1));
            }

            if (options.showtype) {
                // We should take it from options.filedetails.size if available but it's already translated.
                extra.push(CoreMimetypeUtils.getMimetypeDescription(file));
            }

            if (options.showdate) {
                const timecreated = 'timecreated' in file ? file.timecreated : 0;

                if (options.filedetails && options.filedetails.modifieddate) {
                    extra.push(Translate.instant(
                        'addon.mod_resource.modifieddate',
                        { $a: CoreTimeUtils.userDate(options.filedetails.modifieddate * 1000, 'core.strftimedatetimeshort') },
                    ));
                } else if (options.filedetails && options.filedetails.uploadeddate) {
                    extra.push(Translate.instant(
                        'addon.mod_resource.uploadeddate',
                        { $a: CoreTimeUtils.userDate(options.filedetails.uploadeddate * 1000, 'core.strftimedatetimeshort') },
                    ));
                } else if ((file.timemodified || 0) > timecreated + CoreConstants.SECONDS_MINUTE * 5) {
                    /* Modified date may be up to several minutes later than uploaded date just because
                        teacher did not submit the form promptly. Give teacher up to 5 minutes to do it. */
                    extra.push(Translate.instant(
                        'addon.mod_resource.modifieddate',
                        { $a: CoreTimeUtils.userDate((file.timemodified || 0) * 1000, 'core.strftimedatetimeshort') },
                    ));
                } else {
                    extra.push(Translate.instant(
                        'addon.mod_resource.uploadeddate',
                        { $a: CoreTimeUtils.userDate(timecreated * 1000, 'core.strftimedatetimeshort') },
                    ));
                }
            }

            resourceData.extra += extra.join(' ');
        }

        // No previously set, just set the icon.
        if (resourceData.icon == '') {
            resourceData.icon = CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined);
        }

        return resourceData;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown> | undefined> {
        return AddonModResourceIndexComponent;
    }

}
export const AddonModResourceModuleHandler = makeSingleton(AddonModResourceModuleHandlerService);

type AddonResourceHandlerData = {
    icon: string;
    extra: string;
}
;
