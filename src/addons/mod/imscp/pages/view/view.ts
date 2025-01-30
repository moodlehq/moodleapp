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

import { DownloadStatus } from '@/core/constants';
import { Component, OnInit } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreNavigationBarItem } from '@components/navigation-bar/navigation-bar';
import { CoreCourseResourceDownloadResult } from '@features/course/classes/main-resource-component';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreNetwork } from '@services/network';
import { CoreNavigator } from '@services/navigator';
import { CoreErrorHelper } from '@services/error-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { AddonModImscp, AddonModImscpImscp, AddonModImscpTocItem } from '../../services/imscp';
import { CoreModals } from '@services/overlays/modals';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a IMSCP content.
 */
@Component({
    selector: 'page-addon-mod-imscp-view',
    templateUrl: 'view.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModImscpViewPage implements OnInit {

    title = '';
    cmId!: number;
    courseId!: number;
    initialItemHref?: string;
    src = '';
    warning = '';
    navigationItems: CoreNavigationBarItem<AddonModImscpTocItem>[] = [];
    loaded = false;

    protected module?: CoreCourseModuleData;
    protected imscp?: AddonModImscpImscp;
    protected items: AddonModImscpTocItem[] = [];
    protected currentHref?: string;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.initialItemHref = CoreNavigator.getRouteParam('initialHref');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        this.fetchContent();
    }

    /**
     * Download IMSCP contents and load the current item.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async fetchContent(refresh = false): Promise<void> {
        try {
            const { module, imscp } = await this.loadImscpData();

            this.title = imscp.name;

            const downloadResult = await this.downloadResourceIfNeeded(module, refresh);

            // Get contents. No need to refresh, it has been done in downloadResourceIfNeeded.
            const contents = await CoreCourse.getModuleContents(module, this.courseId);

            this.items = AddonModImscp.createItemList(contents);

            if (this.items.length) {
                if (this.initialItemHref) {
                    // Check it's valid.
                    if (this.items.some(item => item.href === this.initialItemHref)) {
                        this.currentHref = this.initialItemHref;
                    }
                }

                if (this.currentHref === undefined) {
                    // Get last viewed.
                    const lastViewedHref = await AddonModImscp.getLastItemViewed(imscp.id);

                    if (lastViewedHref !== undefined) {
                        this.currentHref = lastViewedHref;
                    } else {
                        // Use first one.
                        this.currentHref = this.items[0].href;
                    }
                }
            }

            if (this.currentHref === undefined) {
                throw new CoreError('Empty TOC');
            }

            try {
                await this.loadItemHref(this.currentHref);
            } catch (error) {
                CoreAlerts.showError(error, { default: Translate.instant('addon.mod_imscp.deploymenterror') });

                return;
            }

            if (downloadResult?.failed) {
                const error = CoreErrorHelper.getErrorMessageFromError(downloadResult.error) || downloadResult.error;
                this.warning = Translate.instant('core.errordownloadingsomefiles') + (error ? ' ' + error : '');
            } else {
                this.warning = '';
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Load IMSCP data from WS.
     *
     * @returns Promise resolved when done.
     */
    async loadImscpData(): Promise<{ module: CoreCourseModuleData; imscp: AddonModImscpImscp }> {
        this.module = await CoreCourse.getModule(this.cmId, this.courseId);
        this.imscp = await AddonModImscp.getImscp(this.courseId, this.cmId);

        return {
            module: this.module,
            imscp: this.imscp,
        };
    }

    /**
     * Download a resource if needed.
     * If the download call fails the promise won't be rejected, but the error will be included in the returned object.
     * If module.contents cannot be loaded then the Promise will be rejected.
     *
     * @param module Module data.
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async downloadResourceIfNeeded(
        module: CoreCourseModuleData,
        refresh = false,
    ): Promise<CoreCourseResourceDownloadResult> {

        const result: CoreCourseResourceDownloadResult = {
            failed: false,
        };
        let contentsAlreadyLoaded = false;

        // Get module status to determine if it needs to be downloaded.
        const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(module, this.courseId, undefined, refresh);

        if (status !== DownloadStatus.DOWNLOADED) {
            // Download content. This function also loads module contents if needed.
            try {
                await CoreCourseModulePrefetchDelegate.downloadModule(module, this.courseId);

                // If we reach here it means the download process already loaded the contents, no need to do it again.
                contentsAlreadyLoaded = true;
            } catch (error) {
                // Mark download as failed but go on since the main files could have been downloaded.
                result.failed = true;
                result.error = error;
            }
        }

        if (!module.contents?.length || (refresh && !contentsAlreadyLoaded)) {
            // Try to load the contents.
            const ignoreCache = refresh && CoreNetwork.isOnline();

            try {
                await CoreCourse.loadModuleContents(module, undefined, undefined, false, ignoreCache);
            } catch (error) {
                // Error loading contents. If we ignored cache, try to get the cached value.
                if (ignoreCache && !module.contents) {
                    await CoreCourse.loadModuleContents(module);
                } else if (!module.contents) {
                    // Not able to load contents, throw the error.
                    throw error;
                }
            }
        }

        return result;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(Promise.all([
            AddonModImscp.invalidateContent(this.cmId, this.courseId),
            CoreCourseModulePrefetchDelegate.invalidateCourseUpdates(this.courseId), // To detect if IMSCP was updated.
        ]));

        await CorePromiseUtils.ignoreErrors(this.fetchContent(true));

        refresher?.complete();
    }

    /**
     * Loads an item.
     *
     * @param itemHref Item Href.
     * @returns Promise resolved when done.
     */
    async loadItemHref(itemHref: string): Promise<void> {
        if (!this.module) {
            return;
        }

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

        if (this.imscp) {
            AddonModImscp.storeLastItemViewed(this.imscp.id, itemHref, this.courseId);
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
        const { AddonModImscpTocComponent } = await import('../../components/toc/toc');

        // Create the toc modal.
        const itemHref = await CoreModals.openSideModal<string>({
            component: AddonModImscpTocComponent,
            componentProps: {
                items: this.items,
                selected: this.currentHref,
            },
        });

        if (itemHref) {
            this.loadItemHref(itemHref);
        }
    }

}
