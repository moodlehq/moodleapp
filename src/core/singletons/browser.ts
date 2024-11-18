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

/**
 * Helpers to interact with Browser APIs.
 *
 * This singleton is not necessary to be exported for site plugins.
 */
export class CoreBrowser {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Check whether the given cookie is set.
     *
     * @param name Cookie name.
     * @returns Whether the cookie is set.
     */
    static hasCookie(name: string): boolean {
        return new RegExp(`(\\s|;|^)${name}=`).test(document.cookie ?? '');
    }

    /**
     * Check whether a development setting is set.
     *
     * @param name Setting name.
     * @returns Whether the development setting is set.
     */
    static hasDevelopmentSetting(name: string): boolean {
        const setting = CoreBrowser.getDevelopmentSettingKey(name);

        return CoreBrowser.hasCookie(setting) || CoreBrowser.hasLocalStorage(setting);
    }

    /**
     * Check whether the given localStorage key is set.
     *
     * @param key localStorage key.
     * @returns Whether the key is set.
     */
    static hasLocalStorage(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }

    /**
     * Read a cookie.
     *
     * @param name Cookie name.
     * @returns Cookie value.
     */
    static getCookie(name: string): string | null {
        const cookies = (document.cookie ?? '').split(';').reduce((cookies, cookie) => {
            const [name, value] = cookie.trim().split('=');

            cookies[name] = value;

            return cookies;
        }, {});

        return cookies[name] ?? null;
    }

    /**
     * Read a localStorage key.
     *
     * @param key localStorage key.
     * @returns localStorage value.
     */
    static getLocalStorage(key: string): string | null {
        return localStorage.getItem(key);
    }

    /**
     * Get development setting value.
     *
     * @param name Setting name.
     * @returns Development setting value.
     */
    static getDevelopmentSetting(name: string): string | null {
        const setting = CoreBrowser.getDevelopmentSettingKey(name);

        return CoreBrowser.getCookie(setting) ?? CoreBrowser.getLocalStorage(setting);
    }

    /**
     * Set development setting.
     *
     * @param name Setting name.
     * @param value Setting value.
     */
    static setDevelopmentSetting(name: string, value: string): void {
        const setting = CoreBrowser.getDevelopmentSettingKey(name);

        document.cookie = `${setting}=${value};path=/`;
        localStorage.setItem(setting, value);
    }

    /**
     * Unset development setting.
     *
     * @param name Setting name.
     */
    static clearDevelopmentSetting(name: string): void {
        const setting = CoreBrowser.getDevelopmentSettingKey(name);

        document.cookie = `${setting}=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        localStorage.removeItem(setting);
    }

    /**
     * Get development setting key.
     *
     * @param name Development setting name.
     * @returns THe development setting key.
     */
    protected static getDevelopmentSettingKey(name: string): string {
        return `MoodleApp${name}`;
    }

}
