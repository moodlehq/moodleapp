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

import { Component, OnInit, OnDestroy, viewChildren, Type } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreSites } from '@services/sites';
import { CoreQRScan } from '@services/qrscan';
import {
    CoreMainMenuDelegate,
    CoreMainMenuHandlerToDisplay,
    CoreMainMenuPageNavHandlerToDisplay,
} from '../../services/mainmenu-delegate';
import { CoreMainMenu } from '../../services/mainmenu';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreNavigator } from '@services/navigator';
import { Translate } from '@singletons';
import { CoreDom } from '@static/dom';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreMainMenuUserButtonComponent } from '../../components/user-menu-button/user-menu-button';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreUrl } from '@static/url';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { ReloadableComponent } from '@coretypes/reloadable-component';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreCustomMenu, CoreCustomMenuItem } from '@features/mainmenu/services/custommenu';
import { CoreCustomMenuItemComponent } from '@features/mainmenu/components/custom-menu-item/custom-menu-item';
import { CORE_QRREADER_MENU_FEATURE_NAME } from '@features/viewer/constants';

/**
 * Page that displays the more page of the app.
 */
@Component({
    selector: 'page-core-mainmenu-more',
    templateUrl: 'more.html',
    styleUrl: 'more.scss',
    imports: [
        CoreSharedModule,
        CoreMainMenuUserButtonComponent,
        CoreCustomMenuItemComponent,
    ],
})
export default class CoreMainMenuMorePage implements OnInit, OnDestroy {

    readonly dynamicComponents = viewChildren<CoreDynamicComponent<ReloadableComponent>>(CoreDynamicComponent);

    handlers?: CoreMainMenuHandlerToDisplay[];
    handlersLoaded = false;
    showScanQR: boolean;
    customItems?: CoreCustomMenuItem[];
    customMenuOverrideComponent?: Type<unknown>;

    hasComponentHandlers = false;

    protected allHandlers?: CoreMainMenuHandlerToDisplay[];
    protected subscription!: Subscription;
    protected langSubscription: Subscription;
    protected updateSiteObserver: CoreEventObserver;
    protected resizeListener?: CoreEventObserver;

    constructor() {
        this.langSubscription = Translate.onLangChange.subscribe(() => {
            this.loadCustomMenuItems();
        });

        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async () => {
            this.customItems = await CoreCustomMenu.getCustomMainMenuItems();
        }, CoreSites.getCurrentSiteId());

        this.loadCustomMenuItems();

        this.showScanQR = CoreQRScan.canScanQR() &&
                !CoreSites.getCurrentSite()?.isFeatureDisabled(CORE_QRREADER_MENU_FEATURE_NAME);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.customMenuOverrideComponent = await CoreCustomMenu.getCustomItemComponent();

        // Load the handlers.
        this.subscription = CoreMainMenuDelegate.getHandlersObservable().subscribe((handlers) => {
            this.allHandlers = handlers;

            this.initHandlers();
        });

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.initHandlers();
        });

        CoreSites.loginNavigationFinished();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.langSubscription.unsubscribe();
        this.updateSiteObserver?.off();
        this.subscription?.unsubscribe();
        this.resizeListener?.off();
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(): void {
        if (!this.allHandlers) {
            return;
        }

        // Calculate the main handlers not to display them in this view.
        const mainHandlers: CoreMainMenuHandlerToDisplay[] = CoreMainMenuDelegate.skipOnlyMoreHandlers(this.allHandlers)
            .slice(0, CoreMainMenu.getNumItems());

        // Get only the handlers that don't appear in the main view.
        this.handlers = this.allHandlers.filter((handler) => mainHandlers.indexOf(handler) === -1);
        this.hasComponentHandlers = this.handlers.some((handler) => 'component' in handler);

        this.handlersLoaded = CoreMainMenuDelegate.areHandlersLoaded();
    }

    /**
     * Load custom menu items.
     */
    protected async loadCustomMenuItems(): Promise<void> {
        this.customItems = await CoreCustomMenu.getCustomMainMenuItems();
    }

    /**
     * Open a handler.
     *
     * @param handler Handler to open.
     */
    openHandler(handler: CoreMainMenuPageNavHandlerToDisplay): void {
        const params = handler.pageParams;

        CoreNavigator.navigateToSitePath(handler.page, { params });
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
        const text = await CoreQRScan.scanQRWithUrlHandling();

        if (!text) {
            return;
        }

        // Check if it's a URL.
        if (/^[^:]{2,}:\/\/[^ ]+$/i.test(text)) {
            await CoreContentLinksHelper.visitLink(CoreUrl.decodeURI(text), {
                checkRoot: true,
                openBrowserRoot: true,
            });
        } else {
            // It's not a URL, open it in a modal so the user can see it and copy it.
            CoreViewer.viewText(Translate.instant('core.qrscanner'), text, {
                displayCopyButton: true,
            });
        }
    }

    /**
     * Refresh the data.
     *
     * @param event Event.
     * @returns Promise resolved when done.
     */
    async refreshData(event?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(Promise.all([
            ...(this.dynamicComponents()?.map((component) =>
                Promise.resolve(component.callComponentMethod('invalidateContent'))) || []),
        ]));

        await CorePromiseUtils.allPromisesIgnoringErrors(
            this.dynamicComponents()?.map((component) => Promise.resolve(component.callComponentMethod('reloadContent'))),
        );

        event?.complete();
    }

}
