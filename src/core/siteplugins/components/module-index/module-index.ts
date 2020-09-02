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

import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreCourseModuleDelegate, CoreCourseModuleMainComponent } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';
import { CoreSiteWSPreSets } from '@classes/site';

/**
 * Component that displays the index of a module site plugin.
 */
@Component({
    selector: 'core-site-plugins-module-index',
    templateUrl: 'core-siteplugins-module-index.html',
})
export class CoreSitePluginsModuleIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {
    @Input() module: any; // The module.
    @Input() courseId: number; // Course ID the module belongs to.
    @Input() pageTitle: string; // Current page title. It can be used by the "new-content" directives.

    @ViewChild(CoreSitePluginsPluginContentComponent) content: CoreSitePluginsPluginContentComponent;

    component: string;
    method: string;
    args: any;
    initResult: any;
    preSets: CoreSiteWSPreSets;

    // Data for context menu.
    externalUrl: string;
    description: string;
    refreshIcon: string;
    prefetchStatusIcon: string;
    prefetchText: string;
    size: string;
    displayOpenInBrowser = true;
    displayDescription = true;
    displayRefresh = true;
    displayPrefetch = true;
    displaySize = true;
    ptrEnabled = true;

    jsData: any; // Data to pass to the component.

    protected isDestroyed = false;
    protected statusObserver;

    constructor(protected sitePluginsProvider: CoreSitePluginsProvider, protected courseHelper: CoreCourseHelperProvider,
            protected prefetchDelegate: CoreCourseModulePrefetchDelegate, protected textUtils: CoreTextUtilsProvider,
            protected translate: TranslateService, protected utils: CoreUtilsProvider,
            protected moduleDelegate: CoreCourseModuleDelegate) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.refreshIcon = 'spinner';

        if (this.module) {
            const handlerName = this.moduleDelegate.getHandlerName(this.module.modname),
                handler = this.sitePluginsProvider.getSitePluginHandler(handlerName);

            if (handler) {
                this.component = handler.plugin.component;
                this.preSets = {componentId: this.module.id};
                this.method = handler.handlerSchema.method;
                this.args = {
                    courseid: this.courseId,
                    cmid: this.module.id
                };
                this.initResult = handler.initResult;
                this.jsData = {
                    module: this.module,
                    courseId: this.courseId
                };

                this.displayOpenInBrowser = !this.utils.isFalseOrZero(handler.handlerSchema.displayopeninbrowser);
                this.displayDescription = !this.utils.isFalseOrZero(handler.handlerSchema.displaydescription);
                this.displayRefresh = !this.utils.isFalseOrZero(handler.handlerSchema.displayrefresh);
                this.displayPrefetch = !this.utils.isFalseOrZero(handler.handlerSchema.displayprefetch);
                this.displaySize = !this.utils.isFalseOrZero(handler.handlerSchema.displaysize);
                this.ptrEnabled = !this.utils.isFalseOrZero(handler.handlerSchema.ptrenabled);
            }

            // Get the data for the context menu.
            this.description = this.module.description;
            this.externalUrl = this.module.url;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @return Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any> {
        if (this.content) {
            this.refreshIcon = 'spinner';

            return Promise.resolve(this.content.refreshContent(false)).finally(() => {
                refresher && refresher.complete();
                done && done();
            });
        } else {
            refresher && refresher.complete();
            done && done();

            return Promise.resolve();
        }
    }

    /**
     * Function called when the data of the site plugin content is loaded.
     */
    contentLoaded(refresh: boolean): void {
        this.refreshIcon = 'refresh';

        // Check if there is a prefetch handler for this type of module.
        if (this.prefetchDelegate.getPrefetchHandlerFor(this.module)) {
            this.courseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
        }
    }

    /**
     * Function called when starting to load the data of the site plugin content.
     */
    contentLoading(refresh: boolean): void {
        this.refreshIcon = 'spinner';
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        this.textUtils.viewText(this.translate.instant('core.description'), this.description, {
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
        this.courseHelper.contextMenuPrefetch(this, this.module, this.courseId);
    }

    /**
     * Confirm and remove downloaded files.
     */
    removeFiles(): void {
        this.courseHelper.confirmAndRemoveFiles(this.module, this.courseId);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.statusObserver && this.statusObserver.off();
    }

    /**
     * Call a certain function on the component instance.
     *
     * @param name Name of the function to call.
     * @param params List of params to send to the function.
     * @return Result of the call. Undefined if no component instance or the function doesn't exist.
     */
    callComponentFunction(name: string, params?: any[]): any {
        return this.content.callComponentFunction(name, params);
    }
}
