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
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { Globalization } from '@ionic-native/globalization';
import { Platform } from 'ionic-angular';
import { CoreConfigProvider } from './config';
import { CoreConfigConstants } from '../configconstants';

/*
 * Service to handle language features, like changing the current language.
*/
@Injectable()
export class CoreLangProvider {
    protected fallbackLanguage = CoreConfigConstants.default_lang || 'en';
    protected currentLanguage: string; // Save current language in a variable to speed up the get function.
    protected customStrings = {}; // Strings defined using the admin tool.
    protected customStringsRaw: string;
    protected sitePluginsStrings = {}; // Strings defined by site plugins.

    constructor(private translate: TranslateService, private configProvider: CoreConfigProvider, platform: Platform,
            private globalization: Globalization) {
        // Set fallback language and language to use until the app determines the right language to use.
        translate.setDefaultLang(this.fallbackLanguage);
        translate.use(this.fallbackLanguage);

        platform.ready().then(() => {
            this.getCurrentLanguage().then((language) => {
                translate.use(language);
                moment.locale(language);
            });
        });
    }

    /**
     * Add a set of site plugins strings for a certain language.
     *
     * @param {string} lang The language where to add the strings.
     * @param {any} strings Object with the strings to add.
     * @param {string} [prefix] A prefix to add to all keys.
     */
    addSitePluginsStrings(lang: string, strings: any, prefix?: string): void {
        // Initialize structures if they don't exist.
        if (!this.sitePluginsStrings[lang]) {
            this.sitePluginsStrings[lang] = {};
        }
        if (!this.translate.translations[lang]) {
            this.translate.translations[lang] = {};
        }

        for (const key in strings) {
            const prefixedKey = prefix + key;
            let value = strings[key];

            if (this.customStrings[lang] && this.customStrings[lang][prefixedKey]) {
                // This string is overridden by a custom string, ignore it.
                continue;
            }

            // Add another curly bracket to string params ({$a} -> {{$a}}).
            value = value.replace(/{([^ ]+)}/gm, '{{$1}}');
            // Make sure we didn't add to many brackets in some case.
            value = value.replace(/{{{([^ ]+)}}}/gm, '{{$1}}');

            if (!this.sitePluginsStrings[lang][prefixedKey]) {
                // It's a new site plugin string. Store the original value.
                this.sitePluginsStrings[lang][prefixedKey] = {
                    original: this.translate.translations[lang][prefixedKey],
                    value: value
                };
            } else {
                // Site plugin string already defined. Store the new value.
                this.sitePluginsStrings[lang][prefixedKey].value = value;
            }

            // Store the string in the translations table.
            this.translate.translations[lang][prefixedKey] = value;
        }
    }

    /**
     * Change current language.
     *
     * @param {string} language New language to use.
     * @return {Promise<any>} Promise resolved when the change is finished.
     */
    changeCurrentLanguage(language: string): Promise<any> {
        const promises = [];

        promises.push(this.translate.use(language));
        promises.push(this.configProvider.set('current_language', language));

        moment.locale(language);
        this.currentLanguage = language;

        return Promise.all(promises);
    }

    /**
     * Clear current custom strings.
     */
    clearCustomStrings(): void {
        this.unloadStrings(this.customStrings);
        this.customStrings = {};
        this.customStringsRaw = '';
    }

    /**
     * Clear current site plugins strings.
     */
    clearSitePluginsStrings(): void {
        this.unloadStrings(this.sitePluginsStrings);
        this.sitePluginsStrings = {};
    }

    /**
     * Get all current custom strings.
     *
     * @return {any} Custom strings.
     */
    getAllCustomStrings(): any {
        return this.customStrings;
    }

    /**
     * Get all current site plugins strings.
     *
     * @return {any} Site plugins strings.
     */
    getAllSitePluginsStrings(): any {
        return this.sitePluginsStrings;
    }

    /**
     * Get current language.
     *
     * @return {Promise<string>} Promise resolved with the current language.
     */
    getCurrentLanguage(): Promise<string> {

        if (typeof this.currentLanguage != 'undefined') {
            return Promise.resolve(this.currentLanguage);
        }

        // Get current language from config (user might have changed it).
        return this.configProvider.get('current_language').then((language) => {
            return language;
        }).catch(() => {
            // User hasn't defined a language. If default language is forced, use it.
            if (!CoreConfigConstants.forcedefaultlanguage) {
                return CoreConfigConstants.default_lang;
            }

            try {
                // No forced language, try to get current language from cordova globalization.
                return this.globalization.getPreferredLanguage().then((result) => {
                    let language = result.value.toLowerCase();
                    if (language.indexOf('-') > -1) {
                        // Language code defined by locale has a dash, like en-US or es-ES. Check if it's supported.
                        if (CoreConfigConstants.languages && typeof CoreConfigConstants.languages[language] == 'undefined') {
                            // Code is NOT supported. Fallback to language without dash. E.g. 'en-US' would fallback to 'en'.
                            language = language.substr(0, language.indexOf('-'));

                        }
                    }

                    return language;
                }).catch(() => {
                    // Error getting locale. Use default language.
                    return this.fallbackLanguage;
                });
            } catch (err) {
                // Error getting locale. Use default language.
                return Promise.resolve(this.fallbackLanguage);
            }
        }).then((language) => {
            this.currentLanguage = language; // Save it for later.

            return language;
        });
    }

    /**
     * Load certain custom strings.
     *
     * @param {string} strings Custom strings to load (tool_mobile_customlangstrings).
     */
    loadCustomStrings(strings: string): void {
        if (strings == this.customStringsRaw) {
            // Strings haven't changed, stop.
            return;
        }

        // Reset current values.
        this.clearCustomStrings();

        if (!strings) {
            return;
        }

        const list: string[] = strings.split(/(?:\r\n|\r|\n)/);
        list.forEach((entry: string) => {
            const values: string[] = entry.split('|');
            let lang: string;

            if (values.length < 3) {
                // Not enough data, ignore the entry.
                return;
            }

            lang = values[2];

            if (!this.customStrings[lang]) {
                this.customStrings[lang] = {};
            }

            // Store the original value of the custom string.
            this.customStrings[lang][values[0]] = {
                original: this.translate.translations[lang][values[0]],
                value: values[1]
            };

            // Store the string in the translations table.
            this.translate.translations[lang][values[0]] = values[1];
        });
    }

    /**
     * Unload custom or site plugin strings, removing them from the translations table.
     *
     * @param {any} strings Strings to unload.
     */
    protected unloadStrings(strings: any): void {
        // Iterate over all languages and strings.
        for (const lang in strings) {
            const langStrings = strings[lang];
            for (const key in langStrings) {
                const entry = langStrings[key];
                if (entry.original) {
                    // The string had a value, restore it.
                    this.translate.translations[lang][key] = entry.original;
                } else {
                    // The string didn't exist, delete it.
                    delete this.translate.translations[lang][key];
                }
            }
        }
    }
}
