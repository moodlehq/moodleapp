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

import { Injectable, NgZone } from '@angular/core';
import { Config, Platform, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { Network } from '@ionic-native/network';
import { CoreAppProvider } from '../app';
import { CoreFileProvider } from '../file';
import { CoreLoggerProvider } from '../logger';
import { CoreSitesProvider } from '../sites';
import { CoreDomUtilsProvider } from './dom';
import { CoreTextUtilsProvider } from './text';
import { CoreUrlUtilsProvider } from './url';
import { CoreUtilsProvider } from './utils';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/*
 * "Utils" service with helper functions for iframes, embed and similar.
 */
@Injectable()
export class CoreIframeUtilsProvider {
    static FRAME_TAGS = ['iframe', 'frame', 'object', 'embed'];

    protected logger;

    constructor(logger: CoreLoggerProvider, private fileProvider: CoreFileProvider, private sitesProvider: CoreSitesProvider,
            private urlUtils: CoreUrlUtilsProvider, private textUtils: CoreTextUtilsProvider, private utils: CoreUtilsProvider,
            private domUtils: CoreDomUtilsProvider, private platform: Platform, private appProvider: CoreAppProvider,
            private translate: TranslateService, private network: Network, private zone: NgZone, private config: Config,
            private contentLinksHelper: CoreContentLinksHelperProvider) {
        this.logger = logger.getInstance('CoreUtilsProvider');
    }

    /**
     * Check if a frame uses an online URL but the app is offline. If it does, the iframe is hidden and a warning is shown.
     *
     * @param element The frame to check (iframe, embed, ...).
     * @param isSubframe Whether it's a frame inside another frame.
     * @return True if frame is online and the app is offline, false otherwise.
     */
    checkOnlineFrameInOffline(element: any, isSubframe?: boolean): boolean {
        const src = element.src || element.data;

        if (src && src.match(/^https?:\/\//i) && !this.appProvider.isOnline()) {
            if (element.classList.contains('core-iframe-offline-disabled')) {
                // Iframe already hidden, stop.
                return true;
            }

            // The frame has an online URL but the app is offline. Show a warning, or a link if the URL can be opened in the app.
            const div = document.createElement('div');

            div.setAttribute('text-center', '');
            div.setAttribute('padding', '');
            div.classList.add('core-iframe-offline-warning');

            const site = this.sitesProvider.getCurrentSite();
            const username = site ? site.getInfo().username : undefined;
            this.contentLinksHelper.canHandleLink(src, undefined, username).then((canHandleLink) => {
                if (canHandleLink) {
                    const link = document.createElement('a');

                    if (isSubframe) {
                        // Ionic styles are not available in subframes, adding some minimal inline styles.
                        link.style.display = 'block';
                        link.style.padding = '1em';
                        link.style.fontWeight = '500';
                        link.style.textAlign = 'center';
                        link.style.textTransform = 'uppercase';
                        link.style.cursor = 'pointer';
                    } else {
                        const mode = this.config.get('mode');
                        link.setAttribute('ion-button', '');
                        link.classList.add('button', 'button-' + mode,
                                'button-default', 'button-default-' + mode,
                                'button-block', 'button-block-' + mode);
                    }

                    const message = this.translate.instant('core.viewembeddedcontent');
                    link.innerHTML = isSubframe ? message : '<span class="button-inner">' + message + '</span>';

                    link.onclick = (event: Event): void => {
                        this.contentLinksHelper.handleLink(src, username);
                        event.preventDefault();
                    };

                    div.appendChild(link);
                } else {
                    div.innerHTML = (isSubframe ?  '' : this.domUtils.getConnectionWarningIconHtml()) +
                        '<p>' + this.translate.instant('core.networkerroriframemsg') + '</p>';
                }

                element.parentElement.insertBefore(div, element);
            });

            // Add a class to specify that the iframe is hidden.
            element.classList.add('core-iframe-offline-disabled');

            if (isSubframe) {
                // We cannot apply CSS styles in subframes, just hide the iframe.
                element.style.display = 'none';
            }

            // If the network changes, check it again.
            const subscription = this.network.onConnect().subscribe(() => {
                // Execute the callback in the Angular zone, so change detection doesn't stop working.
                this.zone.run(() => {
                    if (!this.checkOnlineFrameInOffline(element, isSubframe)) {
                        // Now the app is online, no need to check connection again.
                        subscription.unsubscribe();
                    }
                });
            });

            return true;
        } else if (element.classList.contains('core-iframe-offline-disabled')) {
            // Reload the frame.
            element.src = element.src;
            element.data = element.data;

            // Remove the warning and show the iframe
            this.domUtils.removeElement(element.parentElement, 'div.core-iframe-offline-warning');
            element.classList.remove('core-iframe-offline-disabled');

            if (isSubframe) {
                element.style.display = '';
            }
        }

        return false;
    }

    /**
     * Given an element, return the content window and document.
     * Please notice that the element should be an iframe, embed or similar.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @return Window and Document.
     */
    getContentWindowAndDocument(element: any): { window: Window, document: Document } {
        let contentWindow: Window = element.contentWindow,
            contentDocument: Document;

        try {
            contentDocument = element.contentDocument || (contentWindow && contentWindow.document);
        } catch (ex) {
            // Ignore errors.
        }

        if (!contentWindow && contentDocument) {
            // It's probably an <object>. Try to get the window.
            contentWindow = contentDocument.defaultView;
        }

        if (!contentWindow && element.getSVGDocument) {
            // It's probably an <embed>. Try to get the window and the document.
            try {
                contentDocument = element.getSVGDocument();
            } catch (ex) {
                // Ignore errors.
            }

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
     * Redefine the open method in the contentWindow of an element and the sub frames.
     * Please notice that the element should be an iframe, embed or similar.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @param contentWindow The window of the element contents.
     * @param contentDocument The document of the element contents.
     * @param navCtrl NavController to use if a link can be opened in the app.
     */
    redefineWindowOpen(element: any, contentWindow: Window, contentDocument: Document, navCtrl?: NavController): void {
        if (contentWindow) {
            // Intercept window.open.
            contentWindow.open = (url: string, target: string): Window => {
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

                            return null;
                        }
                    } else {
                        this.logger.warn('Cannot get iframe src to open relative url', url, element);

                        return null;
                    }
                }

                if (target == '_self') {
                    // Link should be loaded in the same frame.
                    if (element.tagName.toLowerCase() == 'object') {
                        element.setAttribute('data', url);
                    } else {
                        element.setAttribute('src', url);
                    }
                } else if (url.indexOf('cdvfile://') === 0 || url.indexOf('file://') === 0) {
                    // It's a local file.
                    this.utils.openFile(url).catch((error) => {
                        this.domUtils.showErrorModal(error);
                    });
                } else {
                    // It's an external link, check if it can be opened in the app.
                    this.contentLinksHelper.handleLink(url, undefined, navCtrl, true, true).then((treated) => {
                        if (!treated) {
                            // Not opened in the app, open with browser. Check if we need to auto-login
                            if (!this.sitesProvider.isLoggedIn()) {
                                // Not logged in, cannot auto-login.
                                this.utils.openInBrowser(url);
                            } else {
                                this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(url);
                            }
                        }
                    });
                }

                 // We cannot create new Window objects directly, return null which is a valid return value for Window.open().
                return null;
            };
        }

        if (contentDocument) {
            // Search sub frames.
            CoreIframeUtilsProvider.FRAME_TAGS.forEach((tag) => {
                const elements = Array.from(contentDocument.querySelectorAll(tag));
                elements.forEach((subElement) => {
                    this.treatFrame(subElement, true, navCtrl);
                });
            });
        }
    }

    /**
     * Intercept window.open in a frame and its subframes, shows an error modal instead.
     * Search links (<a>) and open them in browser or InAppBrowser if needed.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @param isSubframe Whether it's a frame inside another frame.
     * @param navCtrl NavController to use if a link can be opened in the app.
     */
    treatFrame(element: any, isSubframe?: boolean, navCtrl?: NavController): void {
        if (element) {
            this.checkOnlineFrameInOffline(element, isSubframe);

            let winAndDoc = this.getContentWindowAndDocument(element);
            // Redefine window.open in this element and sub frames, it might have been loaded already.
            this.redefineWindowOpen(element, winAndDoc.window, winAndDoc.document, navCtrl);
            // Treat links.
            this.treatFrameLinks(element, winAndDoc.document);

            element.addEventListener('load', () => {
                this.checkOnlineFrameInOffline(element, isSubframe);

                // Element loaded, redefine window.open and treat links again.
                winAndDoc = this.getContentWindowAndDocument(element);
                this.redefineWindowOpen(element, winAndDoc.window, winAndDoc.document, navCtrl);
                this.treatFrameLinks(element, winAndDoc.document);

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
     * Search links (<a>) in a frame and open them in browser or InAppBrowser if needed.
     * Only links that haven't been treated by the frame's Javascript will be treated.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @param contentDocument The document of the element contents.
     */
    treatFrameLinks(element: any, contentDocument: Document): void {
        if (!contentDocument) {
            return;
        }

        contentDocument.addEventListener('click', (event) => {
            if (event.defaultPrevented) {
                // Event already prevented by some other code.
                return;
            }

            // Find the link being clicked.
            let el = <Element> event.target;
            while (el && el.tagName !== 'A') {
                el = el.parentElement;
            }

            const link = <CoreIframeHTMLAnchorElement> el;
            if (!link || link.treated) {
                return;
            }

            // Add click listener to the link, this way if the iframe has added a listener to the link it will be executed first.
            link.treated = true;
            link.addEventListener('click', this.linkClicked.bind(this, element, link));
        }, {
            capture: true // Use capture to fix this listener not called if the element clicked is too deep in the DOM.
        });
    }

    /**
     * A link inside a frame was clicked.
     *
     * @param element Frame element.
     * @param link Link clicked.
     * @param event Click event.
     */
    protected linkClicked(element: HTMLFrameElement | HTMLObjectElement, link: HTMLAnchorElement, event: Event): void {
        if (event.defaultPrevented) {
            // Event already prevented by some other code.
            return;
        }

        const scheme = this.urlUtils.getUrlScheme(link.href);
        if (!link.href || (scheme && scheme == 'javascript')) {
            // Links with no URL and Javascript links are ignored.
            return;
        }

        if (scheme && scheme != 'file' && scheme != 'filesystem') {
            // Scheme suggests it's an external resource.
            event.preventDefault();

            const frameSrc = (<HTMLFrameElement> element).src || (<HTMLObjectElement> element).data,
                frameScheme = this.urlUtils.getUrlScheme(frameSrc);

            // If the frame is not local, check the target to identify how to treat the link.
            if (frameScheme && frameScheme != 'file' && frameScheme != 'filesystem' &&
                    (!link.target || link.target == '_self')) {
                // Load the link inside the frame itself.
                if (element.tagName.toLowerCase() == 'object') {
                    element.setAttribute('data', link.href);
                } else {
                    element.setAttribute('src', link.href);
                }

                return;
            }

            // The frame is local or the link needs to be opened in a new window. Open in browser.
            if (!this.sitesProvider.isLoggedIn()) {
                this.utils.openInBrowser(link.href);
            } else {
                this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(link.href);
            }
        } else if (link.target == '_parent' || link.target == '_top' || link.target == '_blank') {
            // Opening links with _parent, _top or _blank can break the app. We'll open it in InAppBrowser.
            event.preventDefault();
            this.utils.openFile(link.href).catch((error) => {
                this.domUtils.showErrorModal(error);
            });
        } else if (this.platform.is('ios') && (!link.target || link.target == '_self')) {
            // In cordova ios 4.1.0 links inside iframes stopped working. We'll manually treat them.
            event.preventDefault();
            if (element.tagName.toLowerCase() == 'object') {
                element.setAttribute('data', link.href);
            } else {
                element.setAttribute('src', link.href);
            }
        }
    }
}

/**
 * Subtype of HTMLAnchorElement, with some calculated data.
 */
type CoreIframeHTMLAnchorElement = HTMLAnchorElement & {
    treated?: boolean; // Whether the element has been treated already.
};
