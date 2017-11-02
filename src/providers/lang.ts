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
    fallbackLanguage:string = 'en'; // mmCoreConfigConstants.default_lang || 'en',
    currentLanguage: string; // Save current language in a variable to speed up the get function.
    customStrings = {};
    customStringsRaw: string;

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

        this.decorateTranslate();
    }

    /**
     * Change current language.
     *
     * @param {string} language New language to use.
     * @return {Promise<any>} Promise resolved when the change is finished.
     */
    changeCurrentLanguage(language: string) : Promise<any> {
        let promises = [];

        promises.push(this.translate.use(language));
        promises.push(this.configProvider.set('current_language', language));

        moment.locale(language);
        this.currentLanguage = language;
        return Promise.all(promises);
    };

    /**
     * Clear current custom strings.
     */
    clearCustomStrings() : void {
        this.customStrings = {};
        this.customStringsRaw = '';
    };

    /**
     * Function to "decorate" the TranslateService.
     * Basically, it extends the translate functions to use the custom lang strings.
     */
    decorateTranslate() : void {
        let originalGet = this.translate.get,
            originalInstant = this.translate.instant;

        // Redefine translate.get.
        this.translate.get = (key: string|string[], interpolateParams?: object) => {
            // Always call the original get function to avoid having to create our own Observables.
            if (typeof key == 'string') {
                let value = this.getCustomString(key);
                if (typeof value != 'undefined') {
                    key = value;
                }
            } else {
                key = this.getCustomStrings(key).translations;
            }
            return originalGet.apply(this.translate, [key, interpolateParams]);
        };

        // Redefine translate.instant.
        this.translate.instant = (key: string|string[], interpolateParams?: object) => {
            if (typeof key == 'string') {
                let value = this.getCustomString(key);
                if (typeof value != 'undefined') {
                    return value;
                }
                return originalInstant.apply(this.translate, [key, interpolateParams]);
            } else {
                let result = this.getCustomStrings(key);
                if (result.allFound) {
                    return result.translations;
                }
                return originalInstant.apply(this.translate, [result.translations]);
            }
        };
    }

    /**
     * Get all current custom strings.
     *
     * @return {any} Custom strings.
     */
    getAllCustomStrings() : any {
        return this.customStrings;
    };

    /**
     * Get current language.
     *
     * @return {Promise<string>} Promise resolved with the current language.
     */
    getCurrentLanguage() : Promise<string> {

        if (typeof this.currentLanguage != 'undefined') {
            return Promise.resolve(this.currentLanguage);
        }

        // Get current language from config (user might have changed it).
        return this.configProvider.get('current_language').then((language) => {
            return language;
        }).catch(() => {
            // User hasn't defined a language. If default language is forced, use it.
            if (CoreConfigConstants.forcedefaultlanguage && !CoreConfigConstants.forcedefaultlanguage) {
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
            } catch(err) {
                // Error getting locale. Use default language.
                return Promise.resolve(this.fallbackLanguage);
            }
        }).then((language) => {
            this.currentLanguage = language; // Save it for later.
            return language;
        });
    };

    /**
     * Get a custom string for a certain key.
     *
     * @param {string} key The key of the translation to get.
     * @return {string} Translation, undefined if not found.
     */
    getCustomString(key: string) : string {
        let customStrings = this.getCustomStringsForLanguage();
        if (customStrings && typeof customStrings[key] != 'undefined') {
            return customStrings[key];
        }
    }

    /**
     * Get custom strings for several keys.
     *
     * @param {string[]} keys The keys of the translations to get.
     * @return {any} Object with translations and a boolean indicating if all translations were found in custom strings.
     */
    getCustomStrings(keys: string[]) : any {
        let customStrings = this.getCustomStringsForLanguage(),
            translations = [],
            allFound = true;

        keys.forEach((key : string) => {
            if (customStrings && typeof customStrings[key] != 'undefined') {
                translations.push(customStrings[key]);
            } else {
                allFound = false;
                translations.push(key);
            }
        });

        return {
            allFound: allFound,
            translations: translations
        };
    }

    /**
     * Get custom strings for a certain language.
     *
     * @param {string} [lang] The language to get. If not defined, return current language.
     * @return {any} Custom strings.
     */
    getCustomStringsForLanguage(lang?: string) : any {
        lang = lang || this.currentLanguage;
        return this.customStrings[lang];
    };

    /**
     * Load certain custom strings.
     *
     * @param {string} strings Custom strings to load (tool_mobile_customlangstrings).
     */
    loadCustomStrings(strings: string) : void {
        if (strings == this.customStringsRaw) {
            // Strings haven't changed, stop.
            return;
        }

        // Reset current values.
        this.clearCustomStrings();

        if (!strings) {
            return;
        }

        let list: string[] = strings.split(/(?:\r\n|\r|\n)/);
        list.forEach((entry: string) => {
            let values: string[] = entry.split('|'),
                lang: string;

            if (values.length < 3) {
                // Not enough data, ignore the entry.
                return;
            }

            lang = values[2];

            if (!this.customStrings[lang]) {
                this.customStrings[lang] = {};
            }

            this.customStrings[lang][values[0]] = values[1];
        });
    };
}
