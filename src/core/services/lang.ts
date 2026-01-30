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
import { LangChangeEvent, TranslationObject } from '@ngx-translate/core';
import { CoreConfig } from '@services/config';
import { CoreSubscriptions } from '@static/subscriptions';
import { makeSingleton, Translate } from '@singletons';

import { dayjs } from '@/core/utils/dayjs';
import { CoreSite } from '../classes/sites/site';
import { CorePlatform } from '@services/platform';
import { CoreLogger } from '@static/logger';
import { CoreSites } from './sites';
import { MoodleTranslateLoader } from '@classes/lang-loader';
import { firstValueFrom } from 'rxjs';

/**
 * Service to handle language features, like changing the current language.
 */
@Injectable({ providedIn: 'root' })
export class CoreLangProvider {

    protected fallbackLanguage = 'en'; // Always use English as fallback language since it contains all strings.
    protected defaultLanguage = CoreConstants.CONFIG.default_lang || 'en'; // Lang to use if device lang not valid or is forced.
    protected currentLanguage?: string; // Save current language in a variable to speed up the get function.
    protected customStringsRaw?: string;
    protected logger: CoreLogger = CoreLogger.getInstance('CoreLang');

    async initialize(): Promise<void> {
        // Set fallback language and language to use until the app determines the right language to use.
        Translate.setFallbackLang(this.fallbackLanguage);
        Translate.use(this.defaultLanguage);

        Translate.onLangChange.subscribe((event: LangChangeEvent) => {
            document.documentElement.setAttribute('lang', event.lang);

            let dir = Translate.instant('core.thisdirection');
            dir = dir.includes('rtl') ? 'rtl' : 'ltr';
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
     * Add a set of site plugins strings in a certain language.
     *
     * @param lang Language to add the strings to.
     * @param strings Strings to add.
     * @param prefix A prefix to add to all keys.
     * @deprecated since 5.2. Use the overload accepting langStrings object.
     */
    async addSitePluginsStrings(lang: string, strings: CoreLangTranslationObject, prefix?: string): Promise<void>;
    /**
     * Add a set of site plugins strings.
     *
     * @param langStrings Object with the strings to add in every language.
     * @param prefix A prefix to add to all keys.
     */
    async addSitePluginsStrings(langStrings: CoreLangTranslationByLanguage, prefix?: string): Promise<void>;
    async addSitePluginsStrings(
        langStringsOrLang: string | CoreLangTranslationByLanguage,
        stringsOrPrefix?:  CoreLangTranslationObject | string,
        prefix?: string,
    ): Promise<void> {
        if (typeof langStringsOrLang === 'string') {
            const lang = langStringsOrLang;
            const strings = stringsOrPrefix as CoreLangTranslationObject;
            await this.addSitePluginsStrings({ [lang]: strings }, prefix);

            return;
        }
        const langStrings = langStringsOrLang;
        prefix = (stringsOrPrefix ?? '') as string;

        const loadedStrings: { [lang: string]: TranslationObject } = {};

        for (let lang of Object.keys(langStrings)) {
            lang = this.formatLanguage(lang, CoreLangFormat.App); // Use the app format instead of Moodle format.

            const strings = langStrings[lang];
            if (!strings) {
                continue;
            }

            loadedStrings[lang] = {};
            for (const key of Object.keys(strings)) {
                const prefixedKey = prefix + key;

                let value = strings[key];

                // Replace the way to access subproperties.
                value = value.replace(/\$a->/gm, '$a.');
                // Add another curly bracket to string params ({$a} -> {{$a}}).
                value = value.replace(/{([^ ]+)}/gm, '{{$1}}');
                // Make sure we didn't add to many brackets in some case.
                value = value.replace(/{{{([^ ]+)}}}/gm, '{{$1}}');

                loadedStrings[lang][prefixedKey] = value;
            }
        }

        await this.getTranslateLoader().setSitePluginsStrings(loadedStrings, this.currentLanguage);
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
    async getMessage(key: string, lang: string): Promise<string | undefined>  {
        const messages = await this.getMessages(lang);

        return messages[key] as string | undefined;
    }

    /**
     * Get messages for the given language.
     *
     * @param lang Language.
     * @param keyPrefix Optional prefix to filter the keys.
     * @returns Messages.
     */
    async getMessages(lang: string, keyPrefix = ''): Promise<TranslationObject> {
        // Create a promise to convert the observable into a promise.
        const promise = new Promise<TranslationObject>((resolve, reject): void => {
            CoreSubscriptions.once(
                Translate.currentLoader.getTranslation(lang),
                (table) => resolve(table),
                reject,
            );
        });

        const table = await promise;

        if (!keyPrefix) {
            return table;
        }

        // Gather all the keys for countries,
        const filtered: TranslationObject = {};

        for (const key in table) {
            if (key.startsWith(keyPrefix)) {
                filtered[key] = table[key];
            }
        }

        return filtered;
    }

    /**
     * Get the parent language for the current language defined on the language strings.
     *
     * @returns If a parent language is set, return the parent language.
     */
    getParentLanguage(): string | undefined {
        return this.currentLanguage
            ? this.getTranslateLoader().getParentLanguage(this.currentLanguage)
            : undefined;
    }

    /**
     * Get the parent language for a certain language. We cannot use the loader function because the language could not be loaded.
     *
     * @param lang Language key.
     * @returns If a parent language is set, return the parent language.
     */
    protected async getParentLanguageForLang(lang: string): Promise<string | undefined> {
        if (lang === this.currentLanguage) {
            return this.getParentLanguage();
        }

        const parentLang = await this.getMessage(MoodleTranslateLoader.PARENT_LANG_KEY, lang);

        if (parentLang && parentLang !== MoodleTranslateLoader.PARENT_LANG_KEY && parentLang !== lang) {
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
        language = this.formatLanguage(language, CoreLangFormat.App);
        await this.loadDayJSLocale(language);

        const previousLanguage = this.currentLanguage ?? this.getDefaultLanguage();

        this.currentLanguage = language;

        try {
            await firstValueFrom(Translate.use(language));
            await CoreConfig.set('current_language', language);
        } catch (error) {
            if (language !== previousLanguage) {
                this.logger.error(`Language ${language} not available, reverting to ${previousLanguage}`, error);

                return this.changeCurrentLanguage(previousLanguage);
            }

            throw error;
        }
    }

    /**
     * Load the locale for DayJS.
     *
     * @param locale Locale to load.
     */
    protected async loadDayJSLocale(locale: string): Promise<void> {
        // Use british english when parent english is loaded.
        locale = locale === 'en' ? 'en-gb' : locale;

        try {
            await import(`dayjs/locale/${locale}`);
            dayjs.locale(locale);

            if (CorePlatform.isAutomated()) {
                // Fix short names for automated tests to match the ones used in LMS. E.g. DayJS uses 'Jun' instead of 'June'.
                dayjs.updateLocale('en-gb', {
                    monthsShort: [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
                    ],
                });
            }
        } catch {
            if (locale === 'en' || locale === 'en-gb') {
                return;
            }
            const parentLang = await this.getParentLanguageForLang(locale);
            const parentLangUsingHyphen = locale.substring(0, locale.indexOf('-'));

            if (parentLangUsingHyphen && (parentLang === 'en' || parentLang === undefined)) {
                await this.loadDayJSLocale(parentLangUsingHyphen);

                return;
            }

            await this.loadDayJSLocale(parentLang ?? 'en');
        }
    }

    /**
     * Clear current custom strings.
     *
     * @param reloadCurrentLang If true, reloads the current language after resetting the strings.
     */
    clearCustomStrings(reloadCurrentLang = true): void {
        this.getTranslateLoader().clearCustomStrings(reloadCurrentLang ? this.currentLanguage : undefined);
        this.customStringsRaw = '';
    }

    /**
     * Clear current site plugins strings.
     */
    clearSitePluginsStrings(): void {
        this.getTranslateLoader().clearSitePluginsStrings(this.currentLanguage);
    }

    /**
     * Get all current custom strings.
     *
     * @returns Custom strings.
     * @deprecated since 5.2. Not used anymore.
     */
    getAllCustomStrings(): unknown {
        return {};
    }

    /**
     * Get all current site plugins strings.
     *
     * @returns Site plugins strings.
     * @deprecated since 5.2. Not used anymore.
     */
    getAllSitePluginsStrings(): unknown {
        return {};
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
     * Get language suffix.
     *
     * This function can be modified to configure the language suffix.
     *
     * @returns Suffix.
     */
    getLanguageSuffix(): string {
        return '';
    }

    /**
     * Get language app variant. Ie: 'en-US_wp'.
     *
     * @param lang Language code.
     * @returns Language variant.
     */
    getLanguageAppVariant(lang: string): string {
        const langSuffix = this.getLanguageSuffix();
        if (langSuffix) {
            if (lang.endsWith(`_${langSuffix}`)) {
                return lang;
            }

            // Append the suffix using the correct separator.
            if (lang.endsWith(`-${langSuffix}`)) {
                return lang.replace(`-${langSuffix}`, `_${langSuffix}`);
            }

            return `${lang}_${langSuffix}`;
        }

        return lang;
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
                lang = lang.replace('-', '_');

                // Use the app variant everywhere for LMS format too.
                return this.getLanguageAppVariant(lang);
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
        if (preferredLanguage.includes('-')) {
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
        return dayjs.months().map(month => this.capitalize(month));
    }

    /**
     * Get translated month short names.
     *
     * @returns Translated month short names.
     */
    getMonthShortNames(): string[] {
        return dayjs.monthsShort().map(month => this.capitalize(month));
    }

    /**
     * Get translated day names.
     *
     * @returns Translated day names.
     */
    getDayNames(): string[] {
        return dayjs.weekdays().map(weekDay => this.capitalize(weekDay));
    }

    /**
     * Get translated day short names.
     *
     * @returns Translated day short names.
     */
    getDayShortNames(): string[] {
        return dayjs.weekdaysShort().map(weekDay => this.capitalize(weekDay));
    }

    /**
     * Get the full list of translations for a certain language.
     *
     * @param lang The language to check.
     * @returns Promise resolved when done.
     *
     * @deprecated since 5.2. Use getMessages instead.
     */
    getTranslationTable(lang: string): Promise<TranslationObject> {
        return this.getMessages(lang);
    }

    /**
     * Get the translate loader as MoodleTranslateLoader.
     *
     * @returns The MoodleTranslateLoader instance.
     */
    protected getTranslateLoader(): MoodleTranslateLoader {
        return Translate.currentLoader as MoodleTranslateLoader;
    }

    /**
     * Loads custom strings obtained from site.
     *
     * @param currentSite Current site object. If not defined, use current site.
     */
    async loadCustomStringsFromSite(currentSite?: CoreSite): Promise<void> {
        currentSite = currentSite ?? CoreSites.getCurrentSite();

        if (!currentSite) {
            return;
        }

        const customStrings = currentSite.getStoredConfig('tool_mobile_customlangstrings');

        if (customStrings === undefined) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        await this.loadCustomStrings(customStrings);
    }

    /**
     * Load certain custom strings.
     *
     * @param strings Custom strings to load (tool_mobile_customlangstrings).
     *
     * @deprecated since 5.2. It will be protected in future versions, do not use anymore.
     */
    async loadCustomStrings(strings: string): Promise<void> {
        if (strings === this.customStringsRaw) {
            // Strings haven't changed, stop.
            return;
        }

        if (!strings) {
            this.clearCustomStrings(false);

            return;
        }

        const customStrings: { [lang: string]: TranslationObject } = {};

        const list = strings.split(/(?:\r\n|\r|\n)/);
        list.forEach((entry: string) => {
            const values: string[] = entry.split('|').map(value => value.trim());
            if (values.length < 3) {
                // Not enough data, ignore the entry.
                return;
            }

            const lang = this.formatLanguage(values[2], CoreLangFormat.App); // Use the app format instead of Moodle format.
            if (!customStrings[lang]) {
                customStrings[lang] = {};
            }
            customStrings[lang][values[0]] = values[1];
        });

        await this.getTranslateLoader().setCustomStrings(customStrings, this.currentLanguage);

        this.customStringsRaw = strings;
    }

    /**
     * Read a language file.
     *
     * @param lang Language code.
     * @returns Promise resolved with the file contents.
     * @deprecated since 5.0. Use getMessages instead.
     */
    async readLangFile(lang: CoreLangLanguage): Promise<TranslationObject> {
        return this.getMessages(lang);
    }

    /**
     * Filter a multilang string.
     *
     * @param text Multilang string.
     * @returns Filtered string.
     */
    async filterMultilang(text: string): Promise<string> {
        const { AddonFilterMultilangHandler } = await import('@addons/filter/multilang/services/handlers/multilang');
        const { AddonFilterMultilang2Handler } = await import('@addons/filter/multilang2/services/handlers/multilang2');

        return Promise.resolve(text)
            .then(text => AddonFilterMultilangHandler.filter(text))
            .then(text => AddonFilterMultilang2Handler.filter(text));
    }

    /**
     * Load custom strings for a certain language that weren't loaded because the language wasn't active.
     *
     * @param langObject The object with the strings to load.
     * @param lang Language to load.
     * @returns Whether the translation table was modified.
     * @deprecated since 5.2. Not used anymore.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async loadLangStrings(langObject: unknown, lang: string): Promise<boolean> {
        return false;
    }

}

export const CoreLang = makeSingleton(CoreLangProvider);

export const enum CoreLangFormat {
    LMS = 'lms',
    App = 'app',
}

/**
 * Language code. E.g. 'au', 'es', etc.
 */
export type CoreLangLanguage = string;

export type CoreLangTranslationObject = Record<string, string>;
export type CoreLangTranslationByLanguage = { [lang: string]: CoreLangTranslationObject };
