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
import { CoreLangProvider } from '../../../providers/lang';
import { CoreSitesProvider } from '../../../providers/sites';
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
};

/**
 * Service that provides some features regarding Main Menu.
 */
@Injectable()
export class CoreMainMenuProvider {
    public static NUM_MAIN_HANDLERS = 4;

    constructor(private langProvider: CoreLangProvider, private sitesProvider: CoreSitesProvider) {}

    /**
     * Get a list of custom menu items for a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<CoreMainMenuCustomItem[]>} List of custom menu items.
     */
    getCustomMenuItems(siteId?: string) : Promise<CoreMainMenuCustomItem[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            let itemsString = site.getStoredConfig('tool_mobile_custommenuitems'),
                items,
                position = 0, // Position of each item, to keep the same order as it's configured.
                map = {},
                result = [];

            if (!itemsString || typeof itemsString != 'string') {
                // Setting not valid.
                return result;
            }

            // Add items to the map.
            items = itemsString.split(/(?:\r\n|\r|\n)/);
            items.forEach((item) => {
                let values = item.split('|'),
                    id,
                    label = values[0] ? values[0].trim() : values[0],
                    url = values[1] ? values[1].trim() : values[1],
                    type = values[2] ? values[2].trim() : values[2],
                    lang = (values[3] ? values[3].trim() : values[3]) || 'none',
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
                const fallbackLang = CoreConfigConstants.default_lang || 'en';

                // Get the right label for each entry and add it to the result.
                for (let id in map) {
                    let entry = map[id],
                        data = entry.labels[currentLang] || entry.labels[currentLang + '_only'] ||
                            entry.labels.none || entry.labels[fallbackLang];

                    if (!data) {
                        // No valid label found, get the first one that is not "_only".
                        for (let lang in entry.labels) {
                            if (lang.indexOf('_only') == -1) {
                                data = entry.labels[lang];
                                break;
                            }
                        }

                        if (!data) {
                            // No valid label, ignore this entry.
                            return;
                        }
                    }

                    result[entry.position] = {
                        url: entry.url,
                        type: entry.type,
                        label: data.label,
                        icon: data.icon
                    };
                }

                return result;
            });
        });
    }
}
