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

import { Pipe, PipeTransform } from '@angular/core';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreLogger } from '@singletons/logger';

/**
 * Filter to format a date.
 */
@Pipe({
    name: 'coreFormatDate',
})
export class CoreFormatDatePipe implements PipeTransform {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreFormatDatePipe');
    }

    /**
     * Format a date.
     *
     * @param timestamp Timestamp to format (in milliseconds). If not defined, use current time.
     * @param format Format to use. It should be a string code to handle i18n (e.g. core.strftimetime).
     *               Defaults to strftimedaydatetime.
     * @param convert If true, convert the format from PHP to Moment. Set it to false for Moment formats.
     * @return Formatted date.
     */
    transform(timestamp: string | number, format?: string, convert?: boolean): string {
        timestamp = timestamp || Date.now();
        format = format || 'strftimedaydatetime';

        if (typeof timestamp == 'string') {
            // Convert the value to a number.
            const numberTimestamp = parseInt(timestamp, 10);
            if (isNaN(numberTimestamp)) {
                this.logger.error('Invalid value received', timestamp);

                return timestamp;
            }
            timestamp = numberTimestamp;
        }

        // Add "core." if needed.
        if (format.indexOf('strf') == 0 || format.indexOf('df') == 0) {
            format = 'core.' + format;
        }

        if (typeof convert == 'undefined') {
            // Initialize convert param. Set it to false if it's a core.df format, set it to true otherwise.
            convert = format.indexOf('core.df') != 0;
        }

        return CoreTimeUtils.userDate(timestamp, format, convert);
    }

}
