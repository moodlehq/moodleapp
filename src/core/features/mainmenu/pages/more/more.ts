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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreSiteInfo } from '@classes/site';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreMainMenuDelegate, CoreMainMenuHandlerData } from '../../services/mainmenu-delegate';
import { CoreMainMenu, CoreMainMenuCustomItem } from '../../services/mainmenu';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreNavigator } from '@services/navigator';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreTextUtils } from '@services/utils/text';
import { Translate } from '@singletons';

/**
 * Page that displays the main menu of the app.
 */
@Component({
    selector: 'page-core-mainmenu-more',
    templateUrl: 'more.html',
    styleUrls: ['more.scss'],
})
export class CoreMainMenuMorePage implements OnInit, OnDestroy {

    handlers?: CoreMainMenuHandlerData[];
    allHandlers?: CoreMainMenuHandlerData[];
    handlersLoaded = false;
    siteInfo?: CoreSiteInfo;
    siteName?: string;
    logoutLabel = 'core.mainmenu.changesite';
    showScanQR: boolean;
    showWeb?: boolean;
    showHelp?: boolean;
    docsUrl?: string;
    customItems?: CoreMainMenuCustomItem[];
    siteUrl?: string;
    loggedOut = false;

    protected subscription!: Subscription;
    protected langObserver: CoreEventObserver;
    protected updateSiteObserver: CoreEventObserver;

    constructor() {

        this.langObserver = CoreEvents.on(CoreEvents.LANGUAGE_CHANGED, this.loadSiteInfo.bind(this));
        this.updateSiteObserver = CoreEvents.on(
            CoreEvents.SITE_UPDATED,
            this.loadSiteInfo.bind(this),
            CoreSites.getCurrentSiteId(),
        );
        this.loadSiteInfo();
        this.showScanQR = CoreUtils.canScanQR() &&
                !CoreSites.getCurrentSite()?.isFeatureDisabled('CoreMainMenuDelegate_QrReader');
    }

    /**
     * Initialize component.
     */
    ngOnInit(): void {
        // Load the handlers.
        this.subscription = CoreMainMenuDelegate.getHandlersObservable().subscribe((handlers) => {
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
        this.langObserver?.off();
        this.updateSiteObserver?.off();
        this.subscription?.unsubscribe();
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(): void {
        if (!this.allHandlers) {
            return;
        }

        // Calculate the main handlers not to display them in this view.
        const mainHandlers = this.allHandlers
            .filter((handler) => !handler.onlyInMore)
            .slice(0, CoreMainMenu.getNumItems());

        // Get only the handlers that don't appear in the main view.
        this.handlers = this.allHandlers.filter((handler) => mainHandlers.indexOf(handler) == -1);

        this.handlersLoaded = CoreMainMenuDelegate.areHandlersLoaded();
    }

    /**
     * Load the site info required by the view.
     */
    protected async loadSiteInfo(): Promise<void> {
        const currentSite = CoreSites.getCurrentSite();

        if (!currentSite) {
            return;
        }

        this.siteInfo = currentSite.getInfo();
        this.siteName = currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();
        this.logoutLabel = CoreLoginHelper.getLogoutLabel(currentSite);
        this.showWeb = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_website');
        this.showHelp = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_help');

        this.docsUrl = await currentSite.getDocsUrl();

        this.customItems = await CoreMainMenu.getCustomMenuItems();
    }

    /**
     * Open a handler.
     *
     * @param handler Handler to open.
     */
    openHandler(handler: CoreMainMenuHandlerData): void {
        const params = handler.pageParams;

        CoreNavigator.navigateToSitePath(handler.page, { params });
    }

    /**
     * Open an embedded custom item.
     *
     * @param item Item to open.
     */
    openItem(item: CoreMainMenuCustomItem): void {
        CoreNavigator.navigateToSitePath('viewer/iframe', { params: { title: item.label, url: item.url } });
    }

    /**
     * Open preferences.
     */
    openPreferences(): void {
        CoreNavigator.navigateToSitePath('preferences');
    }

    /**
     * Open settings.
     */
    openSettings(): void {
        CoreNavigator.navigateToSitePath('settings');
    }

    /**
     * Scan and treat a QR code.
     */
    async scanQR(): Promise<void> {
        // Scan for a QR code.
        const text = await CoreUtils.scanQR();

        if (!text) {
            return;
        }

        if (CoreCustomURLSchemes.isCustomURL(text)) {
            // Is a custom URL scheme, handle it.
            CoreCustomURLSchemes.handleCustomURL(text).catch((error) => {
                CoreCustomURLSchemes.treatHandleCustomURLError(error);
            });
        } else if (/^[^:]{2,}:\/\/[^ ]+$/i.test(text)) { // Check if it's a URL.
            // Check if the app can handle the URL.
            const treated = await CoreContentLinksHelper.handleLink(text, undefined, true, true);

            if (!treated) {
                // Can't handle it, open it in browser.
                CoreSites.getCurrentSite()?.openInBrowserWithAutoLoginIfSameSite(text);
            }
        } else {
            // It's not a URL, open it in a modal so the user can see it and copy it.
            CoreTextUtils.viewText(Translate.instant('core.qrscanner'), text, {
                displayCopyButton: true,
            });
        }
    }

    /**
     * Logout the user.
     */
    logout(): void {
        this.loggedOut = true;
        CoreSites.logout();
    }

}
