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
 * Filter to format a timestamp to a locale string. Timestamp can be in seconds or milliseconds.
 *
 * @deprecated since 3.6. Use coreFormatDate instead.
 */
@Pipe({
    name: 'coreToLocaleString',
})
export class CoreToLocaleStringPipe implements PipeTransform {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreToLocaleStringPipe');
    }

    /**
     * Format a timestamp to a locale string.
     *
     * @param timestamp The timestamp (can be in seconds or milliseconds).
     * @return Formatted time.
     */
    transform(timestamp: number | string): string {
        if (typeof timestamp == 'string') {
            // Convert the value to a number.
            const numberTimestamp = parseInt(timestamp, 10);
            if (isNaN(numberTimestamp)) {
                this.logger.error('Invalid value received', timestamp);

                return timestamp;
            }
            timestamp = numberTimestamp;
        }

        if (timestamp < 0) {
            // Date not valid.
            return '';
        }
        if (timestamp < 100000000000) {
            // Timestamp is in seconds, convert it to milliseconds.
            timestamp = timestamp * 1000;
        }

        return CoreTimeUtils.userDate(timestamp, 'core.strftimedatetimeshort');
    }

}
