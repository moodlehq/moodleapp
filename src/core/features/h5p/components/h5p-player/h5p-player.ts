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

import { CoreApp } from '@services/app';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrlUtils } from '@services/utils/url';
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CoreConstants } from '@/core/constants';
import { CoreSite } from '@classes/site';
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreH5PDisplayOptions } from '../../classes/core';

/**
 * Component to render an H5P package.
 */
@Component({
    selector: 'core-h5p-player',
    templateUrl: 'core-h5p-player.html',
    styleUrls: ['h5p-player.scss'],
})
export class CoreH5PPlayerComponent implements OnInit, OnChanges, OnDestroy {

    @Input() src?: string; // The URL of the player to display the H5P package.
    @Input() component?: string; // Component.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.

    showPackage = false;
    state?: string;
    canDownload = false;
    calculating = true;
    displayOptions?: CoreH5PDisplayOptions;
    urlParams?: {[name: string]: string};

    protected site: CoreSite;
    protected siteId: string;
    protected siteCanDownload: boolean;
    protected observer?: CoreEventObserver;
    protected logger: CoreLogger;

    constructor(
        public elementRef: ElementRef,
    ) {

        this.logger = CoreLogger.getInstance('CoreH5PPlayerComponent');
        this.site = CoreSites.getCurrentSite()!;
        this.siteId = this.site.getId();
        this.siteCanDownload = this.site.canDownloadFiles() && !CoreH5P.isOfflineDisabledInSite();
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

        this.displayOptions = CoreH5P.h5pPlayer.getDisplayOptionsFromUrlParams(this.urlParams);
        this.showPackage = true;

        if (!this.canDownload || (this.state != CoreConstants.OUTDATED && this.state != CoreConstants.NOT_DOWNLOADED)) {
            return;
        }

        // Download the package in background if the size is low.
        try {
            this.attemptDownloadInBg();
        } catch (error) {
            this.logger.error('Error downloading H5P in background', error);
        }
    }

    /**
     * Download the package.
     *
     * @return Promise resolved when done.
     */
    async download(): Promise<void> {
        if (!CoreApp.isOnline()) {
            CoreDomUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        try {
            // Get the file size and ask the user to confirm.
            const size = await CorePluginFileDelegate.getFileSize({ fileurl: this.urlParams!.url }, this.siteId);

            await CoreDomUtils.confirmDownloadSize({ size: size, total: true });

            // User confirmed, add to the queue.
            await CoreFilepool.addToQueueByUrl(this.siteId, this.urlParams!.url, this.component, this.componentId);

        } catch (error) {
            if (CoreDomUtils.isCanceledError(error)) {
                // User cancelled, stop.
                return;
            }

            CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            this.calculateState();
        }
    }

    /**
     * Download the H5P in background if the size is low.
     *
     * @return Promise resolved when done.
     */
    protected async attemptDownloadInBg(): Promise<void> {
        if (!this.urlParams || !this.src || !this.siteCanDownload || !CoreH5P.canGetTrustedH5PFileInSite() ||
                !CoreApp.isOnline()) {
            return;
        }

        // Get the file size.
        const size = await CorePluginFileDelegate.getFileSize({ fileurl: this.urlParams.url }, this.siteId);

        if (CoreFilepool.shouldDownload(size)) {
            // Download the file in background.
            CoreFilepool.addToQueueByUrl(this.siteId, this.urlParams.url, this.component, this.componentId);
        }
    }

    /**
     * Check if the package can be downloaded.
     *
     * @return Promise resolved when done.
     */
    protected async checkCanDownload(): Promise<void> {
        this.observer && this.observer.off();
        this.urlParams = CoreUrlUtils.extractUrlParams(this.src || '');

        if (this.src && this.siteCanDownload && CoreH5P.canGetTrustedH5PFileInSite() && this.site.containsUrl(this.src)) {
            this.calculateState();

            // Listen for changes in the state.
            try {
                const eventName = await CoreFilepool.getFileEventNameByUrl(this.siteId, this.urlParams.url);

                this.observer = CoreEvents.on(eventName, () => {
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
            const state = await CoreFilepool.getFileStateByUrl(this.siteId, this.urlParams!.url);

            this.canDownload = true;
            this.state = state;
        } catch (error) {
            this.canDownload = false;
        } finally {
            this.calculating = false;
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.observer?.off();
    }

}
