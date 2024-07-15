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
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { AddonModImscp, AddonModImscpTocItem } from '../../services/imscp';
import { CoreUtils } from '@services/utils/utils';
import { ADDON_MOD_IMSCP_COMPONENT } from '../../constants';

/**
 * Component that displays a IMSCP.
 */
@Component({
    selector: 'addon-mod-imscp-index',
    templateUrl: 'addon-mod-imscp-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModImscpIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = ADDON_MOD_IMSCP_COMPONENT;
    pluginName = 'imscp';

    items: AddonModImscpTocItem[] = [];
    hasStarted = false;

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModImscpIndexComponent', courseContentsPage);
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
        await AddonModImscp.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        await Promise.all([
            this.loadImscp(),
            this.loadTOC(),
        ]);
    }

    /**
     * Load IMSCP data.
     *
     * @returns Promise resolved when done.
     */
    protected async loadImscp(): Promise<void> {
        const imscp = await AddonModImscp.getImscp(this.courseId, this.module.id);

        this.dataRetrieved.emit(imscp);

        this.dataRetrieved.emit(imscp);

        this.description = imscp.intro;

        const lastViewed = await AddonModImscp.getLastItemViewed(imscp.id);
        this.hasStarted = lastViewed !== undefined;
    }

    /**
     * Load book TOC.
     *
     * @returns Promise resolved when done.
     */
    protected async loadTOC(): Promise<void> {
        // Get contents. No need to refresh, it has been done in downloadResourceIfNeeded.
        const contents = await CoreCourse.getModuleContents(this.module, this.courseId);

        this.items = AddonModImscp.createItemList(contents);
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CoreUtils.ignoreErrors(AddonModImscp.logView(this.module.instance));

        this.analyticsLogEvent('mod_imscp_view_imscp');
    }

    /**
     * Open IMSCP book with a certain item.
     *
     * @param href Item href to open, undefined for last item seen.
     */
    openImscp(href?: string): void {
        CoreNavigator.navigate('view', {
            params: {
                cmId: this.module.id,
                courseId: this.courseId,
                initialHref: href,
            },
        });

        this.hasStarted = true;
    }

    /**
     * Get dummy array for padding.
     *
     * @param n Array length.
     * @returns Dummy array with n elements.
     */
    getNumberForPadding(n: number): number[] {
        return new Array(n);
    }

}
