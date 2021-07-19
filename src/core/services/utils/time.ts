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

import moment, { LongDateFormatKey } from 'moment';
import { CoreConstants } from '@/core/constants';
import { makeSingleton, Translate } from '@singletons';

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
     * Convert a PHP format to a Moment format.
     *
     * @param format PHP format.
     * @return Converted format.
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

                converted += typeof CoreTimeUtilsProvider.FORMAT_REPLACEMENTS[char] != 'undefined' ?
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
     * @return Fixed format.
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
     * Returns hours, minutes and seconds in a human readable format
     *
     * @param seconds A number of seconds
     * @return Seconds in a human readable format.
     */
    formatTime(seconds: number): string {
        const totalSecs = Math.abs(seconds);
        const years = Math.floor(totalSecs / CoreConstants.SECONDS_YEAR);
        let remainder = totalSecs - (years * CoreConstants.SECONDS_YEAR);
        const days = Math.floor(remainder / CoreConstants.SECONDS_DAY);

        remainder = totalSecs - (days * CoreConstants.SECONDS_DAY);

        const hours = Math.floor(remainder / CoreConstants.SECONDS_HOUR);
        remainder = remainder - (hours * CoreConstants.SECONDS_HOUR);

        const mins = Math.floor(remainder / CoreConstants.SECONDS_MINUTE);
        const secs = remainder - (mins * CoreConstants.SECONDS_MINUTE);

        const ss = Translate.instant('core.' + (secs == 1 ? 'sec' : 'secs'));
        const sm = Translate.instant('core.' + (mins == 1 ? 'min' : 'mins'));
        const sh = Translate.instant('core.' + (hours == 1 ? 'hour' : 'hours'));
        const sd = Translate.instant('core.' + (days == 1 ? 'day' : 'days'));
        const sy = Translate.instant('core.' + (years == 1 ? 'year' : 'years'));
        let oyears = '';
        let odays = '';
        let ohours = '';
        let omins = '';
        let osecs = '';

        if (years) {
            oyears = years + ' ' + sy;
        }
        if (days) {
            odays = days + ' ' + sd;
        }
        if (hours) {
            ohours = hours + ' ' + sh;
        }
        if (mins) {
            omins = mins + ' ' + sm;
        }
        if (secs) {
            osecs = secs + ' ' + ss;
        }

        if (years) {
            return oyears + ' ' + odays;
        }
        if (days) {
            return odays + ' ' + ohours;
        }
        if (hours) {
            return ohours + ' ' + omins;
        }
        if (mins) {
            return omins + ' ' + osecs;
        }
        if (secs) {
            return osecs;
        }

        return Translate.instant('core.now');
    }

    /**
     * Returns hours, minutes and seconds in a human readable format.
     *
     * @param duration Duration in seconds
     * @param precision Number of elements to have in precision. 0 or undefined to full precission.
     * @return Duration in a human readable format.
     */
    formatDuration(duration: number, precision?: number): string {
        precision = precision || 5;

        const eventDuration = moment.duration(duration, 'seconds');
        let durationString = '';

        if (precision && eventDuration.years() > 0) {
            durationString += ' ' + moment.duration(eventDuration.years(), 'years').humanize();
            precision--;
        }
        if (precision && eventDuration.months() > 0) {
            durationString += ' ' + moment.duration(eventDuration.months(), 'months').humanize();
            precision--;
        }
        if (precision && eventDuration.days() > 0) {
            durationString += ' ' + moment.duration(eventDuration.days(), 'days').humanize();
            precision--;
        }
        if (precision && eventDuration.hours() > 0) {
            durationString += ' ' + moment.duration(eventDuration.hours(), 'hours').humanize();
            precision--;
        }
        if (precision && eventDuration.minutes() > 0) {
            durationString += ' ' + moment.duration(eventDuration.minutes(), 'minutes').humanize();
            precision--;
        }

        return durationString.trim();
    }

    /**
     * Returns duration in a short human readable format: minutes and seconds, in fromat: 3' 27''.
     *
     * @param duration Duration in seconds
     * @return Duration in a short human readable format.
     */
    formatDurationShort(duration: number): string {
        const minutes = Math.floor(duration / 60);
        const seconds = duration - minutes * 60;
        const durations = <string[]>[];

        if (minutes > 0) {
            durations.push(minutes + '\'');
        }

        if (seconds > 0 || minutes === 0) {
            durations.push(seconds + '\'\'');
        }

        return durations.join(' ');
    }

    /**
     * Return the current timestamp in a "readable" format: YYYYMMDDHHmmSS.
     *
     * @return The readable timestamp.
     */
    readableTimestamp(): string {
        return moment(Date.now()).format('YYYYMMDDHHmmSS');
    }

    /**
     * Return the current timestamp (UNIX format, seconds).
     *
     * @return The current timestamp in seconds.
     */
    timestamp(): number {
        return Math.round(Date.now() / 1000);
    }

    /**
     * Convert a timestamp into a readable date.
     *
     * @param timestamp Timestamp in milliseconds.
     * @param format The format to use (lang key). Defaults to core.strftimedaydatetime.
     * @param convert If true (default), convert the format from PHP to Moment. Set it to false for Moment formats.
     * @param fixDay If true (default) then the leading zero from %d is removed.
     * @param fixHour If true (default) then the leading zero from %I is removed.
     * @return Readable date.
     */
    userDate(timestamp: number, format?: string, convert: boolean = true, fixDay: boolean = true, fixHour: boolean = true): string {
        format = Translate.instant(format ? format : 'core.strftimedaydatetime');

        if (fixDay) {
            format = format!.replace(/%d/g, '%e');
        }

        if (fixHour) {
            format = format!.replace('%I', '%l');
        }

        // Format could be in PHP format, convert it to moment.
        if (convert) {
            format = this.convertPHPToMoment(format!);
        }

        return moment(timestamp).format(format);
    }

    /**
     * Convert a timestamp to the format to set to a datetime input.
     *
     * @param timestamp Timestamp to convert (in ms). If not provided, current time.
     * @return Formatted time.
     */
    toDatetimeFormat(timestamp?: number): string {
        timestamp = timestamp || Date.now();

        return this.userDate(timestamp, 'YYYY-MM-DDTHH:mm:ss.SSS', false) + 'Z';
    }

    /**
     * Convert a text into user timezone timestamp.
     *
     * @todo The `applyOffset` argument is only used as a workaround, it should be removed once
     * MOBILE-3784 is resolved.
     *
     * @param date To convert to timestamp.
     * @param applyOffset Whether to apply offset to date or not.
     * @return Converted timestamp.
     */
    convertToTimestamp(date: string, applyOffset?: boolean): number {
        const timestamp = moment(date).unix();

        if (typeof applyOffset !== 'undefined') {
            return applyOffset ? timestamp - moment().utcOffset() * 60 : timestamp;
        }

        return typeof date == 'string' && date.slice(-1) == 'Z'
            ? timestamp - moment().utcOffset() * 60
            : timestamp;
    }

    /**
     * Return the localized ISO format (i.e DDMMYY) from the localized moment format. Useful for translations.
     * DO NOT USE this function for ion-datetime format. Moment escapes characters with [], but ion-datetime doesn't support it.
     *
     * @param localizedFormat Format to use.
     * @return Localized ISO format
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
     * @return The midnight value of the user's timestamp.
     */
    getMidnightForTimestamp(timestamp?: number): number {
        if (timestamp) {
            return moment(timestamp * 1000).startOf('day').unix();
        } else {
            return moment().startOf('day').unix();
        }
    }

    /**
     * Get the default max year for datetime inputs.
     */
    getDatetimeDefaultMax(): string {
        return String(moment().year() + 20);
    }

    /**
     * Get the default min year for datetime inputs.
     */
    getDatetimeDefaultMin(): string {
        return String(moment().year() - 20);
    }

}

export const CoreTimeUtils = makeSingleton(CoreTimeUtilsProvider);
