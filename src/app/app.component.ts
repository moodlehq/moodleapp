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

import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular';

import { CoreLang } from '@services/lang';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreEvents } from '@singletons/events';
import { Network, NgZone, Platform, SplashScreen } from '@singletons';
import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CoreSubscriptions } from '@singletons/subscriptions';
import { CoreWindow } from '@singletons/window';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { CoreUtils } from '@services/utils/utils';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreConstants } from '@/core/constants';

const MOODLE_VERSION_PREFIX = 'version-';
const MOODLEAPP_VERSION_PREFIX = 'moodleapp-';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {

    @ViewChild(IonRouterOutlet) outlet?: IonRouterOutlet;

    protected lastUrls: Record<string, number> = {};
    protected lastInAppUrl?: string;

    /**
     * Component being initialized.
     *
     * @todo Review all old code to see if something is missing:
     * - IAB events listening.
     * - Platform pause/resume subscriptions.
     * - handleOpenURL and openWindowSafely.
     * - Screen orientation events (probably it can be removed).
     * - Back button registering to close modal first.
     * - Note: HideKeyboardFormAccessoryBar has been moved to config.xml.
     */
    ngOnInit(): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = <any> window;
        document.body.classList.add('ionic5');
        this.addVersionClass(MOODLEAPP_VERSION_PREFIX, CoreConstants.CONFIG.versionname.replace('-dev', ''));

        CoreEvents.on(CoreEvents.LOGOUT, () => {
            // Go to sites page when user is logged out.
            CoreNavigator.navigate('/login/sites', { reset: true });

            // Unload lang custom strings.
            CoreLang.clearCustomStrings();

            // Remove version classes from body.
            this.removeVersionClass(MOODLE_VERSION_PREFIX);
        });

        // Listen for session expired events.
        CoreEvents.on(CoreEvents.SESSION_EXPIRED, (data) => {
            CoreLoginHelper.sessionExpired(data);
        });

        // Listen for passwordchange and usernotfullysetup events to open InAppBrowser.
        CoreEvents.on(CoreEvents.PASSWORD_CHANGE_FORCED, (data) => {
            CoreLoginHelper.passwordChangeForced(data.siteId!);
        });
        CoreEvents.on(CoreEvents.USER_NOT_FULLY_SETUP, (data) => {
            CoreLoginHelper.openInAppForEdit(data.siteId!, '/user/edit.php', 'core.usernotfullysetup');
        });

        // Listen for sitepolicynotagreed event to accept the site policy.
        CoreEvents.on(CoreEvents.SITE_POLICY_NOT_AGREED, (data) => {
            CoreLoginHelper.sitePolicyNotAgreed(data.siteId);
        });

        // Check URLs loaded in any InAppBrowser.
        CoreEvents.on(CoreEvents.IAB_LOAD_START, (event) => {
            // URLs with a custom scheme can be prefixed with "http://" or "https://", we need to remove this.
            const url = event.url.replace(/^https?:\/\//, '');

            if (CoreCustomURLSchemes.isCustomURL(url)) {
                // Close the browser if it's a valid SSO URL.
                CoreCustomURLSchemes.handleCustomURL(url).catch((error) => {
                    CoreCustomURLSchemes.treatHandleCustomURLError(error);
                });
                CoreUtils.closeInAppBrowser();

            } else if (CoreApp.instance.isAndroid()) {
                // Check if the URL has a custom URL scheme. In Android they need to be opened manually.
                const urlScheme = CoreUrlUtils.getUrlProtocol(url);
                if (urlScheme && urlScheme !== 'file' && urlScheme !== 'cdvfile') {
                    // Open in browser should launch the right app if found and do nothing if not found.
                    CoreUtils.openInBrowser(url);

                    // At this point the InAppBrowser is showing a "Webpage not available" error message.
                    // Try to navigate to last loaded URL so this error message isn't found.
                    if (this.lastInAppUrl) {
                        CoreUtils.openInApp(this.lastInAppUrl);
                    } else {
                        // No last URL loaded, close the InAppBrowser.
                        CoreUtils.closeInAppBrowser();
                    }
                } else {
                    this.lastInAppUrl = url;
                }
            }
        });

        // Check InAppBrowser closed.
        CoreEvents.on(CoreEvents.IAB_EXIT, () => {
            CoreLoginHelper.setWaitingForBrowser(false);
            this.lastInAppUrl = '';
            CoreLoginHelper.checkLogout();
        });

        Platform.resume.subscribe(() => {
            // Wait a second before setting it to false since in iOS there could be some frozen WS calls.
            setTimeout(() => {
                CoreLoginHelper.setWaitingForBrowser(false);
                CoreLoginHelper.checkLogout();
            }, 1000);
        });

        // Handle app launched with a certain URL (custom URL scheme).
        win.handleOpenURL = (url: string): void => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                // First check that the URL hasn't been treated a few seconds ago. Sometimes this function is called more than once.
                if (this.lastUrls[url] && Date.now() - this.lastUrls[url] < 3000) {
                    // Function called more than once, stop.
                    return;
                }

                if (!CoreCustomURLSchemes.isCustomURL(url)) {
                    // Not a custom URL, ignore.
                    return;
                }

                this.lastUrls[url] = Date.now();

                CoreEvents.trigger(CoreEvents.APP_LAUNCHED_URL, { url });
                CoreCustomURLSchemes.handleCustomURL(url).catch((error) => {
                    CoreCustomURLSchemes.treatHandleCustomURLError(error);
                });
            });
        };

        // "Expose" CoreWindow.open.
        win.openWindowSafely = (url: string, name?: string): void => {
            CoreWindow.open(url, name);
        };

        CoreEvents.on(CoreEvents.LOGIN, async (data) => {
            if (data.siteId) {
                const site = await CoreSites.getSite(data.siteId);
                const info = site.getInfo();
                if (info) {
                    // Add version classes to body.
                    this.removeVersionClass(MOODLE_VERSION_PREFIX);
                    this.addVersionClass(MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(info.release || ''));
                }
            }

            this.loadCustomStrings();
        });

        CoreEvents.on(CoreEvents.SITE_UPDATED, (data) => {
            if (data.siteId == CoreSites.getCurrentSiteId()) {
                this.loadCustomStrings();

                // Add version classes to body.
                this.removeVersionClass(MOODLE_VERSION_PREFIX);
                this.addVersionClass(MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(data.release || ''));
            }
        });

        CoreEvents.on(CoreEvents.SITE_ADDED, (data) => {
            if (data.siteId == CoreSites.getCurrentSiteId()) {
                this.loadCustomStrings();

                // Add version classes to body.
                this.removeVersionClass(MOODLE_VERSION_PREFIX);
                this.addVersionClass(MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(data.release || ''));
            }
        });

        this.onPlatformReady();

        // @todo: Quit app with back button. How to tell if we're at root level?
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (!this.outlet) {
            return;
        }

        CoreSubscriptions.once(this.outlet.activateEvents, () => SplashScreen.hide());
    }

    /**
     * Async init function on platform ready.
     */
    protected async onPlatformReady(): Promise<void> {
        await Platform.ready();

        // Refresh online status when changes.
        Network.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                const isOnline = CoreApp.isOnline();
                const hadOfflineMessage = document.body.classList.contains('core-offline');

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

        // Set StatusBar properties.
        CoreApp.setStatusBarColor();
    }

    /**
     * Load custom lang strings. This cannot be done inside the lang provider because it causes circular dependencies.
     */
    protected loadCustomStrings(): void {
        const currentSite = CoreSites.getCurrentSite();

        if (currentSite) {
            CoreLang.loadCustomStringsFromSite(currentSite);
        }
    }

    /**
     * Convenience function to add version to body classes.
     *
     * @param prefix Prefix to add to the class.
     * @param release Current release number of the site.
     */
    protected addVersionClass(prefix: string, release: string): void {
        const parts = release.split('.', 3);

        parts[1] = parts[1] || '0';
        parts[2] = parts[2] || '0';

        document.body.classList.add(
            prefix + parts[0],
            prefix + parts[0] + '-' + parts[1],
            prefix + parts[0] + '-' + parts[1] + '-' + parts[2],
        );
    }

    /**
     * Convenience function to remove all version classes form body.
     *
     * @param prefix Prefix of to the class.
     */
    protected removeVersionClass(prefix: string): void {
        const remove: string[] = [];

        Array.from(document.body.classList).forEach((tempClass) => {
            if (tempClass.substring(0, 8) == prefix) {
                remove.push(tempClass);
            }
        });

        remove.forEach((tempClass) => {
            document.body.classList.remove(tempClass);
        });
    }

}
