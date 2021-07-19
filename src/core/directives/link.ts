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
    /* Whether the link should be opened with auto-login. Accepts the following values:
       "yes" -> Always auto-login.
       "no" -> Never auto-login.
       "check" -> Auto-login only if it points to the current site. Default value. */
    @Input() autoLogin = 'check';

    protected element: Element;

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
        this.inApp = typeof this.inApp == 'undefined' ? this.inApp : CoreUtils.isTrueOrOne(this.inApp);

        if (this.element.tagName != 'BUTTON' && this.element.tagName != 'A') {
            this.element.setAttribute('tabindex', '0');
            this.element.setAttribute('role', 'button');
        }

        this.element.addEventListener('click', async (event) => {
            this.performAction(event);
        });

        this.element.addEventListener('keydown', (event: KeyboardEvent) => {
            if ((event.key == ' ' || event.key == 'Enter')) {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        this.element.addEventListener('keyup', (event: KeyboardEvent) => {
            if ((event.key == ' ' || event.key == 'Enter')) {
                this.performAction(event);
            }
        });
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
     * @return Promise resolved when done.
     */
    protected async navigate(href: string, openIn?: string | null): Promise<void> {

        if (CoreUrlUtils.isLocalFileUrl(href)) {
            return this.openLocalFile(href);
        }

        if (href.charAt(0) == '#') {
            // Look for id or name.
            href = href.substr(1);
            CoreDomUtils.scrollToElementBySelector(
                this.element.closest('ion-content'),
                this.content,
                `#${href}, [name='${href}']`,
            );

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
     * @return Promise resolved when done.
     */
    protected async openLocalFile(path: string): Promise<void> {
        const filename = path.substr(path.lastIndexOf('/') + 1);

        if (!CoreFileHelper.isOpenableInApp({ filename })) {
            try {
                await CoreFileHelper.showConfirmOpenUnsupportedFile();
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
     * @return Promise resolved when done.
     */
    protected async openExternalLink(href: string, openIn?: string | null): Promise<void> {
        // It's an external link, we will open with browser. Check if we need to auto-login.
        if (!CoreSites.isLoggedIn()) {
            // Not logged in, cannot auto-login.
            if (this.inApp) {
                CoreUtils.openInApp(href);
            } else {
                CoreUtils.openInBrowser(href);
            }

            return;
        }

        // Check if URL does not have any protocol, so it's a relative URL.
        if (!CoreUrlUtils.isAbsoluteURL(href)) {
            // Add the site URL at the begining.
            if (href.charAt(0) == '/') {
                href = CoreSites.getCurrentSite()!.getURL() + href;
            } else {
                href = CoreSites.getCurrentSite()!.getURL() + '/' + href;
            }
        }

        if (this.autoLogin == 'yes') {
            if (this.inApp) {
                await CoreSites.getCurrentSite()!.openInAppWithAutoLogin(href);
            } else {
                await CoreSites.getCurrentSite()!.openInBrowserWithAutoLogin(href);
            }
        } else if (this.autoLogin == 'no') {
            if (this.inApp) {
                CoreUtils.openInApp(href);
            } else {
                CoreUtils.openInBrowser(href);
            }
        } else {
            // Priority order is: core-link inApp attribute > forceOpenLinksIn setting > data-open-in HTML attribute.
            let openInApp = this.inApp;
            if (typeof this.inApp == 'undefined') {
                if (CoreConstants.CONFIG.forceOpenLinksIn == 'browser') {
                    openInApp = false;
                } else if (CoreConstants.CONFIG.forceOpenLinksIn == 'app' || openIn == 'app') {
                    openInApp = true;
                }
            }

            if (openInApp) {
                await CoreSites.getCurrentSite()!.openInAppWithAutoLoginIfSameSite(href);
            } else {
                await CoreSites.getCurrentSite()!.openInBrowserWithAutoLoginIfSameSite(href);
            }
        }
    }

}
