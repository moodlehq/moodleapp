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
import { CoreConstants } from '../constants';
import { CorePlatform } from '@services/platform';
import moment from 'moment';

/**
 * Singleton with helper functions for time operations.
 */
export class CoreTime {

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

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
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

        const years = Math.floor(totalSecs / CoreConstants.SECONDS_YEAR);
        let remainder = totalSecs - (years * CoreConstants.SECONDS_YEAR);
        const days = Math.floor(remainder / CoreConstants.SECONDS_DAY);

        remainder = remainder - (days * CoreConstants.SECONDS_DAY);

        const hours = Math.floor(remainder / CoreConstants.SECONDS_HOUR);
        remainder = remainder - (hours * CoreConstants.SECONDS_HOUR);

        const mins = Math.floor(remainder / CoreConstants.SECONDS_MINUTE);
        const secs = remainder - (mins * CoreConstants.SECONDS_MINUTE);

        const secondsUnit = Translate.instant('core.' + (secs === 1 ? 'sec' : 'secs'));
        const minutesUnit = Translate.instant('core.' + (mins === 1 ? 'min' : 'mins'));
        const hoursUnit = Translate.instant('core.' + (hours === 1 ? 'hour' : 'hours'));
        const daysUnit = Translate.instant('core.' + (days === 1 ? 'day' : 'days'));
        const yearsUnit = Translate.instant('core.' + (years === 1 ? 'year' : 'years'));
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
            durations.push(minutes + '\'');
        }

        if (seconds > 0 || minutes === 0) {
            durations.push(seconds + '\'\'');
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
            fn.apply(null, args);
        };
    }

    /**
     * Returns the forced timezone to use. Timezone is forced for automated tests.
     *
     * @returns Timezone. Undefined to use the user's timezone.
     */
    static getForcedTimezone(): string | undefined {
        // Use the same timezone forced for LMS in tests.
        return CorePlatform.isAutomated() ? 'Australia/Perth' : undefined;
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
     * Return the current timestamp in a "readable" format: YYYYMMDDHHmmSS.
     *
     * @returns The readable timestamp.
     */
    static readableTimestamp(): string {
        return moment(Date.now()).format('YYYYMMDDHHmmSS');
    }

    /**
     * Return the current timestamp (UNIX format, seconds).
     *
     * @returns The current timestamp in seconds.
     */
    static timestamp(): number {
        return Math.round(Date.now() / 1000);
    }

}
