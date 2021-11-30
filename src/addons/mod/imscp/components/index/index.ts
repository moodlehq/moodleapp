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
import { CoreSilentError } from '@classes/errors/silenterror';
import { CoreNavigationBarItem } from '@components/navigation-bar/navigation-bar';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreDomUtils } from '@services/utils/dom';
import { AddonModImscpProvider, AddonModImscp, AddonModImscpTocItem } from '../../services/imscp';
import { AddonModImscpTocComponent } from '../toc/toc';

/**
 * Component that displays a IMSCP.
 */
@Component({
    selector: 'addon-mod-imscp-index',
    templateUrl: 'addon-mod-imscp-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModImscpIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = AddonModImscpProvider.COMPONENT;
    src = '';
    warning = '';
    navigationItems: CoreNavigationBarItem<AddonModImscpTocItem>[] = [];

    protected items: AddonModImscpTocItem[] = [];
    protected currentHref?: string;

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModImscpIndexComponent', courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent();

        try {
            await AddonModImscp.logView(this.module.instance!, this.module.name);
            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
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
        await AddonModImscp.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download imscp contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh = false): Promise<void> {
        try {
            const downloadResult = await this.downloadResourceIfNeeded(refresh);

            const imscp = await AddonModImscp.getImscp(this.courseId, this.module.id);
            this.description = imscp.intro;
            this.dataRetrieved.emit(imscp);

            // Get contents. No need to refresh, it has been done in downloadResourceIfNeeded.
            const contents = await CoreCourse.getModuleContents(this.module, this.courseId);

            this.items = AddonModImscp.createItemList(contents);

            if (this.items.length && this.currentHref === undefined) {
                this.currentHref = this.items[0].href;
            }

            try {
                await this.loadItemHref(this.currentHref);
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'addon.mod_imscp.deploymenterror', true);

                throw new CoreSilentError(error);
            }

            this.warning = downloadResult.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error!) : '';

        } finally {
            // Pass false because downloadResourceIfNeeded already invalidates and refresh data if refresh=true.
            this.fillContextMenu(false);
        }
    }

    /**
     * Loads an item.
     *
     * @param itemHref Item Href.
     * @return Promise resolved when done.
     */
    async loadItemHref(itemHref?: string): Promise<void> {
        const src = await AddonModImscp.getIframeSrc(this.module, itemHref);
        this.currentHref = itemHref;

        this.navigationItems = this.items.map((item) => ({
            item: item,
            current: item.href == this.currentHref,
            enabled: !!item.href,
        }));

        if (this.src && src == this.src) {
            // Re-loading same page. Set it to empty and then re-set the src in the next digest so it detects it has changed.
            this.src = '';
            setTimeout(() => {
                this.src = src;
            });
        } else {
            this.src = src;
        }
    }

    /**
     * Loads an item.
     *
     * @param item Item.
     */
    loadItem(item: AddonModImscpTocItem): void {
        this.loadItemHref(item.href);
    }

    /**
     * Show the TOC.
     */
    async showToc(): Promise<void> {
        // Create the toc modal.
        const modalData = await CoreDomUtils.openSideModal<string>({
            component: AddonModImscpTocComponent,
            componentProps: {
                items: this.items,
                selected: this.currentHref,
            },
        });

        if (modalData) {
            this.loadItemHref(modalData);
        }
    }

}
