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

import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

import { CoreLangProvider } from '@services/lang';
import { CoreLoginHelperProvider } from '@features/login/services/login.helper';
import {
    CoreEvents,
    CoreEventSessionExpiredData,
    CoreEventSiteAddedData,
    CoreEventSiteData,
    CoreEventSiteUpdatedData,
} from '@singletons/events';
import { Network, NgZone, Platform } from '@singletons/core.singletons';
import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

    constructor(
        protected langProvider: CoreLangProvider,
        protected navCtrl: NavController,
        protected loginHelper: CoreLoginHelperProvider,
    ) {
    }

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
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            // Go to sites page when user is logged out.
            this.navCtrl.navigateRoot('/login/sites');

            // Unload lang custom strings.
            this.langProvider.clearCustomStrings();

            // Remove version classes from body.
            this.removeVersionClass();
        });

        // Listen for session expired events.
        CoreEvents.on(CoreEvents.SESSION_EXPIRED, (data: CoreEventSessionExpiredData) => {
            this.loginHelper.sessionExpired(data);
        });

        // Listen for passwordchange and usernotfullysetup events to open InAppBrowser.
        CoreEvents.on(CoreEvents.PASSWORD_CHANGE_FORCED, (data: CoreEventSiteData) => {
            this.loginHelper.passwordChangeForced(data.siteId!);
        });
        CoreEvents.on(CoreEvents.USER_NOT_FULLY_SETUP, (data: CoreEventSiteData) => {
            this.loginHelper.openInAppForEdit(data.siteId!, '/user/edit.php', 'core.usernotfullysetup');
        });

        // Listen for sitepolicynotagreed event to accept the site policy.
        CoreEvents.on(CoreEvents.SITE_POLICY_NOT_AGREED, (data: CoreEventSiteData) => {
            this.loginHelper.sitePolicyNotAgreed(data.siteId);
        });

        CoreEvents.on(CoreEvents.LOGIN, async (data: CoreEventSiteData) => {
            if (data.siteId) {
                const site = await CoreSites.instance.getSite(data.siteId);
                const info = site.getInfo();
                if (info) {
                    // Add version classes to body.
                    this.removeVersionClass();
                    this.addVersionClass(CoreSites.instance.getReleaseNumber(info.release || ''));
                }
            }

            this.loadCustomStrings();
        });

        CoreEvents.on(CoreEvents.SITE_UPDATED, (data: CoreEventSiteUpdatedData) => {
            if (data.siteId == CoreSites.instance.getCurrentSiteId()) {
                this.loadCustomStrings();

                // Add version classes to body.
                this.removeVersionClass();
                this.addVersionClass(CoreSites.instance.getReleaseNumber(data.release || ''));
            }
        });

        CoreEvents.on(CoreEvents.SITE_ADDED, (data: CoreEventSiteAddedData) => {
            if (data.siteId == CoreSites.instance.getCurrentSiteId()) {
                this.loadCustomStrings();

                // Add version classes to body.
                this.removeVersionClass();
                this.addVersionClass(CoreSites.instance.getReleaseNumber(data.release || ''));
            }
        });

        this.onPlatformReady();
    }

    /**
     * Async init function on platform ready.
     */
    protected async onPlatformReady(): Promise<void> {
        await Platform.instance.ready();

        // Refresh online status when changes.
        Network.instance.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.instance.run(() => {
                const isOnline = CoreApp.instance.isOnline();
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
    }

    /**
     * Load custom lang strings. This cannot be done inside the lang provider because it causes circular dependencies.
     */
    protected loadCustomStrings(): void {
        const currentSite = CoreSites.instance.getCurrentSite();
        if (currentSite) {
            this.langProvider.loadCustomStringsFromSite(currentSite);
        }
    }

    /**
     * Convenience function to add version to body classes.
     *
     * @param release Current release number of the site.
     */
    protected addVersionClass(release: string): void {
        const parts = release.split('.', 3);

        parts[1] = parts[1] || '0';
        parts[2] = parts[2] || '0';

        document.body.classList.add(
            'version-' + parts[0],
            'version-' + parts[0] + '-' + parts[1],
            'version-' + parts[0] + '-' + parts[1] + '-' + parts[2],
        );
    }

    /**
     * Convenience function to remove all version classes form body.
     */
    protected removeVersionClass(): void {
        const remove: string[] = [];

        Array.from(document.body.classList).forEach((tempClass) => {
            if (tempClass.substring(0, 8) == 'version-') {
                remove.push(tempClass);
            }
        });

        remove.forEach((tempClass) => {
            document.body.classList.remove(tempClass);
        });
    }

}
