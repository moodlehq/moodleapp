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
import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { CoreIonLoadingElement } from '@classes/ion-loading';

import { CoreSiteWSPreSets } from '@classes/site';
import {
    CoreCourseModuleSummaryResult,
    CoreCourseModuleSummaryComponent,
} from '@features/course/components/module-summary/module-summary';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import {
    CoreCourseModuleDelegate,
    CoreCourseModuleMainComponent,
} from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsCourseModuleHandlerData,
} from '@features/siteplugins/services/siteplugins';
import { IonRefresher } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreSitePluginsPluginContentComponent, CoreSitePluginsPluginContentLoadedData } from '../plugin-content/plugin-content';

/**
 * Component that displays the index of a module site plugin.
 */
@Component({
    selector: 'core-site-plugins-module-index',
    templateUrl: 'core-siteplugins-module-index.html',
    styles: [':host { display: contents; }'],
})
export class CoreSitePluginsModuleIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {

    @Input() module!: CoreCourseModuleData; // The module.
    @Input() courseId!: number; // Course ID the module belongs to.
    @Input() pageTitle?: string; // Current page title. It can be used by the "new-content" directives.

    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    preSets?: CoreSiteWSPreSets;
    description?: string;

    /**
     * @deprecated since 4.0, use module.url instead.
     */
    externalUrl?: string;
    /**
     * @deprecated since 4.0. It won't be populated anymore.
     */
    refreshIcon = CoreConstants.ICON_REFRESH;
    /**
     * @deprecated since 4.0.. It won't be populated anymore.
     */
    prefetchStatus?: string;
    /**
     * @deprecated since 4.0. It won't be populated anymore.
     */
    prefetchStatusIcon?: string;
    /**
     * @deprecated since 4.0. It won't be populated anymore.
     */
    prefetchText?: string;
    /**
     * @deprecated since 4.0. It won't be populated anymore.
     */
    size?: string;

    collapsibleFooterAppearOnBottom = true;

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
        this.externalUrl = this.module.url;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher | null): Promise<void> {
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
        if (data.success) {
            CoreCourse.storeModuleViewed(this.courseId, this.module.id, {
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
     * Expand the description.
     *
     * @deprecated since 4.0
     */
    expandDescription(): void {
        this.openModuleSummary();
    }

    /**
     * Opens a module summary page.
     */
    async openModuleSummary(): Promise<void> {
        if (!this.module) {
            return;
        }

        const data = await CoreDomUtils.openSideModal<CoreCourseModuleSummaryResult>({
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
     * Prefetch the module.
     *
     * @deprecated since 4.0
     */
    async prefetch(): Promise<void> {
        try {
            // We need to call getDownloadSize, the package might have been updated.
            const size = await CoreCourseModulePrefetchDelegate.getModuleDownloadSize(this.module, this.courseId, true);

            await CoreDomUtils.confirmDownloadSize(size);

            await CoreCourseModulePrefetchDelegate.prefetchModule(this.module, this.courseId, true);
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        }
    }

    /**
     * Confirm and remove downloaded files.
     *
     * @deprecated since 4.0
     */
    async removeFiles(): Promise<void> {
        let modal: CoreIonLoadingElement | undefined;

        try {
            await CoreDomUtils.showDeleteConfirm('addon.storagemanager.confirmdeletedatafrom', { name: this.module.name });

            modal = await CoreDomUtils.showModalLoading();

            await CoreCourseHelper.removeModuleStoredData(this.module, this.courseId);
        } catch (error) {
            if (error) {
                CoreDomUtils.showErrorModal(error);
            }
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Component destroyed.
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
