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

import { CoreConstants } from '@/core/constants';
import { CoreCourseAnyModuleData, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreSitePluginsModuleIndexComponent } from '@features/siteplugins/components/module-index/module-index';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsCourseModuleHandlerData,
    CoreSitePluginsPlugin,
} from '@features/siteplugins/services/siteplugins';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreLogger } from '@singletons/logger';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to support a module using a site plugin.
 */
export class CoreSitePluginsModuleHandler extends CoreSitePluginsBaseHandler implements CoreCourseModuleHandler {

    supportedFeatures?: Record<string, unknown>;
    supportsFeature?: (feature: string) => unknown;

    protected logger: CoreLogger;

    constructor(
        name: string,
        public modName: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsCourseModuleHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.logger = CoreLogger.getInstance('CoreSitePluginsModuleHandler');
        this.supportedFeatures = handlerSchema.supportedfeatures;

        if (initResult?.jsResult && initResult.jsResult.supportsFeature) {
            // The init result defines a function to check if a feature is supported, use it.
            this.supportsFeature = initResult.jsResult.supportsFeature.bind(initResult.jsResult);
        }
    }

    /**
     * @inheritdoc
     */
    getData(
        module: CoreCourseAnyModuleData,
        courseId: number,
        sectionId?: number,
        forCoursePage?: boolean,
    ): CoreCourseModuleHandlerData {
        if ('description' in module && this.shouldOnlyDisplayDescription(module, forCoursePage)) {
            const title = module.description;
            module.description = '';

            return {
                icon: this.getIconSrc(),
                title: title || '',
                a11yTitle: '',
                class: this.handlerSchema.displaydata?.class,
            };
        }

        const hasOffline = !!(this.handlerSchema.offlinefunctions && Object.keys(this.handlerSchema.offlinefunctions).length);
        const showDowloadButton = this.handlerSchema.downloadbutton;
        const handlerData: CoreCourseModuleHandlerData = {
            title: module.name,
            icon: this.getIconSrc(),
            class: this.handlerSchema.displaydata?.class,
            showDownloadButton: typeof showDowloadButton != 'undefined' ? showDowloadButton : hasOffline,
        };

        if (this.handlerSchema.method) {
            // There is a method, add an action.
            handlerData.action = (event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions) => {
                event.preventDefault();
                event.stopPropagation();

                options = options || {};
                options.params = {
                    title: module.name,
                    module,
                };

                CoreNavigator.navigateToSitePath(`siteplugins/module/${courseId}/${module.id}`, options);
            };
        }

        if (forCoursePage && this.handlerSchema.coursepagemethod && module.visibleoncoursepage !== 0) {
            // Call the method to get the course page template.
            this.loadCoursePageTemplate(module, courseId, handlerData);
        }

        return handlerData;
    }

    /**
     * Check whether the plugin should only display the description, similar to mod_label.
     *
     * @param module Module.
     * @param forCoursePage Whether the data will be used to render the course page.
     * @return Bool.
     */
    protected shouldOnlyDisplayDescription(module: CoreCourseAnyModuleData, forCoursePage?: boolean): boolean {
        if (forCoursePage && this.handlerSchema.coursepagemethod) {
            // The plugin defines a method for course page, don't display just the description.
            return false;
        }

        // Check if the plugin specifies if FEATURE_NO_VIEW_LINK is supported.
        const noViewLink = <boolean | undefined> (this.supportsFeature ?
            this.supportsFeature(CoreConstants.FEATURE_NO_VIEW_LINK) :
            this.supportedFeatures?.[CoreConstants.FEATURE_NO_VIEW_LINK]);

        if (noViewLink !== undefined) {
            return noViewLink;
        }

        // The plugin doesn't specify it. Use the value returned by the site.
        return 'noviewlink' in module && !!module.noviewlink;
    }

    /**
     * Load and use template for course page.
     *
     * @param module Module.
     * @param courseId Course ID.
     * @param handlerData Handler data.
     * @return Promise resolved when done.
     */
    protected async loadCoursePageTemplate(
        module: CoreCourseAnyModuleData,
        courseId: number,
        handlerData: CoreCourseModuleHandlerData,
    ): Promise<void> {
        // Call the method to get the course page template.
        handlerData.loading = true;

        const args = {
            courseid: courseId,
            cmid: module.id,
        };

        try {
            const result = await CoreSitePlugins.getContent(
                this.plugin.component,
                this.handlerSchema.coursepagemethod!,
                args,
            );

            // Use the html returned.
            handlerData.title = result.templates[0]?.html ?? '';
            (<CoreCourseWSModule> module).description = '';
        } catch (error) {
            this.logger.error('Error calling course page method:', error);
        } finally {
            handlerData.loading = false;
        }
    }

    /**
     * @inheritdoc
     */
    getIconSrc(): string | undefined {
        return this.handlerSchema.displaydata?.icon;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown>> {
        return CoreSitePluginsModuleIndexComponent;
    }

    /**
     * @inheritdoc
     */
    async manualCompletionAlwaysShown(module: CoreCourseModule): Promise<boolean> {
        if (this.handlerSchema.manualcompletionalwaysshown !== undefined) {
            return this.handlerSchema.manualcompletionalwaysshown;
        }

        if (this.initResult?.jsResult && this.initResult.jsResult.manualCompletionAlwaysShown) {
            // The init result defines a function to check if a feature is supported, use it.
            return this.initResult.jsResult.manualCompletionAlwaysShown(module);
        }

        return false;
    }

}
