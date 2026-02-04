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

import { mockSingleton } from '@/testing/utils';
import { CoreLang, CoreLangProvider } from '@services/lang';

describe('Lang', () => {

    let lang: CoreLangProvider;
    let currentLanguage: string;
    let parentLanguage: string | undefined;

    beforeEach(() => {
        lang = new CoreLangProvider();
        currentLanguage = 'en';

        mockSingleton(CoreLang, {
            getCurrentLanguage: () => Promise.resolve(currentLanguage),
            getParentLanguage: () => parentLanguage,
        });
    });

    it('filters multilang text', async () => {
        await expectMultilangFilter('foo', 'foo');

        await expectMultilangFilter(`
            <span class="multilang" lang="es">Spanish</span>
            <span class="multilang" lang="en">English</span>
            <span class="multilang" lang="ja">Japanese</span>
            <span class="multilang" lang="ES">(ES)</span>
            <span class="multilang" lang="EN">(EN)</span>
            <span class="multilang" lang="JA">(JA)</span>
            <span lang="es" class="multilang">[Spain]</span>
            <span lang="en" class="multilang">[United States]</span>
            <span lang="ja" class="multilang">[Japan]</span>
            text
        `, 'English (EN) [United States] text');

        await expectMultilangFilter(`
            {mlang es}Spanish{mlang}
            {mlang en}English{mlang}
            {mlang ja}Japanese{mlang}
            {mlang ES}(ES){mlang}
            {mlang EN}(EN){mlang}
            {mlang JA}(JA){mlang}
            text
        `, 'English (EN) text');
    });

    it('filters multilang text using regions', async () => {
        currentLanguage = 'en-au';

        await expectMultilangFilter(`
            <span class="multilang" lang="en">English</span>
            <span class="multilang" lang="en-US">English</span>
            <span class="multilang" lang="en_US">(US)</span>
            <span class="multilang" lang="en-AU">English</span>
            <span class="multilang" lang="en_AU">(AU)</span>
            text
        `, 'English (AU) text');

        await expectMultilangFilter(`
            {mlang en}English{mlang}
            {mlang en-US}English{mlang}
            {mlang en_US}(US){mlang}
            {mlang en-AU}English{mlang}
            {mlang en_AU}(AU){mlang}
            text
        `, 'English (AU) text');
    });

    it('filters multilang text using the current language', async () => {
        const multilangText = `
            <span class="multilang" lang="es">Spanish</span>
            <span class="multilang" lang="en">English</span>
            <span class="multilang" lang="ja">Japanese</span>
            text
        `;
        const multilang2Text = `
            {mlang es}Spanish{mlang}
            {mlang en}English{mlang}
            {mlang ja}Japanese{mlang}
            text
        `;

        currentLanguage = 'en';
        await expectMultilangFilter(multilangText, 'English text');
        await expectMultilangFilter(multilang2Text, 'English text');

        currentLanguage = 'es';
        await expectMultilangFilter(multilangText, 'Spanish text');
        await expectMultilangFilter(multilang2Text, 'Spanish text');
    });

    it('filters multilang text using the parent language', async () => {
        currentLanguage = 'ca';
        parentLanguage = 'ja';

        await expectMultilangFilter(`
            <span class="multilang" lang="es">Spanish</span>
            <span class="multilang" lang="en">English</span>
            <span class="multilang" lang="ja">Japanese</span>
            text
        `, 'Japanese text');

        await expectMultilangFilter(`
            {mlang es}Spanish{mlang}
            {mlang en}English{mlang}
            {mlang ja}Japanese{mlang}
            text
        `, 'Japanese text');
    });

    it('filters multilang text using the fallback language', async () => {
        currentLanguage = 'ca';
        parentLanguage = undefined;

        await expectMultilangFilter(`
            <span class="multilang" lang="es">Spanish</span>
            <span class="multilang" lang="en">English</span>
            <span class="multilang" lang="ja">Japanese</span>
            text
        `, 'English text');

        await expectMultilangFilter(`
            {mlang es}Spanish{mlang}
            {mlang en}English{mlang}
            {mlang ja}Japanese{mlang}
            text
        `, 'text');
    });

    it('filters multilang text using the first language', async () => {
        currentLanguage = 'ca';
        parentLanguage = undefined;

        await expectMultilangFilter(`
            <span class="multilang" lang="es">Spanish</span>
            <span class="multilang" lang="ja">Japanese</span>
            text
        `, 'Spanish text');

        await expectMultilangFilter(`
            {mlang es}Spanish{mlang}
            {mlang ja}Japanese{mlang}
            text
        `, 'text');
    });

    /**
     * Test multilang filter (normalizing whitespace).
     *
     * @param text The multilang text to filter.
     * @param expected The expected result.
     */
    async function expectMultilangFilter(text: string, expected: string): Promise<void> {
        const actual = await lang.filterMultilang(text);

        expect(actual.replace(/\s+/g, ' ').trim()).toEqual(expected);
    }

});
