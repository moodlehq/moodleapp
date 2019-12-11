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
    Component, Input, Output, OnInit, ViewChild, ElementRef, EventEmitter, OnChanges, SimpleChange, Optional
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavController } from 'ionic-angular';
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
export class CoreIframeComponent implements OnInit, OnChanges {

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

    constructor(logger: CoreLoggerProvider,
            protected iframeUtils: CoreIframeUtilsProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected sanitizer: DomSanitizer,
            protected navCtrl: NavController,
            protected urlUtils: CoreUrlUtilsProvider,
            protected utils: CoreUtilsProvider,
            @Optional() protected svComponent: CoreSplitViewComponent) {

        this.logger = logger.getInstance('CoreIframe');
        this.loaded = new EventEmitter<HTMLIFrameElement>();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        const iframe: HTMLIFrameElement = this.iframe && this.iframe.nativeElement;

        this.iframeWidth = this.domUtils.formatPixelsSize(this.iframeWidth) || '100%';
        this.iframeHeight = this.domUtils.formatPixelsSize(this.iframeHeight) || '100%';
        this.allowFullscreen = this.utils.isTrueOrOne(this.allowFullscreen);

        // Show loading only with external URLs.
        this.loading = !this.src || !!this.src.match(/^https?:\/\//i);

        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        this.iframeUtils.treatFrame(iframe, false, navCtrl);

        if (this.loading) {
            iframe.addEventListener('load', () => {
                this.loading = false;
                this.loaded.emit(iframe); // Notify iframe was loaded.
            });

            iframe.addEventListener('error', () => {
                this.loading = false;
                this.domUtils.showErrorModal('core.errorloadingcontent', true);
            });

            setTimeout(() => {
                this.loading = false;
            }, this.IFRAME_TIMEOUT);
        }
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange }): void {
        if (changes.src) {
            const youtubeUrl = this.urlUtils.getYoutubeEmbedUrl(changes.src.currentValue);
            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(youtubeUrl || changes.src.currentValue);
        }
    }
}
