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
import { makeSingleton } from '@singletons';

/**
 * Handler to support the multilang2 community filter.
 *
 * @see https://moodle.org/plugins/filter_multilang2
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMultilang2HandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterMultilang2Handler';
    filterName = 'multilang2';
    replacementDone = false;

    /**
     * This function filters the received text based on the language
     * tags embedded in the text, and the current user language or
     * 'other', if present.
     *
     * @param text The text to filter.
     * @returns string The filtered text for this multilang block.
     */
    async filter(text: string): Promise<string> {
        if (text.indexOf('mlang') === -1) {
            return text;
        }

        const currentLang = await CoreLang.getCurrentLanguage();
        this.replacementDone = false;
        const parentLanguage = CoreLang.getParentLanguage();

        const search = /{\s*mlang\s+((?:[a-z0-9_-]+)(?:\s*,\s*[a-z0-9_-]+\s*)*)\s*}(.*?){\s*mlang\s*}/gim;
        const result = text.replace(
            search,
            (subString, language, content) => this.replaceLangs(currentLang, [subString, language, content], parentLanguage),
        );

        if (result === null) {
            return text; // Error during regex processing, keep original text.
        }

        if (this.replacementDone) {
            return result;
        }

        const result2 = text.replace(
            search,
            (subString, language, content) => this.replaceLangs('other', [subString, language, content], parentLanguage),
        );

        return result2 ?? text;
    }

    /**
     * This function filters the current block of multilang tag. If
     * any of the tag languages (or their parent languages) match the
     * specified filtering language, it returns the text of the
     * block. Otherwise it returns an empty string.
     *
     * @param replaceLang A string that specifies the language used to filter the matches.
     * @param langBlock An array containing the matching captured pieces of the
     * regular expression. They are the languages of the tag, and the text associated with those languages.
     * @param parentLanguage A string that contains the parent language.
     *
     * @returns replaced string.
     */
    protected replaceLangs(replaceLang: string, langBlock: string[], parentLanguage: string | undefined): string {
        // Normalize languages.
        const blockLangs = (langBlock[1] ?? '').replace(/ /g, '').replace(/_/g, '-').toLowerCase().split(',');
        const blockText = langBlock[2] ?? '';

        for (const blockLang of blockLangs) {
            /* We don't check for empty values of blockLang as they simply don't
             * match any language and they don't produce any errors or warnings.
             */
            if (blockLang === replaceLang || parentLanguage === blockLang) {
                this.replacementDone = true;

                return blockText;
            }
        }

        return '';
    }

}

export const AddonFilterMultilang2Handler = makeSingleton(AddonFilterMultilang2HandlerService);
