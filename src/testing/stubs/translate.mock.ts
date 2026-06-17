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

import {
    LangChangeEvent,
    Language,
    TranslationObject,
    InterpolatableTranslationObject,
    FallbackLangChangeEvent,
    TranslationChangeEvent,
    InterpolationParameters,
} from '@ngx-translate/core';
import { Observable, Subject, from, isObservable, of, take } from 'rxjs';
import { mock } from '../utils';

// Global translation store for test mocks
const store = {
    translations: new Map<Language, InterpolatableTranslationObject>(),
    hasTranslationFor(lang: Language): boolean {
        return this.translations.has(lang);
    },
    getTranslations(lang: Language): InterpolatableTranslationObject {
        return this.translations.get(lang) ?? {};
    },
    setTranslations(lang: Language, translations: InterpolatableTranslationObject, merge: boolean): void {
        if (!merge) {
            this.translations.set(lang, { ...translations });

            return;
        }

        this.translations.set(lang, {
            ...this.getTranslations(lang),
            ...translations,
        });
    },
    deleteTranslations(lang: Language): void {
        this.translations.delete(lang);
    },
};
let currentLang = 'en';
const onLangChange = new Subject<LangChangeEvent>();
const onTranslationChange = new Subject<TranslationChangeEvent>();
const onFallbackLangChange = new Subject<FallbackLangChangeEvent>();
const onDefaultLangChange = new Subject<LangChangeEvent>();

export const translateLoaderMock = mock({
    getTranslation: (lang: string): Observable<TranslationObject> =>
        // Load translations from json file.
        from(
            import(`@/assets/lang/${lang}.json`)
                .then((json: TranslationObject) => json.default as TranslationObject)
                .catch(() => ({} as TranslationObject)),
        ),
    getParentLanguage: (lang: string): string | undefined =>
        store.getTranslations(lang)?.['core.parentlanguage'] as string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clearCustomStrings: (_langToReload?: string) => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clearSitePluginsStrings: (_langToReload?: string) => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setCustomStrings: (_strings: Record<string, TranslationObject>, _currentLang?: string) => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setSitePluginsStrings: (_strings: Record<string, TranslationObject>, _currentLang?: string) => Promise.resolve(),
});

export const translateMock = mock({
    instant: (key: string | string[], replacements?: Record<string, string | number>) =>
        interpolateTranslation(key, replacements),
    translate: (
        key: string | string[] | (() => string | string[]),
        params?: InterpolationParameters | (() => InterpolationParameters | undefined),
        lang?: Language | (() => Language | undefined),
    ) => {
        const resolvedKey = typeof key === 'function' ? key() : key;
        const resolvedParams = typeof params === 'function' ? params() : params;
        const resolvedLang = typeof lang === 'function' ? lang() : lang ?? currentLang;

        return () => interpolateTranslation(resolvedKey, resolvedParams, resolvedLang);
    },
    get: (key: string | string[], replacements?: Record<string, string | number>) =>
        of(interpolateTranslation(key, replacements)),
    onLangChange: onLangChange.asObservable(),
    onTranslationChange: onTranslationChange.asObservable(),
    onFallbackLangChange: onFallbackLangChange.asObservable(),
    onDefaultLangChange: onDefaultLangChange.asObservable(),
    use: (lang: string): Observable<InterpolatableTranslationObject> => {
        const pending = loadOrExtendLanguage(lang);

        if (isObservable(pending)) {
            pending.pipe(take(1)).subscribe({
                next: (translations) => {
                    store.setTranslations(lang, translations, false);

                    changeLang(lang);
                },
                error: () => {
                    /* ignore here - use can handle it */
                },
            });

            return pending;
        }
        changeLang(lang);

        return of(store.getTranslations(lang));
    },
    langLoaderMock: translateLoaderMock,
    getCurrentLang: () => currentLang,
    getFallbackLang: () => 'en',
    resetLang: (lang: Language) => {
        store.deleteTranslations(lang);
        onTranslationChange.next({ lang, translations: {} });
    },
    setTranslation: (lang: Language, translations: TranslationObject, shouldMerge?: boolean) => {
        store.setTranslations(lang, translations, !!shouldMerge);
        onTranslationChange.next({ lang, translations });
    },
});

/**
 * Changes the current language
 *
 * @param lang Language code (e.g., 'en', 'es').
 */
function changeLang(lang: Language): void {
    currentLang = lang;
    onLangChange.next({ lang, translations: store.getTranslations(lang) });
}

/**
 * Retrieves the given translations
 *
 * @param lang Language code (e.g., 'en', 'es').
 * @returns Observable resolved with the translations object or undefined if not found.
 */
function loadOrExtendLanguage(
    lang: Language,
): Observable<InterpolatableTranslationObject> | undefined {
    // if this language is unavailable, ask for it
    if (!store.hasTranslationFor(lang)) {
        return translateLoaderMock.getTranslation(lang);
    }

    return of(store.getTranslations(lang));
}

/**
 * Interpolates a translation key or keys with optional replacements.
 *
 * @param keys The translation key or array of keys.
 * @param replacements Optional replacements for placeholders in the translation strings.
 * @param lang Optional language code to use for interpolation. Defaults to the current language.
 * @returns The interpolated translation string or an object with interpolated strings for each key.
 */
function interpolateTranslation(
    keys: string | string[],
    replacements?: Record<string, string | number>,
    lang?: Language,
): string | Record<string, string> {
    lang = lang ?? currentLang;
    const applyReplacements = (text: string): string => {
        let result = text;
        for (const [name, value] of Object.entries(replacements ?? {})) {
            result = result.replace(`{{${name}}}`, String(value));
        }

        return result;
    };
    const translations = store.getTranslations(lang);

    if (!Array.isArray(keys)) {
        const translation = translations[keys] as string | undefined;

        return applyReplacements(translation ?? keys);
    }
    const selected: Record<string, string> = {};

    for (const key of keys) {
        const translation = translations[key] as string | undefined;

        selected[key] = applyReplacements(translation ?? key);
    }

    return selected;
}
