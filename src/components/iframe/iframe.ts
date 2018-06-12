// (C) Copyright 2015 Martin Dougiamas
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

import { Component, Input, Output, OnInit, ViewChild, ElementRef, EventEmitter, OnChanges, SimpleChange } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Platform } from 'ionic-angular';
import { CoreFileProvider } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 */
@Component({
    selector: 'core-iframe',
    templateUrl: 'core-iframe.html'
})
export class CoreIframeComponent implements OnInit, OnChanges {

    @ViewChild('iframe') iframe: ElementRef;
    @Input() src: string;
    @Input() iframeWidth: string;
    @Input() iframeHeight: string;
    @Output() loaded?: EventEmitter<HTMLIFrameElement> = new EventEmitter<HTMLIFrameElement>();
    loading: boolean;
    safeUrl: SafeResourceUrl;

    protected logger;
    protected tags = ['iframe', 'frame', 'object', 'embed'];
    protected IFRAME_TIMEOUT = 15000;

    constructor(logger: CoreLoggerProvider, private fileProvider: CoreFileProvider, private urlUtils: CoreUrlUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private utils: CoreUtilsProvider, private domUtils: CoreDomUtilsProvider,
            private sitesProvider: CoreSitesProvider, private platform: Platform, private sanitizer: DomSanitizer) {
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

        // Show loading only with external URLs.
        this.loading = !this.src || !!this.src.match(/^https?:\/\//i);

        this.treatFrame(iframe);

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
            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(changes.src.currentValue);
        }
    }

    /**
     * Given an element, return the content window and document.
     *
     * @param {any} element Element to treat.
     * @return {{ window: Window, document: Document }} Window and Document.
     */
    protected getContentWindowAndDocument(element: any): { window: Window, document: Document } {
        let contentWindow: Window = element.contentWindow,
            contentDocument: Document = element.contentDocument || (contentWindow && contentWindow.document);

        if (!contentWindow && contentDocument) {
            // It's probably an <object>. Try to get the window.
            contentWindow = contentDocument.defaultView;
        }

        if (!contentWindow && element.getSVGDocument) {
            // It's probably an <embed>. Try to get the window and the document.
            contentDocument = element.getSVGDocument();
            if (contentDocument && contentDocument.defaultView) {
                contentWindow = contentDocument.defaultView;
            } else if (element.window) {
                contentWindow = element.window;
            } else if (element.getWindow) {
                contentWindow = element.getWindow();
            }
        }

        return { window: contentWindow, document: contentDocument };
    }

    /**
     * Intercept window.open in a frame and its subframes, shows an error modal instead.
     * Search links (<a>) and open them in browser or InAppBrowser if needed.
     *
     * @param {any} element Element to treat.
     */
    protected treatFrame(element: any): void {
        if (element) {
            let winAndDoc = this.getContentWindowAndDocument(element);
            // Redefine window.open in this element and sub frames, it might have been loaded already.
            this.redefineWindowOpen(element, winAndDoc.window, winAndDoc.document);
            // Treat links.
            this.treatLinks(element, winAndDoc.document);

            element.addEventListener('load', () => {
                // Element loaded, redefine window.open and treat links again.
                winAndDoc = this.getContentWindowAndDocument(element);
                this.redefineWindowOpen(element, winAndDoc.window, winAndDoc.document);
                this.treatLinks(element, winAndDoc.document);

                if (winAndDoc.window) {
                    // Send a resize events to the iframe so it calculates the right size if needed.
                    setTimeout(() => {
                        winAndDoc.window.dispatchEvent(new Event('resize'));
                    }, 1000);
                }
            });
        }
    }

    /**
     * Redefine the open method in the contentWindow of an element and the sub frames.
     *
     * @param {any} element Element to treat.
     * @param {Window} contentWindow The window of the element contents.
     * @param {Document} contentDocument The document of the element contents.
     */
    protected redefineWindowOpen(element: any, contentWindow: Window, contentDocument: Document): void {
        if (contentWindow) {
            // Intercept window.open.
            contentWindow.open = (url: string): Window => {
                const scheme = this.urlUtils.getUrlScheme(url);
                if (!scheme) {
                    // It's a relative URL, use the frame src to create the full URL.
                    const src = element.src || element.data;
                    if (src) {
                        const dirAndFile = this.fileProvider.getFileAndDirectoryFromPath(src);
                        if (dirAndFile.directory) {
                            url = this.textUtils.concatenatePaths(dirAndFile.directory, url);
                        } else {
                            this.logger.warn('Cannot get iframe dir path to open relative url', url, element);

                            return new Window(); // Return new Window object.
                        }
                    } else {
                        this.logger.warn('Cannot get iframe src to open relative url', url, element);

                        return new Window(); // Return new Window object.
                    }
                }

                if (url.indexOf('cdvfile://') === 0 || url.indexOf('file://') === 0) {
                    // It's a local file.
                    this.utils.openFile(url).catch((error) => {
                        this.domUtils.showErrorModal(error);
                    });
                } else {
                    // It's an external link, we will open with browser. Check if we need to auto-login.
                    if (!this.sitesProvider.isLoggedIn()) {
                        // Not logged in, cannot auto-login.
                        this.utils.openInBrowser(url);
                    } else {
                        this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(url);
                    }
                }

                return new Window(); // Return new Window object.
            };
        }

        if (contentDocument) {
            // Search sub frames.
            this.tags.forEach((tag) => {
                const elements = Array.from(contentDocument.querySelectorAll(tag));
                elements.forEach((subElement) => {
                    this.treatFrame(subElement);
                });
            });
        }
    }

    /**
     * Search links (<a>) and open them in browser or InAppBrowser if needed.
     * Only links that haven't been treated by the iframe's Javascript will be treated.
     *
     * @param {any} element Element to treat.
     * @param {Document} contentDocument The document of the element contents.
     */
    protected treatLinks(element: any, contentDocument: Document): void {
        if (!contentDocument) {
            return;
        }

        const links = Array.from(contentDocument.querySelectorAll('a'));
        links.forEach((el: HTMLAnchorElement) => {
            const href = el.href;

            // Check that href is not null.
            if (href) {
                const scheme = this.urlUtils.getUrlScheme(href);
                if (scheme && scheme == 'javascript') {
                    // Javascript links should be treated by the iframe's Javascript.
                    // There's nothing to be done with these links, so they'll be ignored.
                    return;
                } else if (scheme && scheme != 'file' && scheme != 'filesystem') {
                    // Scheme suggests it's an external resource, open it in browser.
                    el.addEventListener('click', (e) => {
                        // If the link's already prevented by SCORM JS then we won't open it in browser.
                        if (!e.defaultPrevented) {
                            e.preventDefault();
                            if (!this.sitesProvider.isLoggedIn()) {
                                this.utils.openInBrowser(href);
                            } else {
                                this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(href);
                            }
                        }
                    });
                } else if (el.target == '_parent' || el.target == '_top' || el.target == '_blank') {
                    // Opening links with _parent, _top or _blank can break the app. We'll open it in InAppBrowser.
                    el.addEventListener('click', (e) => {
                        // If the link's already prevented by SCORM JS then we won't open it in InAppBrowser.
                        if (!e.defaultPrevented) {
                            e.preventDefault();
                            this.utils.openFile(href).catch((error) => {
                                this.domUtils.showErrorModal(error);
                            });
                        }
                    });
                } else if (this.platform.is('ios') && (!el.target || el.target == '_self')) {
                    // In cordova ios 4.1.0 links inside iframes stopped working. We'll manually treat them.
                    el.addEventListener('click', (e) => {
                        // If the link's already prevented by SCORM JS then we won't treat it.
                        if (!e.defaultPrevented) {
                            if (element.tagName.toLowerCase() == 'object') {
                                e.preventDefault();
                                element.attr('data', href);
                            } else {
                                e.preventDefault();
                                element.attr('src', href);
                            }
                        }
                    });
                }
            }
        });
    }

}
