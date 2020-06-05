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

import { Component, Input, Output, ElementRef, OnChanges, SimpleChange, EventEmitter } from '@angular/core';
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
import { CoreH5PCore, CoreH5PDisplayOptions } from '../../classes/core';
import { CoreH5PHelper } from '../../classes/helper';

/**
 * Component to render an iframe with an H5P package.
 */
@Component({
    selector: 'core-h5p-iframe',
    templateUrl: 'core-h5p-iframe.html',
})
export class CoreH5PIframeComponent implements OnChanges {
    @Input() fileUrl?: string; // The URL of the H5P file. If not supplied, onlinePlayerUrl is required.
    @Input() displayOptions?: CoreH5PDisplayOptions; // Display options.
    @Input() onlinePlayerUrl?: string; // The URL of the online player to display the H5P package.
    @Input() trackComponent?: string; // Component to send xAPI events to.
    @Input() contextId?: number; // Context ID. Required for tracking.
    @Output() onIframeUrlSet = new EventEmitter<{src: string, online: boolean}>();
    @Output() onIframeLoaded = new EventEmitter<void>();

    iframeSrc: string;

    protected site: CoreSite;
    protected siteId: string;
    protected siteCanDownload: boolean;
    protected logger;

    constructor(public elementRef: ElementRef,
            protected pluginFileDelegate: CorePluginFileDelegate) {

        this.logger = CoreLogger.instance.getInstance('CoreH5PIframeComponent');
        this.site = CoreSites.instance.getCurrentSite();
        this.siteId = this.site.getId();
        this.siteCanDownload = this.site.canDownloadFiles() && !CoreH5P.instance.isOfflineDisabledInSite();
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
     * @return Promise resolved when done.
     */
    protected async play(): Promise<void> {
        let localUrl: string;
        let state: string;

        if (this.fileUrl) {
            state = await CoreFilepool.instance.getFileStateByUrl(this.siteId, this.fileUrl);
        } else {
            state = CoreConstants.NOT_DOWNLOADABLE;
        }

        if (this.siteCanDownload && CoreFileHelper.instance.isStateDownloaded(state)) {
            // Package is downloaded, use the local URL.
            localUrl = await this.getLocalUrl();
        }

        try {
            if (localUrl) {
                // Local package.
                this.iframeSrc = localUrl;
            } else {
                this.onlinePlayerUrl = this.onlinePlayerUrl || CoreH5P.instance.h5pPlayer.calculateOnlinePlayerUrl(
                        this.site.getURL(), this.fileUrl, this.displayOptions, this.trackComponent);

                // Never allow downloading in the app. This will only work if the user is allowed to change the params.
                const src = this.onlinePlayerUrl.replace(CoreH5PCore.DISPLAY_OPTION_DOWNLOAD + '=1',
                        CoreH5PCore.DISPLAY_OPTION_DOWNLOAD + '=0');

                // Get auto-login URL so the user is automatically authenticated.
                const url = await CoreSites.instance.getCurrentSite().getAutoLoginUrl(src, false);

                // Add the preventredirect param so the user can authenticate.
                this.iframeSrc = CoreUrlUtils.instance.addParamsToUrl(url, {preventredirect: false});
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading H5P package.', true);

        } finally {
            this.addResizerScript();
            this.onIframeUrlSet.emit({src: this.iframeSrc, online: !!localUrl});
        }
    }

    /**
     * Get the local URL of the package.
     *
     * @return Promise resolved with the local URL.
     */
    protected async getLocalUrl(): Promise<string> {
        try {
            const url = await CoreH5P.instance.h5pPlayer.getContentIndexFileUrl(this.fileUrl, this.displayOptions,
                    this.trackComponent, this.contextId, this.siteId);

            return url;
        } catch (error) {
            // Index file doesn't exist, probably deleted because a lib was updated. Try to create it again.
            try {
                const path = await CoreFilepool.instance.getInternalUrlByUrl(this.siteId, this.fileUrl);

                const file = await CoreFile.instance.getFile(path);

                await CoreH5PHelper.saveH5P(this.fileUrl, file, this.siteId);

                // File treated. Try to get the index file URL again.
                const url = await CoreH5P.instance.h5pPlayer.getContentIndexFileUrl(this.fileUrl, this.displayOptions,
                        this.trackComponent, this.contextId, this.siteId);

                return url;
            } catch (error) {
                // Still failing. Delete the H5P package?
                this.logger.error('Error loading downloaded index:', error, this.fileUrl);
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
     * H5P iframe has been loaded.
     */
    iframeLoaded(): void {
        this.onIframeLoaded.emit();

        // Send a resize event to the window so H5P package recalculates the size.
        window.dispatchEvent(new Event('resize'));
    }
}
