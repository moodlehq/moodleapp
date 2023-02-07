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

import { Directive, Input, OnInit, ElementRef, Optional, SecurityContext } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { IonContent } from '@ionic/angular';

import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreConstants } from '@/core/constants';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { DomSanitizer } from '@singletons';
import { CoreFilepool } from '@services/filepool';
import { CoreUrl } from '@singletons/url';
import { CoreDom } from '@singletons/dom';

/**
 * Directive to open a link in external browser or in the app.
 */
@Directive({
    selector: '[core-link]',
})
export class CoreLinkDirective implements OnInit {

    @Input() href?: string | SafeUrl; // Link URL.
    @Input() capture?: boolean | string; // If the link needs to be captured by the app.
    @Input() inApp?: boolean | string; // True to open in embedded browser, false to open in system browser.
    @Input() autoLogin: boolean | string = true; // Whether to try to use auto-login. Values yes/no/check are deprecated.
    @Input() showBrowserWarning = true; // Whether to show a warning before opening browser. Defaults to true.

    protected element: HTMLElement;

    constructor(
        element: ElementRef,
        @Optional() protected content: IonContent,
    ) {
        this.element = element.nativeElement;
    }

    /**
     * Function executed when the component is initialized.
     */
    ngOnInit(): void {
        CoreDom.initializeClickableElementA11y(this.element, (event) => this.performAction(event));
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

        if (!href || CoreUrlUtils.getUrlScheme(href) == 'javascript') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const openIn = this.element.getAttribute('data-open-in');

        if (CoreUtils.isTrueOrOne(this.capture)) {
            href = CoreTextUtils.decodeURI(href);

            const treated = await CoreContentLinksHelper.handleLink(href, undefined, true, true);

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
     * @param openIn Open In App value coming from data-open-in attribute.
     * @returns Promise resolved when done.
     */
    protected async navigate(href: string, openIn?: string | null): Promise<void> {

        if (CoreUrlUtils.isLocalFileUrl(href)) {
            return this.openLocalFile(href);
        }

        if (href.charAt(0) === '#') {
            // Look for id or name.
            href = href.substring(1);
            const container = this.element.closest<HTMLIonContentElement>('ion-content');
            if (container) {
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
                CoreCustomURLSchemes.treatHandleCustomURLError(error);
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
            } catch (error) {
                return; // Cancelled, stop.
            }
        }

        try {
            await CoreUtils.openFile(path);
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        }
    }

    /**
     * Open an external link in the app or in browser.
     *
     * @param href HREF to be opened.
     * @param openIn Open In App value coming from data-open-in attribute.
     * @returns Promise resolved when done.
     */
    protected async openExternalLink(href: string, openIn?: string | null): Promise<void> {
        // Priority order is: core-link inApp attribute > forceOpenLinksIn setting > data-open-in HTML attribute.
        const openInApp = this.inApp !== undefined ?
            CoreUtils.isTrueOrOne(this.inApp) :
            (CoreConstants.CONFIG.forceOpenLinksIn !== 'browser' &&
                (CoreConstants.CONFIG.forceOpenLinksIn === 'app' || openIn === 'app'));

        // Check if we need to auto-login.
        if (!CoreSites.isLoggedIn()) {
            // Not logged in, cannot auto-login.
            if (openInApp) {
                CoreUtils.openInApp(href);
            } else {
                CoreUtils.openInBrowser(href, { showBrowserWarning: this.showBrowserWarning });
            }

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
                const modal = await CoreDomUtils.showModalLoading();

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

        const autoLogin = typeof this.autoLogin === 'boolean' ?
            this.autoLogin :
            !CoreUtils.isFalseOrZero(this.autoLogin) && this.autoLogin !== 'no'; // Support deprecated values yes/no/check.

        if (autoLogin) {
            if (openInApp) {
                await currentSite.openInAppWithAutoLogin(href);
            } else {
                await currentSite.openInBrowserWithAutoLogin(href, undefined, { showBrowserWarning: this.showBrowserWarning });
            }
        } else {
            if (openInApp) {
                CoreUtils.openInApp(href);
            } else {
                CoreUtils.openInBrowser(href, { showBrowserWarning: this.showBrowserWarning });
            }
        }
    }

}
