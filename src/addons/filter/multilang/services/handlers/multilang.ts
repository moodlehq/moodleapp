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

import { CoreLang } from '@services/lang';
import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton } from '@singletons';

/**
 * Handler to support the Multilang filter in core.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMultilangHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterMultilangHandler';
    filterName = 'multilang';

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @returns Filtered text (or promise resolved with the filtered text).
     */
    async filter(
        text: string,
        filter?: CoreFilterFilter, // eslint-disable-line @typescript-eslint/no-unused-vars
        options?: CoreFilterFormatTextOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<string> {
        // Get available languages.
        const regex = /<(?:lang|span)[^>]+lang="([a-zA-Z0-9_-]+)"[^>]*>.*?<\/(?:lang|span)>/img;
        const languages: Set<string> = new Set();
        let firstLanguage: string | undefined;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text))) {
            const language = match[1].toLowerCase().replace(/_/g, '-');
            firstLanguage = firstLanguage ?? language;

            languages.add(language);
        }

        // Find language to use.
        const language = [
            await CoreLang.getCurrentLanguage(),
            CoreLang.getParentLanguage(),
            CoreLang.getFallbackLanguage(),
            firstLanguage,
        ]
            .find(candidate => candidate && languages.has(candidate));

        if (!language) {
            return text;
        }

        // Apply filter.
        const anyLangRegEx = /<(lang|span)[^>]+lang="[a-zA-Z0-9_-]+"[^>]*>.*?<\/(lang|span)>/img;
        const languageRegEx = language.replace(/-/g, '(?:-|_)');
        const currentLangRegEx = new RegExp(`<(?:lang|span)[^>]+lang="${languageRegEx}"[^>]*>(.*?)</(?:lang|span)>`, 'img');

        text = text.replace(currentLangRegEx, '$1');
        text = text.replace(anyLangRegEx, '');

        return text;
    }

    /**
     * Check if the filter should be applied in a certain site based on some filter options.
     *
     * @param options Options.
     * @param site Site.
     * @returns Whether filter should be applied.
     */
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        // The filter should be applied if site is older than 3.7 or the WS didn't filter the text.
        return !!(options.wsNotFiltered || (site && !site.isVersionGreaterEqualThan('3.7')));
    }

}

export const AddonFilterMultilangHandler = makeSingleton(AddonFilterMultilangHandlerService);
