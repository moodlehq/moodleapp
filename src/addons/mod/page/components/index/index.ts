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
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@singletons/utils';
import { AddonModPagePage, AddonModPage } from '../../services/page';
import { AddonModPageHelper } from '../../services/page-helper';
import { ADDON_MOD_PAGE_COMPONENT } from '../../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays a page.
 */
@Component({
    selector: 'addon-mod-page-index',
    templateUrl: 'addon-mod-page-index.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModPageIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = ADDON_MOD_PAGE_COMPONENT;
    pluginName = 'page';
    contents?: string;
    displayDescription = false;
    displayTimemodified = true;
    timemodified?: number;
    page?: AddonModPagePage;

    protected fetchContentDefaultError = 'addon.mod_page.errorwhileloadingthepage';

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModPageIndexComponent', courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent();
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        await AddonModPage.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean): Promise<void> {
        const [contents] = await Promise.all([
            this.getModuleContents(refresh),
            this.loadPageData(),
        ]);

        this.contents = await AddonModPageHelper.getPageHtml(contents, this.module.id);
    }

    /**
     * Load page data from WS.
     *
     * @returns Promise resolved when done.
     */
    protected async loadPageData(): Promise<void> {
        // Get latest title, description and some extra data. Data should've been updated in download.
        this.page = await AddonModPage.getPageData(this.courseId, this.module.id);

        this.description = this.page.intro;
        this.dataRetrieved.emit(this.page);

        // Check if description and timemodified should be displayed.
        if (this.page.displayoptions) {
            const options: Record<string, string | boolean> =
                CoreText.unserialize(this.page.displayoptions) || {};

            this.displayDescription = options.printintro === undefined ||
                    CoreUtils.isTrueOrOne(options.printintro);
            this.displayTimemodified = options.printlastmodified === undefined ||
                    CoreUtils.isTrueOrOne(options.printlastmodified);
        } else {
            this.displayDescription = true;
            this.displayTimemodified = true;
        }

        this.timemodified = 'timemodified' in this.page ? this.page.timemodified : undefined;
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonModPage.logView(this.module.instance));

        this.analyticsLogEvent('mod_page_view_page');
    }

}
