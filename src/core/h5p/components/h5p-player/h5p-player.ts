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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreH5PProvider } from '@core/h5p/providers/h5p';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';
import { CoreConstants } from '@core/constants';

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

    protected siteId: string;
    protected siteCanDownload: boolean;
    protected observer;
    protected urlParams;
    protected logger;

    constructor(loggerProvider: CoreLoggerProvider,
            public elementRef: ElementRef,
            protected sitesProvider: CoreSitesProvider,
            protected urlUtils: CoreUrlUtilsProvider,
            protected utils: CoreUtilsProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected h5pProvider: CoreH5PProvider,
            protected filepoolProvider: CoreFilepoolProvider,
            protected eventsProvider: CoreEventsProvider,
            protected appProvider: CoreAppProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected pluginFileDelegate: CorePluginFileDelegate) {

        this.logger = loggerProvider.getInstance('CoreH5PPlayerComponent');
        this.siteId = sitesProvider.getCurrentSiteId();
        this.siteCanDownload = this.sitesProvider.getCurrentSite().canDownloadFiles();
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
        // If it's already playing and the src changes, don't change the player src, the user could lose data.
        if (changes.src && !this.showPackage) {
            this.checkCanDownload();
        }
    }

    /**
     * Play the H5P.
     *
     * @param e Event.
     */
    play(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();

        this.loading = true;

        let promise;

        if (this.canDownload && (this.state == CoreConstants.DOWNLOADED || this.state == CoreConstants.OUTDATED)) {
            // Package is downloaded, use the local URL.
            promise = this.h5pProvider.getContentIndexFileUrl(this.urlParams.url).catch((error) => {
                // It seems there was something wrong when creating the index file. Delete the package?
                this.logger.error('Error loading downloaded index:', error, this.src);
            });
        } else {
            promise = Promise.resolve();
        }

        promise.then((url) => {
            if (url) {
                // Local package.
                this.playerSrc = url;
            } else {
                // Get auto-login URL so the user is automatically authenticated.
                return this.sitesProvider.getCurrentSite().getAutoLoginUrl(this.src, false).then((url) => {
                    // Add the preventredirect param so the user can authenticate.
                    this.playerSrc = this.urlUtils.addParamsToUrl(url, {preventredirect: false});
                });
            }
        }).finally(() => {
            this.loading = false;
            this.showPackage = true;
        });
    }

    /**
     * Download the package.
     */
    download(e: Event): void {
        e && e.preventDefault();
        e && e.stopPropagation();

        if (!this.appProvider.isOnline()) {
            this.domUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        // Get the file size and ask the user to confirm.
        this.pluginFileDelegate.getFileSize({fileurl: this.urlParams.url}, this.siteId).then((size) => {
            return this.domUtils.confirmDownloadSize({ size: size, total: true }).then(() => {

                // User confirmed, add to the queue.
                return this.filepoolProvider.addToQueueByUrl(this.siteId, this.urlParams.url, this.component, this.componentId);
            }, () => {
                // User cancelled.
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            this.calculateState();
        });
    }

    /**
     * Check if the package can be downloaded.
     */
    protected checkCanDownload(): void {
        this.observer && this.observer.off();
        this.urlParams = this.urlUtils.extractUrlParams(this.src);

        if (this.src && this.siteCanDownload && this.h5pProvider.canGetTrustedH5PFileInSite()) {

            this.calculating = true;

            this.calculateState();

            // Listen for changes in the state.
            this.filepoolProvider.getFileEventNameByUrl(this.siteId, this.urlParams.url).then((eventName) => {
                this.observer = this.eventsProvider.on(eventName, () => {
                    this.calculateState();
                });
            }).catch(() => {
                // An error probably means the file cannot be downloaded or we cannot check it (offline).
            });

            return;
        }

        this.calculating = false;
        this.canDownload = false;
    }

    /**
     * Calcuñate state of the file.
     *
     * @param fileUrl The H5P file URL.
     */
    protected calculateState(): void {
        // Get the status of the file.
        this.filepoolProvider.getFileStateByUrl(this.siteId, this.urlParams.url).then((state) => {
            this.canDownload = true;
            this.state = state;
        }).catch((error) => {
            this.canDownload = false;
        }).finally(() => {
            this.calculating = false;
        });
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.observer && this.observer.off();
    }
}
