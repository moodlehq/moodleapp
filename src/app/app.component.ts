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

import { Component, OnInit, NgZone } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLangProvider } from '@providers/lang';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';

@Component({
    templateUrl: 'app.html'
})
export class MoodleMobileApp implements OnInit {
    // Use page name (string) because the page is lazy loaded (Ionic feature). That way we can load pages without importing them.
    // The downside is that each page needs to implement a ngModule.
    rootPage: any = 'CoreLoginInitPage';
    protected logger;
    protected lastUrls = {};

    constructor(private platform: Platform, statusBar: StatusBar, logger: CoreLoggerProvider,
        private eventsProvider: CoreEventsProvider, private loginHelper: CoreLoginHelperProvider, private zone: NgZone,
        private appProvider: CoreAppProvider, private langProvider: CoreLangProvider, private sitesProvider: CoreSitesProvider) {
        this.logger = logger.getInstance('AppComponent');

        platform.ready().then(() => {
            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.
            if (platform.is('android')) {
                statusBar.styleLightContent();
            } else {
                statusBar.styleDefault();
            }
        });

    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            // Go to sites page when user is logged out.
            this.appProvider.getRootNavController().setRoot('CoreLoginSitesPage');

            // Unload lang custom strings.
            this.langProvider.clearCustomStrings();
        });

        // Listen for session expired events.
        this.eventsProvider.on(CoreEventsProvider.SESSION_EXPIRED, (data) => {
            this.loginHelper.sessionExpired(data);
        });

        // Listen for passwordchange and usernotfullysetup events to open InAppBrowser.
        this.eventsProvider.on(CoreEventsProvider.PASSWORD_CHANGE_FORCED, (data) => {
            this.loginHelper.openInAppForEdit(data.siteId, '/login/change_password.php', 'core.forcepasswordchangenotice', true);
        });
        this.eventsProvider.on(CoreEventsProvider.USER_NOT_FULLY_SETUP, (data) => {
            this.loginHelper.openInAppForEdit(data.siteId, '/user/edit.php', 'core.usernotfullysetup');
        });

        // Listen for sitepolicynotagreed event to accept the site policy.
        this.eventsProvider.on(CoreEventsProvider.SITE_POLICY_NOT_AGREED, (data) => {
            this.loginHelper.sitePolicyNotAgreed(data.siteId);
        });

        // Check URLs loaded in any InAppBrowser.
        this.eventsProvider.on(CoreEventsProvider.IAB_LOAD_START, (event) => {
            this.loginHelper.inAppBrowserLoadStart(event.url);
        });

        // Check InAppBrowser closed.
        this.eventsProvider.on(CoreEventsProvider.IAB_EXIT, () => {
            this.loginHelper.waitingForBrowser = false;
            this.loginHelper.lastInAppUrl = '';
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
            });
        };

        // Listen for app launched URLs. If we receive one, check if it's a SSO authentication.
        this.eventsProvider.on(CoreEventsProvider.APP_LAUNCHED_URL, (url) => {
            this.loginHelper.appLaunchedByURL(url);
        });

        // Load custom lang strings. This cannot be done inside the lang provider because it causes circular dependencies.
        const loadCustomStrings = (): void => {
            const currentSite = this.sitesProvider.getCurrentSite(),
                customStrings = currentSite && currentSite.getStoredConfig('tool_mobile_customlangstrings');

            if (typeof customStrings != 'undefined') {
                this.langProvider.loadCustomStrings(customStrings);
            }
        };

        this.eventsProvider.on(CoreEventsProvider.LOGIN, () => {
            loadCustomStrings();
        });

        this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, (siteId) => {
            if (siteId == this.sitesProvider.getCurrentSiteId()) {
                loadCustomStrings();
            }
        });
    }
}
