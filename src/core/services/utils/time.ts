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

import { makeSingleton } from '@singletons';
import { CoreTime } from '@singletons/time';

/**
 * "Utils" service with helper functions for date and time.
 *
 * @deprecated since 5.0 use CoreTime instead.
 */
@Injectable({ providedIn: 'root' })
export class CoreTimeUtilsProvider {

    /**
     * Convert a PHP format to a DayJS format.
     *
     * @param format PHP format.
     * @returns Converted format.
     * @deprecated since 5.0. Use CoreTime.convertPHPToJSDateFormat instead.
     */
    convertPHPToMoment(format: string): string {
        return CoreTime.convertPHPToJSDateFormat(format);
    }

    /**
     * Fix format to use in an ion-datetime.
     *
     * @param format Format to use.
     * @returns Fixed format.
     * @deprecated since 5.0. Use CoreTime.fixFormatForDatetime instead.
     */
    fixFormatForDatetime(format: string): string {
        return CoreTime.fixFormatForDatetime(format);
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
     * @param convert If true (default), convert the format from PHP to DayJS. Set it to false for DayJS formats.
     * @param fixDay If true (default) then the leading zero from %d is removed.
     * @param fixHour If true (default) then the leading zero from %I is removed.
     * @returns Readable date.
     * @deprecated since 5.0. Use CoreTime.userDate instead.
     */
    userDate(timestamp: number, format?: string, convert: boolean = true, fixDay: boolean = true, fixHour: boolean = true): string {
        return CoreTime.userDate(timestamp, format, convert, fixDay, fixHour);
    }

    /**
     * Convert a timestamp to the format to set to a datetime input.
     *
     * @param timestamp Timestamp to convert (in ms). If not provided, current time.
     * @returns Formatted time.
     * @deprecated since 5.0. Use CoreTime.toDatetimeFormat instead.
     */
    toDatetimeFormat(timestamp?: number): string {
        return CoreTime.toDatetimeFormat(timestamp);
    }

    /**
     * Return the localized ISO format (i.e DDMMYY) from the localized DayJS format. Useful for translations.
     * DO NOT USE this function for ion-datetime format. DayJS escapes characters with [], but ion-datetime doesn't support it.
     *
     * @param localizedFormat Format to use.
     * @returns Localized ISO format.
     * @deprecated since 5.0. Use CoreTime.getLocalizedDateFormat instead.
     */
    getLocalizedDateFormat(localizedFormat: string): string {
        return CoreTime.getLocalizedDateFormat(localizedFormat);
    }

    /**
     * For a given timestamp get the midnight value in the user's timezone.
     *
     * The calculation is performed relative to the user's midnight timestamp
     * for today to ensure that timezones are preserved.
     *
     * @param timestamp The timestamp to calculate from. If not defined, return today's midnight.
     * @returns The midnight value of the user's timestamp.
     * @deprecated since 5.0. Use CoreTime.getMidnightForTimestamp instead.
     */
    getMidnightForTimestamp(timestamp?: number): number {
        return CoreTime.getMidnightForTimestamp(timestamp);
    }

    /**
     * Get the default max year for datetime inputs.
     *
     * @returns The maximum year for datetime inputs.
     * @deprecated since 5.0. Use CoreTime.getDatetimeDefaultMax instead.
     */
    getDatetimeDefaultMax(): string {
        return CoreTime.getDatetimeDefaultMax();
    }

    /**
     * Get the default min year for datetime inputs.
     *
     * @returns The minimum year for datetime inputs.
     * @deprecated since 5.0. Use CoreTime.getDatetimeDefaultMin instead.
     */
    getDatetimeDefaultMin(): string {
        return CoreTime.getDatetimeDefaultMin();
    }

}
/**
 * @deprecated since 5.0. Use CoreTime instead.
 */
// eslint-disable-next-line deprecation/deprecation
export const CoreTimeUtils = makeSingleton(CoreTimeUtilsProvider);
