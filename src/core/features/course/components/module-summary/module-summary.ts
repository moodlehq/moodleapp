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

import { CoreConstants } from '@/core/constants';
import { AddonBlog } from '@addons/blog/services/blog';
import { AddonBlogMainMenuHandlerService } from '@addons/blog/services/handlers/mainmenu';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Params } from '@angular/router';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreApp } from '@services/app';
import { CoreFilepool } from '@services/filepool';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { ModalController, Network, Translate, NgZone } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';

/**
 * Component to display a module summary modal.
 */
@Component({
    selector: 'core-course-module-summary',
    templateUrl: 'module-summary.html',
    styleUrls: ['module-summary.scss'],
})
export class CoreCourseModuleSummaryComponent implements OnInit, OnDestroy {

    @Input() module?: CoreCourseModuleData; // The module of the component.
    @Input() courseId = 0; // Course ID the component belongs to.
    @Input() moduleId = 0; // Module ID the component belongs to.
    @Input() component = ''; // Component name.
    @Input() description = ''; // Module description.
    @Input() hasOffline = false; // If it has offline data to be synced.

    loaded = false; // If the component has been loaded.
    componentId?: number; // Component ID.

    // Data for context menu.
    externalUrl?: string; // External URL to open in browser.

    removeFilesLoading = false;
    prefetchStatusIcon?: string;
    prefetchStatus?: string;
    prefetchText?: string;
    sizeReadable?: string;
    downloadTimeReadable?: string; // Last download time in a readable format.
    size = 0;

    blog = false; // If blog is available.

    isOnline = false; // If the app is online or not.

    protected onlineSubscription: Subscription; // It will observe the status of the network connection.

    protected packageStatusObserver?: CoreEventObserver; // Observer of package status.
    protected fileStatusObserver?: CoreEventObserver; // Observer of file status.
    protected siteId: string;
    protected isDestroyed = false;

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();
        this.isOnline = CoreApp.isOnline();

        // Refresh online status when changes.
        this.onlineSubscription = Network.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreApp.isOnline();
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.module) {
            this.closeModal();

            return;
        }

        this.fetchContent();

        if (this.component) {
            this.packageStatusObserver = CoreEvents.on(
                CoreEvents.PACKAGE_STATUS_CHANGED,
                (data) => {
                    if (data.componentId == module.id && data.component == this.component) {
                        this.getPackageStatus();
                    }
                },
                this.siteId,
            );

            // Debounce the update size function to prevent too many calls when downloading or deleting a whole activity.
            const debouncedUpdateSize = CoreUtils.debounce(async () => {
                if (!this.module) {
                    return;
                }

                const moduleSize = await CoreCourseModulePrefetchDelegate.getModuleStoredSize(this.module, this.courseId);

                this.sizeReadable = moduleSize > 0 ? CoreTextUtils.bytesToSize(moduleSize, 2) : '';
            }, 1000);

            this.fileStatusObserver = CoreEvents.on(
                CoreEvents.COMPONENT_FILE_ACTION,
                (data) => {
                    if (data.component != this.component || data.componentId != module.id) {
                        // The event doesn't belong to this component, ignore.
                        return;
                    }

                    if (!CoreFilepool.isFileEventDownloadedOrDeleted(data)) {
                        return;
                    }

                    // Update the module size.
                    debouncedUpdateSize();
                },
                this.siteId,
            );
        }

    }

    /**
     * Fetch content to populate the page.
     */
    protected async fetchContent(): Promise<void> {
        if (!this.module) {
            return;
        }

        this.componentId = this.module.id;
        this.externalUrl = this.module.url;
        this.courseId = this.courseId || this.module.course;

        this.blog = await AddonBlog.isPluginEnabled();

        await this.getPackageStatus();

        this.loaded = true;
    }

    /**
     * Updage package status.
     *
     * @param refresh If prefetch info has to be refreshed.
     */
    async getPackageStatus(refresh = false): Promise<void> {
        if (!this.module) {
            return;
        }

        const moduleInfo =
            await CoreCourseHelper.getModulePrefetchInfo(this.module, this.courseId, refresh, this.component);

        this.prefetchStatusIcon = moduleInfo.statusIcon;
        this.prefetchStatus = moduleInfo.status;
        this.downloadTimeReadable = '';

        if (moduleInfo.status != CoreConstants.NOT_DOWNLOADABLE) {
            // Module is downloadable, get the text to display to prefetch.
            if (moduleInfo.downloadTime && moduleInfo.downloadTime > 0) {
                this.prefetchText = Translate.instant('core.lastdownloaded');
                this.downloadTimeReadable = CoreTextUtils.ucFirst(moduleInfo.downloadTimeReadable);
            } else {
                // Module not downloaded, show a default text.
                this.prefetchText = Translate.instant('core.download');
            }
        }

        this.sizeReadable = moduleInfo.sizeReadable;
        this.size = moduleInfo.size;
        if (moduleInfo.status == CoreConstants.DOWNLOADING) {
            // Set this to empty to prevent "remove file" option showing up while downloading.
            this.sizeReadable = '';
        }
    }

    /**
     * Go to blog posts.
     */
    async gotoBlog(): Promise<void> {
        const params: Params = { cmId: this.moduleId };

        await CoreNavigator.navigateToSitePath(AddonBlogMainMenuHandlerService.PAGE_NAME, { params });
    }

    /**
     * Prefetch the module.
     */
    async prefetch(): Promise<void> {
        if (!this.module) {
            return;
        }

        const initialIcon = this.prefetchStatusIcon;
        this.prefetchStatusIcon = CoreConstants.ICON_DOWNLOADING; // Show spinner since this operation might take a while.

        try {
            // We need to call getDownloadSize, the package might have been updated.
            const size = await CoreCourseModulePrefetchDelegate.getModuleDownloadSize(this.module, this.courseId, true);

            await CoreDomUtils.confirmDownloadSize(size);

            await CoreCourseModulePrefetchDelegate.prefetchModule(this.module, this.courseId, true);

            await this.getPackageStatus(true);
        } catch (error) {
            this.prefetchStatusIcon = initialIcon;

            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        }
    }

    /**
     * Confirm and remove downloaded files.
     */
    async removeFiles(): Promise<void> {
        if (!this.module) {
            return;
        }

        if (this.prefetchStatus == CoreConstants.DOWNLOADING) {
            CoreDomUtils.showAlertTranslated(undefined, 'core.course.cannotdeletewhiledownloading');

            return;
        }

        try {
            await CoreDomUtils.showDeleteConfirm('addon.storagemanager.confirmdeletedatafrom', { name: this.module.name });

            this.removeFilesLoading = true;

            await CoreCourseHelper.removeModuleStoredData(this.module, this.courseId);

        } catch (error) {
            if (!this.isDestroyed &&error) {
                CoreDomUtils.showErrorModal(error);
            }
        } finally {
            this.removeFilesLoading = false;
        }

        await this.getPackageStatus();
    }

    /**
     * Refresh the data.
     */
    async refresh(): Promise<void> {
        if (!this.module) {
            return;
        }

        ModalController.dismiss({ action: 'refresh' });
    }

    /**
     * Sync the data.
     */
    async sync(): Promise<void> {
        if (!this.module) {
            return;
        }

        ModalController.dismiss({ action: 'sync' });
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.packageStatusObserver?.off();
        this.fileStatusObserver?.off();
        this.onlineSubscription.unsubscribe();
    }

}

export type CoreCourseModuleSummaryResult =  {
    action: 'sync'|'refresh';
};
