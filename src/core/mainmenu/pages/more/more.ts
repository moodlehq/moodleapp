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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCustomURLSchemesProvider, CoreCustomURLSchemesHandleError } from '@providers/urlschemes';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreMainMenuDelegate, CoreMainMenuHandlerData } from '../../providers/delegate';
import { CoreMainMenuProvider, CoreMainMenuCustomItem } from '../../providers/mainmenu';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { TranslateService } from '@ngx-translate/core';

/**
 * Page that displays the list of main menu options that aren't in the tabs.
 */
@IonicPage({segment: 'core-mainmenu-more'})
@Component({
    selector: 'page-core-mainmenu-more',
    templateUrl: 'more.html',
})
export class CoreMainMenuMorePage implements OnDestroy {
    handlers: CoreMainMenuHandlerData[];
    allHandlers: CoreMainMenuHandlerData[];
    handlersLoaded: boolean;
    siteInfo: any;
    siteName: string;
    logoutLabel: string;
    showScanQR: boolean;
    showWeb: boolean;
    showHelp: boolean;
    docsUrl: string;
    customItems: CoreMainMenuCustomItem[];
    siteUrl: string;

    protected subscription;
    protected langObserver;
    protected updateSiteObserver;

    constructor(protected menuDelegate: CoreMainMenuDelegate,
            protected sitesProvider: CoreSitesProvider,
            protected navCtrl: NavController,
            protected mainMenuProvider: CoreMainMenuProvider,
            eventsProvider: CoreEventsProvider,
            protected loginHelper: CoreLoginHelperProvider,
            protected utils: CoreUtilsProvider,
            protected linkHelper: CoreContentLinksHelperProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected urlSchemesProvider: CoreCustomURLSchemesProvider,
            protected translate: TranslateService) {

        this.langObserver = eventsProvider.on(CoreEventsProvider.LANGUAGE_CHANGED, this.loadSiteInfo.bind(this));
        this.updateSiteObserver = eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.loadSiteInfo.bind(this),
            sitesProvider.getCurrentSiteId());
        this.loadSiteInfo();
        this.showScanQR = this.utils.canScanQR() &&
                !this.sitesProvider.getCurrentSite().isFeatureDisabled('CoreMainMenuDelegate_QrReader');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        // Load the handlers.
        this.subscription = this.menuDelegate.getHandlers().subscribe((handlers) => {
            this.allHandlers = handlers;

            this.initHandlers();
        });

        window.addEventListener('resize', this.initHandlers.bind(this));
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        window.removeEventListener('resize', this.initHandlers.bind(this));
        this.langObserver && this.langObserver.off();
        this.updateSiteObserver && this.updateSiteObserver.off();

        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(): void {
        if (this.allHandlers) {
            // Calculate the main handlers not to display them in this view.
            const mainHandlers = this.allHandlers.filter((handler) => {
                return !handler.onlyInMore;
            }).slice(0, this.mainMenuProvider.getNumItems());

            // Get only the handlers that don't appear in the main view.
            this.handlers = this.allHandlers.filter((handler) => {
                return mainHandlers.indexOf(handler) == -1;
            });

            this.handlersLoaded = this.menuDelegate.areHandlersLoaded();
        }
    }

    /**
     * Load the site info required by the view.
     */
    protected loadSiteInfo(): void {
        const currentSite = this.sitesProvider.getCurrentSite();

        this.siteInfo = currentSite.getInfo();
        this.siteName = currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();
        this.logoutLabel = this.loginHelper.getLogoutLabel(currentSite);
        this.showWeb = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_website');
        this.showHelp = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_help');

        currentSite.getDocsUrl().then((docsUrl) => {
            this.docsUrl = docsUrl;
        });

        this.mainMenuProvider.getCustomMenuItems().then((items) => {
            this.customItems = items;
        });
    }

    /**
     * Open a handler.
     *
     * @param handler Handler to open.
     */
    openHandler(handler: CoreMainMenuHandlerData): void {
        this.navCtrl.push(handler.page, handler.pageParams);
    }

    /**
     * Open an embedded custom item.
     *
     * @param item Item to open.
     */
    openItem(item: CoreMainMenuCustomItem): void {
        this.navCtrl.push('CoreViewerIframePage', {title: item.label, url: item.url});
    }

    /**
     * Open app settings page.
     */
    openAppSettings(): void {
        this.navCtrl.push('CoreAppSettingsPage');
    }

    /**
     * Open site settings page.
     */
    openSitePreferences(): void {
        this.navCtrl.push('CoreSitePreferencesPage');
    }

    /**
     * Scan and treat a QR code.
     */
    scanQR(): void {
        // Scan for a QR code.
        this.utils.scanQR().then((text) => {
            if (text) {
                if (this.urlSchemesProvider.isCustomURL(text)) {
                    // Is a custom URL scheme, handle it.
                    this.urlSchemesProvider.handleCustomURL(text).catch((error: CoreCustomURLSchemesHandleError) => {
                        this.urlSchemesProvider.treatHandleCustomURLError(error);
                    });
                } else if (/^[^:]{2,}:\/\/[^ ]+$/i.test(text)) { // Check if it's a URL.
                    // Check if the app can handle the URL.
                    this.linkHelper.handleLink(text, undefined, this.navCtrl, true, true).then((treated) => {
                        if (!treated) {
                            // Can't handle it, open it in browser.
                            this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(text);
                        }
                    });
                } else {
                    // It's not a URL, open it in a modal so the user can see it and copy it.
                    this.textUtils.viewText(this.translate.instant('core.qrscanner'), text, {
                        displayCopyButton: true,
                    });
                }
            }
        });
    }

    /**
     * Logout the user.
     */
    logout(): void {
        this.sitesProvider.logout();
    }
}
