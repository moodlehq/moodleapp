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

import { CoreConstants, DownloadStatus, ModPurpose } from '@/core/constants';
import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreFileHelper } from '@services/file-helper';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { makeSingleton, Translate } from '@singletons';
import { AddonModResource } from '../resource';
import { AddonModResourceHelper } from '../resource-helper';
import { CoreUtils } from '@services/utils/utils';

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
            if (!handlerData.button) {
                return;
            }

            handlerData.button.hidden = status !== DownloadStatus.DOWNLOADED ||
                AddonModResourceHelper.isDisplayedInIframe(module);
        };
        handlerData.button = {
            hidden: true,
            icon: openWithPicker ? 'fas-share-from-square' : 'fas-file',
            label: module.name + ': ' + Translate.instant(openWithPicker ? 'core.openwith' : 'addon.mod_resource.openthefile'),
            action: async (event: Event, module: CoreCourseModuleData, courseId: number): Promise<void> => {
                const hide = await this.hideOpenButton(module);
                if (!hide) {
                    AddonModResourceHelper.openModuleFile(module, courseId);

                    CoreCourse.storeModuleViewed(courseId, module.id);
                }
            },
        };

        const [hideButton, extraBadge] = await Promise.all([
            CoreUtils.ignoreErrors(this.hideOpenButton(module)),
            CoreUtils.ignoreErrors(AddonModResourceHelper.getAfterLinkDetails(module, courseId)),
        ]);

        // Check if the button needs to be shown or not.
        if (hideButton !== undefined) {
            handlerData.button.hidden = hideButton;
        }
        if (extraBadge !== undefined) {
            handlerData.extraBadge = extraBadge;
        }

        handlerData.icon = this.getIconSrc(module);

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

        return status !== DownloadStatus.DOWNLOADED || AddonModResourceHelper.isDisplayedInIframe(module);
    }

    /**
     * @inheritdoc
     */
    async manualCompletionAlwaysShown(module: CoreCourseModuleData): Promise<boolean> {
        const hideButton = await this.hideOpenButton(module);

        return !hideButton;
    }

    /**
     * @inheritdoc
     */
    getIconSrc(module?: CoreCourseModuleData): string | undefined {
        if (!module) {
            return;
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
        const { AddonModResourceIndexComponent } = await import('../../components/index');

        return AddonModResourceIndexComponent;
    }

}
export const AddonModResourceModuleHandler = makeSingleton(AddonModResourceModuleHandlerService);
