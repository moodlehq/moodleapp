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

import { CoreConstants, ModPurpose } from '@/core/constants';
import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { makeSingleton, Translate } from '@singletons';
import { AddonModResourceIndexComponent } from '../../components/index';
import { AddonModResource, AddonModResourceCustomData } from '../resource';
import { AddonModResourceHelper } from '../resource-helper';

/**
 * Handler to support resource modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourceModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_resource';

    name = 'AddonModResource';
    modName = 'resource';
    protected pageName = AddonModResourceModuleHandlerService.PAGE_NAME;

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
        [CoreConstants.FEATURE_MOD_PURPOSE]: ModPurpose.MOD_PURPOSE_CONTENT,
    };

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModResource.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async getData(
        module: CoreCourseModuleData,
        courseId: number,
        sectionId?: number,
        forCoursePage?: boolean,
    ): Promise<CoreCourseModuleHandlerData> {
        const openWithPicker = CoreFileHelper.defaultIsOpenWithPicker();

        const handlerData = await super.getData(module, courseId, sectionId, forCoursePage);
        handlerData.updateStatus = (status) => {
            if (!handlerData.buttons) {
                return;
            }

            handlerData.buttons[0].hidden = status !== CoreConstants.DOWNLOADED ||
                AddonModResourceHelper.isDisplayedInIframe(module);
        };
        handlerData.buttons = [{
            hidden: true,
            icon: openWithPicker ? 'fas-share-square' : 'fas-file',
            label: module.name + ': ' + Translate.instant(openWithPicker ? 'core.openwith' : 'addon.mod_resource.openthefile'),
            action: async (event: Event, module: CoreCourseModuleData, courseId: number): Promise<void> => {
                const hide = await this.hideOpenButton(module);
                if (!hide) {
                    AddonModResourceHelper.openModuleFile(module, courseId);

                    CoreCourse.storeModuleViewed(courseId, module.id);
                }
            },
        }];

        this.getResourceData(module, courseId, handlerData).then((extra) => {
            handlerData.extraBadge = extra;

            return;
        }).catch(() => {
            // Ignore errors.
        });

        try {
            handlerData.icon = this.getIconSrc(module);
        } catch {
            // Ignore errors.
        }

        return handlerData;
    }

    /**
     * Returns if contents are loaded to show open button.
     *
     * @param module The module object.
     * @returns Resolved when done.
     */
    protected async hideOpenButton(module: CoreCourseModuleData): Promise<boolean> {
        if (!module.contentsinfo) { // Not informed before 3.7.6.
            await CoreCourse.loadModuleContents(module, undefined, undefined, false, false, undefined, this.modName);
        }

        const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(module, module.course);

        return status !== CoreConstants.DOWNLOADED || AddonModResourceHelper.isDisplayedInIframe(module);
    }

    /**
     * Returns the activity icon and data.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @returns Resource data.
     */
    protected async getResourceData(
        module: CoreCourseModuleData,
        courseId: number,
        handlerData: CoreCourseModuleHandlerData,
    ): Promise<string> {
        const promises: Promise<void>[] = [];
        let options: AddonModResourceCustomData = {};

        // Check if the button needs to be shown or not.
        promises.push(this.hideOpenButton(module).then((hideOpenButton) => {
            if (!handlerData.buttons) {
                return;
            }

            handlerData.buttons[0].hidden = hideOpenButton;

            return;
        }));

        if (module.customdata !== undefined) {
            options = CoreTextUtils.unserialize(CoreTextUtils.parseJSON(module.customdata));
        } else {
            // Get the resource data.
            promises.push(AddonModResource.getResourceData(courseId, module.id).then((info) => {
                options = CoreTextUtils.unserialize(info.displayoptions);

                return;
            }));
        }

        await Promise.all(promises);

        const extra: string[] = [];

        if (module.contentsinfo) {
            // No need to use the list of files.
            extra.push(CoreTextUtils.cleanTags(module.afterlink));
        } else if (module.contents && module.contents[0]) {
            const files = module.contents;
            const file = files[0];

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
        }

        return extra.join(' ');
    }

    /**
     * @inheritdoc
     */
    getIconSrc(module?: CoreCourseModuleData): string | undefined {
        if (!module) {
            return;
        }

        if (CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0')) {
            return CoreCourse.getModuleIconSrc(module.modname, module.modicon);
        }
        let mimetypeIcon = '';

        if (module.contentsinfo) {
            // No need to use the list of files.
            const mimetype = module.contentsinfo.mimetypes[0];
            if (mimetype) {
                mimetypeIcon = CoreMimetypeUtils.getMimetypeIcon(mimetype);
            }

        } else if (module.contents && module.contents[0]) {
            const files = module.contents;
            const file = files[0];

            mimetypeIcon = CoreMimetypeUtils.getFileIcon(file.filename || '');
        }

        return CoreCourse.getModuleIconSrc(module.modname, module.modicon, mimetypeIcon);
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        return AddonModResourceIndexComponent;
    }

}
export const AddonModResourceModuleHandler = makeSingleton(AddonModResourceModuleHandlerService);
