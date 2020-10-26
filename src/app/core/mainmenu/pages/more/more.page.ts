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
import { CoreLoginHelper } from '@core/login/services/helper';
import { CoreMainMenuDelegate, CoreMainMenuHandlerData } from '../../services/delegate';
import { CoreMainMenu, CoreMainMenuCustomItem } from '../../services/mainmenu';
import { CoreEventObserver, CoreEvents } from '@singletons/events';

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

    protected subscription!: Subscription;
    protected langObserver: CoreEventObserver;
    protected updateSiteObserver: CoreEventObserver;

    constructor(
        protected menuDelegate: CoreMainMenuDelegate,
    ) {

        this.langObserver = CoreEvents.on(CoreEvents.LANGUAGE_CHANGED, this.loadSiteInfo.bind(this));
        this.updateSiteObserver = CoreEvents.on(
            CoreEvents.SITE_UPDATED,
            this.loadSiteInfo.bind(this),
            CoreSites.instance.getCurrentSiteId(),
        );
        this.loadSiteInfo();
        this.showScanQR = CoreUtils.instance.canScanQR() &&
                !CoreSites.instance.getCurrentSite()?.isFeatureDisabled('CoreMainMenuDelegate_QrReader');
    }

    /**
     * Initialize component.
     */
    ngOnInit(): void {
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
            .slice(0, CoreMainMenu.instance.getNumItems());

        // Get only the handlers that don't appear in the main view.
        this.handlers = this.allHandlers.filter((handler) => mainHandlers.indexOf(handler) == -1);

        this.handlersLoaded = this.menuDelegate.areHandlersLoaded();
    }

    /**
     * Load the site info required by the view.
     */
    protected async loadSiteInfo(): Promise<void> {
        const currentSite = CoreSites.instance.getCurrentSite();

        if (!currentSite) {
            return;
        }

        this.siteInfo = currentSite.getInfo();
        this.siteName = currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();
        this.logoutLabel = CoreLoginHelper.instance.getLogoutLabel(currentSite);
        this.showWeb = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_website');
        this.showHelp = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_help');

        this.docsUrl = await currentSite.getDocsUrl();

        this.customItems = await CoreMainMenu.instance.getCustomMenuItems();
    }

    /**
     * Open a handler.
     *
     * @param handler Handler to open.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    openHandler(handler: CoreMainMenuHandlerData): void {
        // @todo
    }

    /**
     * Open an embedded custom item.
     *
     * @param item Item to open.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    openItem(item: CoreMainMenuCustomItem): void {
        // @todo
    }

    /**
     * Open app settings page.
     */
    openAppSettings(): void {
        // @todo
    }

    /**
     * Open site settings page.
     */
    openSitePreferences(): void {
        // @todo
    }

    /**
     * Scan and treat a QR code.
     */
    async scanQR(): Promise<void> {
        // Scan for a QR code.
        // @todo
    }

    /**
     * Logout the user.
     */
    logout(): void {
        CoreSites.instance.logout();
    }

}
