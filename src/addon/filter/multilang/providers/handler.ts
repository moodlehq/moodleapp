
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
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilterDefaultHandler } from '@core/filter/providers/default-filter';
import { CoreFilterFilter } from '@core/filter/providers/filter';
import { CoreLangProvider } from '@providers/lang';

/**
 * Handler to support the Multilang filter.
 */
@Injectable()
export class AddonFilterMultilangHandler extends CoreFilterDefaultHandler {
    name = 'AddonFilterMultilangHandler';
    filterName = 'multilang';

    constructor(private langProvider: CoreLangProvider,
            private sitesProvider: CoreSitesProvider) {
        super();
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        // In Moodle versions older than 3.7, some specific content can be received unfiltered. Filter it in the app.
        const currentSite = this.sitesProvider.getCurrentSite();

        return !currentSite.isVersionGreaterEqualThan('3.7');
    }

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(text: string, filter: CoreFilterFilter, options: any): string | Promise<string> {

        return this.langProvider.getCurrentLanguage().then((language) => {
            // Match the current language.
            const anyLangRegEx = /<(?:lang|span)[^>]+lang="[a-zA-Z0-9_-]+"[^>]*>(.*?)<\/(?:lang|span)>/g;
            let currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g');

            if (!text.match(currentLangRegEx)) {
                // Current lang not found. Try to find the first language.
                const matches = text.match(anyLangRegEx);
                if (matches && matches[0]) {
                    language = matches[0].match(/lang="([a-zA-Z0-9_-]+)"/)[1];
                    currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g');
                } else {
                    // No multi-lang tag found, stop.
                    return text;
                }
            }
            // Extract contents of current language.
            text = text.replace(currentLangRegEx, '$1');
            // Delete the rest of languages
            text = text.replace(anyLangRegEx, '');

            return text;
        });
    }
}
