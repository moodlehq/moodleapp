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

import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreFileHelper } from '@services/file-helper';
import { CoreMimetype } from '@singletons/mimetype';
import { makeSingleton, Translate } from '@singletons';
import { AddonModResource } from '../resource';
import { AddonModResourceHelper } from '../resource-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ADDON_MOD_RESOURCE_MODNAME, ADDON_MOD_RESOURCE_PAGE_NAME } from '../../constants';
import { DownloadStatus } from '@/core/constants';
import { ModFeature, ModArchetype, ModPurpose } from '@addons/mod/constants';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreSites } from '@services/sites';

/**
 * Handler to support resource modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourceModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModResource';
    modName = ADDON_MOD_RESOURCE_MODNAME;
    protected pageName = ADDON_MOD_RESOURCE_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.MOD_ARCHETYPE]: ModArchetype.RESOURCE,
        [ModFeature.GROUPS]: false,
        [ModFeature.GROUPINGS]: false,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.GRADE_HAS_GRADE]: false,
        [ModFeature.GRADE_OUTCOMES]: false,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.CONTENT,
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

                    CoreCourseModuleHelper.storeModuleViewed(courseId, module.id);
                }
            },
        };

        const [hideButton, extraBadge] = await Promise.all([
            CorePromiseUtils.ignoreErrors(this.hideOpenButton(module)),
            CorePromiseUtils.ignoreErrors(AddonModResourceHelper.getAfterLinkDetails(module, courseId)),
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
                mimetypeIcon = CoreMimetype.getMimetypeIcon(mimetype, CoreSites.getCurrentSite());
            }

        } else if (module.contents && module.contents[0]) {
            const files = module.contents;
            const file = files[0];

            mimetypeIcon = CoreMimetype.getFileIcon(file.filename || '', CoreSites.getCurrentSite());
        }

        return CoreCourseModuleHelper.getModuleIconSrc(module.modname, module.modicon, mimetypeIcon);
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
