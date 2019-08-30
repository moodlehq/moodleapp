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
import { Platform, Config } from 'ionic-angular';
import { CoreConfigProvider } from './config';
import { CoreConfigConstants } from '../configconstants';

/*
 * Service to handle language features, like changing the current language.
*/
@Injectable()
export class CoreLangProvider {
    protected fallbackLanguage = 'en'; // Always use English as fallback language since it contains all strings.
    protected defaultLanguage = CoreConfigConstants.default_lang || 'en'; // Lang to use if device lang not valid or is forced.
    protected currentLanguage: string; // Save current language in a variable to speed up the get function.
    protected customStrings = {}; // Strings defined using the admin tool.
    protected customStringsRaw: string;
    protected sitePluginsStrings = {}; // Strings defined by site plugins.

    constructor(private translate: TranslateService, private configProvider: CoreConfigProvider, platform: Platform,
            private globalization: Globalization, private config: Config) {
        // Set fallback language and language to use until the app determines the right language to use.
        translate.setDefaultLang(this.fallbackLanguage);
        translate.use(this.defaultLanguage);

        platform.ready().then(() => {
            this.getCurrentLanguage().then((language) => {
                this.changeCurrentLanguage(language);
            });
        });

        translate.onLangChange.subscribe((event: any) => {
            platform.setLang(event.lang, true);
            platform.setDir(this.translate.instant('core.thisdirection'), true);
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
        lang = lang.replace(/_/g, '-'); // Use the app format instead of Moodle format.

        // Initialize structure if it doesn't exist.
        if (!this.sitePluginsStrings[lang]) {
            this.sitePluginsStrings[lang] = {};
        }

        for (const key in strings) {
            const prefixedKey = prefix + key;
            let value = strings[key];

            if (this.customStrings[lang] && this.customStrings[lang][prefixedKey]) {
                // This string is overridden by a custom string, ignore it.
                continue;
            }

            // Replace the way to access subproperties.
            value = value.replace(/\$a->/gm, '$a.');
            // Add another curly bracket to string params ({$a} -> {{$a}}).
            value = value.replace(/{([^ ]+)}/gm, '{{$1}}');
            // Make sure we didn't add to many brackets in some case.
            value = value.replace(/{{{([^ ]+)}}}/gm, '{{$1}}');

            // Load the string.
            this.loadString(this.sitePluginsStrings, lang, prefixedKey, value);
        }
    }

    /**
     * Capitalize a string (make the first letter uppercase).
     * We cannot use a function from text utils because it would cause a circular dependency.
     *
     * @param {string} value String to capitalize.
     * @return {string} Capitalized string.
     */
    protected capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    /**
     * Change current language.
     *
     * @param {string} language New language to use.
     * @return {Promise<any>} Promise resolved when the change is finished.
     */
    changeCurrentLanguage(language: string): Promise<any> {
        const promises = [];

        // Change the language, resolving the promise when we receive the first value.
        promises.push(new Promise((resolve, reject): void => {
            const subscription = this.translate.use(language).subscribe((data) => {
                // It's a language override, load the original one first.
                const fallbackLang = this.translate.instant('core.parentlanguage');

                if (fallbackLang != '' && fallbackLang != 'core.parentlanguage' && fallbackLang != language) {
                    const fallbackSubs = this.translate.use(fallbackLang).subscribe((fallbackData) => {
                        data = Object.assign(fallbackData, data);
                        resolve(data);

                        // Data received, unsubscribe. Use a timeout because we can receive a value immediately.
                        setTimeout(() => {
                            fallbackSubs.unsubscribe();
                        });
                    }, (error) => {
                        // Resolve with the original language.
                        resolve(data);

                        // Error received, unsubscribe. Use a timeout because we can receive a value immediately.
                        setTimeout(() => {
                            fallbackSubs.unsubscribe();
                        });
                    });
                } else {
                    resolve(data);
                }

                // Data received, unsubscribe. Use a timeout because we can receive a value immediately.
                setTimeout(() => {
                    subscription.unsubscribe();
                });
            }, (error) => {
                reject(error);

                // Error received, unsubscribe. Use a timeout because we can receive a value immediately.
                setTimeout(() => {
                    subscription.unsubscribe();
                });
            });
        }));

        // Change the config.
        promises.push(this.configProvider.set('current_language', language));

        // Use british english when parent english is loaded.
        moment.locale(language == 'en' ? 'en-gb' : language);

        // Set data for ion-datetime.
        this.config.set('monthNames', moment.months().map(this.capitalize.bind(this)));
        this.config.set('monthShortNames', moment.monthsShort().map(this.capitalize.bind(this)));
        this.config.set('dayNames', moment.weekdays().map(this.capitalize.bind(this)));
        this.config.set('dayShortNames', moment.weekdaysShort().map(this.capitalize.bind(this)));

        this.currentLanguage = language;

        return Promise.all(promises).finally(() => {
            // Load the custom and site plugins strings for the language.
            if (this.loadLangStrings(this.customStrings, language) || this.loadLangStrings(this.sitePluginsStrings, language)) {
                // Some lang strings have changed, emit an event to update the pipes.
                this.translate.onLangChange.emit({lang: language, translations: this.translate.translations[language]});
            }
        });
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
            if (CoreConfigConstants.default_lang && CoreConfigConstants.forcedefaultlanguage) {
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

                    if (typeof CoreConfigConstants.languages[language] == 'undefined') {
                        // Language not supported, use default language.
                        return this.defaultLanguage;
                    }

                    return language;
                }).catch(() => {
                    // Error getting locale. Use default language.
                    return this.defaultLanguage;
                });
            } catch (err) {
                // Error getting locale. Use default language.
                return Promise.resolve(this.defaultLanguage);
            }
        }).then((language) => {
            this.currentLanguage = language; // Save it for later.

            return language;
        });
    }

    /**
     * Get the default language.
     *
     * @return {string} Default language.
     */
    getDefaultLanguage(): string {
        return this.defaultLanguage;
    }

    /**
     * Get the fallback language.
     *
     * @return {string} Fallback language.
     */
    getFallbackLanguage(): string {
        return this.fallbackLanguage;
    }

    /**
     * Get the full list of translations for a certain language.
     *
     * @param {string} lang The language to check.
     * @return {Promise<any>} Promise resolved when done.
     */
    getTranslationTable(lang: string): Promise<any> {
        // Create a promise to convert the observable into a promise.
        return new Promise((resolve, reject): void => {
            const observer = this.translate.getTranslation(lang).subscribe((table) => {
                resolve(table);
                observer.unsubscribe();
            }, (err) => {
                reject(err);
                observer.unsubscribe();
            });
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

            lang = values[2].replace(/_/g, '-'); // Use the app format instead of Moodle format.

            if (!this.customStrings[lang]) {
                this.customStrings[lang] = {};
            }

            // Convert old keys format to new one.
            const key = values[0].replace(/^mm\.core/, 'core').replace(/^mm\./, 'core.').replace(/^mma\./, 'addon.')
                    .replace(/^core\.sidemenu/, 'core.mainmenu').replace(/^addon\.grades/, 'core.grades')
                    .replace(/^addon\.participants/, 'core.user');

            this.loadString(this.customStrings, lang, key, values[1]);
        });

        this.customStringsRaw = strings;
    }

    /**
     * Load custom strings for a certain language that weren't loaded because the language wasn't active.
     *
     * @param {any} langObject The object with the strings to load.
     * @param {string} lang Language to load.
     * @return {boolean} Whether the translation table was modified.
     */
    loadLangStrings(langObject: any, lang: string): boolean {
        let langApplied = false;

        if (langObject[lang]) {
            for (const key in langObject[lang]) {
                const entry = langObject[lang][key];

                if (!entry.applied) {
                    // Store the original value of the string.
                    entry.original = this.translate.translations[lang][key];

                    // Store the string in the translations table.
                    this.translate.translations[lang][key] = entry.value;

                    entry.applied = true;
                    langApplied = true;
                }
            }
        }

        return langApplied;
    }

    /**
     * Load a string in a certain lang object and in the translate table if the lang is loaded.
     *
     * @param {any} langObject The object where to store the lang.
     * @param {string} lang Language code.
     * @param {string} key String key.
     * @param {string} value String value.
     */
    loadString(langObject: any, lang: string, key: string, value: string): void {
        lang = lang.replace(/_/g, '-'); // Use the app format instead of Moodle format.

        if (this.translate.translations[lang]) {
            // The language is loaded.
            // Store the original value of the string.
            langObject[lang][key] = {
                original: this.translate.translations[lang][key],
                value: value,
                applied: true
            };

            // Store the string in the translations table.
            this.translate.translations[lang][key] = value;
        } else {
            // The language isn't loaded.
            // Save it in our object but not in the translations table, it will be loaded when the lang is loaded.
            langObject[lang][key] = {
                value: value,
                applied: false
            };
        }
    }

    /**
     * Unload custom or site plugin strings, removing them from the translations table.
     *
     * @param {any} strings Strings to unload.
     */
    protected unloadStrings(strings: any): void {
        // Iterate over all languages and strings.
        for (const lang in strings) {
            if (!this.translate.translations[lang]) {
                // Language isn't loaded, nothing to unload.
                continue;
            }

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
