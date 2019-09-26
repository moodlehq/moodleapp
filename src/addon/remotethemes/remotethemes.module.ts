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

import { NgModule } from '@angular/core';
import { AddonRemoteThemesProvider } from './providers/remotethemes';
import { CoreEventsProvider } from '@providers/events';
import { CoreInitDelegate } from '@providers/init';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';

// List of providers (without handlers).
export const ADDON_REMOTETHEMES_PROVIDERS: any[] = [
    AddonRemoteThemesProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonRemoteThemesProvider
    ]
})
export class AddonRemoteThemesModule {
    constructor(initDelegate: CoreInitDelegate, remoteThemesProvider: AddonRemoteThemesProvider, eventsProvider: CoreEventsProvider,
            sitesProvider: CoreSitesProvider, loggerProvider: CoreLoggerProvider) {

        const logger = loggerProvider.getInstance('AddonRemoteThemesModule');

        // Preload the current site styles.
        initDelegate.registerProcess({
            name: 'AddonRemoteThemesPreloadCurrent',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 250,
            blocking: true,
            load: remoteThemesProvider.preloadCurrentSite.bind(remoteThemesProvider)
        });

        // Preload the styles of the rest of sites.
        initDelegate.registerProcess({
            name: 'AddonRemoteThemesPreload',
            blocking: true,
            load: remoteThemesProvider.preloadSites.bind(remoteThemesProvider)
        });

        let addingSite;

        // When a new site is added to the app, add its styles.
        eventsProvider.on(CoreEventsProvider.SITE_ADDED, (data) => {
            addingSite = data.siteId;

            remoteThemesProvider.addSite(data.siteId).catch((error) => {
                logger.error('Error adding site', error);
            }).then(() => {
                if (addingSite == data.siteId) {
                    addingSite = false;
                }

                // User has logged in, remove tmp styles and enable loaded styles.
                if (data.siteId == sitesProvider.getCurrentSiteId()) {
                    remoteThemesProvider.unloadTmpStyles();
                    remoteThemesProvider.enable(data.siteId);
                }
            });
        });

        // Update styles when current site is updated.
        eventsProvider.on(CoreEventsProvider.SITE_UPDATED, (data) => {
            if (data.siteId === sitesProvider.getCurrentSiteId()) {
                remoteThemesProvider.load(data.siteId).catch((error) => {
                    logger.error('Error loading site after site update', error);
                });
            }
        });

        // Enable styles of current site on login.
        eventsProvider.on(CoreEventsProvider.LOGIN, (data) => {
            remoteThemesProvider.unloadTmpStyles();
            remoteThemesProvider.enable(data.siteId);
        });

        // Disable added styles on logout.
        eventsProvider.on(CoreEventsProvider.LOGOUT, (data) => {
            remoteThemesProvider.clear();
        });

        // Remove site styles when a site is deleted.
        eventsProvider.on(CoreEventsProvider.SITE_DELETED, (site) => {
            remoteThemesProvider.removeSite(site.id);
        });

        // Load temporary styles when site config is checked in login.
        eventsProvider.on(CoreEventsProvider.LOGIN_SITE_CHECKED, (data) => {
            remoteThemesProvider.loadTmpStyles(data.config.mobilecssurl).catch((error) => {
                logger.error('Error loading tmp styles', error);
            });
        });

        // Unload temporary styles when site config is "unchecked" in login.
        eventsProvider.on(CoreEventsProvider.LOGIN_SITE_UNCHECKED, (data) => {
            if (data.siteId && data.siteId === addingSite) {
                // The tmp styles are from a site that is being added permanently.
                // Wait for the final site styles to be loaded before removing the tmp styles so there is no blink effect.
            } else {
                // The tmp styles are from a site that wasn't added in the end. Just remove them.
                remoteThemesProvider.unloadTmpStyles();
            }
        });
    }
}
