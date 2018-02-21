// (C) Copyright 2015 Martin Dougiamas
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
import { CoreTextUtilsProvider } from '../../../../providers/utils/text';
import { CoreSiteAddonsProvider } from '../../providers/siteaddons';
import { CoreCourseModuleMainComponent } from '../../../course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '../../../course/providers/module-prefetch-delegate';
import { CoreCourseHelperProvider } from '../../../course/providers/helper';
import { CoreSiteAddonsAddonContentComponent } from '../addon-content/addon-content';

/**
 * Component that displays the index of a module site addon.
 */
@Component({
    selector: 'core-site-addons-module-index',
    templateUrl: 'module-index.html',
})
export class CoreSiteAddonsModuleIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {
    @Input() module: any; // The module.
    @Input() courseId: number; // Course ID the module belongs to.

    @ViewChild(CoreSiteAddonsAddonContentComponent) addonContent: CoreSiteAddonsAddonContentComponent;

    component: string;
    method: string;
    args: any;
    bootstrapResult: any;

    // Data for context menu.
    externalUrl: string;
    description: string;
    refreshIcon: string;
    prefetchStatusIcon: string;
    prefetchText: string;
    size: string;

    protected isDestroyed = false;
    protected statusObserver;

    constructor(protected siteAddonsProvider: CoreSiteAddonsProvider, protected courseHelper: CoreCourseHelperProvider,
            protected prefetchDelegate: CoreCourseModulePrefetchDelegate, protected textUtils: CoreTextUtilsProvider,
            protected translate: TranslateService) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.refreshIcon = 'spinner';

        if (this.module) {
            const handler = this.siteAddonsProvider.getSiteAddonHandler(this.module.modname);
            if (handler) {
                this.component = handler.addon.component;
                this.method = handler.handlerSchema.method;
                this.args = {
                    courseid: this.courseId,
                    cmid: this.module.id
                };
                this.bootstrapResult = handler.bootstrapResult;
            }

            // Get the data for the context menu.
            this.description = this.module.description;
            this.externalUrl = this.module.url;
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any> {
        if (this.addonContent) {
            this.refreshIcon = 'spinner';

            return Promise.resolve(this.addonContent.refreshData()).finally(() => {
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
     * Function called when the data of the site addon content is loaded.
     */
    contentLoaded(refresh: boolean): void {
        this.refreshIcon = 'refresh';

        // Check if there is a prefetch handler for this type of module.
        if (this.prefetchDelegate.getPrefetchHandlerFor(this.module)) {
            this.courseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
        }
    }

    /**
     * Function called when starting to load the data of the site addon content.
     */
    contentLoading(refresh: boolean): void {
        this.refreshIcon = 'spinner';
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        this.textUtils.expandText(this.translate.instant('core.description'), this.description, this.component, this.module.id);
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
}
