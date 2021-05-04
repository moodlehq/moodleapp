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
import {
    CoreCourseModuleMainResourceComponent,
    CoreCourseResourceDownloadResult,
} from '@features/course/classes/main-resource-component';
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

    items: AddonModImscpTocItem[] = [];
    currentItem?: string;
    src = '';
    warning = '';

    // Initialize empty previous/next to prevent showing arrows for an instant before they're hidden.
    previousItem = '';
    nextItem = '';

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModImscpIndexComponent', courseContentsPage);
    }

    /**
     * Component being initialized.
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
        let downloadResult: CoreCourseResourceDownloadResult;
        const promises: Promise<void>[] = [];

        promises.push(AddonModImscp.getImscp(this.courseId, this.module.id).then((imscp) => {
            this.description = imscp.intro;
            this.dataRetrieved.emit(imscp);

            return;
        }));

        promises.push(this.downloadResourceIfNeeded(refresh).then((result) => {
            downloadResult = result;

            return;
        }));

        try {
            await Promise.all(promises);

            this.items = AddonModImscp.createItemList(this.module.contents);

            if (this.items.length && typeof this.currentItem == 'undefined') {
                this.currentItem = this.items[0].href;
            }

            try {
                await this.loadItem(this.currentItem);
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'addon.mod_imscp.deploymenterror', true);

                throw new CoreSilentError(error);
            }

            this.warning = downloadResult!.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult!.error!) : '';

        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Loads an item.
     *
     * @param itemId Item ID.
     * @return Promise resolved when done.
     */
    async loadItem(itemId?: string): Promise<void> {
        const src = await AddonModImscp.getIframeSrc(this.module, itemId);
        this.currentItem = itemId;
        this.previousItem = itemId ? AddonModImscp.getPreviousItem(this.items, itemId) : '';
        this.nextItem = itemId ? AddonModImscp.getNextItem(this.items, itemId) : '';

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
     * Show the TOC.
     */
    async showToc(): Promise<void> {
        // Create the toc modal.
        const modalData = await CoreDomUtils.openSideModal<string>({
            component: AddonModImscpTocComponent,
            componentProps: {
                items: this.items,
                selected: this.currentItem,
            },
        });

        if (modalData) {
            this.loadItem(modalData);
        }
    }

}
