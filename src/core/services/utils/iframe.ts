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

import { Injectable } from '@angular/core';
import { WKUserScriptWindow } from 'cordova-plugin-wkuserscript';
import { WKWebViewCookiesWindow } from 'cordova-plugin-wkwebview-cookies';

import { CoreNetwork } from '@services/network';
import { CoreFile } from '@services/file';
import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@services/utils/utils';

import { makeSingleton, NgZone, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreWindow } from '@singletons/window';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CorePath } from '@singletons/path';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { FrameElement } from '@classes/element-controllers/FrameElementController';
import { CoreMimetypeUtils } from './mimetype';
import { CoreFilepool } from '@services/filepool';
import { CoreSite } from '@classes/sites/site';
import { CoreNative } from '@features/native/services/native';
import { CoreLoadings } from '@services/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';

type CoreFrameElement = FrameElement & {
    window?: Window;
    getWindow?(): Window;
};

/*
 * "Utils" service with helper functions for iframes, embed and similar.
 */
@Injectable({ providedIn: 'root' })
export class CoreIframeUtilsProvider {

    static readonly FRAME_TAGS = ['iframe', 'object', 'embed'];

    protected logger: CoreLogger;
    protected waitAutoLoginDefer?: CorePromisedValue<void>;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreIframeUtilsProvider');
    }

    /**
     * Check if a frame uses an online URL but the app is offline. If it does, the iframe is hidden and a warning is shown.
     *
     * @param element The frame to check (iframe, embed, ...).
     * @param isSubframe Whether it's a frame inside another frame.
     * @returns True if frame is online and the app is offline, false otherwise.
     */
    checkOnlineFrameInOffline(element: CoreFrameElement, isSubframe?: boolean): boolean {
        const src = 'src' in element ? element.src : element.data;

        if (src && src != 'about:blank' && !CoreUrl.isLocalFileUrl(src) && !CoreNetwork.isOnline()) {
            if (element.classList.contains('core-iframe-offline-disabled')) {
                // Iframe already hidden, stop.
                return true;
            }

            // The frame has an online URL but the app is offline. Show a warning, or a link if the URL can be opened in the app.
            this.addOfflineWarning(element, src, isSubframe);

            // If the network changes, check it again.
            const subscription = CoreNetwork.onConnectShouldBeStable().subscribe(() => {
                // Execute the callback in the Angular zone, so change detection doesn't stop working.
                NgZone.run(() => {
                    if (!this.checkOnlineFrameInOffline(element, isSubframe)) {
                        // Now the app is online, no need to check connection again.
                        subscription.unsubscribe();
                    }
                });
            });

            return true;
        } else if (element.classList.contains('core-iframe-offline-disabled') && element.parentElement) {
            // Reload the frame.
            if ('src' in element) {
                // eslint-disable-next-line no-self-assign
                element.src = element.src;

            } else {
                // eslint-disable-next-line no-self-assign
                element.data = element.data;
            }

            // Remove the warning and show the iframe
            CoreDomUtils.removeElement(element.parentElement, 'div.core-iframe-offline-warning');
            element.classList.remove('core-iframe-offline-disabled');

            if (isSubframe) {
                element.style.display = '';
            }
        }

        return false;
    }

    /**
     * Add an offline warning message.
     *
     * @param element The frame to check (iframe, embed, ...).
     * @param src Frame src.
     * @param isSubframe Whether it's a frame inside another frame.
     * @returns Promise resolved when done.
     */
    protected async addOfflineWarning(element: HTMLElement, src: string, isSubframe?: boolean): Promise<void> {
        const site = CoreSites.getCurrentSite();
        const username = site ? site.getInfo()?.username : undefined;

        const div = document.createElement('div');
        div.classList.add('core-iframe-offline-warning', 'ion-padding', 'ion-text-center');

        // Add a class to specify that the iframe is hidden.
        element.classList.add('core-iframe-offline-disabled');
        if (isSubframe) {
            // We cannot apply CSS styles in subframes, just hide the iframe.
            element.style.display = 'none';
        }

        const canHandleLink = await CoreContentLinksHelper.canHandleLink(src, undefined, username);

        if (!canHandleLink) {
            div.innerHTML = (isSubframe ? '' : '<div class="core-iframe-network-error"></div>') +
                '<p>' + Translate.instant('core.networkerroriframemsg') + '</p>';

            element.parentElement?.insertBefore(div, element);

            return;
        }

        let link: HTMLElement | undefined;

        if (isSubframe) {
            // Ionic styles are not available in subframes, adding some minimal inline styles.
            link = document.createElement('a');
            link.style.display = 'block';
            link.style.padding = '1em';
            link.style.fontWeight = '500';
            link.style.textAlign = 'center';
            link.style.textTransform = 'uppercase';
            link.style.cursor = 'pointer';
        } else {
            link = document.createElement('ion-button');
            link.setAttribute('expand', 'block');
            link.setAttribute('size', 'default');
            link.classList.add(
                'button',
                'button-block',
                'button-default',
                'button-solid',
                'ion-activatable',
                'ion-focusable',
            );
        }

        link.innerHTML = Translate.instant('core.viewembeddedcontent');

        link.onclick = (event: Event): void => {
            CoreContentLinksHelper.handleLink(src, username);
            event.preventDefault();
        };

        div.appendChild(link);

        element.parentElement?.insertBefore(div, element);
    }

    /**
     * Get auto-login URL for an iframe.
     *
     * @param iframe Iframe element.
     * @param url Original URL.
     * @returns Promise resolved with the URL.
     */
    async getAutoLoginUrlForIframe(iframe: HTMLIFrameElement, url: string): Promise<string> {
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return url;
        }

        if (this.waitAutoLoginDefer) {
            // Another iframe is already using auto-login. Wait for it to finish.
            await this.waitAutoLoginDefer;

            // Return the original URL, we can't request a new auto-login.
            return url;
        }

        // First iframe requesting auto-login.
        this.waitAutoLoginDefer = new CorePromisedValue();

        const finalUrl = await currentSite.getAutoLoginUrl(url, false);

        // Resolve the promise once the iframe is loaded, or after a certain time.
        const unblock = () => {
            if (!this.waitAutoLoginDefer) {
                // Not blocked.
                return;
            }

            this.waitAutoLoginDefer.resolve();
            delete this.waitAutoLoginDefer;
        };

        iframe.addEventListener('load', () => unblock());
        setTimeout(() => unblock(), 15000);

        return finalUrl;
    }

    /**
     * Given an element, return the content window and document.
     * Please notice that the element should be an iframe, embed or similar.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @returns Window and Document.
     */
    getContentWindowAndDocument(element: CoreFrameElement): { window: Window | null; document: Document | null } {
        const src = 'src' in element ? element.src : element.data;
        if (src !== 'about:blank' && !CoreUrl.isLocalFileUrl(src)) {
            // No permissions to access the iframe.
            return { window: null, document: null };
        }

        let contentWindow: Window | null = 'contentWindow' in element ? element.contentWindow : null;
        let contentDocument: Document | null = null;

        try {
            contentDocument = 'contentDocument' in element && element.contentDocument
                ? element.contentDocument
                : contentWindow && contentWindow.document;
        } catch {
            // Ignore errors.
        }

        if (!contentWindow && contentDocument) {
            // It's probably an <object>. Try to get the window.
            contentWindow = contentDocument.defaultView;
        }

        if (!contentWindow && 'getSVGDocument' in element) {
            // It's probably an <embed>. Try to get the window and the document.
            try {
                contentDocument = element.getSVGDocument();
            } catch {
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
        }
    }

    /**
     * Redefine the open method in the contentWindow of an element and the sub frames.
     * Please notice that the element should be an iframe, embed or similar.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @param contentWindow The window of the element contents.
     * @param contentDocument The document of the element contents.
     */
    redefineWindowOpen(
        element: CoreFrameElement,
        contentWindow: Window,
        contentDocument: Document,
    ): void {
        if (contentWindow) {
            // Intercept window.open.
            contentWindow.open = (url: string, name: string) => {
                this.windowOpen(url, name, element);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return null as any;
            };
        }

        if (contentDocument.body) {
            // Search sub frames.
            CoreIframeUtilsProvider.FRAME_TAGS.forEach((tag) => {
                const elements = Array.from(contentDocument.body.querySelectorAll(tag));
                elements.forEach((subElement: CoreFrameElement) => {
                    this.treatFrame(subElement, true);
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
     */
    treatFrame(element: CoreFrameElement, isSubframe?: boolean): void {
        if (!element) {
            return;
        }

        element.classList.add('core-loading');

        const treatElement = (sendResizeEvent = false) => {

            this.checkOnlineFrameInOffline(element, isSubframe);

            const { window, document } = this.getContentWindowAndDocument(element);

            // Redefine window.open in this element and sub frames, it might have been loaded already.
            if (window && document) {
                this.redefineWindowOpen(element, window, document);
            }

            // Treat links.
            if (document) {
                this.treatFrameLinks(element, document);
            }

            // Iframe content has been loaded.
            // Send a resize events to the iframe so it calculates the right size if needed.
            if (sendResizeEvent) {
                element.classList.remove('core-loading');

                if (window) {
                    setTimeout(() => window.dispatchEvent && window.dispatchEvent(new Event('resize')), 1000);
                }
            }
        };

        treatElement();

        // Element loaded, redefine window.open and treat links again.
        element.addEventListener('load', () => treatElement(true));
    }

    /**
     * Search links (<a>) in a frame and open them in browser or InAppBrowser if needed.
     * Only links that haven't been treated by the frame's Javascript will be treated.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @param contentDocument The document of the element contents.
     */
    treatFrameLinks(element: CoreFrameElement, contentDocument: Document): void {
        if (!contentDocument) {
            return;
        }

        contentDocument.addEventListener('click', (event) => {
            if (event.defaultPrevented) {
                // Event already prevented by some other code.
                return;
            }

            // Find the link being clicked.
            let el: Element | null = event.target as Element;
            while (el && el.tagName !== 'A' && el.tagName !== 'a') {
                el = el.parentElement;
            }

            const link = <CoreIframeHTMLAnchorElement> el;
            if (!link || link.treated) {
                return;
            }

            // Add click listener to the link, this way if the iframe has added a listener to the link it will be executed first.
            link.treated = true;
            link.addEventListener('click', event => this.linkClicked(link, element, event));
        }, {
            capture: true, // Use capture to fix this listener not called if the element clicked is too deep in the DOM.
        });
    }

    /**
     * Handle a window.open called by a frame.
     *
     * @param url URL passed to window.open.
     * @param name Name passed to window.open.
     * @param element HTML element of the frame.
     * @returns Promise resolved when done.
     */
    protected async windowOpen(url: string, name: string, element?: CoreFrameElement): Promise<void> {
        const scheme = CoreUrl.getUrlProtocol(url);
        if (!scheme) {
            // It's a relative URL, use the frame src to create the full URL.
            const src = element
                ? ('src' in element ? element.src : element.data)
                : null;
            if (src) {
                const dirAndFile = CoreFile.getFileAndDirectoryFromPath(src);
                if (dirAndFile.directory) {
                    url = CorePath.concatenatePaths(dirAndFile.directory, url);
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
        } else {
            try {
                // It's an external link or a local file, check if it can be opened in the app.
                await CoreWindow.open(url, name);
            } catch (error) {
                CoreDomUtils.showErrorModal(error);
            }
        }
    }

    /**
     * A link inside a frame was clicked.
     *
     * @param link Link clicked, or data of the link clicked.
     * @param element Frame element.
     * @param event Click event.
     * @returns Promise resolved when done.
     */
    protected async linkClicked(
        link: CoreIframeHTMLAnchorElement | {href: string; target?: string; originalHref?: string},
        element?: CoreFrameElement,
        event?: Event,
    ): Promise<void> {
        if (event && event.defaultPrevented) {
            // Event already prevented by some other code.
            return;
        }

        const urlParts = CoreUrl.parse(link.href);
        const originalHref = 'getAttribute' in link ? link.getAttribute('href') : link.originalHref;
        if (!link.href || !originalHref || originalHref == '#' || !urlParts || urlParts.protocol === 'javascript') {
            // Links with no URL and Javascript links are ignored.
            return;
        }

        if (urlParts.protocol && !CoreUrl.isLocalFileUrlScheme(urlParts.protocol, urlParts.domain || '')) {
            // Scheme suggests it's an external resource.
            event && event.preventDefault();

            const frameSrc = element && ((<HTMLIFrameElement> element).src || (<HTMLObjectElement> element).data);

            // If the frame is not local, check the target to identify how to treat the link.
            if (
                element &&
                frameSrc &&
                !CoreUrl.isLocalFileUrl(frameSrc) &&
                (!link.target || link.target == '_self')
            ) {
                // Load the link inside the frame itself.
                if (element.tagName.toLowerCase() == 'object') {
                    element.setAttribute('data', link.href);
                } else {
                    element.setAttribute('src', link.href);
                }

                return;
            }

            // The frame is local or the link needs to be opened in a new window. Open in browser.
            if (!CoreSites.isLoggedIn()) {
                CoreUtils.openInBrowser(link.href);
            } else {
                await CoreSites.getCurrentSite()?.openInBrowserWithAutoLogin(link.href);
            }
        } else if (link.target == '_parent' || link.target == '_top' || link.target == '_blank') {
            // Opening links with _parent, _top or _blank can break the app. We'll open it in InAppBrowser.
            event && event.preventDefault();

            const filename = link.href.substring(link.href.lastIndexOf('/') + 1);

            if (!CoreFileHelper.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.showConfirmOpenUnsupportedFile(false, { filename });
                } catch (error) {
                    return; // Cancelled, stop.
                }
            }

            try {
                await CoreUtils.openFile(link.href);
            } catch (error) {
                CoreDomUtils.showErrorModal(error);
            }
        } else if (CorePlatform.isIOS() && (!link.target || link.target == '_self') && element) {
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
     * Inject code to the iframes because we cannot access the online ones.
     *
     * @param userScriptWindow Window.
     */
    injectiOSScripts(userScriptWindow: WKUserScriptWindow): void {
        const wwwPath = CoreFile.getWWWAbsolutePath();
        const linksPath = CorePath.concatenatePaths(wwwPath, 'assets/js/iframe-treat-links.js').replace(/%20/g, ' ');

        userScriptWindow.WKUserScript?.addScript({ id: 'CoreIframeUtilsLinksScript', file: linksPath });

        // Handle post messages received by iframes.
        window.addEventListener('message', (event) => this.handleIframeMessage(event));
    }

    /**
     * Fix cookies for an iframe URL.
     *
     * @param url URL of the iframe.
     * @returns Promise resolved when done.
     */
    async fixIframeCookies(url: string): Promise<void> {
        if (!CorePlatform.isIOS() || !url || CoreUrl.isLocalFileUrl(url)) {
            // No need to fix cookies.
            return;
        }

        // Save a "fake" cookie for the iframe's domain to fix a bug in WKWebView.
        try {
            const win = <WKWebViewCookiesWindow> window;
            const urlParts = CoreUrl.parse(url);

            if (urlParts?.domain && win.WKWebViewCookies) {
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

    /**
     * Check whether the help should be displayed in current OS.
     *
     * @returns Boolean.
     */
    shouldDisplayHelp(): boolean {
        return CorePlatform.isIOS() && CorePlatform.getPlatformMajorVersion() >= 14;
    }

    /**
     * Check whether the help should be displayed for a certain iframe.
     *
     * @param url Iframe URL.
     * @returns Boolean.
     */
    shouldDisplayHelpForUrl(url: string): boolean {
        return this.shouldDisplayHelp() && !CoreUrl.isLocalFileUrl(url);
    }

    /**
     * Open help modal for iframes.
     */
    openIframeHelpModal(): void {
        CoreDomUtils.showAlertWithOptions({
            header: Translate.instant('core.settings.ioscookies'),
            message: Translate.instant('core.ioscookieshelp'),
            buttons: [
                {
                    text: Translate.instant('core.cancel'),
                    role: 'cancel',
                },
                {
                    text: Translate.instant('core.opensettings'),
                    handler: (): void => {
                        CoreNative.plugin('diagnostic')?.switchToSettings();
                    },
                },
            ],
        });
    }

    /**
     * Check if a frame content should be opened with an external app (PDF reader, browser, etc.).
     *
     * @param urlOrFrame Either a URL of a frame, or the frame to check.
     * @returns Whether it should be opened with an external app, and the label for the action to launch in external.
     */
    frameShouldLaunchExternal(urlOrFrame: string | FrameElement): { launchExternal: boolean; label: string } {
        const url = typeof urlOrFrame === 'string' ?
            urlOrFrame :
            ('src' in urlOrFrame ? urlOrFrame.src : urlOrFrame.data);
        const frame = typeof urlOrFrame !== 'string' && urlOrFrame;

        const extension = url && CoreMimetypeUtils.guessExtensionFromUrl(url);
        const launchExternal = extension === 'pdf' || (frame && frame.getAttribute('data-open-external') === 'true');

        let label = '';
        if (launchExternal) {
            const mimetype = extension && CoreMimetypeUtils.getMimeType(extension);

            label = mimetype && mimetype !== 'text/html' && mimetype !== 'text/plain' ?
                Translate.instant('core.openfilewithextension', { extension: extension.toUpperCase() }) :
                Translate.instant('core.openinbrowser');
        }

        return {
            launchExternal,
            label,
        };
    }

    /**
     * Launch a frame content in an external app.
     *
     * @param url Frame URL.
     * @param options Options
     */
    async frameLaunchExternal(url: string, options: LaunchExternalOptions = {}): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            if (!CoreNetwork.isOnline()) {
                // User is offline, try to open a local copy of the file if present.
                const localUrl = options.site ?
                    await CorePromiseUtils.ignoreErrors(CoreFilepool.getInternalUrlByUrl(options.site.getId(), url)) :
                    undefined;

                if (localUrl) {
                    CoreUtils.openFile(localUrl);
                } else {
                    CoreDomUtils.showErrorModal('core.networkerrormsg', true);
                }

                return;
            }

            const mimetype = await CorePromiseUtils.ignoreErrors(CoreUtils.getMimeTypeFromUrl(url));

            if (!mimetype || mimetype === 'text/html' || mimetype === 'text/plain') {
                // It's probably a web page, open in browser.
                options.site ? options.site.openInBrowserWithAutoLogin(url) : CoreUtils.openInBrowser(url);

                return;
            }

            // Open the file using the online URL and try to download it in background for offline usage.
            if (options.site) {
                CoreFilepool.getUrlByUrl(options.site.getId(), url, options.component, options.componentId, 0, false);

                url = await options.site.checkAndFixPluginfileURL(url);
            }

            CoreUtils.openOnlineFile(url);

        } finally {
            modal.dismiss();
        }
    }

}

export const CoreIframeUtils = makeSingleton(CoreIframeUtilsProvider);

/**
 * Subtype of HTMLAnchorElement, with some calculated data.
 */
type CoreIframeHTMLAnchorElement = HTMLAnchorElement & {
    treated?: boolean; // Whether the element has been treated already.
};

/**
 * Options to pass to frameLaunchExternal.
 */
type LaunchExternalOptions = {
    site?: CoreSite; // Site the frame belongs to.
    component?: string; // Component to download the file if needed.
    componentId?: string | number; // Component ID to use in conjunction with the component.
};
