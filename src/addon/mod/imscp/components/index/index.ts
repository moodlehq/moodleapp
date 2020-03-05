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
import { ModalController } from 'ionic-angular';
import {
    CoreCourseModuleMainResourceComponent, CoreCourseResourceDownloadResult
} from '@core/course/classes/main-resource-component';
import { AddonModImscpProvider } from '../../providers/imscp';

/**
 * Component that displays a IMSCP.
 */
@Component({
    selector: 'addon-mod-imscp-index',
    templateUrl: 'addon-mod-imscp-index.html',
})
export class AddonModImscpIndexComponent extends CoreCourseModuleMainResourceComponent {
    component = AddonModImscpProvider.COMPONENT;

    items = [];
    currentItem: string;
    src = '';
    warning: string;

    // Initialize empty previous/next to prevent showing arrows for an instant before they're hidden.
    previousItem = '';
    nextItem = '';

    constructor(injector: Injector,
            protected imscpProvider: AddonModImscpProvider,
            protected modalCtrl: ModalController) {
        super(injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.loadContent().then(() => {
            this.imscpProvider.logView(this.module.instance, this.module.name).then(() => {
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
        return this.imscpProvider.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download imscp contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        let downloadResult: CoreCourseResourceDownloadResult;
        const promises = [];

        promises.push(this.imscpProvider.getImscp(this.courseId, this.module.id).then((imscp) => {
            this.description = imscp.intro;
            this.dataRetrieved.emit(imscp);
        }));

        promises.push(this.downloadResourceIfNeeded(refresh).then((result) => {
            downloadResult = result;
        }));

        return Promise.all(promises).then(() => {
            this.items = this.imscpProvider.createItemList(this.module.contents);
            if (this.items.length && typeof this.currentItem == 'undefined') {
                this.currentItem = this.items[0].href;
            }

            return this.loadItem(this.currentItem).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'addon.mod_imscp.deploymenterror', true);

                return Promise.reject(null);
            });
        }).then(() => {
            this.warning = downloadResult.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error) : '';

        }).finally(() => {
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Loads an item.
     *
     * @param itemId Item ID.
     * @return Promise resolved when done.
     */
    loadItem(itemId: string): Promise<any> {
        return this.imscpProvider.getIframeSrc(this.module, itemId).then((src) => {
            this.currentItem = itemId;
            this.previousItem = this.imscpProvider.getPreviousItem(this.items, itemId);
            this.nextItem = this.imscpProvider.getNextItem(this.items, itemId);

            if (this.src && src == this.src) {
                // Re-loading same page. Set it to empty and then re-set the src in the next digest so it detects it has changed.
                this.src = '';
                setTimeout(() => {
                    this.src = src;
                });
            } else {
                this.src = src;
            }
        });
    }

    /**
     * Show the TOC.
     *
     * @param event Event.
     */
    showToc(event: MouseEvent): void {
        // Create the toc modal.
        const modal =  this.modalCtrl.create('AddonModImscpTocPage', {
            items: this.items,
            selected: this.currentItem
        }, { cssClass: 'core-modal-lateral',
            showBackdrop: true,
            enableBackdropDismiss: true,
            enterAnimation: 'core-modal-lateral-transition',
            leaveAnimation: 'core-modal-lateral-transition' });

        modal.onDidDismiss((itemId) => {
            if (itemId) {
                this.loadItem(itemId);
            }
        });

        modal.present({
            ev: event
        });
    }
}
