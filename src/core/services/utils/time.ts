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

import moment, { LongDateFormatKey } from 'moment-timezone';
import { makeSingleton, Translate } from '@singletons';
import { CoreTime } from '@singletons/time';

/*
 * "Utils" service with helper functions for date and time.
*/
@Injectable({ providedIn: 'root' })
export class CoreTimeUtilsProvider {

    protected static readonly FORMAT_REPLACEMENTS = { // To convert PHP strf format to Moment format.
        '%a': 'ddd',
        '%A': 'dddd',
        '%d': 'DD',
        '%e': 'D', // Not exactly the same. PHP adds a space instead of leading zero, Moment doesn't.
        '%j': 'DDDD',
        '%u': 'E',
        '%w': 'e', // It might not behave exactly like PHP, the first day could be calculated differently.
        '%U': 'ww', // It might not behave exactly like PHP, the first week could be calculated differently.
        '%V': 'WW',
        '%W': 'ww', // It might not behave exactly like PHP, the first week could be calculated differently.
        '%b': 'MMM',
        '%B': 'MMMM',
        '%h': 'MMM',
        '%m': 'MM',
        '%C' : '', // Not supported by Moment.
        '%g': 'GG',
        '%G': 'GGGG',
        '%y': 'YY',
        '%Y': 'YYYY',
        '%H': 'HH',
        '%k': 'H', // Not exactly the same. PHP adds a space instead of leading zero, Moment doesn't.
        '%I': 'hh',
        '%l': 'h', // Not exactly the same. PHP adds a space instead of leading zero, Moment doesn't.
        '%M': 'mm',
        '%p': 'A',
        '%P': 'a',
        '%r': 'hh:mm:ss A',
        '%R': 'HH:mm',
        '%S': 'ss',
        '%T': 'HH:mm:ss',
        '%X': 'LTS',
        '%z': 'ZZ',
        '%Z': 'ZZ', // Not supported by Moment, it was deprecated. Use the same as %z.
        '%c': 'LLLL',
        '%D': 'MM/DD/YY',
        '%F': 'YYYY-MM-DD',
        '%s': 'X',
        '%x': 'L',
        '%n': '\n',
        '%t': '\t',
        '%%': '%',
    };

    /**
     * Initialize.
     */
    initialize(): void {
        // Set relative time thresholds for humanize(), otherwise for example 47 minutes were converted to 'an hour'.
        moment.relativeTimeThreshold('s', 60);
        moment.relativeTimeThreshold('m', 60);
        moment.relativeTimeThreshold('h', 24);
        moment.relativeTimeThreshold('d', 30);
        moment.relativeTimeThreshold('M', 12);
        moment.relativeTimeThreshold('y', 365);
        moment.relativeTimeThreshold('ss', 0); // To display exact number of seconds instead of just "a few seconds".
    }

    /**
     * Convert a PHP format to a Moment format.
     *
     * @param format PHP format.
     * @returns Converted format.
     */
    convertPHPToMoment(format: string): string {
        if (typeof format != 'string') {
            // Not valid.
            return '';
        }

        let converted = '';
        let escaping = false;

        for (let i = 0; i < format.length; i++) {
            let char = format[i];

            if (char == '%') {
                // It's a PHP format, try to convert it.
                i++;
                char += format[i] || '';

                if (escaping) {
                    // We were escaping some characters, stop doing it now.
                    escaping = false;
                    converted += ']';
                }

                converted += CoreTimeUtilsProvider.FORMAT_REPLACEMENTS[char] !== undefined ?
                    CoreTimeUtilsProvider.FORMAT_REPLACEMENTS[char] : char;
            } else {
                // Not a PHP format. We need to escape them, otherwise the letters could be confused with Moment formats.
                if (!escaping) {
                    escaping = true;
                    converted += '[';
                }

                converted += char;
            }
        }

        if (escaping) {
            // Finish escaping.
            converted += ']';
        }

        return converted;
    }

    /**
     * Fix format to use in an ion-datetime.
     *
     * @param format Format to use.
     * @returns Fixed format.
     */
    fixFormatForDatetime(format: string): string {
        if (!format) {
            return '';
        }

        // The component ion-datetime doesn't support escaping characters ([]), so we remove them.
        let fixed = format.replace(/[[\]]/g, '');

        if (fixed.indexOf('A') != -1) {
            // Do not use am/pm format because there is a bug in ion-datetime.
            fixed = fixed.replace(/ ?A/g, '');
            fixed = fixed.replace(/h/g, 'H');
        }

        return fixed;
    }

    /**
     * Return the current timestamp in a "readable" format: YYYYMMDDHHmmSS.
     *
     * @returns The readable timestamp.
     * @deprecated since 5.0. Use CoreTime.timestamp instead.
     */
    readableTimestamp(): string {
        return CoreTime.readableTimestamp();
    }

    /**
     * Return the current timestamp (UNIX format, seconds).
     *
     * @returns The current timestamp in seconds.
     * @deprecated since 5.0. Use CoreTime.timestamp instead.
     */
    timestamp(): number {
        return CoreTime.timestamp();
    }

    /**
     * Convert a timestamp into a readable date.
     *
     * @param timestamp Timestamp in milliseconds.
     * @param format The format to use (lang key). Defaults to core.strftimedaydatetime.
     * @param convert If true (default), convert the format from PHP to Moment. Set it to false for Moment formats.
     * @param fixDay If true (default) then the leading zero from %d is removed.
     * @param fixHour If true (default) then the leading zero from %I is removed.
     * @returns Readable date.
     */
    userDate(timestamp: number, format?: string, convert: boolean = true, fixDay: boolean = true, fixHour: boolean = true): string {
        format = Translate.instant(format ? format : 'core.strftimedaydatetime');

        if (fixDay) {
            format = format.replace(/%d/g, '%e');
        }

        if (fixHour) {
            format = format.replace('%I', '%l');
        }

        // Format could be in PHP format, convert it to moment.
        if (convert) {
            format = this.convertPHPToMoment(format);
        }

        return moment(timestamp).format(format);
    }

    /**
     * Convert a timestamp to the format to set to a datetime input.
     *
     * @param timestamp Timestamp to convert (in ms). If not provided, current time.
     * @returns Formatted time.
     */
    toDatetimeFormat(timestamp?: number): string {
        const isoString = moment(timestamp || Date.now()).toISOString(true);

        // Remove milliseconds and timezone for consistency with the values used by ion-datetime.
        // ion-datetime no longer uses timezone, it always uses UTC.
        return isoString.substring(0, isoString.indexOf('.'));
    }

    /**
     * Return the localized ISO format (i.e DDMMYY) from the localized moment format. Useful for translations.
     * DO NOT USE this function for ion-datetime format. Moment escapes characters with [], but ion-datetime doesn't support it.
     *
     * @param localizedFormat Format to use.
     * @returns Localized ISO format
     */
    getLocalizedDateFormat(localizedFormat: LongDateFormatKey): string {
        return moment.localeData().longDateFormat(localizedFormat);
    }

    /**
     * For a given timestamp get the midnight value in the user's timezone.
     *
     * The calculation is performed relative to the user's midnight timestamp
     * for today to ensure that timezones are preserved.
     *
     * @param timestamp The timestamp to calculate from. If not defined, return today's midnight.
     * @returns The midnight value of the user's timestamp.
     */
    getMidnightForTimestamp(timestamp?: number): number {
        if (timestamp !== undefined) {
            return moment(timestamp * 1000).startOf('day').unix();
        } else {
            return moment().startOf('day').unix();
        }
    }

    /**
     * Get the default max year for datetime inputs.
     *
     * @returns The maximum year for datetime inputs.
     */
    getDatetimeDefaultMax(): string {
        return String(moment().year() + 20);
    }

    /**
     * Get the default min year for datetime inputs.
     *
     * @returns The minimum year for datetime inputs.
     */
    getDatetimeDefaultMin(): string {
        return String(moment().year() - 20);
    }

}

export const CoreTimeUtils = makeSingleton(CoreTimeUtilsProvider);
