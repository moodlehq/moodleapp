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

import { Directive, Input, OnInit, ElementRef, SecurityContext } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';

import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@static/url';
import { CoreOpener } from '@static/opener';
import { DATA_APP_OPEN_IN, DATA_APP_OPEN_IN_LEGACY, CoreConstants, CoreLinkOpenMethod } from '@/core/constants';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { DomSanitizer } from '@singletons';
import { CoreFilepool } from '@services/filepool';
import { CoreDom } from '@static/dom';
import { toBoolean } from '../transforms/boolean';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreSite } from '@classes/sites/site';

/**
 * Directive to open a link in external browser or in the app.
 */
@Directive({
    selector: '[core-link]',
    host: {
        href: 'href', // Make sure href is in the DOM for a11y.
    },
})
export class CoreLinkDirective implements OnInit {

    @Input() href?: string | SafeUrl; // Link URL.
    @Input({ transform: toBoolean }) capture = false; // If the link needs to be captured by the app.
    /**
     * If set, force the open method. If not set, it will be determined based on forceOpenLinksIn config and data attribute.
     */
    @Input() openIn?: Exclude<CoreLinkOpenMethod, CoreLinkOpenMethod.APP>;
    /**
     * True to force open in embedded browser, false to force open in system browser, undefined to determine it based on
     * forceOpenLinksIn setting and data-app-open-in attribute.
     *
     * @deprecated since 5.2. Use openIn instead.
     */
    @Input({ transform: toBoolean }) inApp?: boolean;
    @Input({ transform: toBoolean }) autoLogin = true; // Whether to try to use auto-login.
    @Input({ transform: toBoolean }) showBrowserWarning = true; // Whether to show a warning before opening browser.

    protected element: HTMLElement | HTMLIonFabButtonElement | HTMLIonButtonElement | HTMLIonItemElement;

    constructor(
        // eslint-disable-next-line @angular-eslint/prefer-inject
        element: ElementRef,
    ) {
        this.element = element.nativeElement;  // This is done that way to let format text create a directive.
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        let hasNativeButton = false;
        if ('componentOnReady' in this.element) {
            await this.element.componentOnReady();

            // Native buttons may be already accessible and does not neet to set TabIndex and role.
            hasNativeButton = !!this.element.shadowRoot?.querySelector('.button-native');
        }

        CoreDom.initializeClickableElementA11y(this.element, (event) => this.performAction(event), !hasNativeButton);
    }

    /**
     * Perform "click" action.
     *
     * @param event Event.
     * @returns Resolved when done.
     */
    protected async performAction(event: Event): Promise<void> {
        if (event.defaultPrevented) {
            return; // Link already treated, stop.
        }

        let href: string | null = null;
        if (this.href) {
            // Convert the URL back to string if needed.
            href = typeof this.href === 'string' ? this.href : DomSanitizer.sanitize(SecurityContext.URL, this.href);
        }

        href = href || this.element.getAttribute('href') || this.element.getAttribute('xlink:href');

        if (!href || CoreUrl.getUrlProtocol(href) === 'javascript') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const openIn = this.element.getAttribute(DATA_APP_OPEN_IN) || this.element.getAttribute(DATA_APP_OPEN_IN_LEGACY);

        if (this.capture) {
            const treated = await CoreContentLinksHelper.handleLink(CoreUrl.decodeURI(href), undefined, true, true);

            if (!treated) {
                this.navigate(href, openIn);
            }
        } else {
            this.navigate(href, openIn);
        }
    }

    /**
     * Convenience function to correctly navigate, open file or url in the browser.
     *
     * @param href HREF to be opened.
     * @param openIn Open in value coming from data attribute.
     * @returns Promise resolved when done.
     */
    protected async navigate(href: string, openIn?: string | null): Promise<void> {

        if (CoreUrl.isLocalFileUrl(href)) {
            return this.openLocalFile(href);
        }

        if (href.charAt(0) === '#') {
            // Look for id or name.
            href = href.substring(1);
            const container = this.element.closest<HTMLIonContentElement>('ion-content');
            if (container && href.length > 0) {
                CoreDom.scrollToElement(
                    container,
                    `#${href}, [name='${href}']`,
                );
            }

            return;
        }

        if (CoreCustomURLSchemes.isCustomURL(href)) {
            try {
                await CoreCustomURLSchemes.handleCustomURL(href);
            } catch (error) {
                CoreCustomURLSchemes.treatHandleCustomURLError(error, href, 'CoreLinkDirective');
            }

            return;
        }

        return this.openExternalLink(href, openIn);
    }

    /**
     * Open a local file.
     *
     * @param path Path to the file.
     * @returns Promise resolved when done.
     */
    protected async openLocalFile(path: string): Promise<void> {
        const filename = path.substring(path.lastIndexOf('/') + 1);

        if (!CoreFileHelper.isOpenableInApp({ filename })) {
            try {
                await CoreFileHelper.showConfirmOpenUnsupportedFile(false, { filename });
            } catch {
                return; // Cancelled, stop.
            }
        }

        try {
            await CoreOpener.openFile(path);
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Open an external link in the app or in browser.
     *
     * @param href HREF to be opened.
     * @param dataOpenIn Open in value coming from data attribute.
     * @returns Promise resolved when done.
     */
    protected async openExternalLink(href: string, dataOpenIn?: string | null): Promise<void> {

        const openLink = async (site?: CoreSite): Promise<void> => {
            // Priority order is: openIn input > forceOpenLinksIn setting > HTML data attribute.
            const openIn = this.openIn ??
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                (this.inApp ? CoreLinkOpenMethod.INAPPBROWSER : undefined) ??
                CoreConstants.CONFIG.forceOpenLinksIn ??
                dataOpenIn;

            if (openIn === CoreLinkOpenMethod.EMBEDDED) {
                await CoreViewer.openIframeViewer((this.element.textContent || this.element.innerText || '').trim(), href);
            } else if (openIn === CoreLinkOpenMethod.INAPPBROWSER || openIn === CoreLinkOpenMethod.APP) {
                // For backwards compatibility, consider APP as INAPPBROWSER. @deprecated since 5.2.
                if (this.autoLogin && site) {
                    await site.openInAppWithAutoLogin(href);
                } else {
                    CoreOpener.openInApp(href);
                }
            } else {
                if (this.autoLogin && site) {
                    await site.openInBrowserWithAutoLogin(href, undefined, { showBrowserWarning: this.showBrowserWarning });
                } else {
                    CoreOpener.openInBrowser(href, { showBrowserWarning: this.showBrowserWarning });
                }
            }
        };

        if (!CoreSites.isLoggedIn()) {
            await openLink();

            return;
        }

        const currentSite = CoreSites.getRequiredCurrentSite();

        // Make sure it's an absolute URL.
        href = CoreUrl.toAbsoluteURL(currentSite.getURL(), href);

        if (currentSite.isSitePluginFileUrl(href)) {
            // It's a site file. Check if it's being downloaded right now.
            const isDownloading = await CoreFilepool.isFileDownloadingByUrl(currentSite.getId(), href);

            if (isDownloading) {
                // Wait for the download to finish before opening the file to prevent downloading it twice.
                const modal = await CoreLoadings.show();

                try {
                    const path = await CoreFilepool.downloadUrl(currentSite.getId(), href);

                    return this.openLocalFile(path);
                } catch {
                    // Error downloading, just open the original URL.
                } finally {
                    modal.dismiss();
                }
            }
        }

        await openLink(currentSite);
    }

}
