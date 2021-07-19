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
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonModUrlIndexComponent } from '../../components/index/index';
import { AddonModUrl } from '../url';
import { AddonModUrlHelper } from '../url-helper';

/**
 * Handler to support url modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModUrlModuleHandlerService implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_url';

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
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
    };

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getData(module: CoreCourseAnyModuleData, courseId: number): CoreCourseModuleHandlerData {

        /**
         * Open the URL.
         *
         * @param module The module object.
         * @param courseId The course ID.
         */
        const openUrl = async (module: CoreCourseModule, courseId: number): Promise<void> => {
            try {
                if (module.instance) {
                    await AddonModUrl.logView(module.instance, module.name);
                    CoreCourse.checkModuleCompletion(courseId, module.completiondata);
                }
            } catch {
                // Ignore errors.
            }

            AddonModUrlHelper.open(module.contents[0].fileurl);
        };

        const handlerData: CoreCourseModuleHandlerData = {
            icon: CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'addon-mod_url-handler',
            showDownloadButton: false,
            action: async (event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions) => {
                const modal = await CoreDomUtils.showModalLoading();

                try {
                    const shouldOpen = await this.shouldOpenLink(module, courseId);

                    if (shouldOpen) {
                        openUrl(module, courseId);
                    } else {
                        options = options || {};
                        options.params = options.params || {};
                        Object.assign(options.params, { module });
                        const routeParams = '/' + courseId + '/' + module.id;

                        CoreNavigator.navigateToSitePath(AddonModUrlModuleHandlerService.PAGE_NAME + routeParams, options);
                    }
                } finally {
                    modal.dismiss();
                }
            },
            buttons: [{
                hidden: true, // Hide it until we calculate if it should be displayed or not.
                icon: 'fas-link',
                label: 'core.openmodinbrowser',
                action: (event: Event, module: CoreCourseModule, courseId: number): void => {
                    openUrl(module, courseId);
                },
            }],
        };

        this.hideLinkButton(module, courseId).then((hideButton) => {
            handlerData.buttons![0]!.hidden = hideButton;

            if (module.contents && module.contents[0]) {
                // Calculate the icon to use.
                handlerData.icon = AddonModUrl.guessIcon(module.contents[0].fileurl) ||
                    CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined);
            }

            return;
        }).catch(() => {
            // Ignore errors.
        });

        return handlerData;
    }

    /**
     * Returns if contents are loaded to show link button.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @return Resolved when done.
     */
    protected async hideLinkButton(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        try {
            await CoreCourse.loadModuleContents(module, courseId, undefined, false, false, undefined, this.modName);

            return !(module.contents && module.contents[0] && module.contents[0].fileurl);
        } catch {
            // Module contents could not be loaded, most probably device is offline.
            return true;
        }
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown> | undefined> {
        return AddonModUrlIndexComponent;
    }

    /**
     * Check whether the link should be opened directly.
     *
     * @param module Module.
     * @param courseId Course ID.
     * @return Promise resolved with boolean.
     */
    protected async shouldOpenLink(module: CoreCourseModule, courseId: number): Promise<boolean> {
        try {
            // First of all, make sure module contents are loaded.
            await CoreCourse.loadModuleContents(module, courseId, undefined, false, false, undefined, this.modName);

            // Check if the URL can be handled by the app. If so, always open it directly.
            const canHandle = await CoreContentLinksHelper.canHandleLink(module.contents[0].fileurl, courseId, undefined, true);

            if (canHandle) {
                // URL handled by the app, open it directly.
                return true;
            } else if (AddonModUrl.isGetUrlWSAvailable()) {
                // Not handled by the app, check the display type.
                const url = await CoreUtils.ignoreErrors(AddonModUrl.getUrl(courseId, module.id));
                const displayType = AddonModUrl.getFinalDisplayType(url);

                return displayType == CoreConstants.RESOURCELIB_DISPLAY_OPEN ||
                    displayType == CoreConstants.RESOURCELIB_DISPLAY_POPUP;
            }

            return false;
        } catch {
            return false;
        }
    }

    /**
     * @inheritdoc
     */
    manualCompletionAlwaysShown(module: CoreCourseModule): Promise<boolean> {
        return this.shouldOpenLink(module, module.course!);
    }

}
export const AddonModUrlModuleHandler = makeSingleton(AddonModUrlModuleHandlerService);
