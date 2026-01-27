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

import { CoreLang } from '@services/lang';
import { Translate } from '@singletons';

/**
 * Singleton with helper functions for country lists.
 */
export class CoreCountries {

    static readonly COUNTRIES_TRANSLATION_KEY_PREFIX = 'assets.countries.';

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Get country name based on country code.
     *
     * @param code Country code (AF, ES, US, ...).
     * @returns Country name. If the country is not found, return the country code.
     */
    static getCountryName(code: string): string {
        const countryKey = `${CoreCountries.COUNTRIES_TRANSLATION_KEY_PREFIX}${code}`;
        const countryName = Translate.instant(countryKey);

        return countryName !== countryKey ? countryName : code;
    }

    /**
     * Get list of countries with their code and translated name.
     *
     * @returns Promise resolved with the list of countries.
     */
    static async getCountryList(): Promise<Record<string, string>> {
        // Get the keys of the countries.
        const keys = await CoreCountries.getCountryKeysList();

        // Now get the code and the translated name.
        const countries: Record<string, string> = {};

        keys.forEach((key) => {
            if (key.startsWith(CoreCountries.COUNTRIES_TRANSLATION_KEY_PREFIX)) {
                const code = key.replace(CoreCountries.COUNTRIES_TRANSLATION_KEY_PREFIX, '');
                countries[code] = Translate.instant(key);
            }
        });

        return countries;
    }

    /**
     * Get list of countries with their code and translated name. Sorted by the name of the country.
     *
     * @returns Promise resolved with the list of countries.
     */
    static async getCountryListSorted(): Promise<CoreCountry[]> {
        // Get the keys of the countries.
        const countries = await CoreCountries.getCountryList();

        // Sort translations.
        return Object.keys(countries)
            .sort((a, b) => countries[a].localeCompare(countries[b]))
            .map((code) => ({ code, name: countries[code] }));
    }

    /**
     * Get the list of language keys of the countries.
     *
     * @returns Promise resolved with the countries list. Rejected if not translated.
     */
    protected static async getCountryKeysList(): Promise<string[]> {
        // It's possible that the current language isn't translated, so try with default language first.
        const defaultLang = CoreLang.getDefaultLanguage();

        try {
            return await CoreCountries.getCountryKeysListForLanguage(defaultLang);
        } catch {
            // Not translated, try to use the fallback language.
            const fallbackLang = CoreLang.getFallbackLanguage();

            if (fallbackLang === defaultLang) {
                // Same language, just reject.
                throw new Error('Countries not found.');
            }

            return CoreCountries.getCountryKeysListForLanguage(fallbackLang);
        }
    }

    /**
     * Get the list of language keys of the countries, based on the translation table for a certain language.
     *
     * @param lang Language to check.
     * @returns Promise resolved with the countries list. Rejected if not translated.
     */
    protected static async getCountryKeysListForLanguage(lang: string): Promise<string[]> {
        // Get the translation table for the countries.
        const table = await CoreLang.getMessages(lang, CoreCountries.COUNTRIES_TRANSLATION_KEY_PREFIX);
        const keys = Object.keys(table);

        if (keys.length === 0) {
            // Not translated, reject.
            throw new Error('Countries not found.');
        }

        return keys;
    }

}

/**
 * Data about a country.
 */
export type CoreCountry = {
    code: string;
    name: string;
};
