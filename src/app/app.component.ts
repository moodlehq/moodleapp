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

import { Component, OnInit, NgZone } from '@angular/core';
import { Platform, IonicApp } from 'ionic-angular';
import { Network } from '@ionic-native/network';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLangProvider } from '@providers/lang';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCustomURLSchemesProvider } from '@providers/urlschemes';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { Keyboard } from '@ionic-native/keyboard';
import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { CoreLoginSitesPage } from '@core/login/pages/sites/sites';

@Component({
    templateUrl: 'app.html'
})
export class MoodleMobileApp implements OnInit {
    // Use page name (string) because the page is lazy loaded (Ionic feature). That way we can load pages without importing them.
    // The downside is that each page needs to implement a ngModule.
    rootPage: any = 'CoreLoginInitPage';
    protected logger;
    protected lastUrls = {};
    protected lastInAppUrl: string;

    constructor(private platform: Platform, logger: CoreLoggerProvider, keyboard: Keyboard, private app: IonicApp,
            private eventsProvider: CoreEventsProvider, private loginHelper: CoreLoginHelperProvider, private zone: NgZone,
            private appProvider: CoreAppProvider, private langProvider: CoreLangProvider, private sitesProvider: CoreSitesProvider,
            private screenOrientation: ScreenOrientation, private urlSchemesProvider: CoreCustomURLSchemesProvider,
            private utils: CoreUtilsProvider, private urlUtils: CoreUrlUtilsProvider, private network: Network) {
        this.logger = logger.getInstance('AppComponent');

        platform.ready().then(() => {
            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.

            // Set StatusBar properties.
            this.appProvider.setStatusBarColor();

            keyboard.hideFormAccessoryBar(false);

            if (this.appProvider.isDesktop()) {
                app.setElementClass('platform-desktop', true);

                if (this.appProvider.isMac()) {
                    app.setElementClass('platform-mac', true);
                } else if (this.appProvider.isLinux()) {
                    app.setElementClass('platform-linux', true);
                } else if (this.appProvider.isWindows()) {
                    app.setElementClass('platform-windows', true);
                }
            }

            // Register back button action to allow closing modals before anything else.
            this.appProvider.registerBackButtonAction(() => {
                return this.closeModal();
            }, 2000);
        });

    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            // Go to sites page when user is logged out.
            // Due to DeepLinker, we need to use the ViewCtrl instead of name.
            // Otherwise some pages are re-created when they shouldn't.
            this.appProvider.getRootNavController().setRoot(CoreLoginSitesPage);

            // Unload lang custom strings.
            this.langProvider.clearCustomStrings();

            // Remove version classes from body.
            this.removeVersionClass();
        });

        // Listen for session expired events.
        this.eventsProvider.on(CoreEventsProvider.SESSION_EXPIRED, (data) => {
            this.loginHelper.sessionExpired(data);
        });

        // Listen for passwordchange and usernotfullysetup events to open InAppBrowser.
        this.eventsProvider.on(CoreEventsProvider.PASSWORD_CHANGE_FORCED, (data) => {
            this.loginHelper.passwordChangeForced(data.siteId);
        });
        this.eventsProvider.on(CoreEventsProvider.USER_NOT_FULLY_SETUP, (data) => {
            this.loginHelper.openInAppForEdit(data.siteId, '/user/edit.php', 'core.usernotfullysetup');
        });

        // Listen for sitepolicynotagreed event to accept the site policy.
        this.eventsProvider.on(CoreEventsProvider.SITE_POLICY_NOT_AGREED, (data) => {
            this.loginHelper.sitePolicyNotAgreed(data.siteId);
        });

        this.platform.ready().then(() => {
            // Refresh online status when changes.
            this.network.onchange().subscribe(() => {
                // Execute the callback in the Angular zone, so change detection doesn't stop working.
                this.zone.run(() => {
                    const isOnline = this.appProvider.isOnline(),
                        hadOfflineMessage = document.body.classList.contains('core-offline');

                    document.body.classList.toggle('core-offline', !isOnline);

                    if (isOnline && hadOfflineMessage) {
                        document.body.classList.add('core-online');

                        setTimeout(() => {
                            document.body.classList.remove('core-online');
                        }, 3000);
                    } else if (!isOnline) {
                        document.body.classList.remove('core-online');
                    }
                });
            });
        });

        // Check URLs loaded in any InAppBrowser.
        this.eventsProvider.on(CoreEventsProvider.IAB_LOAD_START, (event) => {
            // URLs with a custom scheme can be prefixed with "http://" or "https://", we need to remove this.
            const url = event.url.replace(/^https?:\/\//, '');

            if (this.urlSchemesProvider.isCustomURL(url)) {
                // Close the browser if it's a valid SSO URL.
                this.urlSchemesProvider.handleCustomURL(url);
                this.utils.closeInAppBrowser(false);

            } else if (this.platform.is('android')) {
                // Check if the URL has a custom URL scheme. In Android they need to be opened manually.
                const urlScheme = this.urlUtils.getUrlProtocol(url);
                if (urlScheme && urlScheme !== 'file' && urlScheme !== 'cdvfile') {
                    // Open in browser should launch the right app if found and do nothing if not found.
                    this.utils.openInBrowser(url);

                    // At this point the InAppBrowser is showing a "Webpage not available" error message.
                    // Try to navigate to last loaded URL so this error message isn't found.
                    if (this.lastInAppUrl) {
                        this.utils.openInApp(this.lastInAppUrl);
                    } else {
                        // No last URL loaded, close the InAppBrowser.
                        this.utils.closeInAppBrowser(false);
                    }
                } else {
                    this.lastInAppUrl = url;
                }
            }
        });

        // Check InAppBrowser closed.
        this.eventsProvider.on(CoreEventsProvider.IAB_EXIT, () => {
            this.loginHelper.waitingForBrowser = false;
            this.lastInAppUrl = '';
            this.loginHelper.checkLogout();
        });

        this.platform.resume.subscribe(() => {
            // Wait a second before setting it to false since in iOS there could be some frozen WS calls.
            setTimeout(() => {
                this.loginHelper.waitingForBrowser = false;
                this.loginHelper.checkLogout();
            }, 1000);
        });

        // Handle app launched with a certain URL (custom URL scheme).
        (<any> window).handleOpenURL = (url: string): void => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            this.zone.run(() => {
                // First check that the URL hasn't been treated a few seconds ago. Sometimes this function is called more than once.
                if (this.lastUrls[url] && Date.now() - this.lastUrls[url] < 3000) {
                    // Function called more than once, stop.
                    return;
                }

                this.logger.debug('App launched by URL ', url);

                this.lastUrls[url] = Date.now();

                this.eventsProvider.trigger(CoreEventsProvider.APP_LAUNCHED_URL, url);
                this.urlSchemesProvider.handleCustomURL(url);
            });
        };

        // Load custom lang strings. This cannot be done inside the lang provider because it causes circular dependencies.
        const loadCustomStrings = (): void => {
            const currentSite = this.sitesProvider.getCurrentSite(),
                customStrings = currentSite && currentSite.getStoredConfig('tool_mobile_customlangstrings');

            if (typeof customStrings != 'undefined') {
                this.langProvider.loadCustomStrings(customStrings);
            }
        };

        this.eventsProvider.on(CoreEventsProvider.LOGIN, (data) => {
            if (data.siteId) {
                this.sitesProvider.getSite(data.siteId).then((site) => {
                    const info = site.getInfo();
                    if (info) {
                        // Add version classes to body.
                        this.removeVersionClass();
                        this.addVersionClass(this.sitesProvider.getReleaseNumber(info.release || ''));
                    }
                });
            }

            loadCustomStrings();
        });

        this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, (data) => {
            if (data.siteId == this.sitesProvider.getCurrentSiteId()) {
                loadCustomStrings();

                // Add version classes to body.
                this.removeVersionClass();
                this.addVersionClass(this.sitesProvider.getReleaseNumber(data.release || ''));
            }
        });

        this.eventsProvider.on(CoreEventsProvider.SITE_ADDED, (data) => {
            if (data.siteId == this.sitesProvider.getCurrentSiteId()) {
                loadCustomStrings();

                // Add version classes to body.
                this.removeVersionClass();
                this.addVersionClass(this.sitesProvider.getReleaseNumber(data.release || ''));
            }
        });

        // Pause Youtube videos in Android when app is put in background or screen is locked.
        this.platform.pause.subscribe(() => {
            if (!this.platform.is('android')) {
                return;
            }

            const pauseVideos = (window: Window): void => {
                // Search videos in iframes recursively.
                for (let i = 0; i < window.length; i++) {
                    pauseVideos(window[i]);
                }

                if (window.location.hostname.match(/^www\.youtube(-nocookie)?\.com$/)) {
                    // Embedded Youtube video, pause it.
                    const videos = window.document.querySelectorAll('video');
                    for (let i = 0; i < videos.length; i++) {
                        videos[i].pause();
                    }
                }
            };

            pauseVideos(window);
        });

        // Detect orientation changes.
        this.screenOrientation.onChange().subscribe(
            () => {
                if (this.platform.is('ios')) {
                    // Force ios to recalculate safe areas when rotating.
                    // This can be erased when https://issues.apache.org/jira/browse/CB-13448 issue is solved or
                    // After switching to WkWebview.
                    const viewport = document.querySelector('meta[name=viewport]');
                    viewport.setAttribute('content', viewport.getAttribute('content').replace('viewport-fit=cover,', ''));

                    setTimeout(() => {
                        viewport.setAttribute('content', 'viewport-fit=cover,' + viewport.getAttribute('content'));
                    });
                }

                this.eventsProvider.trigger(CoreEventsProvider.ORIENTATION_CHANGE);
            }
        );
    }

    /**
     * Convenience function to add version to body classes.
     *
     * @param release Current release number of the site.
     */
    protected addVersionClass(release: string): void {
        const parts = release.split('.');

        parts[1] = parts[1] || '0';
        parts[2] = parts[2] || '0';

        document.body.classList.add('version-' + parts[0], 'version-' + parts[0] + '-' + parts[1],
            'version-' + parts[0] + '-' + parts[1] + '-' + parts[2]);

    }

    /**
     * Convenience function to remove all version classes form body.
     */
    protected removeVersionClass(): void {
        const remove = [];
        Array.from(document.body.classList).forEach((tempClass) => {
            if (tempClass.substring(0, 8) == 'version-') {
                remove.push(tempClass);
            }
        });

        remove.forEach((tempClass) => {
            document.body.classList.remove(tempClass);
        });
    }

    /**
     * Close one modal if any.
     *
     * @return True if one modal was present.
     */
    closeModal(): boolean {
        // Following function is hidden in Ionic Code, however there's no solution for that.
        const portal = this.app._getActivePortal();
        if (portal) {
            portal.pop();

            return true;
        }

        return false;
    }
}
