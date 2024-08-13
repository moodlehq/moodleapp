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

import { CoreConstants } from '@/core/constants';
import { LangChangeEvent } from '@ngx-translate/core';
import { CoreConfig } from '@services/config';
import { CoreSubscriptions } from '@singletons/subscriptions';
import { makeSingleton, Translate, Http } from '@singletons';

import moment from 'moment-timezone';
import { CoreSite } from '../classes/sites/site';
import { CorePlatform } from '@services/platform';
import { AddonFilterMultilangHandler } from '@addons/filter/multilang/services/handlers/multilang';
import { AddonFilterMultilang2Handler } from '@addons/filter/multilang2/services/handlers/multilang2';
import { firstValueFrom } from 'rxjs';
import { CoreLogger } from '@singletons/logger';
import { CoreSites } from './sites';

/*
 * Service to handle language features, like changing the current language.
*/
@Injectable({ providedIn: 'root' })
export class CoreLangProvider {

    protected fallbackLanguage = 'en'; // Always use English as fallback language since it contains all strings.
    protected defaultLanguage = CoreConstants.CONFIG.default_lang || 'en'; // Lang to use if device lang not valid or is forced.
    protected currentLanguage?: string; // Save current language in a variable to speed up the get function.
    protected customStrings: CoreLanguageObject = {}; // Strings defined using the admin tool.
    protected customStringsRaw?: string;
    protected sitePluginsStrings: CoreLanguageObject = {}; // Strings defined by site plugins.
    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreLang');
    }

    async initialize(): Promise<void> {
        // Set fallback language and language to use until the app determines the right language to use.
        Translate.setDefaultLang(this.fallbackLanguage);
        Translate.use(this.defaultLanguage);

        Translate.onLangChange.subscribe((event: LangChangeEvent) => {
            document.documentElement.setAttribute('lang', event.lang);

            let dir = Translate.instant('core.thisdirection');
            dir = dir.indexOf('rtl') != -1 ? 'rtl' : 'ltr';
            document.documentElement.setAttribute('dir', dir);
        });

        this.initializeCurrentLanguage();
    }

    /**
     * Init language.
     */
    protected async initializeCurrentLanguage(): Promise<void> {
        await CorePlatform.ready();

        let language: string;

        if (CorePlatform.isAutomated()) {
            // Force current language to English when Behat is running.
            language = 'en';
        } else {
            language = await this.getCurrentLanguage();
        }

        await this.changeCurrentLanguage(language);
    }

    /**
     * Add a set of site plugins strings for a certain language.
     *
     * @param lang The language where to add the strings.
     * @param strings Object with the strings to add.
     * @param prefix A prefix to add to all keys.
     */
    addSitePluginsStrings(lang: string, strings: string[], prefix?: string): void {
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
     * @param value String to capitalize.
     * @returns Capitalized string.
     */
    protected capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    /**
     * Get message for the given language.
     *
     * @param key Message key.
     * @param lang Language.
     * @returns Message if found, null otherwise.
     */
    async getMessage(key: string, lang: string): Promise<string | null>  {
        const messages = await this.getMessages(lang);

        return messages[key] ?? null;
    }

    /**
     * Get messages for the given language.
     *
     * @param lang Language.
     * @returns Messages.
     */
    getMessages(lang: string): Promise<Record<string, string>> {
        return new Promise(resolve => CoreSubscriptions.once(
            Translate.getTranslation(lang),
            messages => resolve(messages),
            () => resolve({}),
        ));
    }

    /**
     * Get the parent language defined on the language strings.
     *
     * @returns If a parent language is set, return the index name.
     */
    getParentLanguage(): string | undefined {
        const parentLang = Translate.instant('core.parentlanguage');
        if (parentLang !== '' && parentLang !== 'core.parentlanguage' && parentLang !== this.currentLanguage) {
            return parentLang;
        }
    }

    /**
     * Change current language.
     *
     * @param language New language to use.
     * @returns Promise resolved when the change is finished.
     */
    async changeCurrentLanguage(language: string): Promise<void> {
        // Use british english when parent english is loaded.
        moment.locale(language == 'en' ? 'en-gb' : language);

        const previousLanguage = this.currentLanguage ?? this.getDefaultLanguage();

        this.currentLanguage = language;

        try {
            await this.reloadLanguageStrings();
            await CoreConfig.set('current_language', language);
        } catch (error) {
            if (language !== previousLanguage) {
                this.logger.error(`Language ${language} not available, reverting to ${previousLanguage}`, error);

                return this.changeCurrentLanguage(previousLanguage);
            }

            throw error;
        } finally {
            // Load the custom and site plugins strings for the language.
            if (this.loadLangStrings(this.customStrings, language) || this.loadLangStrings(this.sitePluginsStrings, language)) {
                // Some lang strings have changed, emit an event to update the pipes.
                Translate.onLangChange.emit({ lang: language, translations: Translate.translations[language] });
            }
        }
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
     * @returns Custom strings.
     */
    getAllCustomStrings(): CoreLanguageObject {
        return this.customStrings;
    }

    /**
     * Get all current site plugins strings.
     *
     * @returns Site plugins strings.
     */
    getAllSitePluginsStrings(): CoreLanguageObject {
        return this.sitePluginsStrings;
    }

    /**
     * Get current language.
     *
     * @returns Promise resolved with the current language.
     */
    async getCurrentLanguage(format?: CoreLangFormat): Promise<string> {
        if (this.currentLanguage === undefined) {
            this.currentLanguage = await this.detectLanguage();
        }

        return format ? this.formatLanguage(this.currentLanguage, format) : this.currentLanguage;
    }

    /**
     * Get current language sync.
     *
     * @returns Current language or undefined.
     */
    getCurrentLanguageSync(format?: CoreLangFormat): string | undefined {
        if (this.currentLanguage === undefined) {
            return;
        }

        return format ? this.formatLanguage(this.currentLanguage, format) : this.currentLanguage;
    }

    /**
     * Update a language code to the given format.
     *
     * @param lang Language code.
     * @param format Format to use.
     * @returns Formatted language code.
     */
    formatLanguage(lang: string, format: CoreLangFormat): string {
        switch (format) {
            case CoreLangFormat.App:
                return lang.replace('_', '-');
            case CoreLangFormat.LMS:
                return lang.replace('-', '_');
        }
    }

    /**
     * Get the current language from settings, or detect the browser one.
     *
     * @returns Promise resolved with the selected language.
     */
    protected async detectLanguage(): Promise<string> {
        // Get current language from config (user might have changed it).
        try {
            return await CoreConfig.get<string>('current_language');
        } catch {
            // Try will return, ignore errors here to avoid nesting.
        }

        // User hasn't defined a language. If default language is forced, use it.
        if (CoreConstants.CONFIG.default_lang && CoreConstants.CONFIG.forcedefaultlanguage) {
            return CoreConstants.CONFIG.default_lang;
        }

        // No forced language, try to get current language from browser.
        let preferredLanguage = navigator.language.toLowerCase();
        if (preferredLanguage.indexOf('-') > -1) {
            // Language code defined by locale has a dash, like en-US or es-ES. Check if it's supported.
            if (CoreConstants.CONFIG.languages && CoreConstants.CONFIG.languages[preferredLanguage] === undefined) {
                // Code is NOT supported. Fallback to language without dash. E.g. 'en-US' would fallback to 'en'.
                preferredLanguage = preferredLanguage.substring(0, preferredLanguage.indexOf('-'));
            }
        }

        if (CoreConstants.CONFIG.languages[preferredLanguage] === undefined) {
            // Language not supported, use default language.
            return this.defaultLanguage;
        }

        return preferredLanguage;
    }

    /**
     * Get the default language.
     *
     * @returns Default language.
     */
    getDefaultLanguage(): string {
        return this.defaultLanguage;
    }

    /**
     * Get the fallback language.
     *
     * @returns Fallback language.
     */
    getFallbackLanguage(): string {
        return this.fallbackLanguage;
    }

    /**
     * Get translated month names.
     *
     * @returns Translated month names.
     */
    getMonthNames(): string[] {
        return moment.months().map(month => this.capitalize(month));
    }

    /**
     * Get translated month short names.
     *
     * @returns Translated month short names.
     */
    getMonthShortNames(): string[] {
        return moment.monthsShort().map(month => this.capitalize(month));
    }

    /**
     * Get translated day names.
     *
     * @returns Translated day names.
     */
    getDayNames(): string[] {
        return moment.weekdays().map(weekDay => this.capitalize(weekDay));
    }

    /**
     * Get translated day short names.
     *
     * @returns Translated day short names.
     */
    getDayShortNames(): string[] {
        return moment.weekdaysShort().map(weekDay => this.capitalize(weekDay));
    }

    /**
     * Get the full list of translations for a certain language.
     *
     * @param lang The language to check.
     * @returns Promise resolved when done.
     */
    getTranslationTable(lang: string): Promise<Record<string, unknown>> {
        // Create a promise to convert the observable into a promise.
        return new Promise((resolve, reject): void => {
            const observer = Translate.getTranslation(lang).subscribe({
                next: (table) => {
                    resolve(table);
                    observer.unsubscribe();
                },
                error: (err) => {
                    reject(err);
                    observer.unsubscribe();
                },
            });
        });
    }

    /**
     * Loads custom strings obtained from site.
     *
     * @param currentSite Current site object. If not defined, use current site.
     */
    loadCustomStringsFromSite(currentSite?: CoreSite): void {
        currentSite = currentSite ?? CoreSites.getCurrentSite();

        if (!currentSite) {
            return;
        }

        const customStrings = currentSite.getStoredConfig('tool_mobile_customlangstrings');

        if (customStrings === undefined) {
            return;
        }

        this.loadCustomStrings(customStrings);
    }

    /**
     * Load certain custom strings.
     *
     * @param strings Custom strings to load (tool_mobile_customlangstrings).
     */
    loadCustomStrings(strings: string): void {
        if (strings === this.customStringsRaw) {
            // Strings haven't changed, stop.
            return;
        }

        // Reset current values.
        this.clearCustomStrings();

        if (!strings) {
            return;
        }

        let currentLangChanged = false;

        const list: string[] = strings.split(/(?:\r\n|\r|\n)/);
        list.forEach((entry: string) => {
            const values: string[] = entry.split('|').map(value => value.trim());

            if (values.length < 3) {
                // Not enough data, ignore the entry.
                return;
            }

            const lang = this.formatLanguage(values[2], CoreLangFormat.App); // Use the app format instead of Moodle format.

            if (lang === this.currentLanguage) {
                currentLangChanged = true;
            }

            if (!this.customStrings[lang]) {
                this.customStrings[lang] = {};
            }

            this.loadString(this.customStrings, lang, values[0], values[1]);
        });

        this.customStringsRaw = strings;

        if (currentLangChanged && this.currentLanguage) {
            // Some lang strings have changed, emit an event to update the pipes.
            Translate.onLangChange.emit({
                lang: this.currentLanguage,
                translations: Translate.translations[this.currentLanguage],
            });
        }
    }

    /**
     * Load custom strings for a certain language that weren't loaded because the language wasn't active.
     *
     * @param langObject The object with the strings to load.
     * @param lang Language to load.
     * @returns Whether the translation table was modified.
     */
    loadLangStrings(langObject: CoreLanguageObject, lang: string): boolean {
        let langApplied = false;

        if (langObject[lang]) {
            for (const key in langObject[lang]) {
                const entry = langObject[lang][key];

                if (!entry.applied) {
                    // Store the original value of the string.
                    entry.original = Translate.translations[lang][key];

                    // Store the string in the translations table.
                    Translate.translations[lang][key] = entry.value;

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
     * @param langObject The object where to store the lang.
     * @param lang Language code.
     * @param key String key.
     * @param value String value.
     */
    loadString(langObject: CoreLanguageObject, lang: string, key: string, value: string): void {
        lang = lang.replace(/_/g, '-'); // Use the app format instead of Moodle format.

        if (Translate.translations[lang]) {
            // The language is loaded.
            // Store the original value of the string.
            langObject[lang][key] = {
                original: Translate.translations[lang][key],
                value,
                applied: true,
            };

            // Store the string in the translations table.
            Translate.translations[lang][key] = value;
        } else {
            // The language isn't loaded.
            // Save it in our object but not in the translations table, it will be loaded when the lang is loaded.
            langObject[lang][key] = {
                value,
                applied: false,
            };
        }
    }

    /**
     * Read a language file.
     *
     * @param lang Language code.
     * @returns Promise resolved with the file contents.
     */
    async readLangFile(lang: CoreLangLanguage): Promise<Record<string, string>> {
        const observable = Http.get(`assets/lang/${lang}.json`, {
            responseType: 'json',
        });

        return <Record<string, string>> await firstValueFrom(observable);
    }

    /**
     * Filter a multilang string.
     *
     * @param text Multilang string.
     * @returns Filtered string.
     */
    async filterMultilang(text: string): Promise<string> {
        return Promise.resolve(text)
            .then(text => AddonFilterMultilangHandler.filter(text))
            .then(text => AddonFilterMultilang2Handler.filter(text));
    }

    /**
     * Unload custom or site plugin strings, removing them from the translations table.
     *
     * @param strings Strings to unload.
     */
    protected unloadStrings(strings: CoreLanguageObject): void {
        // Iterate over all languages and strings.
        for (const lang in strings) {
            if (!Translate.translations[lang]) {
                // Language isn't loaded, nothing to unload.
                continue;
            }

            const langStrings = strings[lang];
            for (const key in langStrings) {
                const entry = langStrings[key];
                if (entry.original) {
                    // The string had a value, restore it.
                    Translate.translations[lang][key] = entry.original;
                } else {
                    // The string didn't exist, delete it.
                    delete Translate.translations[lang][key];
                }
            }
        }
    }

    /**
     * Reload language strings for the current language.
     */
    protected async reloadLanguageStrings(): Promise<void> {
        const currentLanguage = this.currentLanguage;

        if (!currentLanguage) {
            return;
        }

        await new Promise((resolve, reject) => {
            CoreSubscriptions.once(Translate.use(currentLanguage), async data => {
                // Check if it has a parent language.
                const fallbackLang = this.getParentLanguage();

                if (fallbackLang) {
                    try {
                        // Merge parent translations with the child ones.
                        const parentTranslations = Translate.translations[fallbackLang] ?? await this.readLangFile(fallbackLang);

                        const mergedData = {
                            ...parentTranslations,
                            ...data,
                        };

                        Object.assign(data, mergedData);
                    } catch {
                        // Ignore errors.
                    }
                }

                resolve(data);
            }, reject);
        });
    }

}

export const CoreLang = makeSingleton(CoreLangProvider);

export const enum CoreLangFormat {
    LMS = 'lms',
    App = 'app'
}

/**
 * Language code. E.g. 'au', 'es', etc.
 */
export type CoreLangLanguage = string;

/**
 * Language object has two leves, first per language and second per string key.
 */
type CoreLanguageObject = {
    [s: string]: { // Lang name.
        [s: string]: { // String key.
            value: string; // Value with replacings done.
            original?: string; // Original value of the string.
            applied?: boolean; // If the key is applied to the translations table or not.
        };
    };
};
