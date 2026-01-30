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

import { Translate } from '@singletons';
import { CoreTimeConstants } from '../constants';
import { dayjs } from '@/core/utils/dayjs';
import { CorePlatform } from '@services/platform';

/**
 * Static class with helper functions for time operations.
 */
export class CoreTime {

    /**
     * To convert PHP strf format to DayJS format.
     */
    protected static readonly FORMAT_REPLACEMENTS = {
        '%a': 'ddd',
        '%A': 'dddd',
        '%d': 'DD',
        '%e': 'D', // Not exactly the same. PHP adds a space instead of leading zero, DayJs doesn't.
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
        '%C' : '', // Not supported by DayJs.
        '%g': 'GG',
        '%G': 'GGGG',
        '%y': 'YY',
        '%Y': 'YYYY',
        '%H': 'HH',
        '%k': 'H', // Not exactly the same. PHP adds a space instead of leading zero, DayJS doesn't.
        '%I': 'hh',
        '%l': 'h', // Not exactly the same. PHP adds a space instead of leading zero, DayJS doesn't.
        '%M': 'mm',
        '%p': 'A',
        '%P': 'a',
        '%r': 'hh:mm:ss A',
        '%R': 'HH:mm',
        '%S': 'ss',
        '%T': 'HH:mm:ss',
        '%X': 'LTS',
        '%z': 'ZZ',
        '%Z': 'ZZ', // Not supported by DayJS, it was deprecated. Use the same as %z.
        '%c': 'LLLL',
        '%D': 'MM/DD/YY',
        '%F': 'YYYY-MM-DD',
        '%s': 'X',
        '%x': 'L',
        '%n': '\n',
        '%t': '\t',
        '%%': '%',
    };

    protected static readonly LEGACY_TIMEZONES = {
        '-13.0': 'Australia/Perth',
        '-12.5': 'Etc/GMT+12',
        '-12.0': 'Etc/GMT+12',
        '-11.5': 'Etc/GMT+11',
        '-11.0': 'Etc/GMT+11',
        '-10.5': 'Etc/GMT+10',
        '-10.0': 'Etc/GMT+10',
        '-9.5': 'Etc/GMT+9',
        '-9.0': 'Etc/GMT+9',
        '-8.5': 'Etc/GMT+8',
        '-8.0': 'Etc/GMT+8',
        '-7.5': 'Etc/GMT+7',
        '-7.0': 'Etc/GMT+7',
        '-6.5': 'Etc/GMT+6',
        '-6.0': 'Etc/GMT+6',
        '-5.5': 'Etc/GMT+5',
        '-5.0': 'Etc/GMT+5',
        '-4.5': 'Etc/GMT+4',
        '-4.0': 'Etc/GMT+4',
        '-3.5': 'Etc/GMT+3',
        '-3.0': 'Etc/GMT+3',
        '-2.5': 'Etc/GMT+2',
        '-2.0': 'Etc/GMT+2',
        '-1.5': 'Etc/GMT+1',
        '-1.0': 'Etc/GMT+1',
        '-0.5': 'Etc/GMT',
        '0': 'Etc/GMT',
        '0.0': 'Etc/GMT',
        '0.5': 'Etc/GMT',
        '1.0': 'Etc/GMT-1',
        '1.5': 'Etc/GMT-1',
        '2.0': 'Etc/GMT-2',
        '2.5': 'Etc/GMT-2',
        '3.0': 'Etc/GMT-3',
        '3.5': 'Etc/GMT-3',
        '4.0': 'Etc/GMT-4',
        '4.5': 'Asia/Kabul',
        '5.0': 'Etc/GMT-5',
        '5.5': 'Asia/Kolkata',
        '6.0': 'Etc/GMT-6',
        '6.5': 'Asia/Rangoon',
        '7.0': 'Etc/GMT-7',
        '7.5': 'Etc/GMT-7',
        '8.0': 'Etc/GMT-8',
        '8.5': 'Etc/GMT-8',
        '9.0': 'Etc/GMT-9',
        '9.5': 'Australia/Darwin',
        '10.0': 'Etc/GMT-10',
        '10.5': 'Etc/GMT-10',
        '11.0': 'Etc/GMT-11',
        '11.5': 'Etc/GMT-11',
        '12.0': 'Etc/GMT-12',
        '12.5': 'Etc/GMT-12',
        '13.0': 'Etc/GMT-13',
    };

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Initialize.
     */
    static async initialize(): Promise<void> {
        const plugins = [
            import('dayjs/plugin/localeData'),
            import('dayjs/plugin/objectSupport'),
            import('dayjs/plugin/dayOfYear'),
            import('dayjs/plugin/weekday'),
            import('dayjs/plugin/calendar'),
            import('dayjs/plugin/localizedFormat'),
            import('dayjs/plugin/utc'),
        ];
        if (CorePlatform.isAutomated()) {
            plugins.push(import('dayjs/plugin/timezone'));
            plugins.push(import('dayjs/plugin/updateLocale'));
        }

        const result = await Promise.all(plugins);
        result.map((plugin) => {
            dayjs.extend(plugin.default);
        });

        // Set relative time thresholds for humanize(), otherwise for example 47 minutes were converted to 'an hour'.
        const strictThresholds = [
            { l: 's', r: 59, d: 'second' }, // ss is not declared on locale.
            { l: 'm', r: 1 },
            { l: 'mm', r: 59, d: 'minute' },
            { l: 'h', r: 1 },
            { l: 'hh', r: 23, d: 'hour' },
            { l: 'd', r: 1 },
            { l: 'dd', r: 29, d: 'day' },
            { l: 'M', r: 1 },
            { l: 'MM', r: 11, d: 'month' },
            { l: 'y', r: 1 },
            { l: 'yy', r: Infinity, d: 'year' },
        ];

        const  config = {
            thresholds: strictThresholds,
            rounding: Math.floor,
        };

        const plugin = await import('dayjs/plugin/relativeTime');

        dayjs.extend(plugin.default, config);
    }

    /**
     * Returns years, months, days, hours, minutes and seconds in a human readable format.
     *
     * @param seconds A number of seconds
     * @param precision Number of elements to have in precision.
     * @returns Seconds in a human readable format.
     */
    static formatTime(seconds: number, precision = 2): string {
        precision = precision || 5; // Use max precision if 0 is passed.

        const totalSecs = Math.abs(seconds);
        if (!totalSecs) {
            return Translate.instant('core.now');
        }

        const years = Math.floor(totalSecs / CoreTimeConstants.SECONDS_YEAR);
        let remainder = totalSecs - (years * CoreTimeConstants.SECONDS_YEAR);
        const days = Math.floor(remainder / CoreTimeConstants.SECONDS_DAY);

        remainder = remainder - (days * CoreTimeConstants.SECONDS_DAY);

        const hours = Math.floor(remainder / CoreTimeConstants.SECONDS_HOUR);
        remainder = remainder - (hours * CoreTimeConstants.SECONDS_HOUR);

        const mins = Math.floor(remainder / CoreTimeConstants.SECONDS_MINUTE);
        const secs = remainder - (mins * CoreTimeConstants.SECONDS_MINUTE);

        const secondsUnit = Translate.instant(`core.${secs === 1 ? 'sec' : 'secs'}`);
        const minutesUnit = Translate.instant(`core.${mins === 1 ? 'min' : 'mins'}`);
        const hoursUnit = Translate.instant(`core.${hours === 1 ? 'hour' : 'hours'}`);
        const daysUnit = Translate.instant(`core.${days === 1 ? 'day' : 'days'}`);
        const yearsUnit = Translate.instant(`core.${years === 1 ? 'year' : 'years'}`);
        const parts: string[] = [];

        if (precision && years) {
            parts.push(`${years} ${yearsUnit}`);
            precision--;
        }
        if (precision && days) {
            parts.push(`${days} ${daysUnit}`);
            precision--;
        }
        if (precision && hours) {
            parts.push(`${hours} ${hoursUnit}`);
            precision--;
        }
        if (precision && mins) {
            parts.push(`${mins} ${minutesUnit}`);
            precision--;
        }
        if (precision && secs) {
            parts.push(`${secs} ${secondsUnit}`);
            precision--;
        }

        return parts.join(' ');
    }

    /**
     * Converts a number of seconds into a short human readable format: minutes and seconds, in fromat: 3' 27''.
     *
     * @param duration Duration in seconds.
     * @returns Short human readable text.
     */
    static formatTimeShort(duration: number): string {
        const minutes = Math.floor(duration / 60);
        const seconds = duration - minutes * 60;
        const durations = <string[]>[];

        if (minutes > 0) {
            durations.push(`${minutes}'`);
        }

        if (seconds > 0 || minutes === 0) {
            durations.push(`${seconds}''`);
        }

        return durations.join(' ');
    }

    /**
     * Wrap a function so that it is called only once.
     *
     * @param fn Function.
     * @returns Wrapper that will call the underlying function only once.
     */
    static once<T extends unknown[]>(fn: (...args: T) => unknown): (...args: T) => void {
        let called = false;

        return (...args: T) => {
            if (called) {
                return;
            }

            called = true;
            fn(...args);
        };
    }

    /**
     * Translates legacy timezone names.
     *
     * @param tz Timezone name.
     * @returns Readable timezone name.
     */
    static translateLegacyTimezone(tz: string): string {
        return CoreTime.LEGACY_TIMEZONES[tz] ?? tz;
    }

    /**
     * Ensure the timestamp is in milliseconds.
     *
     * @param time Timestamp in milliseconds or seconds.
     * @returns Timestamp in milliseconds.
     */
    static ensureMilliseconds(time: number): number {
        if (time < 10000000000) { // Checking year 2286.
            // It's a timestamp in seconds, convert it to milliseconds.
            return time * 1000;
        }

        return time;
    }

    /**
     * Ensure the timestamp is in seconds.
     *
     * @param time Timestamp in milliseconds or seconds.
     * @returns Timestamp in seconds.
     */
    static ensureSeconds(time: number): number {
        if (time > 10000000000) { // Checking year 2286.
            // It's a timestamp in milliseconds, convert it to seconds.
            return Math.round(time / 1000);
        }

        return time;
    }

    /**
     * Return the current timestamp in a "readable" format: YYYYMMDDHHmmss.
     *
     * @returns The readable timestamp.
     */
    static readableTimestamp(): string {
        return dayjs().format('YYYYMMDDHHmmss');
    }

    /**
     * Return the current timestamp (UNIX format, seconds).
     *
     * @returns The current timestamp in seconds.
     */
    static timestamp(): number {
        return dayjs().unix();
    }

    /**
     * Convert a PHP format to a JS date format.
     *
     * @param format PHP format.
     * @returns Converted format.
     */
    static convertPHPToJSDateFormat(format: string): string {
        if (typeof format !== 'string') {
            // Not valid.
            return '';
        }

        let converted = '';
        let escaping = false;

        for (let i = 0; i < format.length; i++) {
            let char = format[i];

            if (char === '%') {
                // It's a PHP format, try to convert it.
                i++;
                char += format[i] || '';

                if (escaping) {
                    // We were escaping some characters, stop doing it now.
                    escaping = false;
                    converted += ']';
                }

                converted += CoreTime.FORMAT_REPLACEMENTS[char] !== undefined ?
                    CoreTime.FORMAT_REPLACEMENTS[char] : char;
            } else {
                // Not a PHP format. We need to escape them, otherwise the letters could be confused with DayJS formats.
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
    static fixFormatForDatetime(format: string): string {
        if (!format) {
            return '';
        }

        // The component ion-datetime doesn't support escaping characters ([]), so we remove them.
        let fixed = format.replace(/[[\]]/g, '');

        if (fixed.indexOf('A') !== -1) {
            // Do not use am/pm format because there is a bug in ion-datetime.
            fixed = fixed.replace(/ ?A/g, '');
            fixed = fixed.replace(/h/g, 'H');
        }

        return fixed;
    }

    /**
     * Convert a timestamp into a readable date.
     *
     * @param timestamp Timestamp in milliseconds.
     * @param format The format to use (lang key). Defaults to core.strftimedaydatetime.
     * @param convert If true (default), convert the format from PHP to DayJS. Set it to false for DayJS formats.
     * @param fixDay If true (default) then the leading zero from %d is removed.
     * @param fixHour If true (default) then the leading zero from %I is removed.
     * @returns Readable date.
     */
    static userDate(
        timestamp: number,
        format?: string,
        convert = true,
        fixDay = true,
        fixHour = true,
    ): string {
        format = Translate.instant(format ? format : 'core.strftimedaydatetime');

        if (fixDay) {
            format = format.replace(/%d/g, '%e');
        }

        if (fixHour) {
            format = format.replace('%I', '%l');
        }

        // Format could be in PHP format, convert it to DayJS.
        if (convert) {
            format = CoreTime.convertPHPToJSDateFormat(format);
        }

        return dayjs(timestamp).format(format);
    }

    /**
     * Convert a timestamp to the format to set to a datetime input.
     *
     * @param timestamp Timestamp to convert (in ms). If not provided, current time.
     * @returns Formatted time.
     */
    static toDatetimeFormat(timestamp?: number): string {
        // See https://ionicframework.com/docs/api/datetime#iso-8601-datetime-format-yyyy-mm-ddthhmmz
        // Do not use toISOString because it returns the date in UTC.
        return dayjs(timestamp).format('YYYY-MM-DDTHH:mm');
    }

    /**
     * Return the localized ISO format (i.e DDMMYY) from the localized DayJS format. Useful for translations.
     * DO NOT USE this function for ion-datetime format. DayJS escapes characters with [], but ion-datetime doesn't support it.
     *
     * @param localizedFormat Format to use.
     * @returns Localized ISO format
     * @todo Check this is used.
     */
    static getLocalizedDateFormat(localizedFormat: string): string {
        return dayjs.localeData().longDateFormat(localizedFormat);
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
    static getMidnightForTimestamp(timestamp?: number): number {
        return timestamp === undefined
            ? dayjs().startOf('day').unix()
            : dayjs(timestamp * 1000).startOf('day').unix();
    }

    /**
     * Get the default max year for datetime inputs.
     *
     * @returns The maximum year for datetime inputs.
     */
    static getDatetimeDefaultMax(): string {
        return String(dayjs().year() + 20);
    }

    /**
     * Get the default min year for datetime inputs.
     *
     * @returns The minimum year for datetime inputs.
     */
    static getDatetimeDefaultMin(): string {
        return String(dayjs().year() - 20);
    }

    /**
     * Formats the timestamp as a relative date string (e.g., "Today", "Yesterday", "Tomorrow"). If timestamp isn't close enough
     * to be a relative date, it returns null.
     *
     * @param timestamp The timestamp to format.
     * @returns Formatted date, or null if not a close date.
     */
    static formatRelativeDate(timestamp: number): string | null {
        const date = dayjs(timestamp);
        const today = dayjs();
        let langString: string | null = null;

        if (date.isSame(today, 'day')) {
            langString = 'timerelativetoday';
        } else if (date.isSame(today.subtract(1, 'days'), 'day')) {
            langString = 'timerelativeyesterday';
        } else if (date.isSame(today.add(1, 'days'), 'day')) {
            langString = 'timerelativetomorrow';
        }

        if (langString === null) {
            return null;
        }

        return Translate.instant(`core.${langString}`, { $a: CoreTime.userDate(timestamp, 'core.strftimedateshort') });
    }

}
