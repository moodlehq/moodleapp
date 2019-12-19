
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
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilterDefaultHandler } from '@core/filter/providers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@core/filter/providers/filter';
import { CoreLangProvider } from '@providers/lang';
import { CoreSite } from '@classes/site';

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
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(text: string, filter: CoreFilterFilter, options: CoreFilterFormatTextOptions, siteId?: string)
            : string | Promise<string> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            return this.langProvider.getCurrentLanguage().then((language) => {
                // Match the current language.
                const anyLangRegEx = /<(?:lang|span)[^>]+lang="[a-zA-Z0-9_-]+"[^>]*>(.*?)<\/(?:lang|span)>/g;
                let currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g');

                if (!text.match(currentLangRegEx)) {
                    // Current lang not found. Try to find the first language.
                    const matches = text.match(anyLangRegEx);
                    if (matches && matches[0]) {
                        language = matches[0].match(/lang="([a-zA-Z0-9_-]+)"/)[1];
                        currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>',
                                'g');
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
        });
    }

    /**
     * Check if the filter should be applied in a certain site based on some filter options.
     *
     * @param options Options.
     * @param site Site.
     * @return Whether filter should be applied.
     */
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        // The filter should be applied if site is older than 3.7 or the WS didn't filter the text.
        return options.wsNotFiltered || !site.isVersionGreaterEqualThan('3.7');
    }
}
