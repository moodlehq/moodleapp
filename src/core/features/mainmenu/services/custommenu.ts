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

import { Injectable, Type } from '@angular/core';

import { CoreConstants, CoreLinkOpenMethod } from '@/core/constants';
import { CoreLang, CoreLangFormat, CoreLangLanguage } from '@services/lang';
import { Device, makeSingleton } from '@singletons';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreText } from '@static/text';

/**
 * Service that provides some features regarding custom main and user menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreCustomMenuService {

    protected static readonly CUSTOM_MAIN_MENU_ITEMS_CONFIG = 'tool_mobile_custommenuitems';
    protected static readonly CUSTOM_USER_MENU_ITEMS_CONFIG = 'tool_mobile_customusermenuitems';

    /**
     * Get a list of custom main menu items.
     *
     * @param siteId Site to get custom items from.
     * @returns List of custom menu items.
     */
    async getCustomMainMenuItems(siteId?: string): Promise<CoreCustomMenuItem[]> {
        const customItems = await Promise.all([
            this.getCustomMenuItemsFromSite(CoreCustomMenuService.CUSTOM_MAIN_MENU_ITEMS_CONFIG, siteId),
            this.getCustomItemsFromConfig(CoreConstants.CONFIG.customMainMenuItems),
        ]);

        return customItems.flat();
    }

    /**
     * Get a list of custom user menu items.
     *
     * @param siteId Site to get custom items from.
     * @returns List of custom menu items.
     */
    async getUserCustomMenuItems(siteId?: string): Promise<CoreCustomMenuItem[]> {
        const customItems = await Promise.all([
            this.getCustomMenuItemsFromSite(CoreCustomMenuService.CUSTOM_USER_MENU_ITEMS_CONFIG, siteId),
            this.getCustomItemsFromConfig(CoreConstants.CONFIG.customUserMenuItems),
        ]);

        return customItems.flat();
    }

    /**
     * Get a list of custom menu items for a certain site.
     *
     * @param config Config key to get items from.
     * @param siteId Site ID. If not defined, current site.
     * @returns List of custom menu items.
     */
    protected async getCustomMenuItemsFromSite(config: string, siteId?: string): Promise<CoreCustomMenuItem[]> {
        const site = await CoreSites.getSite(siteId);

        const itemsString = site.getStoredConfig(config);
        if (!itemsString || typeof itemsString !== 'string') {
            // Setting not valid.
            return [];
        }

        const map: CustomMenuItemsMap = {};
        const result: CoreCustomMenuItem[] = [];

        let position = 0; // Position of each item, to keep the same order as it's configured.

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

            const id = `${url}#${type}`;
            if (!icon) {
                // Icon not defined, use default one.
                icon = type === CoreLinkOpenMethod.EMBEDDED
                    ? 'fas-expand' // @todo Find a better icon for embedded.
                    : 'fas-link';
            }

            if (!map[id]) {
                // New entry, add it to the map.
                map[id] = {
                    url,
                    type: type as CoreLinkOpenMethod,
                    position,
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

        const onlySuffix = '_only';

        // Get the right label for each entry and add it to the result.
        for (const id in map) {
            const entry = map[id];
            let data = entry.labels[currentLangApp]
                ?? entry.labels[currentLangLMS]
                ?? entry.labels[`${currentLangApp}${onlySuffix}`]
                ?? entry.labels[`${currentLangLMS}${onlySuffix}`]
                ?? entry.labels.none
                ?? entry.labels[fallbackLang];

            if (!data) {
                // No valid label found, get the first one that is not "_only".
                for (const lang in entry.labels) {
                    if (!lang.endsWith(onlySuffix)) {
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
     * @param items Items from config.
     * @returns List of custom menu items.
     */
    protected async getCustomItemsFromConfig(items?: CoreCustomMenuLocalizedCustomItem[]): Promise<CoreCustomMenuItem[]> {
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
                url: CoreText.replaceArguments(item.url, replacements, 'uri'),
                label: typeof item.label === 'string'
                    ? item.label
                    : item.label[currentLang] ?? item.label[fallbackLang],
            }));
    }

    /**
     * Get the class of the component to render for custom menu items. If not defined, the default component will be used.
     * This method can be overridden in subclasses to provide a custom component to render the custom menu items.
     *
     * @returns The class of the component to render for custom menu items, or `undefined` to use the default component.
     */
    async getCustomItemComponent(): Promise<Type<unknown> | undefined> {
        return undefined;
    }

}

export const CoreCustomMenu = makeSingleton(CoreCustomMenuService);

/**
 * Custom main menu item.
 */
export type CoreCustomMenuItem = {
    /**
     * Type of the item: app, inappbrowser, browser or embedded.
     */
    type: CoreLinkOpenMethod;

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

    /**
     * Extra data to add additional features.
     */
    extraData?: Record<string, unknown>;
};

/**
 * Custom menu item with localized text.
 */
export type CoreCustomMenuLocalizedCustomItem = Omit<CoreCustomMenuItem, 'label'> & {
    label: string | Record<CoreLangLanguage, string>;
};

/**
 * Map of custom menu items.
 */
type CustomMenuItemsMap = Record<string, {
    url: string;
    type: CoreLinkOpenMethod;
    position: number;
    labels: {
        [lang: string]: {
            label: string;
            icon: string;
        };
    };
}>;
