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

import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreLoggerProvider } from '@providers/logger';
import * as moment from 'moment';

/**
 * Filter to format a date.
 */
@Pipe({
    name: 'coreFormatDate',
})
export class CoreFormatDatePipe implements PipeTransform {
    protected logger;

    constructor(logger: CoreLoggerProvider, private translate: TranslateService) {
        this.logger = logger.getInstance('CoreDateDayOrTimePipe');
    }

    /**
     * Format a date.
     *
     * @param {string|number} timestamp Timestamp to format (in milliseconds). If not defined, use current time.
     * @param {string} format Format to use. It should be a string code to handle i18n (e.g. core.dftimedate). If the code
     *                        doesn't have a prefix, 'core' will be used by default. E.g. 'dftimedate' -> 'core.dftimedate'.
     * @return {string} Formatted date.
     */
    transform(timestamp: string | number, format: string): string {
        timestamp = timestamp || Date.now();

        if (typeof timestamp == 'string') {
            // Convert the value to a number.
            const numberTimestamp = parseInt(timestamp, 10);
            if (isNaN(numberTimestamp)) {
                this.logger.error('Invalid value received', timestamp);

                return timestamp;
            }
            timestamp = numberTimestamp;
        }

        if (format.indexOf('df') == 0) {
            format = this.translate.instant('core.' + format);
        } else if (format.indexOf('.') > 0) {
            format = this.translate.instant(format);
        }

        return moment(timestamp).format(format);
    }
}
