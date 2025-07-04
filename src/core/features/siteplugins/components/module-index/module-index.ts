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

import { Component, OnInit, OnDestroy, Input, ViewChild, HostBinding, inject } from '@angular/core';

import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCourseModuleSummaryResult } from '@features/course/components/module-summary/module-summary';
import CoreCourseContentsPage from '@features/course/pages/contents/contents';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import {
    CoreCourseModuleDelegate,
    CoreCourseModuleMainComponent,
} from '@features/course/services/module-delegate';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsCourseModuleHandlerData,
} from '@features/siteplugins/services/siteplugins';
import { CoreModals } from '@services/overlays/modals';
import { CoreUtils } from '@singletons/utils';
import { CoreSitePluginsPluginContentComponent, CoreSitePluginsPluginContentLoadedData } from '../plugin-content/plugin-content';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleInfoComponent } from '../../../course/components/module-info/module-info';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';

/**
 * Component that displays the index of a module site plugin.
 */
@Component({
    selector: 'core-site-plugins-module-index',
    templateUrl: 'core-siteplugins-module-index.html',
    styles: [':host { display: contents; }'],
    imports: [
        CoreSharedModule,
        CoreSitePluginsPluginContentComponent,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class CoreSitePluginsModuleIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {

    courseContentsPage = inject(CoreCourseContentsPage, { optional: true });

    @Input({ required: true }) module!: CoreCourseModuleData; // The module.
    @Input({ required: true }) courseId!: number; // Course ID the module belongs to.
    @Input() pageTitle?: string; // Current page title. It can be used by the "new-content" directives.

    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    @HostBinding('class') component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    preSets?: CoreSiteWSPreSets;
    description?: string;

    collapsibleFooterAppearOnBottom = true;
    addDefaultModuleInfo = false;

    displayOpenInBrowser = true;
    displayDescription = true;
    displayRefresh = true;
    displayPrefetch = true;
    displaySize = true;
    displayGrades = false;
    // @todo  // Currently display blogs is not an option since it may change soon adding new summary handlers.
    displayBlog = false;

    ptrEnabled = true;
    isDestroyed = false;

    jsData?: Record<string, unknown>; // Data to pass to the component.

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (!this.module) {
            return;
        }

        const handlerName = CoreCourseModuleDelegate.getHandlerName(this.module.modname);
        const handler = CoreSitePlugins.getSitePluginHandler(handlerName);

        if (handler) {
            this.component = handler.plugin.component;
            this.preSets = { componentId: this.module.id };
            this.method = handler.handlerSchema.method;
            this.args = {
                courseid: this.courseId,
                cmid: this.module.id,
            };
            this.initResult = handler.initResult;
            this.jsData = {
                module: this.module,
                courseId: this.courseId,
            };

            const handlerSchema = <CoreSitePluginsCourseModuleHandlerData> handler.handlerSchema;

            this.displayOpenInBrowser = !CoreUtils.isFalseOrZero(handlerSchema.displayopeninbrowser);
            this.displayDescription = !CoreUtils.isFalseOrZero(handlerSchema.displaydescription);
            this.displayRefresh = !CoreUtils.isFalseOrZero(handlerSchema.displayrefresh);
            this.displayPrefetch = !CoreUtils.isFalseOrZero(handlerSchema.displayprefetch);
            this.displaySize = !CoreUtils.isFalseOrZero(handlerSchema.displaysize);
            this.displayGrades = CoreUtils.isTrueOrOne(handlerSchema.displaygrades); // False by default.
            this.ptrEnabled = !CoreUtils.isFalseOrZero(handlerSchema.ptrenabled);

            this.collapsibleFooterAppearOnBottom = !CoreUtils.isFalseOrZero(handlerSchema.isresource);
        }

        // Get the data for the context menu.
        this.description = this.module.description;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement | null): Promise<void> {
        try {
            await this.content?.refreshContent(false);
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Function called when the data of the site plugin content is loaded.
     */
    contentLoaded(data: CoreSitePluginsPluginContentLoadedData): void {
        this.addDefaultModuleInfo = !data.content.includes('<core-course-module-info');
        if (data.success) {
            CoreCourseModuleHelper.storeModuleViewed(this.courseId, this.module.id, {
                sectionId: this.module.section,
            });
        }
    }

    /**
     * Function called when starting to load the data of the site plugin content.
     */
    contentLoading(): void {
        return;
    }

    /**
     * Opens a module summary page.
     */
    async openModuleSummary(): Promise<void> {
        if (!this.module) {
            return;
        }

        const { CoreCourseModuleSummaryComponent } = await import('@features/course/components/module-summary/module-summary');

        const data = await CoreModals.openSideModal<CoreCourseModuleSummaryResult>({
            component: CoreCourseModuleSummaryComponent,
            componentProps: {
                moduleId: this.module.id,
                module: this.module,
                description: this.description,
                component: this.component,
                courseId: this.courseId,
                displayOptions: {
                    displayOpenInBrowser: this.displayOpenInBrowser,
                    displayDescription: this.displayDescription,
                    displayRefresh: this.displayRefresh,
                    displayPrefetch: this.displayPrefetch,
                    displaySize: this.displaySize,
                    displayBlog: this.displayBlog,
                    displayGrades: this.displayGrades,
                },
            },
        });

        if (data && data.action == 'refresh' && this.content?.dataLoaded) {
            this.content?.refreshContent(true);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
    }

    /**
     * Call a certain function on the component instance.
     *
     * @param name Name of the function to call.
     * @param params List of params to send to the function.
     * @returns Result of the call. Undefined if no component instance or the function doesn't exist.
     */
    callComponentFunction(name: string, params?: unknown[]): unknown | undefined {
        return this.content?.callComponentFunction(name, params);
    }

}
