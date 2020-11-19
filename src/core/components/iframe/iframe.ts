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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavController } from '@ionic/angular';

import { CoreFile } from '@services/file';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreIframeUtils } from '@services/utils/iframe';
import { CoreUtils } from '@services/utils/utils';
import { CoreLogger } from '@singletons/logger';

@Component({
    selector: 'core-iframe',
    templateUrl: 'core-iframe.html',
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

    protected readonly IFRAME_TIMEOUT = 15000;
    protected logger: CoreLogger;
    protected initialized = false;

    constructor(
        protected sanitizer: DomSanitizer,
        protected navCtrl: NavController,
    ) {

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

        this.iframeWidth = (this.iframeWidth && CoreDomUtils.instance.formatPixelsSize(this.iframeWidth)) || '100%';
        this.iframeHeight = (this.iframeHeight && CoreDomUtils.instance.formatPixelsSize(this.iframeHeight)) || '100%';
        this.allowFullscreen = CoreUtils.instance.isTrueOrOne(this.allowFullscreen);

        // Show loading only with external URLs.
        this.loading = !this.src || !CoreUrlUtils.instance.isLocalFileUrl(this.src);

        // @todo const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        CoreIframeUtils.instance.treatFrame(iframe, false, this.navCtrl);

        iframe.addEventListener('load', () => {
            this.loading = false;
            this.loaded.emit(iframe); // Notify iframe was loaded.
        });

        iframe.addEventListener('error', () => {
            this.loading = false;
            CoreDomUtils.instance.showErrorModal('core.errorloadingcontent', true);
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
            const url = CoreUrlUtils.instance.getYoutubeEmbedUrl(changes.src.currentValue) || changes.src.currentValue;

            await CoreIframeUtils.instance.fixIframeCookies(url);

            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(CoreFile.instance.convertFileSrc(url));

            // Now that the URL has been set, initialize the iframe. Wait for the iframe to the added to the DOM.
            setTimeout(() => {
                this.init();
            });
        }
    }

}
