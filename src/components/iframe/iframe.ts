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
    Component, Input, Output, ViewChild, ElementRef, EventEmitter, OnChanges, SimpleChange, Optional
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavController } from 'ionic-angular';
import { CoreFile } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreIframeUtilsProvider } from '@providers/utils/iframe';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

@Component({
    selector: 'core-iframe',
    templateUrl: 'core-iframe.html'
})
export class CoreIframeComponent implements OnChanges {

    @ViewChild('iframe') iframe: ElementRef;
    @Input() src: string;
    @Input() iframeWidth: string;
    @Input() iframeHeight: string;
    @Input() allowFullscreen: boolean | string;
    @Output() loaded?: EventEmitter<HTMLIFrameElement> = new EventEmitter<HTMLIFrameElement>();
    loading: boolean;
    safeUrl: SafeResourceUrl;

    protected logger;
    protected IFRAME_TIMEOUT = 15000;
    protected initialized = false;

    constructor(logger: CoreLoggerProvider,
            protected iframeUtils: CoreIframeUtilsProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected sanitizer: DomSanitizer,
            protected navCtrl: NavController,
            protected urlUtils: CoreUrlUtilsProvider,
            protected utils: CoreUtilsProvider,
            @Optional() protected svComponent: CoreSplitViewComponent,
            ) {

        this.logger = logger.getInstance('CoreIframe');
        this.loaded = new EventEmitter<HTMLIFrameElement>();
    }

    /**
     * Init the data.
     */
    protected init(): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        const iframe: HTMLIFrameElement = this.iframe && this.iframe.nativeElement;

        this.iframeWidth = this.domUtils.formatPixelsSize(this.iframeWidth) || '100%';
        this.iframeHeight = this.domUtils.formatPixelsSize(this.iframeHeight) || '100%';
        this.allowFullscreen = this.utils.isTrueOrOne(this.allowFullscreen);

        // Show loading only with external URLs.
        this.loading = !this.src || !this.urlUtils.isLocalFileUrl(this.src);

        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        this.iframeUtils.treatFrame(iframe, false, navCtrl);

        iframe.addEventListener('load', () => {
            this.loading = false;
            this.loaded.emit(iframe); // Notify iframe was loaded.
        });

        iframe.addEventListener('error', () => {
            this.loading = false;
            this.domUtils.showErrorModal('core.errorloadingcontent', true);
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
            const url = this.urlUtils.getYoutubeEmbedUrl(changes.src.currentValue) || changes.src.currentValue;

            await this.iframeUtils.fixIframeCookies(url);

            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(CoreFile.instance.convertFileSrc(url));

            // Now that the URL has been set, initialize the iframe. Wait for the iframe to the added to the DOM.
            setTimeout(() => {
                this.init();
            });
        }
    }
}
