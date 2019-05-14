// (C) Copyright 2015 Martin Dougiamas
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
import { NavController } from 'ionic-angular';
import { CoreLangProvider } from '@providers/lang';
import { CoreSitesProvider } from '@providers/sites';
import { CoreConfigConstants } from '../../../configconstants';

/**
 * Custom main menu item.
 */
export interface CoreMainMenuCustomItem {
    /**
     * Type of the item: app, inappbrowser, browser or embedded.
     * @type {string}
     */
    type: string;

    /**
     * Url of the item.
     * @type {string}
     */
    url: string;

    /**
     * Label to display for the item.
     * @type {string}
     */
    label: string;

    /**
     * Name of the icon to display for the item.
     * @type {string}
     */
    icon: string;
}

/**
 * Service that provides some features regarding Main Menu.
 */
@Injectable()
export class CoreMainMenuProvider {
    static NUM_MAIN_HANDLERS = 4;
    static ITEM_MIN_WIDTH = 72; // Min with of every item, based on 5 items on a 360 pixel wide screen.
    protected tablet = false;

    constructor(private langProvider: CoreLangProvider, private sitesProvider: CoreSitesProvider) {
        this.tablet = window && window.innerWidth && window.innerWidth >= 576 && window.innerHeight >= 576;
    }

    /**
     * Get a list of custom menu items for a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<CoreMainMenuCustomItem[]>} List of custom menu items.
     */
    getCustomMenuItems(siteId?: string): Promise<CoreMainMenuCustomItem[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const itemsString = site.getStoredConfig('tool_mobile_custommenuitems'),
                map = {},
                result = [];

            let items,
                position = 0; // Position of each item, to keep the same order as it's configured.

            if (!itemsString || typeof itemsString != 'string') {
                // Setting not valid.
                return result;
            }

            // Add items to the map.
            items = itemsString.split(/(?:\r\n|\r|\n)/);
            items.forEach((item) => {
                const values = item.split('|'),
                    label = values[0] ? values[0].trim() : values[0],
                    url = values[1] ? values[1].trim() : values[1],
                    type = values[2] ? values[2].trim() : values[2],
                    lang = (values[3] ? values[3].trim() : values[3]) || 'none';
                let id,
                    icon = values[4] ? values[4].trim() : values[4];

                if (!label || !url || !type) {
                    // Invalid item, ignore it.
                    return;
                }

                id = url + '#' + type;
                if (!icon) {
                    // Icon not defined, use default one.
                    icon = type == 'embedded' ? 'qr-scanner' : 'link';
                }

                if (!map[id]) {
                    // New entry, add it to the map.
                    map[id] = {
                        url: url,
                        type: type,
                        position: position,
                        labels: {}
                    };
                    position++;
                }

                map[id].labels[lang.toLowerCase()] = {
                    label: label,
                    icon: icon
                };
            });

            if (!position) {
                // No valid items found, stop.
                return result;
            }

            return this.langProvider.getCurrentLanguage().then((currentLang) => {
                const fallbackLang = CoreConfigConstants.default_lang || 'en';

                // Get the right label for each entry and add it to the result.
                for (const id in map) {
                    const entry = map[id];
                    let data = entry.labels[currentLang] || entry.labels[currentLang + '_only'] ||
                            entry.labels.none || entry.labels[fallbackLang];

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
                        icon: data.icon
                    };
                }

                // Remove undefined values.
                return result.filter((entry) => {
                    return typeof entry != 'undefined';
                });
            });
        });
    }

    /**
     * Get the number of items to be shown on the main menu bar.
     *
     * @return {number} Number of items depending on the device width.
     */
    getNumItems(): number {
        if (!this.isResponsiveMainMenuItemsDisabledInCurrentSite() && window && window.innerWidth) {
            let numElements;

            if (this.tablet) {
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
     * @param  {NavController} navCtrl  NavController to resize the content.
     * @return {string}                Tabs placement including side value.
     */
    getTabPlacement(navCtrl: NavController): string {
        const tablet = window && window.innerWidth && window.innerWidth >= 576 && window.innerHeight >= 576;

        if (tablet != this.tablet) {
            this.tablet = tablet;

            // Resize so content margins can be updated.
            setTimeout(() => {
                navCtrl.resize();
            }, 500);
        }

        return tablet ? 'side' : 'bottom';
    }

    /**
     * Check if responsive main menu items is disabled in the current site.
     *
     * @return {boolean} Whether it's disabled.
     */
    protected isResponsiveMainMenuItemsDisabledInCurrentSite(): boolean {
        const site = this.sitesProvider.getCurrentSite();

        return site && site.isFeatureDisabled('NoDelegate_ResponsiveMainMenuItems');
    }
}
