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
import { mergeDeep, TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Http, Translate } from '@singletons';
import { CoreLogger } from '@static/logger';
import { firstValueFrom, from, Observable, of } from 'rxjs';

@Injectable()
export class MoodleTranslateLoader implements TranslateLoader {

    protected translations: { [lang: string]: TranslationObject } = {};
    protected translationFiles: { [lang: string]: TranslationObject } = {};

    protected customStrings: { [lang: string]: TranslationObject } = {}; // Strings defined using the admin tool.
    protected sitePluginsStrings: { [lang: string]: TranslationObject } = {}; // Strings defined by site plugins.

    static readonly PARENT_LANG_KEY = 'core.parentlanguage';

    protected logger = CoreLogger.getInstance('MoodleTranslateLoader');

    /**
     * Get the translations for a specific language.
     *
     * @param lang Language code (e.g., 'en', 'es').
     * @returns Observable resolved with the translations object.
     */
    getTranslation(lang: string): Observable<TranslationObject> {
        if (this.translations[lang]) {
            this.logger.debug('Get translation', lang);
            // This is done here to ensure site strings and custom strings are loaded in the proper order.
            const translation = this.applySiteStrings(lang);

            return of(translation);
        }

        return from(this.loadLanguage(lang).then((translation) => {
            this.logger.debug('Successfully loaded translation', lang);

            return translation;
        }).catch((error) => {
            this.logger.error('Error loading translation', lang, error);

            return {};
        }));
    }

    /**
     * Load translations for a specific language.
     *
     * @param lang Language code (e.g., 'en', 'es').
     * @returns Promise resolved with the translations object or empty object if not found.
     */
    protected async loadLanguage(lang: string): Promise<TranslationObject> {
        // Return the imported translations for the requested language.
        let translation = await this.fetchLanguageFile(lang);

        // Check if it has a parent language.
        const parentLang = this.getParentLanguage(lang);
        if (parentLang) {
            try {
                this.logger.debug('Loading parent language', parentLang);

                // Merge parent translations with the child ones.
                const parentTranslations = await this.loadLanguage(parentLang);
                if (Object.keys(parentTranslations).length > 0) {
                    translation = mergeDeep(parentTranslations, translation);
                }
            } catch {
                // Ignore errors.
            }
        }

        this.translations[lang] = translation;

        return this.applySiteStrings(lang);
    }

    /**
     * Fetch the language file from assets.
     *
     * @param lang Language code.
     * @returns Promise resolved with the translations object.
     */
    protected async fetchLanguageFile(lang: string): Promise<TranslationObject> {
        if (this.translationFiles[lang]) {
            return this.translationFiles[lang];
        }
        this.logger.debug('Fetching language file', lang);

        try {
            const request = Http.get(`/assets/lang/${lang}.json`) as Observable<TranslationObject>;

            this.translationFiles[lang] = await firstValueFrom(request);

            return this.translationFiles[lang];
        } catch (error) {
            this.logger.error('Error fetching language file', lang, error);

            throw error;
        }
    }

    /**
     * Get the parent language of a certain language.
     * Language translation should be loaded first.
     *
     * @param lang Language code.
     * @returns Parent language code or undefined if not found.
     */
    getParentLanguage(lang: string): string | undefined {
        const parentLang = this.translationFiles[lang]?.[MoodleTranslateLoader.PARENT_LANG_KEY] as string | undefined;
        if (parentLang && parentLang !== MoodleTranslateLoader.PARENT_LANG_KEY && parentLang !== lang) {
            return parentLang;
        }
    }

    /**
     * Clear current custom strings.
     *
     * @param langToReload If defined, reloads the language after resetting the strings.
     */
    async clearCustomStrings(langToReload?: string): Promise<void> {
        this.customStrings = {};
        if (!langToReload) {
            return;
        }

        await this.reloadLanguage(langToReload);
    }

    /**
     * Clear current site plugins strings.
     *
     * @param langToReload If defined, reloads the language after resetting the strings.
     */
    async clearSitePluginsStrings(langToReload?: string): Promise<void> {
        this.sitePluginsStrings = {};

        if (!langToReload) {
            return;
        }

        await this.reloadLanguage(langToReload);

    }

    /**
     * Set custom strings defined using the admin tool.
     *
     * @param strings Strings.
     * @param currentLang Current language. If defined, reloads the language after setting the strings.
     */
    async setCustomStrings(strings: { [lang: string]: TranslationObject }, currentLang?: string): Promise<void> {
        this.customStrings = strings;

        if (!currentLang) {
            return;
        }

        await this.reloadLanguage(currentLang, strings);
    }

    /**
     * Set site plugins strings.
     *
     * @param strings Strings.
     * @param currentLang Current language. If defined, reloads the language after setting the strings.
     */
    async setSitePluginsStrings(strings: { [lang: string]: TranslationObject }, currentLang?: string): Promise<void> {
        Object.keys(strings).forEach((lang) => {
            if (!this.sitePluginsStrings[lang]) {
                this.sitePluginsStrings[lang] = {};
            }

            this.sitePluginsStrings[lang] = mergeDeep(this.sitePluginsStrings[lang], strings[lang]);
        });

        if (!currentLang) {
            return;
        }

        await this.reloadLanguage(currentLang, strings);
    }

    /**
     * Apply site plugins strings and custom strings to the translations.
     *
     * @param lang Language code.
     * @returns The merged translations object.
     */
    protected applySiteStrings(lang: string): TranslationObject {
        let translation = this.translationFiles[lang] || {};

        const sitePluginsStrings = this.sitePluginsStrings[lang] || {};
        const customStrings = this.customStrings[lang] || {};
        const siteStrings = mergeDeep(sitePluginsStrings, customStrings);

        // Site strings should override default ones.
        translation = mergeDeep(translation, siteStrings);

        const parentLang = this.getParentLanguage(lang);
        if (parentLang) {
            const parentTranslations = this.applySiteStrings(parentLang);
            if (Object.keys(parentTranslations).length > 0) {
                // Child translations should override parent ones.
                translation = mergeDeep(parentTranslations, translation);
            }
        }

        return translation;
    }

    /**
     * Reload a language to ensure the new strings are applied.
     *
     * @param currentLang Current language.
     * @param strings If defined, only reloads the language if it has strings for the current language.
     *  If not defined, the language will be reloaded.
     */
    protected async reloadLanguage(currentLang: string, strings?: { [lang: string]: TranslationObject }): Promise<void> {
        const parentLang = this.getParentLanguage(currentLang);
        if (parentLang && (!strings || strings[parentLang])) {
            // Load parent language if needed.
            await firstValueFrom(Translate.reloadLang(parentLang));
        }

        if (!strings || strings[currentLang] || (parentLang && strings[parentLang])) {
            // Load current language to merge the new site plugins strings.
            await firstValueFrom(Translate.reloadLang(currentLang));
        }
    }

}
