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
import { CoreApp, CoreAppProvider } from '../app';
import { CoreFileProvider } from '../file';
import { CoreFileHelper } from '../file-helper';
import { CoreLoggerProvider } from '../logger';
import { CoreSitesProvider } from '../sites';
import { CoreDomUtilsProvider } from './dom';
import { CoreTextUtilsProvider } from './text';
import { CoreUrlUtilsProvider } from './url';
import { CoreUtilsProvider } from './utils';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { makeSingleton } from '@singletons/core.singletons';
import { CoreUrl } from '@singletons/url';
import { CoreWindow } from '@singletons/window';
import { WKUserScriptWindow } from 'cordova-plugin-wkuserscript';
import { WKWebViewCookiesWindow } from 'cordova-plugin-wkwebview-cookies';

/*
 * "Utils" service with helper functions for iframes, embed and similar.
 */
@Injectable()
export class CoreIframeUtilsProvider {
    static FRAME_TAGS = ['iframe', 'frame', 'object', 'embed'];

    protected logger;

    constructor(logger: CoreLoggerProvider,
            private fileProvider: CoreFileProvider,
            private sitesProvider: CoreSitesProvider,
            private urlUtils: CoreUrlUtilsProvider,
            private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider,
            private domUtils: CoreDomUtilsProvider,
            platform: Platform,
            appProvider: CoreAppProvider,
            private translate: TranslateService,
            private network: Network, private zone: NgZone,
            private config: Config,
            private contentLinksHelper: CoreContentLinksHelperProvider
            ) {
        this.logger = logger.getInstance('CoreUtilsProvider');

        const win = <WKUserScriptWindow> window;

        if (appProvider.isIOS() && win.WKUserScript) {
            platform.ready().then(() => {
                // Inject code to the iframes because we cannot access the online ones.
                const wwwPath = fileProvider.getWWWAbsolutePath();
                const linksPath = textUtils.concatenatePaths(wwwPath, 'assets/js/iframe-treat-links.js');
                const recaptchaPath = textUtils.concatenatePaths(wwwPath, 'assets/js/iframe-recaptcha.js');

                win.WKUserScript.addScript({id: 'CoreIframeUtilsLinksScript', file: linksPath});
                win.WKUserScript.addScript({
                    id: 'CoreIframeUtilsRecaptchaScript',
                    file: recaptchaPath,
                    injectionTime: win.WKUserScript.InjectionTime.END,
                });

                // Handle post messages received by iframes.
                window.addEventListener('message', this.handleIframeMessage.bind(this));
            });
        }
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

        if (src && src != 'about:blank' && !this.urlUtils.isLocalFileUrl(src) && !CoreApp.instance.isOnline()) {
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
     * Handle some iframe messages.
     *
     * @param event Message event.
     */
    handleIframeMessage(event: MessageEvent): void {
        if (!event.data || event.data.environment != 'moodleapp' || event.data.context != 'iframe') {
            return;
        }

        switch (event.data.action) {
            case 'window_open':
                this.windowOpen(event.data.url, event.data.name);
                break;

            case 'link_clicked':
                this.linkClicked(event.data.link);
                break;

            default:
                break;
        }
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
            contentWindow.open = (url: string, name: string): Window => {
                this.windowOpen(url, name, element, navCtrl);

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
            while (el && el.tagName !== 'A' && el.tagName !== 'a') {
                el = el.parentElement;
            }

            const link = <CoreIframeHTMLAnchorElement> el;
            if (!link || link.treated) {
                return;
            }

            // Add click listener to the link, this way if the iframe has added a listener to the link it will be executed first.
            link.treated = true;
            link.addEventListener('click', this.linkClicked.bind(this, link, element));
        }, {
            capture: true // Use capture to fix this listener not called if the element clicked is too deep in the DOM.
        });
    }

    /**
     * Handle a window.open called by a frame.
     *
     * @param url URL passed to window.open.
     * @param name Name passed to window.open.
     * @param element HTML element of the frame.
     * @param navCtrl NavController to use if a link can be opened in the app.
     * @return Promise resolved when done.
     */
    protected async windowOpen(url: string, name: string, element?: any, navCtrl?: NavController): Promise<void> {
        const scheme = this.urlUtils.getUrlScheme(url);
        if (!scheme) {
            // It's a relative URL, use the frame src to create the full URL.
            const src = element && (element.src || element.data);
            if (src) {
                const dirAndFile = this.fileProvider.getFileAndDirectoryFromPath(src);
                if (dirAndFile.directory) {
                    url = this.textUtils.concatenatePaths(dirAndFile.directory, url);
                } else {
                    this.logger.warn('Cannot get iframe dir path to open relative url', url, element);

                    return;
                }
            } else {
                this.logger.warn('Cannot get iframe src to open relative url', url, element);

                return;
            }
        }

        if (name == '_self') {
            // Link should be loaded in the same frame.
            if (!element) {
                this.logger.warn('Cannot load URL in iframe because the element was not supplied', url);

                return;
            }

            if (element.tagName.toLowerCase() == 'object') {
                element.setAttribute('data', url);
            } else {
                element.setAttribute('src', url);
            }
        } else if (this.urlUtils.isLocalFileUrl(url)) {
            // It's a local file.
            const filename = url.substr(url.lastIndexOf('/') + 1);

            if (!CoreFileHelper.instance.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.instance.showConfirmOpenUnsupportedFile();
                } catch (error) {
                    return; // Cancelled, stop.
                }
            }

            try {
                await this.utils.openFile(url);
            } catch (error) {
                this.domUtils.showErrorModal(error);
            }
        } else {
            // It's an external link, check if it can be opened in the app.
            await CoreWindow.open(url, name, {
                navCtrl,
            });
        }
    }

    /**
     * A link inside a frame was clicked.
     *
     * @param link Data of the link clicked.
     * @param element Frame element.
     * @param event Click event.
     * @return Promise resolved when done.
     */
    protected async linkClicked(link: {href: string, target?: string}, element?: HTMLFrameElement | HTMLObjectElement,
            event?: Event): Promise<void> {
        if (event && event.defaultPrevented) {
            // Event already prevented by some other code.
            return;
        }

        const urlParts = CoreUrl.parse(link.href);
        if (!link.href || (urlParts.protocol && urlParts.protocol == 'javascript')) {
            // Links with no URL and Javascript links are ignored.
            return;
        }

        if (!this.urlUtils.isLocalFileUrlScheme(urlParts.protocol, urlParts.domain)) {
            // Scheme suggests it's an external resource.
            event && event.preventDefault();

            const frameSrc = element && ((<HTMLFrameElement> element).src || (<HTMLObjectElement> element).data);

            // If the frame is not local, check the target to identify how to treat the link.
            if (element && !this.urlUtils.isLocalFileUrl(frameSrc) && (!link.target || link.target == '_self')) {
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
                await this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(link.href);
            }
        } else if (link.target == '_parent' || link.target == '_top' || link.target == '_blank') {
            // Opening links with _parent, _top or _blank can break the app. We'll open it in InAppBrowser.
            event && event.preventDefault();

            const filename = link.href.substr(link.href.lastIndexOf('/') + 1);

            if (!CoreFileHelper.instance.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.instance.showConfirmOpenUnsupportedFile();
                } catch (error) {
                    return; // Cancelled, stop.
                }
            }

            try {
                await this.utils.openFile(link.href);
            } catch (error) {
                this.domUtils.showErrorModal(error);
            }
        } else if (CoreApp.instance.isIOS() && (!link.target || link.target == '_self') && element) {
            // In cordova ios 4.1.0 links inside iframes stopped working. We'll manually treat them.
            event && event.preventDefault();
            if (element.tagName.toLowerCase() == 'object') {
                element.setAttribute('data', link.href);
            } else {
                element.setAttribute('src', link.href);
            }
        }
    }

    /**
     * Fix cookies for an iframe URL.
     *
     * @param url URL of the iframe.
     * @return Promise resolved when done.
     */
    async fixIframeCookies(url: string): Promise<void> {
        if (!CoreApp.instance.isIOS() || !url || this.urlUtils.isLocalFileUrl(url)) {
            // No need to fix cookies.
            return;
        }

        // Save a "fake" cookie for the iframe's domain to fix a bug in WKWebView.
        try {
            const win = <WKWebViewCookiesWindow> window;
            const urlParts = CoreUrl.parse(url);

            if (urlParts.domain) {
                await win.WKWebViewCookies.setCookie({
                    name: 'MoodleAppCookieForWKWebView',
                    value: '1',
                    domain: urlParts.domain,
                });
            }
        } catch (err) {
            // Ignore errors.
            this.logger.error('Error setting cookie', err);
        }
    }
}

export class CoreIframeUtils extends makeSingleton(CoreIframeUtilsProvider) {}

/**
 * Subtype of HTMLAnchorElement, with some calculated data.
 */
type CoreIframeHTMLAnchorElement = HTMLAnchorElement & {
    treated?: boolean; // Whether the element has been treated already.
};
