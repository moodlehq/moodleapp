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

import { Component, OnInit, Optional } from '@angular/core';
import {
    CoreCourseModuleMainResourceComponent,
} from '@features/course/classes/main-resource-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse, CoreCourseWSModule } from '@features/course/services/course';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { AddonModPageProvider, AddonModPagePage, AddonModPage } from '../../services/page';
import { AddonModPageHelper } from '../../services/page-helper';

/**
 * Component that displays a page.
 */
@Component({
    selector: 'addon-mod-page-index',
    templateUrl: 'addon-mod-page-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModPageIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = AddonModPageProvider.COMPONENT;
    canGetPage = false;
    contents?: string;
    displayDescription = true;
    displayTimemodified = true;
    timemodified?: number;
    page?: CoreCourseWSModule | AddonModPagePage;
    warning?: string;

    protected fetchContentDefaultError = 'addon.mod_page.errorwhileloadingthepage';

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModPageIndexComponent', courseContentsPage);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.canGetPage = AddonModPage.instance.isGetPageWSAvailable();

        await this.loadContent();

        try {
            await AddonModPage.instance.logView(this.module!.instance!, this.module!.name);
            CoreCourse.instance.checkModuleCompletion(this.courseId!, this.module!.completiondata);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        await AddonModPage.instance.invalidateContent(this.module!.id, this.courseId!);
    }

    /**
     * Download page contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh?: boolean): Promise<void> {
        // Download the resource if it needs to be downloaded.
        try {
            const downloadResult = await this.downloadResourceIfNeeded(refresh);

            const promises: Promise<void>[] = [];

            let getPagePromise: Promise<CoreCourseWSModule | AddonModPagePage>;

            // Get the module to get the latest title and description. Data should've been updated in download.
            if (this.canGetPage) {
                getPagePromise = AddonModPage.instance.getPageData(this.courseId!, this.module!.id);
            } else {
                getPagePromise = CoreCourse.instance.getModule(this.module!.id, this.courseId!);
            }

            promises.push(getPagePromise.then((page) => {
                if (!page) {
                    return;
                }

                this.description = 'intro' in page ? page.intro : page.description;
                this.dataRetrieved.emit(page);

                if (!this.canGetPage) {
                    return;
                }

                this.page = page;

                // Check if description and timemodified should be displayed.
                if ('displayoptions' in this.page) {
                    const options: Record<string, string | boolean> =
                        CoreTextUtils.instance.unserialize(this.page.displayoptions) || {};

                    this.displayDescription = typeof options.printintro == 'undefined' ||
                            CoreUtils.instance.isTrueOrOne(options.printintro);
                    this.displayTimemodified = typeof options.printlastmodified == 'undefined' ||
                            CoreUtils.instance.isTrueOrOne(options.printlastmodified);
                } else {
                    this.displayDescription = true;
                    this.displayTimemodified = true;
                }

                this.timemodified = 'timemodified' in this.page ? this.page.timemodified : undefined;

                return;
            }).catch(() => {
                // Ignore errors.
            }));

            // Get the page HTML.
            promises.push(AddonModPageHelper.instance.getPageHtml(this.module!.contents, this.module!.id).then((content) => {

                this.contents = content;
                this.warning = downloadResult?.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error!) : '';

                return;
            }));

            await Promise.all(promises);
        } finally {
            this.fillContextMenu(refresh);
        }
    }

}
