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

import { CoreLang, CoreLangFormat, CoreLangLanguage } from '@services/lang';
import { CoreSites } from '@services/sites';
import { CoreConstants } from '@/core/constants';
import { CoreMainMenuDelegate, CoreMainMenuHandlerToDisplay } from './mainmenu-delegate';
import { Device, makeSingleton } from '@singletons';
import { CoreArray } from '@singletons/array';
import { CoreTextUtils } from '@services/utils/text';
import { CoreScreen } from '@services/screen';
import { CorePlatform } from '@services/platform';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CoreMainMenuProvider.MAIN_MENU_HANDLER_BADGE_UPDATED]: CoreMainMenuHandlerBadgeUpdatedEventData;
        [CoreMainMenuProvider.MAIN_MENU_VISIBILITY_UPDATED]: void;
    }

}

/**
 * Service that provides some features regarding Main Menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreMainMenuProvider {

    static readonly NUM_MAIN_HANDLERS = 4;
    static readonly ITEM_MIN_WIDTH = 72; // Min with of every item, based on 5 items on a 360 pixel wide screen.
    static readonly MORE_PAGE_NAME = 'more';
    static readonly MAIN_MENU_HANDLER_BADGE_UPDATED = 'main_menu_handler_badge_updated';
    static readonly MAIN_MENU_VISIBILITY_UPDATED = 'main_menu_visbility_updated';

    /**
     * Get the current main menu handlers.
     *
     * @returns Promise resolved with the current main menu handlers.
     */
    async getCurrentMainMenuHandlers(): Promise<CoreMainMenuHandlerToDisplay[]> {
        const handlers = await CoreMainMenuDelegate.getHandlersWhenLoaded();

        return handlers.filter(handler => !handler.onlyInMore).slice(0, this.getNumItems());
    }

    /**
     * Get a list of custom menu items.
     *
     * @param siteId Site to get custom items from.
     * @returns List of custom menu items.
     */
    async getCustomMenuItems(siteId?: string): Promise<CoreMainMenuCustomItem[]> {
        const customItems = await Promise.all([
            this.getCustomMenuItemsFromSite(siteId),
            this.getCustomItemsFromConfig(),
        ]);

        return CoreArray.flatten(customItems);
    }

    /**
     * Get a list of custom menu items for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns List of custom menu items.
     */
    protected async getCustomMenuItemsFromSite(siteId?: string): Promise<CoreMainMenuCustomItem[]> {
        const site = await CoreSites.getSite(siteId);

        const itemsString = site.getStoredConfig('tool_mobile_custommenuitems');
        const map: CustomMenuItemsMap = {};
        const result: CoreMainMenuCustomItem[] = [];

        let position = 0; // Position of each item, to keep the same order as it's configured.

        if (!itemsString || typeof itemsString != 'string') {
            // Setting not valid.
            return result;
        }

        // Add items to the map.
        const items = itemsString.split(/(?:\r\n|\r|\n)/);
        items.forEach((item) => {
            const values = item.split('|');
            const label = values[0] ? values[0].trim() : values[0];
            const url = values[1] ? values[1].trim() : values[1];
            const type = values[2] ? values[2].trim() : values[2];
            const lang = (values[3] ? values[3].trim() : values[3]) || 'none';
            let icon = values[4] ? values[4].trim() : values[4];

            if (!label || !url || !type) {
                // Invalid item, ignore it.
                return;
            }

            const id = url + '#' + type;
            if (!icon) {
                // Icon not defined, use default one.
                icon = type == 'embedded' ? 'fa-expand' : 'fa-link'; // @todo Find a better icon for embedded.
            }

            if (!map[id]) {
                // New entry, add it to the map.
                map[id] = {
                    url: url,
                    type: type,
                    position: position,
                    labels: {},
                };
                position++;
            }

            map[id].labels[lang.toLowerCase()] = {
                label: label,
                icon: icon,
            };
        });

        if (!position) {
            // No valid items found, stop.
            return result;
        }

        const currentLangApp = await CoreLang.getCurrentLanguage();
        const currentLangLMS = CoreLang.formatLanguage(currentLangApp, CoreLangFormat.LMS);
        const fallbackLang = CoreConstants.CONFIG.default_lang || 'en';

        // Get the right label for each entry and add it to the result.
        for (const id in map) {
            const entry = map[id];
            let data = entry.labels[currentLangApp]
                ?? entry.labels[currentLangLMS]
                ?? entry.labels[currentLangApp + '_only']
                ?? entry.labels[currentLangLMS + '_only']
                ?? entry.labels.none
                ?? entry.labels[fallbackLang];

            if (!data) {
                // No valid label found, get the first one that is not "_only".
                for (const lang in entry.labels) {
                    if (lang.indexOf('_only') == -1) {
                        data = entry.labels[lang];
                        break;
                    }
                }

                if (!data) {
                    // No valid label, ignore this entry.
                    continue;
                }
            }

            result[entry.position] = {
                url: entry.url,
                type: entry.type,
                label: data.label,
                icon: data.icon,
            };
        }

        // Remove undefined values.
        return result.filter((entry) => entry !== undefined);
    }

    /**
     * Get a list of custom menu items from config.
     *
     * @returns List of custom menu items.
     */
    protected async getCustomItemsFromConfig(): Promise<CoreMainMenuCustomItem[]> {
        const items = CoreConstants.CONFIG.customMainMenuItems;

        if (!items) {
            return [];
        }

        const currentLang = await CoreLang.getCurrentLanguage();

        const fallbackLang = CoreConstants.CONFIG.default_lang || 'en';
        const replacements = {
            devicetype: '',
            osversion: Device.version,
        };

        if (CorePlatform.isAndroid()) {
            replacements.devicetype = 'Android';
        } else if (CorePlatform.isIOS()) {
            replacements.devicetype = 'iPhone or iPad';
        } else {
            replacements.devicetype = 'Other';
        }

        return items
            .filter(item => typeof item.label === 'string' || currentLang in item.label || fallbackLang in item.label)
            .map(item => ({
                ...item,
                url: CoreTextUtils.replaceArguments(item.url, replacements, 'uri'),
                label: typeof item.label === 'string'
                    ? item.label
                    : item.label[currentLang] ?? item.label[fallbackLang],
            }));
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
                numElements = Math.floor(window.innerHeight / CoreMainMenuProvider.ITEM_MIN_WIDTH);
            } else {
                numElements = Math.floor(window.innerWidth / CoreMainMenuProvider.ITEM_MIN_WIDTH);

                // Set a maximum elements to show and skip more button.
                numElements = numElements >= 5 ? 5 : numElements;
            }

            // Set a mínimum elements to show and skip more button.
            return numElements > 1 ? numElements - 1 : 1;
        }

        return CoreMainMenuProvider.NUM_MAIN_HANDLERS;
    }

    /**
     * Get tabs placement depending on the device size.
     *
     * @returns Tabs placement including side value.
     */
    getTabPlacement(): 'bottom' | 'side' {
        return CoreScreen.isTablet ? 'side' : 'bottom';
    }

    /**
     * Check if a certain page is the root of a main menu tab.
     *
     * @param pageName Name of the page.
     * @returns Promise resolved with boolean: whether it's the root of a main menu tab.
     */
    async isMainMenuTab(pageName: string): Promise<boolean> {
        if (pageName == CoreMainMenuProvider.MORE_PAGE_NAME) {
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

/**
 * Custom main menu item.
 */
export interface CoreMainMenuCustomItem {
    /**
     * Type of the item: app, inappbrowser, browser or embedded.
     */
    type: string;

    /**
     * Url of the item.
     */
    url: string;

    /**
     * Label to display for the item.
     */
    label: string;

    /**
     * Name of the icon to display for the item.
     */
    icon: string;
}

/**
 * Custom main menu item with localized text.
 */
export type CoreMainMenuLocalizedCustomItem = Omit<CoreMainMenuCustomItem, 'label'> & {
    label: string | Record<CoreLangLanguage, string>;
};

/**
 * Map of custom menu items.
 */
type CustomMenuItemsMap = Record<string, {
    url: string;
    type: string;
    position: number;
    labels: {
        [lang: string]: {
            label: string;
            icon: string;
        };
    };
}>;

export type CoreMainMenuHandlerBadgeUpdatedEventData = {
    handler: string; // Handler name.
    value: number; // New counter value.
};
