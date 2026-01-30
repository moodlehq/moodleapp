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
        // Return the imported translations for the requested language
        let translation = await this.fetchLanguageFile(lang);

        this.translations[lang] = translation;

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
        try {
            const request = Http.get(`/assets/lang/${lang}.json`) as Observable<TranslationObject>;

            return await firstValueFrom(request);
        } catch (error) {
            this.logger.error('Error fetching language file', lang, error);

            return {};
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
        const parentLang = this.translations[lang][MoodleTranslateLoader.PARENT_LANG_KEY] as string | undefined;
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

        await firstValueFrom(Translate.reloadLang(langToReload));
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

        await firstValueFrom(Translate.reloadLang(langToReload));
    }

    /**
     * Set custom strings defined using the admin tool.
     *
     * @param strings Strings.
     * @param currentLang Current language. If defined, reloads the language after setting the strings.
     */
    async setCustomStrings(strings: { [lang: string]: TranslationObject }, currentLang?: string): Promise<void> {
        this.customStrings = strings;

        if (!currentLang || !strings[currentLang]) {
            return;
        }

        // Load them in the current translations.
        await firstValueFrom(Translate.reloadLang(currentLang));
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

        if (!currentLang || !strings[currentLang]) {
            return;
        }

        // Load them in the current translations.
        await firstValueFrom(Translate.reloadLang(currentLang));
    }

    /**
     * Apply site plugins strings and custom strings to the translations.
     *
     * @param lang Language code.
     * @returns The merged translations object.
     */
    protected applySiteStrings(lang: string): TranslationObject {
        let translation = this.translations[lang] || {};

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

}
