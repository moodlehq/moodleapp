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

import { Type } from '@angular/core';

import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import {
    CoreCourseModuleHandler,
    CoreCourseModuleHandlerData,
    CoreCourseOverviewItemContent,
} from '@features/course/services/module-delegate';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsCourseModuleHandlerData,
    CoreSitePluginsPlugin,
} from '@features/siteplugins/services/siteplugins';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreLogger } from '@static/logger';
import { CoreEvents } from '@static/events';
import { CorePromiseUtils } from '@static/promise-utils';
import { CORE_SITE_PLUGINS_UPDATE_COURSE_CONTENT } from '@features/siteplugins/constants';
import { ModFeature } from '@addons/mod/constants';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';

/**
 * Handler to support a module using a site plugin.
 */
export class CoreSitePluginsModuleHandler extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    supportedFeatures?: Record<ModFeature, unknown>;
    supportsFeature?: (feature: ModFeature) => unknown;

    protected logger: CoreLogger;

    constructor(
        public name: string,
        public modName: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsCourseModuleHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super();

        this.logger = CoreLogger.getInstance('CoreSitePluginsModuleHandler');
        this.supportedFeatures = handlerSchema.supportedfeatures;

        if (initResult?.jsResult && initResult.jsResult.supportsFeature) {
            // The init result defines a function to check if a feature is supported, use it.
            this.supportsFeature = (feature) => initResult.jsResult.supportsFeature(feature);
        }
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
        const icon = module.modicon || this.handlerSchema.displaydata?.icon; // Prioritize theme icon over handler icon.

        if (this.shouldOnlyDisplayDescription(module, forCoursePage)) {
            const title = module.description;
            module.description = '';

            return {
                icon: CoreCourseModuleHelper.getModuleIconSrc(module.modname, icon),
                title: title || '',
                a11yTitle: '',
                class: this.handlerSchema.displaydata?.class,
            };
        }

        const hasOffline = !!(this.handlerSchema.offlinefunctions && Object.keys(this.handlerSchema.offlinefunctions).length);
        const showDowloadButton = this.handlerSchema.downloadbutton;
        const handlerData: CoreCourseModuleHandlerData = {
            title: module.name,
            icon: CoreCourseModuleHelper.getModuleIconSrc(module.modname, icon),
            class: this.handlerSchema.displaydata?.class,
            showDownloadButton: showDowloadButton !== undefined ? showDowloadButton : hasOffline,
            hasCustomCmListItem: this.handlerSchema.hascustomcmlistitem ?? false,
        };

        if (this.handlerSchema.method) {
            // There is a method, add an action.
            handlerData.action = async (
                event: Event,
                module: CoreCourseModuleData,
                courseId: number,
                options?: CoreNavigationOptions,
            ) => {
                event.preventDefault();
                event.stopPropagation();

                await this.openActivityPage(module, courseId, options);
            };
        }

        if (forCoursePage && this.handlerSchema.coursepagemethod && !CoreCourseHelper.isModuleStealth(module)) {
            // Call the method to get the course page template.
            const method = this.handlerSchema.coursepagemethod;
            this.loadCoursePageTemplate(module, courseId, handlerData, method);

            // Allow updating the data via event.
            CoreEvents.on(CORE_SITE_PLUGINS_UPDATE_COURSE_CONTENT, (data) => {
                if (data.cmId === module.id) {
                    this.loadCoursePageTemplate(module, courseId, handlerData, method, !data.alreadyFetched);
                }
            });
        }

        return handlerData;
    }

    /**
     * Check whether the plugin should only display the description, similar to mod_label.
     *
     * @param module Module.
     * @param forCoursePage Whether the data will be used to render the course page.
     * @returns Bool.
     */
    protected shouldOnlyDisplayDescription(module: CoreCourseModuleData, forCoursePage?: boolean): boolean {
        if (forCoursePage && this.handlerSchema.coursepagemethod) {
            // The plugin defines a method for course page, don't display just the description.
            return false;
        }

        // Check if the plugin specifies if FEATURE_NO_VIEW_LINK is supported.
        const noViewLink = this.supportsNoViewLink();

        if (noViewLink !== undefined) {
            return noViewLink;
        }

        // The plugin doesn't specify it. Use the value returned by the site.
        return 'noviewlink' in module && !!module.noviewlink;
    }

    /**
     * Check whether the module supports NO_VIEW_LINK.
     *
     * @returns Bool if defined, undefined if not specified.
     */
    supportsNoViewLink(): boolean | undefined {
        return <boolean | undefined> (this.supportsFeature ?
            this.supportsFeature(ModFeature.NO_VIEW_LINK) :
            this.supportedFeatures?.[ModFeature.NO_VIEW_LINK]);
    }

    /**
     * Load and use template for course page.
     *
     * @param module Module.
     * @param courseId Course ID.
     * @param handlerData Handler data.
     * @param method Method to call.
     * @param refresh Whether to refresh the data.
     * @returns Promise resolved when done.
     */
    protected async loadCoursePageTemplate(
        module: CoreCourseModuleData,
        courseId: number,
        handlerData: CoreCourseModuleHandlerData,
        method: string,
        refresh?: boolean,
    ): Promise<void> {
        // Call the method to get the course page template.
        handlerData.loading = true;

        const args = {
            courseid: courseId,
            cmid: module.id,
        };

        if (refresh) {
            await CorePromiseUtils.ignoreErrors(CoreSitePlugins.invalidateContent(this.plugin.component, method, args));
        }

        try {
            const result = await CoreSitePlugins.getContent(this.plugin.component, method, args);

            // Use the html returned.
            handlerData.title = result.templates[0]?.html ?? '';
            (<CoreCourseModuleData> module).description = '';
        } catch (error) {
            this.logger.error('Error calling course page method:', error);
        } finally {
            handlerData.loading = false;
        }
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        const { CoreSitePluginsModuleIndexComponent } =
            await import('@features/siteplugins/components/module-index/module-index');

        return CoreSitePluginsModuleIndexComponent;
    }

    /**
     * @inheritdoc
     */
    async manualCompletionAlwaysShown(module: CoreCourseModuleData): Promise<boolean> {
        if (this.handlerSchema.manualcompletionalwaysshown !== undefined) {
            return this.handlerSchema.manualcompletionalwaysshown;
        }

        if (this.initResult?.jsResult && this.initResult.jsResult.manualCompletionAlwaysShown) {
            // The init result defines a function to check if a feature is supported, use it.
            return this.initResult.jsResult.manualCompletionAlwaysShown(module);
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    async openActivityPage(module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions): Promise<void> {
        if (!CoreCourseModuleHelper.moduleHasView(module)) {
            return;
        }

        options = options || {};
        options.params = options.params || {};
        Object.assign(options.params, {
            title: module.name,
            module,
        });

        CoreNavigator.navigateToSitePath(`siteplugins/module/${courseId}/${module.id}`, options);
    }

    /**
     * @inheritdoc
     */
    async getOverviewItemContent(
        item: CoreCourseOverviewItem,
        activity: CoreCourseOverviewActivity,
        courseId: number,
    ): Promise<CoreCourseOverviewItemContent | undefined> {
        const content = await this.getOverviewItemContentFromInitTemplates(item, activity, courseId);

        return content ?? super.getOverviewItemContent(item, activity, courseId);
    }

    /**
     * If there is a template in the init result to render the item, use it to render the content.
     *
     * @param item Item to render.
     * @param activity Activity data the item belongs to.
     * @param courseId Course ID the item belongs to.
     * @returns Content to render, undefined if no template found.
     */
    protected async getOverviewItemContentFromInitTemplates(
        item: CoreCourseOverviewItem,
        activity: CoreCourseOverviewActivity,
        courseId: number,
    ): Promise<CoreCourseOverviewItemContent | undefined> {
        const template = this.initResult?.templates?.find(template => template.id === item.key);
        if (!template) {
            return;
        }

        const { CoreSitePluginsOverviewItemComponent } =
                await import('@features/siteplugins/components/overview-item/overview-item');

        return {
            component: CoreSitePluginsOverviewItemComponent,
            componentData: {
                item,
                activity,
                courseId,
                html: template.html,
                otherData: this.initResult?.otherdata,
            },
        };
    }

}
