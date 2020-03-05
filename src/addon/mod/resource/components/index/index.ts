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

import { Component, Injector } from '@angular/core';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreUtilsProvider } from '@providers/utils/utils';
import {
    CoreCourseModuleMainResourceComponent, CoreCourseResourceDownloadResult
} from '@core/course/classes/main-resource-component';
import { AddonModResourceProvider } from '../../providers/resource';
import { AddonModResourceHelperProvider } from '../../providers/helper';

/**
 * Component that displays a resource.
 */
@Component({
    selector: 'addon-mod-resource-index',
    templateUrl: 'addon-mod-resource-index.html',
})
export class AddonModResourceIndexComponent extends CoreCourseModuleMainResourceComponent {
    component = AddonModResourceProvider.COMPONENT;

    canGetResource: boolean;
    mode: string;
    src: string;
    contentText: string;
    displayDescription = true;
    warning: string;

    constructor(injector: Injector,
            protected resourceProvider: AddonModResourceProvider,
            protected resourceHelper: AddonModResourceHelperProvider,
            protected utils: CoreUtilsProvider,
            protected filepoolProvider: CoreFilepoolProvider) {
        super(injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.canGetResource = this.resourceProvider.isGetResourceWSAvailable();

        this.loadContent().then(() => {
            this.resourceProvider.logView(this.module.instance, this.module.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return this.resourceProvider.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download resource contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        // Load module contents if needed. Passing refresh is needed to force reloading contents.
        return this.courseProvider.loadModuleContents(this.module, this.courseId, null, false, refresh).then(() => {
            if (!this.module.contents || !this.module.contents.length) {
                return Promise.reject(this.utils.createFakeWSError('core.filenotfound', true));
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
                const options = this.textUtils.unserialize(resource.displayoptions) || {};
                this.displayDescription = typeof options.printintro == 'undefined' || !!options.printintro;
                this.dataRetrieved.emit(resource);
            }

            if (this.resourceHelper.isDisplayedInIframe(this.module)) {
                let downloadResult: CoreCourseResourceDownloadResult;

                return this.downloadResourceIfNeeded(refresh, true).then((result) => {
                    downloadResult = result;
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

                        this.warning = downloadResult.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error) : '';
                    });
                });
            } else if (this.resourceHelper.isDisplayedEmbedded(this.module, resource && resource.display)) {
                this.mode = 'embedded';
                this.warning = '';

                return this.resourceHelper.getEmbeddedHtml(this.module, this.courseId).then((html) => {
                    this.contentText = html;

                    this.mode = this.contentText.length > 0 ? 'embedded' : 'external';
                });
            } else {
                this.mode = 'external';
                this.warning = '';
            }
        }).finally(() => {
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Opens a file.
     *
     * @return Promise resolved when done.
     */
    async open(): Promise<void> {
        let downloadable = await this.modulePrefetchDelegate.isModuleDownloadable(this.module, this.courseId);

        if (downloadable) {
            // Check if the main file is downloadle.
            // This isn't done in "isDownloadable" to prevent extra WS calls in the course page.
            downloadable = await this.resourceHelper.isMainFileDownloadable(this.module);

            if (downloadable) {
                return this.resourceHelper.openModuleFile(this.module, this.courseId);
            }
        }

        // The resource cannot be downloaded, open the activity in browser.
        return this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(this.module.url);
    }
}
