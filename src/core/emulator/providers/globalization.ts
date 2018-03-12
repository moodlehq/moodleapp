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
import { Globalization } from '@ionic-native/globalization';
import { CoreAppProvider } from '@providers/app';

/**
 * Emulates the Cordova Globalization plugin in desktop apps and in browser.
 */
@Injectable()
export class GlobalizationMock extends Globalization {

    constructor(private appProvider: CoreAppProvider) {
        super();
    }

    /**
     * Get the current locale.
     *
     * @return {string} Locale name.
     */
    private getCurrentlocale(): string {
        // Get browser language.
        const navLang = (<any> navigator).userLanguage || navigator.language;

        try {
            if (this.appProvider.isDesktop()) {
                return require('electron').remote.app.getLocale() || navLang;
            } else {
                return navLang;
            }
        } catch (ex) {
            // Something went wrong, return browser language.
            return navLang;
        }
    }

    /**
     * Get the current locale name.
     *
     * @return {Promise<{value: string}>} Promise resolved with an object with the language string.
     */
    getLocaleName(): Promise<{ value: string }> {
        const locale = this.getCurrentlocale();
        if (locale) {
            return Promise.resolve({ value: locale });
        } else {
            const error = { code: GlobalizationError.UNKNOWN_ERROR, message: 'Cannot get language' };

            return Promise.reject(error);
        }
    }

    /*
     * Get the current preferred language.
     *
     * @return {Promise<{value: string}>} Promise resolved with an object with the language string.
     */
    getPreferredLanguage(): Promise<{ value: string }> {
        return this.getLocaleName();
    }
}
