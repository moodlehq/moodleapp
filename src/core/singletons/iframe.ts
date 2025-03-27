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

import { WKUserScriptWindow } from 'cordova-plugin-wkuserscript';
import { WKWebViewCookiesWindow } from 'cordova-plugin-wkwebview-cookies';

import { CoreNetwork } from '@services/network';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CoreOpener } from '@singletons/opener';

import { NgZone, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreWindow } from '@singletons/window';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CorePath } from '@singletons/path';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { FrameElement } from '@classes/element-controllers/FrameElementController';
import { CoreMimetype } from '@singletons/mimetype';
import { CoreFilepool } from '@services/filepool';
import { CoreSite } from '@classes/sites/site';
import { CoreNative } from '@features/native/services/native';
import { CoreLoadings } from '@services/overlays/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreDom } from '@singletons/dom';

/**
 * "Utils" service with helper functions for iframes, embed and similar.
 */
export class CoreIframe {

    /**
     * List of tags that can contain an iframe.
     */
    static readonly FRAME_TAGS = ['iframe', 'object', 'embed'];

    protected static logger = CoreLogger.getInstance('CoreIframe');
    protected static waitAutoLoginDefer?: CorePromisedValue<void>;

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Check if a frame uses an online URL but the app is offline. If it does, the iframe is hidden and a warning is shown.
     *
     * @param element The frame to check (iframe, embed, ...).
     * @param isSubframe Whether it's a frame inside another frame.
     * @returns True if frame is online and the app is offline, false otherwise.
     */
    static checkOnlineFrameInOffline(element: CoreFrameElement, isSubframe?: boolean): boolean {
        const src = 'src' in element ? element.src : element.data;

        if (src && src != 'about:blank' && !CoreUrl.isLocalFileUrl(src) && !CoreNetwork.isOnline()) {
            if (element.classList.contains('core-iframe-offline-disabled')) {
                // Iframe already hidden, stop.
                return true;
            }

            // The frame has an online URL but the app is offline. Show a warning, or a link if the URL can be opened in the app.
            CoreIframe.addOfflineWarning(element, src, isSubframe);

            // If the network changes, check it again.
            const subscription = CoreNetwork.onConnectShouldBeStable().subscribe(() => {
                // Execute the callback in the Angular zone, so change detection doesn't stop working.
                NgZone.run(() => {
                    if (!CoreIframe.checkOnlineFrameInOffline(element, isSubframe)) {
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
            CoreDom.removeElement(element.parentElement, 'div.core-iframe-offline-warning');
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
     */
    protected static async addOfflineWarning(element: HTMLElement, src: string, isSubframe?: boolean): Promise<void> {
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
                `<p>${Translate.instant('core.networkerroriframemsg')}</p>`;

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
    static async getAutoLoginUrlForIframe(iframe: HTMLIFrameElement, url: string): Promise<string> {
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return url;
        }

        if (CoreIframe.waitAutoLoginDefer) {
            // Another iframe is already using auto-login. Wait for it to finish.
            await CoreIframe.waitAutoLoginDefer;

            // Return the original URL, we can't request a new auto-login.
            return url;
        }

        // First iframe requesting auto-login.
        CoreIframe.waitAutoLoginDefer = new CorePromisedValue();

        const finalUrl = await currentSite.getAutoLoginUrl(url, false);

        // Resolve the promise once the iframe is loaded, or after a certain time.
        const unblock = () => {
            if (!CoreIframe.waitAutoLoginDefer) {
                // Not blocked.
                return;
            }

            CoreIframe.waitAutoLoginDefer.resolve();
            delete CoreIframe.waitAutoLoginDefer;
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
    static getContentWindowAndDocument(element: CoreFrameElement): { window: Window | null; document: Document | null } {
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
    static handleIframeMessage(event: MessageEvent): void {
        if (!event.data || event.data.environment !== 'moodleapp' || event.data.context !== 'iframe') {
            return;
        }

        switch (event.data.action) {
            case 'window_open':
                CoreIframe.windowOpen(event.data.url, event.data.name);
                break;

            case 'link_clicked':
                CoreIframe.linkClicked(event.data.link);
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
    static redefineWindowOpen(
        element: CoreFrameElement,
        contentWindow: Window,
        contentDocument: Document,
    ): void {
        if (contentWindow) {
            // Intercept window.open.
            const originalWindowOpen = contentWindow.open;
            contentWindow.open = (url: string, name: string) => {
                if (name === '_self') {
                    // Link will be opened in the same frame, no need to treat it.
                    return originalWindowOpen(url, name);
                }

                CoreIframe.windowOpen(url, name, element);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return null as any;
            };
        }

        if (contentDocument.body) {
            // Search sub frames.
            CoreIframe.FRAME_TAGS.forEach((tag) => {
                const elements = Array.from(contentDocument.body.querySelectorAll(tag));
                elements.forEach((subElement: CoreFrameElement) => {
                    CoreIframe.treatFrame(subElement, true);
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
    static treatFrame(element: CoreFrameElement, isSubframe?: boolean): void {
        if (!element) {
            return;
        }

        element.classList.add('core-loading');

        const treatElement = (sendResizeEvent = false) => {

            CoreIframe.checkOnlineFrameInOffline(element, isSubframe);

            const { window, document } = CoreIframe.getContentWindowAndDocument(element);

            // Redefine window.open in this element and sub frames, it might have been loaded already.
            if (window && document) {
                CoreIframe.redefineWindowOpen(element, window, document);
            }

            // Treat links.
            if (document) {
                CoreIframe.treatFrameLinks(document);
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
     * @param contentDocument The document of the element contents.
     */
    static treatFrameLinks(contentDocument: Document): void {
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
            link.addEventListener('click', event => CoreIframe.linkClicked(link, event));
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
    protected static async windowOpen(url: string, name: string, element?: CoreFrameElement): Promise<void> {
        const scheme = CoreUrl.getUrlProtocol(url);
        if (!scheme) {
            // It's a relative URL, use the frame src to create the full URL.
            const src = element
                ? ('src' in element ? element.src : element.data)
                : null;
            if (src) {
                const dirAndFile = CoreFileUtils.getFileAndDirectoryFromPath(src);
                if (dirAndFile.directory) {
                    url = CorePath.concatenatePaths(dirAndFile.directory, url);
                } else {
                    CoreIframe.logger.warn('Cannot get iframe dir path to open relative url', url, element);

                    return;
                }
            } else {
                CoreIframe.logger.warn('Cannot get iframe src to open relative url', url, element);

                return;
            }
        }

        try {
            // It's an external link or a local file, check if it can be opened in the app.
            await CoreWindow.open(url, name);
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * A link inside a frame was clicked.
     *
     * @param link Link clicked, or data of the link clicked.
     * @param event Click event.
     * @returns Promise resolved when done.
     */
    protected static async linkClicked(
        link: CoreIframeHTMLAnchorElement | {href: string; target?: string; originalHref?: string},
        event?: Event,
    ): Promise<void> {
        if (event && event.defaultPrevented) {
            // Event already prevented by some other code.
            return;
        }

        if (!link.target || link.target === '_self') {
            // Link needs to be opened in the same iframe. This is already handled properly, we don't need to do anything else.
            // Links opened in the same iframe won't be captured by the app.
            return;
        }

        const urlParts = CoreUrl.parse(link.href);
        const originalHref = 'getAttribute' in link ? link.getAttribute('href') : link.originalHref;
        if (!link.href || !originalHref || originalHref === '#' || !urlParts || urlParts.protocol === 'javascript') {
            // Links with no URL and Javascript links are ignored.
            return;
        }

        try {
            event?.preventDefault();
            await CoreWindow.open(link.href, link.target);
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Inject code to the iframes because we cannot access the online ones.
     *
     * @param userScriptWindow Window.
     */
    static injectiOSScripts(userScriptWindow: WKUserScriptWindow): void {
        const wwwPath = CoreFile.getWWWAbsolutePath();
        const linksPath = CorePath.concatenatePaths(wwwPath, 'assets/js/iframe-treat-links.js').replace(/%20/g, ' ');

        userScriptWindow.WKUserScript?.addScript({ id: 'CoreIframeUtilsLinksScript', file: linksPath });

        // Handle post messages received by iframes.
        window.addEventListener('message', (event) => CoreIframe.handleIframeMessage(event));
    }

    /**
     * Fix cookies for an iframe URL.
     *
     * @param url URL of the iframe.
     */
    static async fixIframeCookies(url: string): Promise<void> {
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
            CoreIframe.logger.error('Error setting cookie', err);
        }
    }

    /**
     * Check whether the help should be displayed in current OS.
     *
     * @returns Boolean.
     */
    static shouldDisplayHelp(): boolean {
        return CorePlatform.isIOS() && CorePlatform.getPlatformMajorVersion() >= 14;
    }

    /**
     * Check whether the help should be displayed for a certain iframe.
     *
     * @param url Iframe URL.
     * @returns Boolean.
     */
    static shouldDisplayHelpForUrl(url: string): boolean {
        return CoreIframe.shouldDisplayHelp() && !CoreUrl.isLocalFileUrl(url);
    }

    /**
     * Open help modal for iframes.
     */
    static openIframeHelpModal(): void {
        CoreAlerts.show({
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
    static frameShouldLaunchExternal(urlOrFrame: string | FrameElement): { launchExternal: boolean; label: string } {
        const url = typeof urlOrFrame === 'string' ?
            urlOrFrame :
            ('src' in urlOrFrame ? urlOrFrame.src : urlOrFrame.data);
        const frame = typeof urlOrFrame !== 'string' && urlOrFrame;

        const extension = url && CoreMimetype.guessExtensionFromUrl(url);
        const launchExternal = extension === 'pdf' || (frame && frame.getAttribute('data-open-external') === 'true');

        let label = '';
        if (launchExternal) {
            const mimetype = extension && CoreMimetype.getMimeType(extension);

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
     * @param options Options.
     */
    static async frameLaunchExternal(url: string, options: LaunchExternalOptions = {}): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            if (!CoreNetwork.isOnline()) {
                // User is offline, try to open a local copy of the file if present.
                const localUrl = options.site ?
                    await CorePromiseUtils.ignoreErrors(CoreFilepool.getInternalUrlByUrl(options.site.getId(), url)) :
                    undefined;

                if (localUrl) {
                    CoreOpener.openFile(localUrl);
                } else {
                    CoreAlerts.showError(Translate.instant('core.networkerrormsg'));
                }

                return;
            }

            const mimetype = await CorePromiseUtils.ignoreErrors(CoreMimetype.getMimeTypeFromUrl(url));

            if (!mimetype || mimetype === 'text/html' || mimetype === 'text/plain') {
                // It's probably a web page, open in browser.
                options.site ? options.site.openInBrowserWithAutoLogin(url) : CoreOpener.openInBrowser(url);

                return;
            }

            // Open the file using the online URL and try to download it in background for offline usage.
            if (options.site) {
                CoreFilepool.getUrlByUrl(options.site.getId(), url, options.component, options.componentId, 0, false);

                url = await options.site.checkAndFixPluginfileURL(url);
            }

            CoreOpener.openOnlineFile(url);

        } finally {
            modal.dismiss();
        }
    }

}

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

type CoreFrameElement = FrameElement & {
    window?: Window;
    getWindow?(): Window;
};
