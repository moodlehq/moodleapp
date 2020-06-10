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

import { Component, Input, ElementRef, OnInit, OnDestroy, OnChanges, SimpleChange } from '@angular/core';
import { CoreApp } from '@providers/app';
import { CoreEvents } from '@providers/events';
import { CoreFile } from '@providers/file';
import { CoreFilepool } from '@providers/filepool';
import { CoreLogger } from '@providers/logger';
import { CoreSites } from '@providers/sites';
import { CoreDomUtils } from '@providers/utils/dom';
import { CoreUrlUtils } from '@providers/utils/url';
import { CoreH5P } from '@core/h5p/providers/h5p';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';
import { CoreFileHelper } from '@providers/file-helper';
import { CoreConstants } from '@core/constants';
import { CoreSite } from '@classes/site';
import { CoreH5PCore } from '../../classes/core';
import { CoreH5PHelper } from '../../classes/helper';

/**
 * Component to render an H5P package.
 */
@Component({
    selector: 'core-h5p-player',
    templateUrl: 'core-h5p-player.html'
})
export class CoreH5PPlayerComponent implements OnInit, OnChanges, OnDestroy {
    @Input() src: string; // The URL of the player to display the H5P package.
    @Input() component?: string; // Component.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.

    playerSrc: string;
    showPackage = false;
    loading = false;
    state: string;
    canDownload: boolean;
    calculating = true;

    protected site: CoreSite;
    protected siteId: string;
    protected siteCanDownload: boolean;
    protected observer;
    protected urlParams;
    protected logger;

    constructor(public elementRef: ElementRef,
            protected pluginFileDelegate: CorePluginFileDelegate) {

        this.logger = CoreLogger.instance.getInstance('CoreH5PPlayerComponent');
        this.site = CoreSites.instance.getCurrentSite();
        this.siteId = this.site.getId();
        this.siteCanDownload = this.site.canDownloadFiles() && !CoreH5P.instance.isOfflineDisabledInSite();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.checkCanDownload();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        // If it's already playing there's no need to check if it can be downloaded.
        if (changes.src && !this.showPackage) {
            this.checkCanDownload();
        }
    }

    /**
     * Play the H5P.
     *
     * @param e Event.
     */
    async play(e: MouseEvent): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        this.loading = true;

        let localUrl: string;

        if (this.canDownload && CoreFileHelper.instance.isStateDownloaded(this.state)) {
            // Package is downloaded, use the local URL.
            try {
                localUrl = await CoreH5P.instance.h5pPlayer.getContentIndexFileUrl(this.urlParams.url, this.urlParams, this.siteId);
            } catch (error) {
                // Index file doesn't exist, probably deleted because a lib was updated. Try to create it again.
                try {
                    const path = await CoreFilepool.instance.getInternalUrlByUrl(this.siteId, this.urlParams.url);

                    const file = await CoreFile.instance.getFile(path);

                    await CoreH5PHelper.saveH5P(this.urlParams.url, file, this.siteId);

                    // File treated. Try to get the index file URL again.
                    localUrl = await CoreH5P.instance.h5pPlayer.getContentIndexFileUrl(this.urlParams.url, this.urlParams,
                            this.siteId);
                } catch (error) {
                    // Still failing. Delete the H5P package?
                    this.logger.error('Error loading downloaded index:', error, this.src);
                }
            }
        }

        try {
            if (localUrl) {
                // Local package.
                this.playerSrc = localUrl;
            } else {
                // Never allow downloading in the app. This will only work if the user is allowed to change the params.
                const src = this.src && this.src.replace(CoreH5PCore.DISPLAY_OPTION_DOWNLOAD + '=1',
                        CoreH5PCore.DISPLAY_OPTION_DOWNLOAD + '=0');

                // Get auto-login URL so the user is automatically authenticated.
                const url = await CoreSites.instance.getCurrentSite().getAutoLoginUrl(src, false);

                // Add the preventredirect param so the user can authenticate.
                this.playerSrc = CoreUrlUtils.instance.addParamsToUrl(url, {preventredirect: false});
            }
        } finally {

            this.addResizerScript();
            this.loading = false;
            this.showPackage = true;

            if (this.canDownload && (this.state == CoreConstants.OUTDATED || this.state == CoreConstants.NOT_DOWNLOADED)) {
                // Download the package in background if the size is low.
                try {
                    this.attemptDownloadInBg();
                } catch (error) {
                    this.logger.error('Error downloading H5P in background', error);
                }
            }
        }
    }

    /**
     * Download the package.
     *
     * @return Promise resolved when done.
     */
    async download(e: Event): Promise<void> {
        e && e.preventDefault();
        e && e.stopPropagation();

        if (!CoreApp.instance.isOnline()) {
            CoreDomUtils.instance.showErrorModal('core.networkerrormsg', true);

            return;
        }

        try {
            // Get the file size and ask the user to confirm.
            const size = await this.pluginFileDelegate.getFileSize({fileurl: this.urlParams.url}, this.siteId);

            await CoreDomUtils.instance.confirmDownloadSize({ size: size, total: true });

            // User confirmed, add to the queue.
            await CoreFilepool.instance.addToQueueByUrl(this.siteId, this.urlParams.url, this.component, this.componentId);

        } catch (error) {
            if (CoreDomUtils.instance.isCanceledError(error)) {
                // User cancelled, stop.
                return;
            }

            CoreDomUtils.instance.showErrorModalDefault(error, 'core.errordownloading', true);
            this.calculateState();
        }
    }

    /**
     * Download the H5P in background if the size is low.
     *
     * @return Promise resolved when done.
     */
    protected async attemptDownloadInBg(): Promise<void> {
        if (this.urlParams && this.src && this.siteCanDownload && CoreH5P.instance.canGetTrustedH5PFileInSite() &&
                CoreApp.instance.isOnline()) {

            // Get the file size.
            const size = await this.pluginFileDelegate.getFileSize({fileurl: this.urlParams.url}, this.siteId);

            if (CoreFilepool.instance.shouldDownload(size)) {
                // Download the file in background.
                CoreFilepool.instance.addToQueueByUrl(this.siteId, this.urlParams.url, this.component, this.componentId);
            }
        }
    }

    /**
     * Add the resizer script if it hasn't been added already.
     */
    protected addResizerScript(): void {
        if (document.head.querySelector('#core-h5p-resizer-script') != null) {
            // Script already added, don't add it again.
            return;
        }

        const script = document.createElement('script');
        script.id = 'core-h5p-resizer-script';
        script.type = 'text/javascript';
        script.src = CoreH5P.instance.h5pPlayer.getResizerScriptUrl();
        document.head.appendChild(script);
    }

    /**
     * Check if the package can be downloaded.
     *
     * @return Promise resolved when done.
     */
    protected async checkCanDownload(): Promise<void> {
        this.observer && this.observer.off();
        this.urlParams = CoreUrlUtils.instance.extractUrlParams(this.src);

        if (this.src && this.siteCanDownload && CoreH5P.instance.canGetTrustedH5PFileInSite() && this.site.containsUrl(this.src)) {

            this.calculateState();

            // Listen for changes in the state.
            try {
                const eventName = await CoreFilepool.instance.getFileEventNameByUrl(this.siteId, this.urlParams.url);

                this.observer = CoreEvents.instance.on(eventName, () => {
                    this.calculateState();
                });
            } catch (error) {
                // An error probably means the file cannot be downloaded or we cannot check it (offline).
            }

        } else {
            this.calculating = false;
            this.canDownload = false;
        }

    }

    /**
     * Calculate state of the file.
     *
     * @param fileUrl The H5P file URL.
     * @return Promise resolved when done.
     */
    protected async calculateState(): Promise<void> {
        this.calculating = true;

        // Get the status of the file.
        try {
            const state = await CoreFilepool.instance.getFileStateByUrl(this.siteId, this.urlParams.url);

            this.canDownload = true;
            this.state = state;
        } catch (error) {
            this.canDownload = false;
        } finally {
            this.calculating = false;
        }
    }

    /**
     * H5P iframe has been loaded.
     */
    iframeLoaded(): void {
        // Send a resize event to the window so H5P package recalculates the size.
        window.dispatchEvent(new Event('resize'));
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.observer && this.observer.off();
    }
}
