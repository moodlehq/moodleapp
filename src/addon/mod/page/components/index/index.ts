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
import { CoreUtilsProvider } from '@providers/utils/utils';
import {
    CoreCourseModuleMainResourceComponent, CoreCourseResourceDownloadResult
} from '@core/course/classes/main-resource-component';
import { AddonModPageProvider, AddonModPagePage } from '../../providers/page';
import { AddonModPageHelperProvider } from '../../providers/helper';

/**
 * Component that displays a page.
 */
@Component({
    selector: 'addon-mod-page-index',
    templateUrl: 'addon-mod-page-index.html',
})
export class AddonModPageIndexComponent extends CoreCourseModuleMainResourceComponent {
    component = AddonModPageProvider.COMPONENT;
    canGetPage: boolean;
    contents: any;
    displayDescription = true;
    displayTimemodified = true;
    page: AddonModPagePage;
    warning: string;

    protected fetchContentDefaultError = 'addon.mod_page.errorwhileloadingthepage';

    constructor(injector: Injector,
            protected pageProvider: AddonModPageProvider,
            protected pageHelper: AddonModPageHelperProvider,
            protected utils: CoreUtilsProvider) {
        super(injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.canGetPage = this.pageProvider.isGetPageWSAvailable();

        this.loadContent().then(() => {
            this.pageProvider.logView(this.module.instance, this.module.name).then(() => {
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
        return this.pageProvider.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download page contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        let downloadResult: CoreCourseResourceDownloadResult;

        // Download the resource if it needs to be downloaded.
        return this.downloadResourceIfNeeded(refresh).then((result) => {
            downloadResult = result;
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
                    this.dataRetrieved.emit(page);

                    if (this.canGetPage) {
                        this.page = page;

                        // Check if description and timemodified should be displayed.
                        if (this.page.displayoptions) {
                            const options = this.textUtils.unserialize(this.page.displayoptions) || {};
                            this.displayDescription = typeof options.printintro == 'undefined' ||
                                    this.utils.isTrueOrOne(options.printintro);
                            this.displayTimemodified = typeof options.printlastmodified == 'undefined' ||
                                    this.utils.isTrueOrOne(options.printlastmodified);
                        } else {
                            this.displayDescription = true;
                            this.displayTimemodified = true;
                        }
                    }
                }
            }).catch(() => {
                // Ignore errors.
            }));

            // Get the page HTML.
            promises.push(this.pageHelper.getPageHtml(this.module.contents, this.module.id).then((content) => {

                this.contents = content;
                this.warning = downloadResult.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error) : '';
            }));

            return Promise.all(promises);
        }).finally(() => {
            this.fillContextMenu(refresh);
        });
    }
}
