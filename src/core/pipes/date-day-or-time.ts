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
import { dayjs } from '@/core/utils/dayjs';

import { CoreTime } from '@static/time';
import { Translate } from '@singletons';
import { CoreLogger } from '@static/logger';

/**
 * Filter to display a date using the day, or the time.
 *
 * This shows a short version of a date. Use this filter when you want
 * the user to visualise when the action was done relatively to today's date.
 *
 * For instance, if the action happened during this day it will display the time,
 * but when the action happened few days ago, it will display the day of the week.
 *
 * The older the date is, the more information about it will be displayed.
 *
 * This filter expects a timestamp NOT including milliseconds.
 */
@Pipe({
    name: 'coreDateDayOrTime',
})
export class CoreDateDayOrTimePipe implements PipeTransform {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreDateDayOrTimePipe');
    }

    /**
     * Format a timestamp.
     *
     * @param timestamp The UNIX timestamp (without milliseconds).
     * @returns Formatted time.
     */
    transform(timestamp: string | number): string {
        if (typeof timestamp === 'string') {
            // Convert the value to a number.
            const numberTimestamp = parseInt(timestamp, 10);
            if (isNaN(numberTimestamp)) {
                this.logger.error('Invalid value received', timestamp);

                return timestamp;
            }
            timestamp = numberTimestamp;
        }

        return dayjs(timestamp * 1000).calendar(null, {
            sameDay: CoreTime.convertPHPToJSDateFormat(Translate.instant('core.strftimetime')),
            lastDay: Translate.instant('core.dflastweekdate'),
            lastWeek: Translate.instant('core.dflastweekdate'),
            sameElse: CoreTime.convertPHPToJSDateFormat(Translate.instant('core.strftimedatefullshort')),
        });
    }

}
