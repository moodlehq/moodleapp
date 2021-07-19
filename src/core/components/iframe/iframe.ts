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

import {
    Component, Input, Output, ViewChild, ElementRef, EventEmitter, OnChanges, SimpleChange,
} from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

import { CoreFile } from '@services/file';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreIframeUtils } from '@services/utils/iframe';
import { CoreUtils } from '@services/utils/utils';
import { CoreLogger } from '@singletons/logger';
import { DomSanitizer } from '@singletons';

@Component({
    selector: 'core-iframe',
    templateUrl: 'core-iframe.html',
    styleUrls: ['iframe.scss'],
})
export class CoreIframeComponent implements OnChanges {

    @ViewChild('iframe') iframe?: ElementRef;
    @Input() src?: string;
    @Input() iframeWidth?: string;
    @Input() iframeHeight?: string;
    @Input() allowFullscreen?: boolean | string;
    @Output() loaded: EventEmitter<HTMLIFrameElement> = new EventEmitter<HTMLIFrameElement>();

    loading?: boolean;
    safeUrl?: SafeResourceUrl;
    displayHelp = false;

    protected readonly IFRAME_TIMEOUT = 15000;
    protected logger: CoreLogger;
    protected initialized = false;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreIframe');
        this.loaded = new EventEmitter<HTMLIFrameElement>();
    }

    /**
     * Init the data.
     */
    protected init(): void {
        if (this.initialized) {
            return;
        }

        const iframe: HTMLIFrameElement | undefined = this.iframe?.nativeElement;
        if (!iframe) {
            return;
        }

        this.initialized = true;

        this.iframeWidth = (this.iframeWidth && CoreDomUtils.formatPixelsSize(this.iframeWidth)) || '100%';
        this.iframeHeight = (this.iframeHeight && CoreDomUtils.formatPixelsSize(this.iframeHeight)) || '100%';
        this.allowFullscreen = CoreUtils.isTrueOrOne(this.allowFullscreen);

        // Show loading only with external URLs.
        this.loading = !this.src || !CoreUrlUtils.isLocalFileUrl(this.src);

        CoreIframeUtils.treatFrame(iframe, false);

        iframe.addEventListener('load', () => {
            this.loading = false;
            this.loaded.emit(iframe); // Notify iframe was loaded.
        });

        iframe.addEventListener('error', () => {
            this.loading = false;
            CoreDomUtils.showErrorModal('core.errorloadingcontent', true);
        });

        if (this.loading) {
            setTimeout(() => {
                this.loading = false;
            }, this.IFRAME_TIMEOUT);
        }
    }

    /**
     * Detect changes on input properties.
     */
    async ngOnChanges(changes: {[name: string]: SimpleChange }): Promise<void> {
        if (changes.src) {
            const url = CoreUrlUtils.getYoutubeEmbedUrl(changes.src.currentValue) || changes.src.currentValue;
            this.displayHelp = CoreIframeUtils.shouldDisplayHelpForUrl(url);

            await CoreIframeUtils.fixIframeCookies(url);

            this.safeUrl = DomSanitizer.bypassSecurityTrustResourceUrl(CoreFile.convertFileSrc(url));

            // Now that the URL has been set, initialize the iframe. Wait for the iframe to the added to the DOM.
            setTimeout(() => {
                this.init();
            });
        }
    }

    /**
     * Open help modal for iframes.
     */
    openIframeHelpModal(): void {
        CoreIframeUtils.openIframeHelpModal();
    }

}
