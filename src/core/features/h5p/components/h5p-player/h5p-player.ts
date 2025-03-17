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

import { CoreNetwork } from '@services/network';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { DownloadStatus } from '@/core/constants';
import { CoreSite } from '@classes/sites/site';
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreH5PDisplayOptions } from '../../classes/core';
import { BehaviorSubject } from 'rxjs';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreH5PIframeComponent } from '../h5p-iframe/h5p-iframe';
import { CoreFileHelper } from '@services/file-helper';

/**
 * Component to render an H5P package.
 */
@Component({
    selector: 'core-h5p-player',
    templateUrl: 'core-h5p-player.html',
    styleUrl: 'h5p-player.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreH5PIframeComponent,
    ],
})
export class CoreH5PPlayerComponent implements OnInit, OnChanges, OnDestroy {

    @Input() src?: string; // The URL of the player to display the H5P package.
    @Input() component?: string; // Component.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.
    @Input() fileTimemodified?: number; // The timemodified of the package file.
    @Input() autoPlay = false; // Auto-play the H5P package.

    showPackage = false;
    state?: DownloadStatus;
    canDownload$ = new BehaviorSubject(false);
    calculating$ = new BehaviorSubject(true);
    displayOptions?: CoreH5PDisplayOptions;
    // This param should be initialized as undefined to avoid showing the download button when is not set.
    urlParams?: {[name: string]: string};

    protected site: CoreSite;
    protected siteId: string;
    protected siteCanDownload: boolean;
    protected observer?: CoreEventObserver;
    protected logger: CoreLogger;
    protected nativeElement: HTMLElement;

    constructor(
        elementRef: ElementRef,
    ) {
        this.nativeElement = elementRef.nativeElement;

        this.logger = CoreLogger.getInstance('CoreH5PPlayerComponent');
        this.site = CoreSites.getRequiredCurrentSite();
        this.siteId = this.site.getId();
        this.siteCanDownload = this.site.canDownloadFiles() && !CoreH5P.isOfflineDisabledInSite();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.handleAutoPlay();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        // If it's already playing there's no need to check if it can be downloaded or auto-played.
        if (changes.src && !this.showPackage) {
            this.handleAutoPlay();
        }
    }

    /**
     * Handle auto-play. If auto-play is enabled or package is downloaded (outdated included), it will try to play the H5P.
     */
    protected async handleAutoPlay(): Promise<void> {
        await this.checkCanDownload();

        if (!this.autoPlay) {
            if (this.canDownload$.getValue() && this.state && CoreFileHelper.isStateDownloaded(this.state)) {
                // It will be played if it's downloaded.
                this.play();
            }

            return;
        }

        this.play();
    }

    /**
     * Play the H5P.
     *
     * @param e Event.
     */
    async play(e?: MouseEvent): Promise<void> {
        e?.preventDefault();
        e?.stopPropagation();

        this.displayOptions = CoreH5P.h5pPlayer.getDisplayOptionsFromUrlParams(this.urlParams);
        this.showPackage = true;

        if (
            !this.canDownload$.getValue() ||
            (this.state !== DownloadStatus.OUTDATED && this.state !== DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED)
        ) {
            return;
        }

        // Download the package in background if the size is low.
        try {
            await this.attemptDownloadInBg();
        } catch (error) {
            this.logger.error('Error downloading H5P in background', error);
        }
    }

    /**
     * Download the package.
     */
    async download(): Promise<void> {
        if (!CoreNetwork.isOnline()) {
            CoreAlerts.showError(Translate.instant('core.networkerrormsg'));

            return;
        }

        if (!this.urlParams) {
            return;
        }

        try {
            // Check if the package has missing dependencies. If so, it cannot be downloaded.
            const missingDependencies = await CoreH5P.h5pFramework.getMissingDependenciesForFile(this.urlParams.url);
            if (missingDependencies.length > 0) {
                throw CoreH5P.h5pFramework.buildMissingDependenciesErrorFromDBRecords(missingDependencies);
            }

            // Get the file size and ask the user to confirm.
            const size = await CorePluginFileDelegate.getFileSize({ fileurl: this.urlParams.url }, this.siteId);

            await CoreAlerts.confirmDownloadSize({ size: size, total: true });

            // User confirmed, add to the queue.
            await CoreFilepool.addToQueueByUrl(this.siteId, this.urlParams.url, this.component, this.componentId);

        } catch (error) {
            if (CoreErrorHelper.isCanceledError(error)) {
                // User cancelled, stop.
                return;
            }

            CoreAlerts.showError(error, { default: Translate.instant('core.errordownloading') });
            this.calculateState();
        }
    }

    /**
     * Download the H5P in background if the size is low.
     */
    protected async attemptDownloadInBg(): Promise<void> {
        if (!this.urlParams || !this.src || !this.siteCanDownload || !CoreH5P.canGetTrustedH5PFileInSite() ||
                !CoreNetwork.isOnline()) {
            return;
        }

        // Check if the package has missing dependencies. If so, it cannot be downloaded.
        const missingDependencies = await CoreH5P.h5pFramework.getMissingDependenciesForFile(this.urlParams.url);
        if (missingDependencies.length > 0) {
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
     */
    protected async checkCanDownload(): Promise<void> {
        this.observer?.off();
        this.urlParams = CoreUrl.extractUrlParams(this.src || '');

        if (this.src && this.siteCanDownload && CoreH5P.canGetTrustedH5PFileInSite() && this.site.containsUrl(this.src)) {
            await this.calculateState();

            // Listen for changes in the state.
            try {
                const eventName = await CoreFilepool.getFileEventNameByUrl(this.siteId, this.urlParams.url);

                this.observer = CoreEvents.on(eventName, () => {
                    this.calculateState();
                });
            } catch {
                // An error probably means the file cannot be downloaded or we cannot check it (offline).
            }

        } else {
            this.calculating$.next(false);
            this.canDownload$.next(false);
        }

    }

    /**
     * Calculate state of the file.
     */
    protected async calculateState(): Promise<void> {
        if (!this.urlParams) {
            return;
        }

        this.calculating$.next(true);

        // Get the status of the file.
        try {
            const state = await CoreFilepool.getFileStateByUrl(this.siteId, this.urlParams.url);

            this.canDownload$.next(true);
            this.state = state;
        } catch {
            this.canDownload$.next(false);
        } finally {
            this.calculating$.next(false);
        }
    }

    /**
     * Get the native element.
     *
     * @returns The native element.
     */
    getElement(): HTMLElement {
        return this.nativeElement;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.observer?.off();
    }

}
