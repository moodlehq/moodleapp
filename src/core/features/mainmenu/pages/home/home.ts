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

import { Component, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreSites } from '@services/sites';
import { CoreEventObserver } from '@singletons/events';
import { CoreTabsOutletComponent, CoreTabsOutletTab } from '@components/tabs-outlet/tabs-outlet';
import { CoreMainMenuHomeDelegate, CoreMainMenuHomeHandlerToDisplay } from '../../services/home-delegate';
import { CoreArray } from '@singletons/array';
import { CoreMainMenuHomeHandlerService } from '@features/mainmenu/services/handlers/mainmenu';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSiteLogoComponent } from '../../../../components/site-logo/site-logo';
import { CoreMainMenuUserButtonComponent } from '../../components/user-menu-button/user-menu-button';

/**
 * Page that displays the Home.
 */
@Component({
    selector: 'page-core-mainmenu-home',
    templateUrl: 'home.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreSiteLogoComponent,
        CoreMainMenuUserButtonComponent,
    ],
})
export default class CoreMainMenuHomePage implements OnInit {

    @ViewChild(CoreTabsOutletComponent) tabsComponent?: CoreTabsOutletComponent;

    siteName = '';
    tabs: CoreTabsOutletTab[] = [];
    loaded = false;

    protected subscription?: Subscription;
    protected updateSiteObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.subscription = CoreMainMenuHomeDelegate.getHandlersObservable().subscribe((handlers) => {
            handlers && this.initHandlers(handlers);
        });
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(handlers: CoreMainMenuHomeHandlerToDisplay[]): void {
        // Re-build the list of tabs.
        const loaded = CoreMainMenuHomeDelegate.areHandlersLoaded();
        const handlersMap = CoreArray.toObject(handlers, 'title');
        const newTabs = handlers.map((handler): CoreTabsOutletTab => {
            const tab = this.tabs.find(tab => tab.title == handler.title);

            // If a handler is already in the list, use existing object to prevent re-creating the tab.
            if (tab) {
                return tab;
            }

            return {
                page: `/main/${CoreMainMenuHomeHandlerService.PAGE_NAME}/${handler.page}`,
                pageParams: handler.pageParams,
                title: handler.title,
                class: handler.class,
                icon: handler.icon,
                badge: handler.badge,
            };
        });

        // Sort them by priority so new handlers are in the right position.
        newTabs.sort((a, b) => (handlersMap[b.title].priority || 0) - (handlersMap[a.title].priority || 0));

        this.tabs = newTabs;

        // Try to prevent empty box displayed for an instant when it shouldn't.
        setTimeout(() => {
            this.loaded = loaded;
        }, 50);
    }

    /**
     * Tab was selected.
     */
    tabSelected(): void {
        CoreSites.loginNavigationFinished();
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.tabsComponent?.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.tabsComponent?.ionViewDidLeave();
    }

}
