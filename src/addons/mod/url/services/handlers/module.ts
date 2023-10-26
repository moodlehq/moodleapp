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
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreNavigationOptions } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonModUrlIndexComponent } from '../../components/index/index';
import { AddonModUrl } from '../url';
import { AddonModUrlHelper } from '../url-helper';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';

/**
 * Handler to support url modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModUrlModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_url';

    name = 'AddonModUrl';
    modName = 'url';
    protected pageName = AddonModUrlModuleHandlerService.PAGE_NAME;

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
    async getData(module: CoreCourseModuleData): Promise<CoreCourseModuleHandlerData> {

        /**
         * Open the URL.
         *
         * @param module The module object.
         * @param courseId The course ID.
         */
        const openUrl = async (module: CoreCourseModuleData, courseId: number): Promise<void> => {
            await this.logView(module);

            CoreCourse.storeModuleViewed(courseId, module.id);

            const contents = await CoreCourse.getModuleContents(module);
            AddonModUrlHelper.open(contents[0].fileurl);
        };

        const handlerData: CoreCourseModuleHandlerData = {
            icon: CoreCourse.getModuleIconSrc(module.modname, module.modicon),
            title: module.name,
            class: 'addon-mod_url-handler',
            showDownloadButton: false,
            action: async (event: Event, module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions) => {
                const modal = await CoreDomUtils.showModalLoading();

                try {
                    const shouldOpen = await this.shouldOpenLink(module);

                    if (shouldOpen) {
                        openUrl(module, courseId);
                    } else {
                        this.openActivityPage(module, module.course, options);
                    }
                } finally {
                    modal.dismiss();
                }
            },
            button: {
                hidden: true, // Hide it until we calculate if it should be displayed or not.
                icon: 'fas-link',
                label: 'core.openmodinbrowser',
                action: (event: Event, module: CoreCourseModuleData, courseId: number): void => {
                    openUrl(module, courseId);
                },
            },
        };

        const hideButton = await CoreUtils.ignoreErrors(this.hideLinkButton(module));

        if (handlerData.button && hideButton !== undefined) {
            handlerData.button.hidden = hideButton;
        }

        try {
            handlerData.icon = await this.getIconSrc(module);
        } catch {
            // Ignore errors.
        }

        return handlerData;
    }

    /**
     * @inheritdoc
     */
    async getIconSrc(module?: CoreCourseModuleData): Promise<string | undefined> {
        if (!module) {
            return;
        }

        let mainFile = module.contents?.[0];

        if (!mainFile) {
            try {
                // Try to get module contents, it's needed to get the URL with parameters.
                const contents = await CoreCourse.getModuleContents(
                    module,
                    undefined,
                    undefined,
                    true,
                    false,
                    undefined,
                    'url',
                );

                mainFile = contents[0];
            } catch {
                // Fallback in case is not prefetched.
                const mod = await CoreCourse.getModule(module.id, module.course, undefined, true, false, undefined, 'url');

                mainFile = mod.contents?.[0];
            }
        }

        const icon = mainFile? AddonModUrl.guessIcon(mainFile.fileurl) : undefined;

        // Calculate the icon to use.
        return CoreCourse.getModuleIconSrc(module.modname, module.modicon, icon);
    }

    /**
     * Returns if contents are loaded to show link button.
     *
     * @param module The module object.
     * @returns Resolved when done.
     */
    protected async hideLinkButton(module: CoreCourseModuleData): Promise<boolean> {
        try {
            const contents =
                await CoreCourse.getModuleContents(module, undefined, undefined, false, false, undefined, this.modName);

            return !(contents[0] && contents[0].fileurl);
        } catch {
            // Module contents could not be loaded, most probably device is offline.
            return true;
        }
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        return AddonModUrlIndexComponent;
    }

    /**
     * Check whether the link should be opened directly.
     *
     * @param module Module.
     * @returns Promise resolved with boolean.
     */
    protected async shouldOpenLink(module: CoreCourseModuleData): Promise<boolean> {
        try {
            const contents =
                await CoreCourse.getModuleContents(module, undefined, undefined, false, false, undefined, this.modName);

            // Check if the URL can be handled by the app. If so, always open it directly.
            const canHandle = await CoreContentLinksHelper.canHandleLink(contents[0].fileurl, module.course, undefined, true);

            if (canHandle) {
                // URL handled by the app, open it directly.
                return true;
            } else {
                // Not handled by the app, check the display type.
                const url = await CoreUtils.ignoreErrors(AddonModUrl.getUrl(module.course, module.id));
                const displayType = AddonModUrl.getFinalDisplayType(url);

                return displayType == CoreConstants.RESOURCELIB_DISPLAY_OPEN ||
                    displayType == CoreConstants.RESOURCELIB_DISPLAY_POPUP;
            }
        } catch {
            return false;
        }
    }

    /**
     * @inheritdoc
     */
    manualCompletionAlwaysShown(module: CoreCourseModuleData): Promise<boolean> {
        return this.shouldOpenLink(module);
    }

    /**
     * Log module viewed.
     */
    protected async logView(module: CoreCourseModuleData): Promise<void> {
        try {
            if (module.instance) {
                await AddonModUrl.logView(module.instance);
                CoreCourse.checkModuleCompletion(module.course, module.completiondata);
            }
        } catch {
            // Ignore errors.
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'mod_url_view_url',
            name: module.name,
            data: { id: module.instance, category: 'url' },
            url: `/mod/url/view.php?id=${module.id}`,
        });
    }

}
export const AddonModUrlModuleHandler = makeSingleton(AddonModUrlModuleHandlerService);
