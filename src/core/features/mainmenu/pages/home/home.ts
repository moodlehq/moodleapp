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
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTabsOutletComponent, CoreTabsOutletTab } from '@components/tabs-outlet/tabs-outlet';
import { CoreMainMenuHomeDelegate, CoreMainMenuHomeHandlerToDisplay } from '../../services/home-delegate';
import { CoreUtils } from '@services/utils/utils';
import { ActivatedRoute } from '@angular/router';
import { CoreNavigator, CoreRedirectPayload } from '@services/navigator';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourse } from '@features/course/services/course';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';

/**
 * Page that displays the Home.
 */
@Component({
    selector: 'page-core-mainmenu-home',
    templateUrl: 'home.html',
    styleUrls: ['home.scss'],
})
export class CoreMainMenuHomePage implements OnInit {

    @ViewChild(CoreTabsOutletComponent) tabsComponent?: CoreTabsOutletComponent;

    siteName!: string;
    tabs: CoreTabsOutletTab[] = [];
    loaded = false;
    selectedTab?: number;

    protected subscription?: Subscription;
    protected updateSiteObserver?: CoreEventObserver;
    protected pendingRedirect?: CoreRedirectPayload;
    protected urlToOpen?: string;

    constructor(
        protected route: ActivatedRoute,
    ) {
    }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.route.queryParams.subscribe((params: Partial<CoreRedirectPayload> & { urlToOpen?: string }) => {
            this.urlToOpen = params.urlToOpen ?? this.urlToOpen;

            if (params.redirectPath) {
                this.pendingRedirect = {
                    redirectPath: params.redirectPath,
                    redirectOptions: params.redirectOptions,
                };
            }
        });

        this.loadSiteName();

        this.subscription = CoreMainMenuHomeDelegate.getHandlersObservable().subscribe((handlers) => {
            handlers && this.initHandlers(handlers);
        });

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.loadSiteName();
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(handlers: CoreMainMenuHomeHandlerToDisplay[]): void {
        // Re-build the list of tabs.
        const loaded = CoreMainMenuHomeDelegate.areHandlersLoaded();
        const handlersMap = CoreUtils.arrayToObject(handlers, 'title');
        const newTabs = handlers.map((handler): CoreTabsOutletTab => {
            const tab = this.tabs.find(tab => tab.title == handler.title);

            // If a handler is already in the list, use existing object to prevent re-creating the tab.
            if (tab) {
                return tab;
            }

            return {
                page: `/main/home/${handler.page}`,
                pageParams: handler.pageParams,
                title: handler.title,
                class: handler.class,
                icon: handler.icon,
                badge: handler.badge,
            };
        });

        // Sort them by priority so new handlers are in the right position.
        newTabs.sort((a, b) => (handlersMap[b.title].priority || 0) - (handlersMap[a.title].priority || 0));

        if (typeof this.selectedTab == 'undefined' && newTabs.length > 0) {
            let maxPriority = 0;

            this.selectedTab = Object.entries(newTabs).reduce((maxIndex, [index, tab]) => {
                const selectPriority = handlersMap[tab.title].selectPriority ?? 0;

                if (selectPriority > maxPriority) {
                    maxPriority = selectPriority;
                    maxIndex = Number(index);
                }

                return maxIndex;
            }, 0);
        }

        this.tabs = newTabs;

        // Try to prevent empty box displayed for an instant when it shouldn't.
        setTimeout(() => {
            this.loaded = loaded;
        }, 50);
    }

    /**
     * Load the site name.
     */
    protected loadSiteName(): void {
        this.siteName = CoreSites.getCurrentSite()!.getSiteName();
    }

    /**
     * Handle a redirect.
     *
     * @param data Data received.
     */
    protected handleRedirect(data: CoreRedirectPayload): void {
        const params = data.redirectOptions?.params;
        const coursePathMatches = data.redirectPath.match(/^course\/(\d+)\/?$/);

        if (coursePathMatches) {
            if (!params?.course) {
                CoreCourseHelper.getAndOpenCourse(Number(coursePathMatches[1]), params);
            } else {
                CoreCourse.openCourse(params.course, params);
            }
        } else {
            CoreNavigator.navigateToSitePath(data.redirectPath, {
                ...data.redirectOptions,
                preferCurrentTab: false,
            });
        }
    }

    /**
     * Handle a URL to open.
     *
     * @param url URL to open.
     */
    protected async handleUrlToOpen(url: string): Promise<void> {
        const actions = await CoreContentLinksDelegate.getActionsFor(url, undefined);

        const action = CoreContentLinksHelper.getFirstValidAction(actions);
        if (action) {
            action.action(action.sites![0]);
        }
    }

    /**
     * Tab was selected.
     */
    tabSelected(): void {
        if (this.pendingRedirect) {
            this.handleRedirect(this.pendingRedirect);
        } else if (this.urlToOpen) {
            this.handleUrlToOpen(this.urlToOpen);
        }

        delete this.pendingRedirect;
        delete this.urlToOpen;
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
