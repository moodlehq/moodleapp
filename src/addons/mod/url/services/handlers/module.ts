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
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourse, CoreCourseModuleContentFile } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreNavigationOptions } from '@services/navigator';
import { CoreLoadings } from '@services/overlays/loadings';
import { CorePromiseUtils } from '@static/promise-utils';
import { makeSingleton } from '@singletons';
import { AddonModUrl } from '../url';
import { AddonModUrlHelper } from '../url-helper';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreUrl } from '@static/url';
import { CoreMimetype } from '@static/mimetype';
import { ADDON_MOD_URL_COMPONENT, ADDON_MOD_URL_MODNAME, ADDON_MOD_URL_PAGE_NAME } from '../../constants';
import { ModFeature, ModArchetype, ModPurpose, ModResourceDisplay } from '@addons/mod/constants';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';

/**
 * Handler to support url modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModUrlModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = ADDON_MOD_URL_COMPONENT;
    modName = ADDON_MOD_URL_MODNAME;
    protected pageName = ADDON_MOD_URL_PAGE_NAME;

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
    async getData(module: CoreCourseModuleData): Promise<CoreCourseModuleHandlerData> {
        /**
         * Open the URL.
         *
         * @param module The module object.
         * @param courseId The course ID.
         */
        const openUrl = async (module: CoreCourseModuleData, courseId: number): Promise<void> => {
            await this.logView(module);

            CoreCourseModuleHelper.storeModuleViewed(courseId, module.id);

            const mainFile = await this.getModuleMainFile(module);
            if (!mainFile) {
                return;
            }

            AddonModUrlHelper.open(mainFile.fileurl);
        };

        const handlerData: CoreCourseModuleHandlerData = {
            icon: CoreCourseModuleHelper.getModuleIconSrc(module.modname, module.modicon),
            title: module.name,
            class: 'addon-mod_url-handler',
            showDownloadButton: false,
            action: async (event: Event, module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions) => {
                const modal = await CoreLoadings.show();

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
                icon: 'fas-link',
                label: 'core.openmodinbrowser',
                action: (event: Event, module: CoreCourseModuleData, courseId: number): void => {
                    openUrl(module, courseId);
                },
            },
        };

        try {
            handlerData.icon = await this.getIconSrc(module, handlerData.icon as string);
        } catch {
            // Ignore errors.
        }

        return handlerData;
    }

    /**
     * @inheritdoc
     */
    async getIconSrc(module?: CoreCourseModuleData, modIcon?: string): Promise<string | undefined> {
        if (!module) {
            return modIcon;
        }

        const component = CoreUrl.getThemeImageUrlParam(module.modicon, 'component');
        if (component === this.modName) {
            return modIcon;
        }

        let icon: string | undefined;

        let image = CoreUrl.getThemeImageUrlParam(module.modicon, 'image');
        if (image.startsWith('f/')) {
            // Remove prefix, and hyphen + numbered suffix.
            image = image.substring(2).replace(/-[0-9]+$/, '');

            // In case we get an extension, try to get the type.
            image = CoreMimetype.getExtensionType(image) ?? image;

            icon = CoreMimetype.getFileIconForType(image, CoreSites.getCurrentSite());
        } else {
            const mainFile = await this.getModuleMainFile(module);

            icon = mainFile ? AddonModUrl.guessIcon(mainFile.fileurl) : undefined;
        }

        // Calculate the icon to use.
        return CoreCourseModuleHelper.getModuleIconSrc(module.modname, module.modicon, icon);
    }

    /**
     * Get the module main file if not set.
     *
     * @param module Module.
     * @returns Module contents.
     */
    protected async getModuleMainFile(module?: CoreCourseModuleData): Promise<CoreCourseModuleContentFile | undefined> {
        if (!module) {
            return;
        }

        if (module.contents?.[0]) {
            return module.contents[0];
        }

        try {
            // Try to get module contents, it's needed to get the URL with parameters.
            const contents = await CoreCourse.getModuleContents(
                module,
                undefined,
                undefined,
                false,
                false,
                undefined,
                'url',
            );

            module.contents = contents;
        } catch {
            // Fallback in case is not prefetched.
            const mod = await CoreCourse.getModule(module.id, module.course, undefined, true, false, undefined, 'url');
            module.contents = mod.contents;
        }

        return module.contents?.[0];
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { AddonModUrlIndexComponent } = await import('../../components/index');

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
            const mainFile = await this.getModuleMainFile(module);
            if (!mainFile) {
                return false;
            }

            // Check if the URL can be handled by the app. If so, always open it directly.
            const canHandle = await CoreContentLinksHelper.canHandleLink(mainFile.fileurl, module.course, undefined, true);

            if (canHandle) {
                // URL handled by the app, open it directly.
                return true;
            } else {
                // Not handled by the app, check the display type.
                const url = await CorePromiseUtils.ignoreErrors(AddonModUrl.getUrl(module.course, module.id));
                const displayType = AddonModUrl.getFinalDisplayType(url);

                return displayType === ModResourceDisplay.OPEN ||
                    displayType === ModResourceDisplay.POPUP;
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

    /**
     * @inheritdoc
     */
    async getModuleForcedLang(module: CoreCourseModuleData): Promise<string | undefined> {
        const mod = await AddonModUrl.getUrl(
            module.course,
            module.id,
            { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        return mod?.lang;
    }

}
export const AddonModUrlModuleHandler = makeSingleton(AddonModUrlModuleHandlerService);
