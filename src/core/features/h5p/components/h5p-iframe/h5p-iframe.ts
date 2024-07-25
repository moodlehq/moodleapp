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

import { Component, Input, Output, ElementRef, OnChanges, SimpleChange, EventEmitter, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrl } from '@singletons/url';
import { CoreH5P } from '@features/h5p/services/h5p';
import { DownloadStatus } from '@/core/constants';
import { CoreSite } from '@classes/sites/site';
import { CoreLogger } from '@singletons/logger';
import { CoreH5PCore, CoreH5PDisplayOptions } from '../../classes/core';
import { CoreH5PHelper } from '../../classes/helper';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';

/**
 * Component to render an iframe with an H5P package.
 */
@Component({
    selector: 'core-h5p-iframe',
    templateUrl: 'core-h5p-iframe.html',
})
export class CoreH5PIframeComponent implements OnChanges, OnDestroy {

    @Input() fileUrl?: string; // The URL of the H5P file. If not supplied, onlinePlayerUrl is required.
    @Input() displayOptions?: CoreH5PDisplayOptions; // Display options.
    @Input() onlinePlayerUrl?: string; // The URL of the online player to display the H5P package.
    @Input() trackComponent?: string; // Component to send xAPI events to.
    @Input() contextId?: number; // Context ID. Required for tracking.
    @Input() enableInAppFullscreen?: boolean; // Whether to enable our custom in-app fullscreen feature.
    @Input() saveFreq?: number; // Save frequency (in seconds) if enabled.
    @Input() state?: string; // Initial content state.
    @Output() onIframeUrlSet = new EventEmitter<{src: string; online: boolean}>();
    @Output() onIframeLoaded = new EventEmitter<void>();

    iframeSrc?: string;

    protected site: CoreSite;
    protected siteId: string;
    protected siteCanDownload: boolean;
    protected logger: CoreLogger;
    protected currentPageRoute?: string;
    protected subscription: Subscription;
    protected iframeLoadedOnce = false;

    constructor(
        public elementRef: ElementRef,
        router: Router,
    ) {
        this.logger = CoreLogger.getInstance('CoreH5PIframeComponent');
        this.site = CoreSites.getRequiredCurrentSite();
        this.siteId = this.site.getId();
        this.siteCanDownload = this.site.canDownloadFiles() && !CoreH5P.isOfflineDisabledInSite();

        // Send resize events when the page holding this component is re-entered.
        this.currentPageRoute = router.url;
        this.subscription = router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                if (!this.iframeLoadedOnce || event.urlAfterRedirects !== this.currentPageRoute) {
                    return;
                }

                window.dispatchEvent(new Event('resize'));
            });
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        // If it's already playing don't change it.
        if ((changes.fileUrl || changes.onlinePlayerUrl) && !this.iframeSrc) {
            this.play();
        }
    }

    /**
     * Play the H5P.
     *
     * @returns Promise resolved when done.
     */
    protected async play(): Promise<void> {
        let localUrl: string | undefined;
        let state: DownloadStatus;
        this.onlinePlayerUrl = this.onlinePlayerUrl || CoreH5P.h5pPlayer.calculateOnlinePlayerUrl(
            this.site.getURL(),
            this.fileUrl || '',
            this.displayOptions,
            this.trackComponent,
        );

        if (this.fileUrl) {
            state = await CoreFilepool.getFileStateByUrl(this.siteId, this.fileUrl);
        } else {
            state = DownloadStatus.NOT_DOWNLOADABLE;
        }

        if (this.siteCanDownload && CoreFileHelper.isStateDownloaded(state)) {
            // Package is downloaded, use the local URL.
            localUrl = await this.getLocalUrl();
        }

        try {
            if (localUrl) {
                // Local package.
                this.iframeSrc = localUrl;

                // Only log analytics event when playing local package, online package already logs it.
                CoreAnalytics.logEvent({
                    type: CoreAnalyticsEventType.VIEW_ITEM,
                    ws: 'core_h5p_get_trusted_h5p_file',
                    name: 'H5P content',
                    data: { category: 'h5p' },
                    url: this.onlinePlayerUrl,
                });
            } else {
                // Never allow downloading in the app. This will only work if the user is allowed to change the params.
                const src = this.onlinePlayerUrl.replace(
                    CoreH5PCore.DISPLAY_OPTION_DOWNLOAD + '=1',
                    CoreH5PCore.DISPLAY_OPTION_DOWNLOAD + '=0',
                );

                // Add the preventredirect param so the user can authenticate.
                this.iframeSrc = CoreUrl.addParamsToUrl(src, { preventredirect: false });
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading H5P package.', true);

        } finally {
            CoreH5PHelper.addResizerScript();
            this.onIframeUrlSet.emit({ src: this.iframeSrc!, online: !!localUrl });
        }
    }

    /**
     * Get the local URL of the package.
     *
     * @returns Promise resolved with the local URL.
     */
    protected async getLocalUrl(): Promise<string | undefined> {
        const otherOptions = {
            saveFreq: this.saveFreq,
            state: this.state,
        };

        try {
            const url = await CoreH5P.h5pPlayer.getContentIndexFileUrl(
                this.fileUrl!,
                this.displayOptions,
                this.trackComponent,
                this.contextId,
                this.siteId,
                otherOptions,
            );

            return url;
        } catch (error) {
            // Index file doesn't exist, probably deleted because a lib was updated. Try to create it again.
            try {
                const path = await CoreFilepool.getInternalUrlByUrl(this.siteId, this.fileUrl!);

                const file = await CoreFile.getFile(path);

                await CoreH5PHelper.saveH5P(this.fileUrl!, file, this.siteId);

                // File treated. Try to get the index file URL again.
                const url = await CoreH5P.h5pPlayer.getContentIndexFileUrl(
                    this.fileUrl!,
                    this.displayOptions,
                    this.trackComponent,
                    this.contextId,
                    this.siteId,
                    otherOptions,
                );

                return url;
            } catch (error) {
                // Still failing. Delete the H5P package?
                this.logger.error('Error loading downloaded index:', error, this.fileUrl);
            }
        }
    }

    /**
     * H5P iframe has been loaded.
     */
    iframeLoaded(): void {
        this.onIframeLoaded.emit();
        this.iframeLoadedOnce = true;

        // Send a resize event to the window so H5P package recalculates the size.
        window.dispatchEvent(new Event('resize'));
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

}
