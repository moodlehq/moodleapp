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

import { Directive, Input, OnInit, ElementRef, Optional } from '@angular/core';
import { NavController, Content } from 'ionic-angular';
import { CoreFileHelper } from '@providers/file-helper';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreConfigConstants } from '../configconstants';
import { CoreCustomURLSchemesProvider } from '@providers/urlschemes';

/**
 * Directive to open a link in external browser.
 */
@Directive({
    selector: '[core-link]'
})
export class CoreLinkDirective implements OnInit {
    @Input() capture?: boolean | string; // If the link needs to be captured by the app.
    @Input() inApp?: boolean | string; // True to open in embedded browser, false to open in system browser.
    @Input() autoLogin = 'check'; // If the link should be open with auto-login. Accepts the following values:
                                  //   "yes" -> Always auto-login.
                                  //   "no" -> Never auto-login.
                                  //   "check" -> Auto-login only if it points to the current site. Default value.

    protected element: Element;

    constructor(element: ElementRef,
            protected domUtils: CoreDomUtilsProvider,
            protected utils: CoreUtilsProvider,
            protected sitesProvider: CoreSitesProvider,
            protected urlUtils: CoreUrlUtilsProvider,
            protected contentLinksHelper: CoreContentLinksHelperProvider,
            @Optional() protected navCtrl: NavController,
            @Optional() protected content: Content,
            @Optional() protected svComponent: CoreSplitViewComponent,
            protected textUtils: CoreTextUtilsProvider,
            protected urlSchemesProvider: CoreCustomURLSchemesProvider) {

        this.element = element.nativeElement;
    }

    /**
     * Function executed when the component is initialized.
     */
    ngOnInit(): void {
        this.inApp = typeof this.inApp == 'undefined' ? this.inApp : this.utils.isTrueOrOne(this.inApp);

        let navCtrl = this.navCtrl;

        if (this.svComponent && (!this.navCtrl || this.navCtrl === this.svComponent.getDetailsNav())) {
            // The link is in the right side of a split view. Always open them with the left side NavController.
            navCtrl = this.svComponent.getMasterNav();
        }

        this.element.addEventListener('click', (event) => {
            // If the event prevented default action, do nothing.
            if (!event.defaultPrevented) {
                let href = this.element.getAttribute('href') || this.element.getAttribute('xlink:href');
                if (href && this.urlUtils.getUrlScheme(href) != 'javascript') {
                    event.preventDefault();
                    event.stopPropagation();

                    const openIn = this.element.getAttribute('data-open-in');

                    if (this.utils.isTrueOrOne(this.capture)) {
                        href = this.textUtils.decodeURI(href);
                        this.contentLinksHelper.handleLink(href, undefined, navCtrl, true, true).then((treated) => {
                            if (!treated) {
                                this.navigate(href, openIn);
                            }
                        });
                    } else {
                        this.navigate(href, openIn);
                    }
                }
            }
        });
    }

    /**
     * Convenience function to correctly navigate, open file or url in the browser.
     *
     * @param href HREF to be opened.
     * @param openIn Open In App value coming from data-open-in attribute.
     * @return Promise resolved when done.
     */
    protected async navigate(href: string, openIn: string): Promise<void> {

        if (this.urlUtils.isLocalFileUrl(href)) {
            // We have a local file.
            const filename = href.substr(href.lastIndexOf('/') + 1);

            if (!CoreFileHelper.instance.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.instance.showConfirmOpenUnsupportedFile();
                } catch (error) {
                    return; // Cancelled, stop.
                }
            }

            try {
                await this.utils.openFile(href);
            } catch (error) {
                this.domUtils.showErrorModal(error);
            }
        } else if (href.charAt(0) == '#') {
            href = href.substr(1);
            // In site links
            if (href.charAt(0) == '/') {
                // @todo: This cannot be achieved with push/pop navigation, location.go() doesn't update the state, only the URL.
                // In Ionic 4 the navigation will change, so maybe it can be done by then.
            } else {
                // Look for id or name.
                this.domUtils.scrollToElementBySelector(this.content, '#' + href + ', [name=\'' + href + '\']');
            }
        } else if (this.urlSchemesProvider.isCustomURL(href)) {
            try {
                await this.urlSchemesProvider.handleCustomURL(href);
            } catch (error) {
                this.urlSchemesProvider.treatHandleCustomURLError(error);
            }
        } else {

            // It's an external link, we will open with browser. Check if we need to auto-login.
            if (!this.sitesProvider.isLoggedIn()) {
                // Not logged in, cannot auto-login.
                if (this.inApp) {
                    this.utils.openInApp(href);
                } else {
                    this.utils.openInBrowser(href);
                }
            } else {
                // Check if URL does not have any protocol, so it's a relative URL.
                if (!this.urlUtils.isAbsoluteURL(href)) {
                    // Add the site URL at the begining.
                    if (href.charAt(0) == '/') {
                        href = this.sitesProvider.getCurrentSite().getURL() + href;
                    } else {
                        href = this.sitesProvider.getCurrentSite().getURL() + '/' + href;
                    }
                }

                if (this.autoLogin == 'yes') {
                    if (this.inApp) {
                        await this.sitesProvider.getCurrentSite().openInAppWithAutoLogin(href);
                    } else {
                        await this.sitesProvider.getCurrentSite().openInBrowserWithAutoLogin(href);
                    }
                } else if (this.autoLogin == 'no') {
                    if (this.inApp) {
                        this.utils.openInApp(href);
                    } else {
                        this.utils.openInBrowser(href);
                    }
                } else {
                    // Priority order is: core-link inApp attribute > forceOpenLinksIn setting > data-open-in HTML attribute.
                    let openInApp;
                    if (typeof this.inApp == 'undefined') {
                        if (CoreConfigConstants['forceOpenLinksIn'] == 'browser') {
                            openInApp = false;
                        } else if (CoreConfigConstants['forceOpenLinksIn'] == 'app' || openIn == 'app') {
                            openInApp = true;
                        }
                    } else {
                        openInApp = this.inApp;
                    }

                    if (openInApp) {
                        await this.sitesProvider.getCurrentSite().openInAppWithAutoLoginIfSameSite(href);
                    } else {
                        await this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(href);
                    }
                }
            }
        }
    }
}
