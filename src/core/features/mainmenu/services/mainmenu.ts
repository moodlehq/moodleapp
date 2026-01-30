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

import { Injectable } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreMainMenuDelegate, CoreMainMenuPageNavHandlerToDisplay } from './mainmenu-delegate';
import { makeSingleton } from '@singletons';
import { CoreScreen } from '@services/screen';
import {
    CoreMainMenuPlacement,
    MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT,
    MAIN_MENU_ITEM_MIN_WIDTH,
    MAIN_MENU_MORE_PAGE_NAME,
    MAIN_MENU_NUM_MAIN_HANDLERS,
    MAIN_MENU_VISIBILITY_UPDATED_EVENT,
} from '../constants';
import { CoreCustomMenuItem } from './custommenu';

declare module '@static/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT]: CoreMainMenuHandlerBadgeUpdatedEventData;
        [MAIN_MENU_VISIBILITY_UPDATED_EVENT]: void;
    }

}

/**
 * Service that provides some features regarding Main Menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreMainMenuProvider {

    /**
     * @deprecated since 5.0. Use MAIN_MENU_NUM_MAIN_HANDLERS instead.
     */
    static readonly NUM_MAIN_HANDLERS = MAIN_MENU_NUM_MAIN_HANDLERS;
    /**
     * @deprecated since 5.0. Use MAIN_MENU_ITEM_MIN_WIDTH instead.
     */
    static readonly ITEM_MIN_WIDTH = MAIN_MENU_ITEM_MIN_WIDTH;
    /**
     * @deprecated since 5.0. Use MAIN_MENU_MORE_PAGE_NAME instead.
     */
    static readonly MORE_PAGE_NAME = MAIN_MENU_MORE_PAGE_NAME;
    /**
     * @deprecated since 5.0. Use MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT instead.
     */
    static readonly MAIN_MENU_HANDLER_BADGE_UPDATED = MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT;
    /**
     * @deprecated since 5.0. Use MAIN_MENU_VISIBILITY_UPDATED_EVENT instead.
     */
    static readonly MAIN_MENU_VISIBILITY_UPDATED = MAIN_MENU_VISIBILITY_UPDATED_EVENT;

    /**
     * Get the current main menu handlers.
     *
     * @returns Promise resolved with the current main menu handlers.
     */
    async getCurrentMainMenuHandlers(): Promise<CoreMainMenuPageNavHandlerToDisplay[]> {
        const handlers = await CoreMainMenuDelegate.getHandlersWhenLoaded();

        return CoreMainMenuDelegate.skipOnlyMoreHandlers(handlers).slice(0, this.getNumItems());
    }

    /**
     * Get a list of custom menu items.
     *
     * @param siteId Site to get custom items from.
     * @returns List of custom menu items.
     *
     * @deprecated since 5.2. Use CoreCustomMenu.getCustomMenuItems() instead.
     */
    async getCustomMenuItems(siteId?: string): Promise<CoreCustomMenuItem[]> {
        const { CoreCustomMenu } = await import('./custommenu');

        return CoreCustomMenu.getCustomMainMenuItems(siteId);
    }

    /**
     * Get the number of items to be shown on the main menu bar.
     *
     * @returns Number of items depending on the device width.
     */
    getNumItems(): number {
        if (!this.isResponsiveMainMenuItemsDisabledInCurrentSite() && window && window.innerWidth) {
            let numElements: number;

            if (CoreScreen.isTablet) {
                // Tablet, menu will be displayed vertically.
                numElements = Math.floor(window.innerHeight / MAIN_MENU_ITEM_MIN_WIDTH);
            } else {
                numElements = Math.floor(window.innerWidth / MAIN_MENU_ITEM_MIN_WIDTH);

                // Set a maximum elements to show and skip more button.
                numElements = numElements >= 5 ? 5 : numElements;
            }

            // Set a mínimum elements to show and skip more button.
            return numElements > 1 ? numElements - 1 : 1;
        }

        return MAIN_MENU_NUM_MAIN_HANDLERS;
    }

    /**
     * Get tabs placement depending on the device size.
     *
     * @returns Tabs placement including side value.
     */
    getTabPlacement(): CoreMainMenuPlacement {
        return CoreScreen.isTablet ? CoreMainMenuPlacement.SIDE : CoreMainMenuPlacement.BOTTOM;
    }

    /**
     * Check if a certain page is the root of a main menu tab.
     *
     * @param pageName Name of the page.
     * @returns Promise resolved with boolean: whether it's the root of a main menu tab.
     */
    async isMainMenuTab(pageName: string): Promise<boolean> {
        if (pageName === MAIN_MENU_MORE_PAGE_NAME) {
            return true;
        }

        return this.isCurrentMainMenuHandler(pageName);
    }

    /**
     * Check if a certain page is the root of a main menu handler currently displayed.
     *
     * @param pageName Name of the page.
     * @returns Promise resolved with boolean: whether it's the root of a main menu handler.
     */
    async isCurrentMainMenuHandler(pageName: string): Promise<boolean> {
        const handlers = await this.getCurrentMainMenuHandlers();

        const handler = handlers.find((handler) => {
            const tabRoot = /^[^/]+/.exec(handler.page)?.[0] ?? handler.page;

            return tabRoot == pageName;
        });

        return !!handler;
    }

    /**
     * Check if responsive main menu items is disabled in the current site.
     *
     * @returns Whether it's disabled.
     */
    protected isResponsiveMainMenuItemsDisabledInCurrentSite(): boolean {
        const site = CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled('NoDelegate_ResponsiveMainMenuItems');
    }

}

export const CoreMainMenu = makeSingleton(CoreMainMenuProvider);

export type CoreMainMenuHandlerBadgeUpdatedEventData = {
    handler: string; // Handler name.
    value: number; // New counter value.
};

/**
 * Override for a main menu item.
 */
export type CoreMainMenuOverrideItem = {
    handler: string; // Handler name.
    icon?: string; // New icon name.
    priority?: number; // New priority.
};
