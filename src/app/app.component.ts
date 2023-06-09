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
import { BackButtonEvent, ScrollDetail } from '@ionic/core';

import { CoreLang } from '@services/lang';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreEvents } from '@singletons/events';
import { NgZone, SplashScreen } from '@singletons';
import { CoreNetwork } from '@services/network';
import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CoreSubscriptions } from '@singletons/subscriptions';
import { CoreWindow } from '@singletons/window';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@/core/constants';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreDom } from '@singletons/dom';
import { CorePlatform } from '@services/platform';
import { CoreUrl } from '@singletons/url';
import { CoreLogger } from '@singletons/logger';
import { CorePromisedValue } from '@classes/promised-value';

const MOODLE_SITE_URL_PREFIX = 'url-';
const MOODLE_VERSION_PREFIX = 'version-';
const MOODLEAPP_VERSION_PREFIX = 'moodleapp-';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit, AfterViewInit {

    @ViewChild(IonRouterOutlet) outlet?: IonRouterOutlet;

    protected logger = CoreLogger.getInstance('AppComponent');

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = <any> window;
        CoreDomUtils.toggleModeClass('ionic5', true, { includeLegacy: true });
        this.addVersionClass(MOODLEAPP_VERSION_PREFIX, CoreConstants.CONFIG.versionname.replace('-dev', ''));

        CoreEvents.on(CoreEvents.LOGOUT, async () => {
            // Unload lang custom strings.
            CoreLang.clearCustomStrings();

            // Remove version classes from body.
            this.removeModeClasses([MOODLE_VERSION_PREFIX, MOODLE_SITE_URL_PREFIX]);

            // Go to sites page when user is logged out.
            await CoreNavigator.navigate('/login/sites', { reset: true });

            if (CoreSitePlugins.hasSitePluginsLoaded) {
                // Temporary fix. Reload the page to unload all plugins.
                window.location.reload();
            }
        });

        // Listen to scroll to add style when scroll is not 0.
        win.addEventListener('ionScroll', async ({ detail, target }: CustomEvent<ScrollDetail>) => {
            if ((target as HTMLElement).tagName != 'ION-CONTENT') {
                return;
            }
            const content = (target as HTMLIonContentElement);

            const page = content.closest('.ion-page');
            if (!page) {
                return;
            }

            page.querySelector<HTMLIonHeaderElement>('ion-header')?.classList.toggle('core-header-shadow', detail.scrollTop > 0);

            const scrollElement = await content.getScrollElement();
            content.classList.toggle('core-footer-shadow', !CoreDom.scrollIsBottom(scrollElement));
        });

        CorePlatform.resume.subscribe(() => {
            // Wait a second before setting it to false since in iOS there could be some frozen WS calls.
            setTimeout(() => {
                if (CoreLoginHelper.isWaitingForBrowser() && !CoreUtils.isInAppBrowserOpen()) {
                    CoreLoginHelper.stopWaitingForBrowser();
                    CoreLoginHelper.checkLogout();
                }
            }, 1000);
        });

        // "Expose" CoreWindow.open.
        win.openWindowSafely = (url: string, name?: string): void => {
            CoreWindow.open(url, name);
        };

        // Treat URLs that try to override the app.
        win.onOverrideUrlLoading = (url: string) => {
            CoreWindow.open(url);
        };

        CoreEvents.on(CoreEvents.LOGIN, async (data) => {
            if (data.siteId) {
                const site = await CoreSites.getSite(data.siteId);
                const info = site.getInfo();
                if (info) {
                    // Add version classes to body.
                    this.removeModeClasses([MOODLE_VERSION_PREFIX, MOODLE_SITE_URL_PREFIX]);

                    this.addVersionClass(MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(info.release || ''));
                    this.addSiteUrlClass(info.siteurl);
                }
            }

            this.loadCustomStrings();
        });

        // Site config is checked in login.
        CoreEvents.on(CoreEvents.LOGIN_SITE_CHECKED, (data) => {
            this.addSiteUrlClass(data.config.httpswwwroot);
        });

        CoreEvents.on(CoreEvents.SITE_UPDATED, async (data) => {
            if (data.siteId === CoreSites.getCurrentSiteId()) {
                this.loadCustomStrings();

                // Add version classes to body.
                this.removeModeClasses([MOODLE_VERSION_PREFIX, MOODLE_SITE_URL_PREFIX]);

                this.addVersionClass(MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(data.release || ''));
                this.addSiteUrlClass(data.siteurl);
            }
        });

        CoreEvents.on(CoreEvents.SITE_ADDED, (data) => {
            if (data.siteId === CoreSites.getCurrentSiteId()) {
                this.loadCustomStrings();

                // Add version classes to body.
                this.removeModeClasses([MOODLE_VERSION_PREFIX, MOODLE_SITE_URL_PREFIX]);

                this.addVersionClass(MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(data.release || ''));
                this.addSiteUrlClass(data.siteurl);
            }
        });

        this.onPlatformReady();

        // Quit app with back button.
        document.addEventListener('ionBackButton', (event: BackButtonEvent) => {
            // This callback should have the lowest priority in the app.
            event.detail.register(-100, async () => {
                const initialPath = CoreNavigator.getCurrentPath();
                if (initialPath.startsWith('/main/')) {
                    // Main menu has its own callback to handle back. If this callback is called it means we should exit app.
                    CoreApp.closeApp();

                    return;
                }

                // This callback can be called at the same time as Ionic's back navigation callback.
                // Check if the path changes due to the back navigation handler, to know if we're at root level.
                // Ionic doc recommends IonRouterOutlet.canGoBack, but there's no easy way to get the current outlet from here.
                // The path seems to change immediately (0 ms timeout), but use 50ms just in case.
                await CoreUtils.wait(50);

                if (CoreNavigator.getCurrentPath() != initialPath) {
                    // Ionic has navigated back, nothing else to do.
                    return;
                }

                // Quit the app.
                CoreApp.closeApp();
            });
        });

        // @todo Pause Youtube videos in Android when app is put in background or screen is locked?
        // See: https://github.com/moodlehq/moodleapp/blob/ionic3/src/app/app.component.ts#L312
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (!this.outlet) {
            return;
        }

        this.logger.debug('App component initialized');

        CoreSubscriptions.once(this.outlet.activateEvents, async () => {
            await CorePlatform.ready();

            this.logger.debug('Hide splash screen');
            SplashScreen.hide();
            this.setSystemUIColorsAfterSplash();
        });
    }

    /**
     * Set the system UI Colors after hiding the splash to ensure it's correct.
     *
     * @returns Promise resolved when done.
     */
    protected async setSystemUIColorsAfterSplash(): Promise<void> {
        // When the app starts and the splash is hidden, the color of the bars changes from transparent to black.
        // We have to set the current color but we don't know when the change will be made.
        // This problem is only related to Android, so on iOS it will be only set once.
        if (!CorePlatform.isAndroid()) {
            CoreApp.setSystemUIColors();

            return;
        }

        const promise = new CorePromisedValue<void>();

        const interval = window.setInterval(() => {
            CoreApp.setSystemUIColors();
        });
        setTimeout(() => {
            clearInterval(interval);
            promise.resolve();

        }, 1000);

        return promise;
    }

    /**
     * Async init function on platform ready.
     */
    protected async onPlatformReady(): Promise<void> {
        await CorePlatform.ready();

        this.logger.debug('Platform is ready');

        // Refresh online status when changes.
        CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                const isOnline = CoreNetwork.isOnline();
                const hadOfflineMessage = CoreDomUtils.hasModeClass('core-offline');

                CoreDomUtils.toggleModeClass('core-offline', !isOnline, { includeLegacy: true });

                if (isOnline && hadOfflineMessage) {
                    CoreDomUtils.toggleModeClass('core-online', true, { includeLegacy: true });

                    setTimeout(() => {
                        CoreDomUtils.toggleModeClass('core-online', false, { includeLegacy: true });
                    }, 3000);
                } else if (!isOnline) {
                    CoreDomUtils.toggleModeClass('core-online', false, { includeLegacy: true });
                }
            });
        });

        const isOnline = CoreNetwork.isOnline();
        CoreDomUtils.toggleModeClass('core-offline', !isOnline, { includeLegacy: true });
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
     * Convenience function to add version to html classes.
     *
     * @param prefix Prefix to add to the class.
     * @param release Current release number of the site.
     */
    protected addVersionClass(prefix: string, release: string): void {
        const parts = release.split('.', 3);

        parts[1] = parts[1] || '0';
        parts[2] = parts[2] || '0';

        CoreDomUtils.toggleModeClass(prefix + parts[0], true, { includeLegacy: true });
        CoreDomUtils.toggleModeClass(prefix + parts[0] + '-' + parts[1], true, { includeLegacy: true });
        CoreDomUtils.toggleModeClass(prefix + parts[0] + '-' + parts[1] + '-' + parts[2], true, { includeLegacy: true });
    }

    /**
     * Convenience function to remove all mode classes form body.
     *
     * @param prefixes Prefixes of the class mode to be removed.
     */
    protected removeModeClasses(prefixes: string[]): void {
        for (const modeClass of CoreDomUtils.getModeClasses()) {
            if (!prefixes.some((prefix) => modeClass.startsWith(prefix))) {
                continue;
            }

            CoreDomUtils.toggleModeClass(modeClass, false, { includeLegacy: true });
        }
    }

    /**
     * Converts the provided URL into a CSS class that be used within the page.
     * This is primarily used to add the siteurl to the body tag as a CSS class.
     * Extracted from LMS url_to_class_name function.
     *
     * @param url Url.
     * @returns Class name
     */
    protected urlToClassName(url: string): string {
        const parsedUrl = CoreUrl.parse(url);

        if (!parsedUrl) {
            return '';
        }

        let className = parsedUrl.domain?.replace(/\./g, '-') || '';

        if (parsedUrl.port) {
            className += `--${parsedUrl.port}`;
        }
        if (parsedUrl.path) {
            const leading = new RegExp('^/+');
            const trailing = new RegExp('/+$');
            const path = parsedUrl.path.replace(leading, '').replace(trailing, '');
            if (path) {
                className += '--' + path.replace(/\//g, '-') || '';
            }
        }

        return className;
    }

    /**
     * Convenience function to add site url to html classes.
     */
    protected addSiteUrlClass(siteUrl: string): void {
        const className = this.urlToClassName(siteUrl);

        CoreDomUtils.toggleModeClass(MOODLE_SITE_URL_PREFIX + className, true);
    }

}
