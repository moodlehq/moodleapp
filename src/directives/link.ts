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

import { Directive, Input, OnInit, ElementRef, Optional } from '@angular/core';
import { NavController, Content } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreConfigConstants } from '../configconstants';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

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

    protected element: HTMLElement;

    constructor(element: ElementRef, private domUtils: CoreDomUtilsProvider, private utils: CoreUtilsProvider,
            private sitesProvider: CoreSitesProvider, private urlUtils: CoreUrlUtilsProvider,
            private contentLinksHelper: CoreContentLinksHelperProvider, @Optional() private navCtrl: NavController,
            @Optional() private content: Content, @Optional() private svComponent: CoreSplitViewComponent) {
        // This directive can be added dynamically. In that case, the first param is the anchor HTMLElement.
        this.element = element.nativeElement || element;
    }

    /**
     * Function executed when the component is initialized.
     */
    ngOnInit(): void {
        this.inApp = this.utils.isTrueOrOne(this.inApp);

        let navCtrl = this.navCtrl;

        if (this.svComponent && (!this.navCtrl || this.navCtrl === this.svComponent.getDetailsNav())) {
            // The link is in the right side of a split view. Always open them with the left side NavController.
            navCtrl = this.svComponent.getMasterNav();
        }

        this.element.addEventListener('click', (event) => {
            // If the event prevented default action, do nothing.
            if (!event.defaultPrevented) {
                const href = this.element.getAttribute('href');
                if (href) {
                    event.preventDefault();
                    event.stopPropagation();

                    if (this.utils.isTrueOrOne(this.capture)) {
                        this.contentLinksHelper.handleLink(href, undefined, navCtrl, true, true).then((treated) => {
                            if (!treated) {
                                this.navigate(href);
                            }
                        });
                    } else {
                        this.navigate(href);
                    }
                }
            }
        });
    }

    /**
     * Convenience function to correctly navigate, open file or url in the browser.
     *
     * @param {string} href HREF to be opened.
     */
    protected navigate(href: string): void {
        const contentLinksScheme = CoreConfigConstants.customurlscheme + '://link=';

        if (href.indexOf('cdvfile://') === 0 || href.indexOf('file://') === 0 || href.indexOf('filesystem:') === 0) {
            // We have a local file.
            this.utils.openFile(href).catch((error) => {
                this.domUtils.showErrorModal(error);
            });
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
        } else if (href.indexOf(contentLinksScheme) === 0) {
            // Link should be treated by Custom URL Scheme. Encode the right part, otherwise ':' is removed in iOS.
            href = contentLinksScheme + encodeURIComponent(href.replace(contentLinksScheme, ''));
            this.utils.openInBrowser(href);
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
                        this.sitesProvider.getCurrentSite().openInAppWithAutoLogin(href);
                    } else {
                        this.sitesProvider.getCurrentSite().openInBrowserWithAutoLogin(href);
                    }
                } else if (this.autoLogin == 'no') {
                    if (this.inApp) {
                        this.utils.openInApp(href);
                    } else {
                        this.utils.openInBrowser(href);
                    }
                } else {
                    if (this.inApp) {
                        this.sitesProvider.getCurrentSite().openInAppWithAutoLoginIfSameSite(href);
                    } else {
                        this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(href);
                    }
                }
            }
        }
    }
}
