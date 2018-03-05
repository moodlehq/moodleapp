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
import { AddonModResourceProvider } from '../../providers/resource';
import { AddonModResourcePrefetchHandler } from '../../providers/prefetch-handler';
import { AddonModResourceHelperProvider } from '../../providers/helper';

/**
 * Component that displays a resource.
 */
@Component({
    selector: 'addon-mod-resource-index',
    templateUrl: 'index.html',
})
export class AddonModResourceIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {
    @Input() module: any; // The module of the resource.
    @Input() courseId: number; // Course ID the resource belongs to.
    @Output() resourceRetrieved?: EventEmitter<any>;

    loaded: boolean;
    component = AddonModResourceProvider.COMPONENT;
    componentId: number;

    canGetResource: boolean;
    mode: string;
    src: string;
    contentText: string;

    // Data for context menu.
    externalUrl: string;
    description: string;
    refreshIcon: string;
    prefetchStatusIcon: string;
    prefetchText: string;
    size: string;

    protected isDestroyed = false;
    protected statusObserver;

    constructor(private resourceProvider: AddonModResourceProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private appProvider: CoreAppProvider, private textUtils: CoreTextUtilsProvider,
            private courseHelper: CoreCourseHelperProvider, private translate: TranslateService,
            private prefetchHandler: AddonModResourcePrefetchHandler, private resourceHelper: AddonModResourceHelperProvider) {
        this.resourceRetrieved = new EventEmitter();

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

        this.canGetResource = this.resourceProvider.isGetResourceWSAvailable();

        this.fetchContent().then(() => {
            this.resourceProvider.logView(this.module.instance).then(() => {
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

            return this.resourceProvider.invalidateContent(this.module.id, this.courseId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.fetchContent(true);
            }).finally(() => {
                this.refreshIcon = 'refresh';
                refresher && refresher.complete();
                done && done();
            });
        }
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
     * Download resource contents.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        // Load module contents if needed. Passing refresh is needed to force reloading contents.
        return this.courseProvider.loadModuleContents(this.module, this.courseId, null, false, refresh).then(() => {
            if (!this.module.contents || !this.module.contents.length) {
                return Promise.reject(null);
            }

            // Get the resource instance to get the latest name/description and to know if it's embedded.
            if (this.canGetResource) {
                return this.resourceProvider.getResourceData(this.courseId, this.module.id).catch(() => {
                    // Ignore errors.
                });
            }

            return this.courseProvider.getModule(this.module.id, this.courseId).catch(() => {
                // Ignore errors.
            });
        }).then((resource) => {
            if (resource) {
                this.description = resource.intro || resource.description;
                this.resourceRetrieved.emit(resource);
            }

            if (this.resourceHelper.isDisplayedInIframe(this.module)) {
                let downloadFailed = false;

                return this.prefetchHandler.download(this.module, this.courseId).catch(() => {
                    // Mark download as failed but go on since the main files could have been downloaded.
                    downloadFailed = true;
                }).then(() => {
                    return this.resourceHelper.getIframeSrc(this.module).then((src) => {
                        this.mode = 'iframe';

                        if (this.src && src.toString() == this.src.toString()) {
                            // Re-loading same page.
                            // Set it to empty and then re-set the src in the next digest so it detects it has changed.
                            this.src = '';
                            setTimeout(() => {
                                this.src = src;
                            });
                        } else {
                            this.src = src;
                        }

                        if (downloadFailed && this.appProvider.isOnline()) {
                            // We could load the main file but the download failed. Show error message.
                            this.domUtils.showErrorModal('core.errordownloadingsomefiles', true);
                        }
                    });
                });
            } else if (this.resourceHelper.isDisplayedEmbedded(this.module, resource && resource.display)) {
                this.mode = 'embedded';

                return this.resourceHelper.getEmbeddedHtml(this.module).then((html) => {
                    this.contentText = html;
                });
            } else {
                this.mode = 'external';
            }
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.courseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
        }).catch((error) => {
            // Error getting data, fail.
            this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
        });
    }

    /**
     * Opens a file.
     */
    open(): void {
        this.resourceHelper.openModuleFile(this.module, this.courseId);
    }

    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.statusObserver && this.statusObserver.off();
    }
}
