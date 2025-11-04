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

import djs from 'dayjs'; // eslint-disable-line no-restricted-imports
import { CorePlatform } from '@services/platform';

// Re-export everything as is except dayjs itself.
export { Dayjs, extend, locale, isDayjs, unix } from 'dayjs'; // eslint-disable-line no-restricted-imports

/**
 * Wrapper to create dayjs instances. It will use dayjs or dayjs.tz depending on whether the app is running automated tests.
 * This is needed because the app needs to force a timezone when running automated tests, and dayjs.tz causes problems with
 * timezones that have daylight saving time. E.g. if you create a dayjs.tz instance with current time and then change it to a date
 * with a different DST, the timezone will be wrong.
 *
 * @param date Date to create the dayjs instance from. If not provided, current date will be used.
 * @param format Format to use to parse the date. If not provided, the date will be parsed using the default format.
 * @param strictOrLocale Strict parsing or locale.
 * @param strict Strict parsing.
 * @returns Dayjs instance.
 */
const dayJSWrapper = ((
    date?: djs.ConfigType,
    format?: djs.OptionType,
    strictOrLocale?: boolean|string,
    strict?: boolean,
): djs.Dayjs => {
    if (CorePlatform.isAutomated()) {
        // For testing, force the timezone to Australia/Perth. We need to use dayjs.tz to set the timezone.
        // In this case the format needs to be a string.
        const formatString: string | undefined = format === undefined ?
            undefined :
            typeof format === 'string' ? format : ('format' in format ? format.format : format[0]);

        return formatString ? djs.tz(date, formatString, 'Australia/Perth') : djs.tz(date, 'Australia/Perth');
    }

    // Use the regular dayjs, with no timezone set.
    if (typeof strictOrLocale === 'boolean') {
        return djs(date, format, strictOrLocale);
    }

    return djs(date, format, strictOrLocale, strict);
}) as typeof djs;

// Create a Proxy to use the original dayjs library for all properties and functions.
const dayJSProxy = new Proxy(dayJSWrapper, {
    get: (target, prop) => djs[prop],
});

export { dayJSProxy as dayjs };
