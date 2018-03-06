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

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseModuleMainComponent } from '@core/course/providers/module-delegate';
import { AddonModPageProvider } from '../../providers/page';
import { AddonModPageHelperProvider } from '../../providers/helper';
import { AddonModPagePrefetchHandler } from '../../providers/prefetch-handler';

/**
 * Component that displays a page.
 */
@Component({
    selector: 'addon-mod-page-index',
    templateUrl: 'index.html',
})
export class AddonModPageIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {
    @Input() module: any; // The module of the page.
    @Input() courseId: number; // Course ID the page belongs to.
    @Output() pageRetrieved?: EventEmitter<any>;

    loaded: boolean;
    component = AddonModPageProvider.COMPONENT;
    componentId: number;
    canGetPage: boolean;
    contents: any;

    // Data for context menu.
    externalUrl: string;
    description: string;
    refreshIcon: string;
    prefetchStatusIcon: string;
    prefetchText: string;
    size: string;

    protected isDestroyed;
    protected statusObserver;

    constructor(private pageProvider: AddonModPageProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private appProvider: CoreAppProvider, private textUtils: CoreTextUtilsProvider,
            private courseHelper: CoreCourseHelperProvider, private translate: TranslateService,
            private pageHelper: AddonModPageHelperProvider, private pagePrefetch: AddonModPagePrefetchHandler) {
        this.pageRetrieved = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.externalUrl = this.module.url;
        this.loaded = false;
        this.refreshIcon = 'spinner';

        this.canGetPage = this.pageProvider.isGetPageWSAvailable();

        this.fetchContent().then(() => {
            this.pageProvider.logView(this.module.instance).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completionstatus);
            });
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any> {
        if (this.loaded) {
            this.refreshIcon = 'spinner';

            return this.pageProvider.invalidateContent(this.module.id, this.courseId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.fetchContent(true);
            }).finally(() => {
                this.refreshIcon = 'refresh';
                refresher && refresher.complete();
                done && done();
            });
        }

        return Promise.resolve();
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
     * Download page contents.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        let downloadFailed = false;

        // Download content. This function also loads module contents if needed.
        return this.pagePrefetch.download(this.module, this.courseId).catch(() => {
            // Mark download as failed but go on since the main files could have been downloaded.
            downloadFailed = true;
        }).then(() => {
            if (!this.module.contents.length) {
                // Try to load module contents for offline usage.
                return this.courseProvider.loadModuleContents(this.module, this.courseId);
            }
        }).then(() => {
            const promises = [];

            let getPagePromise;

            // Get the module to get the latest title and description. Data should've been updated in download.
            if (this.canGetPage) {
                getPagePromise = this.pageProvider.getPageData(this.courseId, this.module.id);
            } else {
                getPagePromise = this.courseProvider.getModule(this.module.id, this.courseId);
            }

            promises.push(getPagePromise.then((page) => {
                if (page) {
                    this.description = page.intro || page.description;
                    this.pageRetrieved.emit(page);
                }
            }).catch(() => {
                // Ignore errors.
            }));

            // Get the page HTML.
            promises.push(this.pageHelper.getPageHtml(this.module.contents, this.module.id).then((content) => {
                // All data obtained, now fill the context menu.
                this.courseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);

                this.contents = content;

                if (downloadFailed && this.appProvider.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    this.domUtils.showErrorModal('core.errordownloadingsomefiles', true);
                }
            }));

            return Promise.all(promises);
        }).catch((error) => {
            // Error getting data, fail.
            this.domUtils.showErrorModalDefault(error, 'addon.mod_page.errorwhileloadingthepage', true);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
        });
    }

    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.statusObserver && this.statusObserver.off();
    }
}
