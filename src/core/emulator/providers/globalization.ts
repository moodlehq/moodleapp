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
import { Globalization, GlobalizationOptions } from '@ionic-native/globalization';
import { CoreAppProvider } from '@providers/app';

/**
 * Mock the Globalization Error.
 */
export class GlobalizationErrorMock implements GlobalizationError {
    static UNKNOWN_ERROR = 0;
    static FORMATTING_ERROR = 1;
    static PARSING_ERROR = 2;
    static PATTERN_ERROR = 3;

    constructor(public code: number, public message: string) { }
}

/**
 * Emulates the Cordova Globalization plugin in desktop apps and in browser.
 */
@Injectable()
export class GlobalizationMock extends Globalization {

    constructor(private appProvider: CoreAppProvider) {
        super();
    }

    /**
     * Converts date to string.
     *
     * @param {Date} date Date you wish to convert
     * @param options Options for the converted date. Length, selector.
     * @returns {Promise<{value: string}>} Returns a promise when the date has been converted.
     */
    dateToString(date: Date, options: GlobalizationOptions): Promise<{ value: string; }> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }

    /**
     * Returns a pattern string to format and parse currency values according to the client's user preferences and ISO 4217
     * currency code.
     *
     * @param {string} currencyCode Currency Code.
     * @returns {Promise<any>}
     */
    getCurrencyPattern(currencyCode: string): Promise<any> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
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
     * Returns an array of the names of the months or days of the week, depending on the client's user preferences and calendar.
     *
     * @param options Object with type (narrow or wide) and item (month or days).
     * @returns {Promise<{value: Array<string>}>} Returns a promise.
     */
    getDateNames(options: { type: string; item: string; }): Promise<{ value: Array<string>; }> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }

    /**
     * Returns a pattern string to format and parse dates according to the client's user preferences.
     *
     * @param options Object with the format length and selector
     * @returns {Promise<any>} Returns a promise.
     */
    getDatePattern(options: GlobalizationOptions): Promise<any> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }

    /**
     * Returns the first day of the week according to the client's user preferences and calendar.
     *
     * @returns {Promise<{value: string}>} returns a promise with the value
     */
    getFirstDayOfWeek(): Promise<{ value: string; }> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
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
            const error = new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Cannot get language');

            return Promise.reject(error);
        }
    }

    /**
     * Returns a pattern string to format and parse numbers according to the client's user preferences.
     * @param options Can be decimal, percent, or currency.
     * @returns {Promise<any>}
     */
    getNumberPattern(options: { type: string; }): Promise<any> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }

    /*
     * Get the current preferred language.
     *
     * @return {Promise<{value: string}>} Promise resolved with an object with the language string.
     */
    getPreferredLanguage(): Promise<{ value: string }> {
        return this.getLocaleName();
    }

    /**
     * Indicates whether daylight savings time is in effect for a given date using the client's time zone and calendar.
     *
     * @param {data} date Date to process.
     * @returns {Promise<{dst: string}>} reutrns a promise with the value
     */
    isDayLightSavingsTime(date: Date): Promise<{ dst: string; }> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }

    /**
     * Returns a number formatted as a string according to the client's user preferences.
     * @param numberToConvert {Number} The number to convert
     * @param options {Object} Object with property `type` that can be set to: decimal, percent, or currency.
     */
    numberToString(numberToConvert: number, options: { type: string; }): Promise<{ value: string; }> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }

    /**
     * Parses a date formatted as a string, according to the client's user preferences and calendar using the time zone of the
     * client, and returns the corresponding date object.
     *
     * @param {string} dateString Date as a string to be converted
     * @param options Options for the converted date. Length, selector.
     * @returns {Promise<any>} Returns a promise when the date has been converted.
     */
    stringToDate(dateString: string, options: GlobalizationOptions): Promise<any> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }

    /**
     *
     * @param {string} stringToConvert String you want to conver to a number.
     *
     * @param options The type of number you want to return. Can be decimal, percent, or currency.
     * @returns {Promise<{ value: number | string }>} Returns a promise with the value.
     */
    stringToNumber(stringToConvert: string, options: { type: string; }): Promise<{ value: number | string; }> {
        return Promise.reject(new GlobalizationErrorMock(GlobalizationErrorMock.UNKNOWN_ERROR, 'Not supported.'));
    }
}
