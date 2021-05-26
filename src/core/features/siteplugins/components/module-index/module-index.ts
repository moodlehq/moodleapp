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

import { CoreSiteWSPreSets } from '@classes/site';
import { CoreCourseHelper, CoreCourseModule } from '@features/course/services/course-helper';
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
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver } from '@singletons/events';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';

/**
 * Component that displays the index of a module site plugin.
 */
@Component({
    selector: 'core-site-plugins-module-index',
    templateUrl: 'core-siteplugins-module-index.html',
    styles: [':host { display: contents; }'],
})
export class CoreSitePluginsModuleIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {

    @Input() module!: CoreCourseModule; // The module.
    @Input() courseId!: number; // Course ID the module belongs to.
    @Input() pageTitle?: string; // Current page title. It can be used by the "new-content" directives.

    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    preSets?: CoreSiteWSPreSets;

    // Data for context menu.
    externalUrl?: string;
    description?: string;
    refreshIcon?: string;
    prefetchStatus?: string;
    prefetchStatusIcon?: string;
    prefetchText?: string;
    size?: string;
    contextMenuStatusObserver?: CoreEventObserver;
    contextFileStatusObserver?: CoreEventObserver;
    displayOpenInBrowser = true;
    displayDescription = true;
    displayRefresh = true;
    displayPrefetch = true;
    displaySize = true;
    ptrEnabled = true;
    isDestroyed = false;

    jsData?: Record<string, unknown>; // Data to pass to the component.

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.refreshIcon = CoreConstants.ICON_LOADING;

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
            this.ptrEnabled = !CoreUtils.isFalseOrZero(handlerSchema.ptrenabled);
        }

        // Get the data for the context menu.
        this.description = this.module.description;
        this.externalUrl = this.module.url;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher | null, done?: () => void): Promise<void> {
        if (this.content) {
            this.refreshIcon = CoreConstants.ICON_LOADING;
        }

        try {
            await this.content?.refreshContent(false);
        } finally {
            refresher?.complete();
            done && done();
        }
    }

    /**
     * Function called when the data of the site plugin content is loaded.
     */
    contentLoaded(refresh: boolean): void {
        this.refreshIcon = CoreConstants.ICON_REFRESH;

        // Check if there is a prefetch handler for this type of module.
        if (CoreCourseModulePrefetchDelegate.getPrefetchHandlerFor(this.module)) {
            CoreCourseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
        }
    }

    /**
     * Function called when starting to load the data of the site plugin content.
     */
    contentLoading(): void {
        this.refreshIcon = CoreConstants.ICON_LOADING;
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        CoreTextUtils.viewText(Translate.instant('core.description'), this.description!, {
            component: this.component,
            componentId: this.module.id,
            filter: true,
            contextLevel: 'module',
            instanceId: this.module.id,
            courseId: this.courseId,
        });
    }

    /**
     * Prefetch the module.
     */
    prefetch(): void {
        CoreCourseHelper.contextMenuPrefetch(this, this.module, this.courseId);
    }

    /**
     * Confirm and remove downloaded files.
     */
    removeFiles(): void {
        CoreCourseHelper.confirmAndRemoveFiles(this.module, this.courseId);
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
     * @return Result of the call. Undefined if no component instance or the function doesn't exist.
     */
    callComponentFunction(name: string, params?: unknown[]): unknown | undefined {
        return this.content?.callComponentFunction(name, params);
    }

}
