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

import { OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { CoreTime } from '@static/time';
import { CoreLogger } from '@static/logger';
import { Translate } from '@singletons';
import { Subscription } from 'rxjs';

/**
 * Filter to format a date.
 */
@Pipe({
    name: 'coreFormatDate',
    pure: false,
})
export class CoreFormatDatePipe implements PipeTransform, OnDestroy {

    protected logger: CoreLogger;
    protected cachedResult?: string;
    protected subscription: Subscription;

    protected lastFormat?: string;
    protected lastTimestamp?: string | number;
    protected lastConvert?: boolean;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreFormatDatePipe');

        this.subscription = Translate.onLangChange.subscribe(() => {
            this.cachedResult = undefined;
        });
    }

    /**
     * Pipes a timestamp into a formatted date.
     *
     * @param timestamp Timestamp to format (in milliseconds). If not defined, use current time.
     * @param format Format to use. It should be a string code to handle i18n (e.g. core.strftimetime).
     *               Defaults to strftimedaydatetime.
     * @param convert If true, convert the format from PHP to DayJS. Set it to false for DayJS formats.
     * @returns Formatted date.
     */
    transform(timestamp: string | number, format = 'strftimedaydatetime', convert?: boolean): string {
        if (this.lastTimestamp !== timestamp || this.lastFormat !== format || this.lastConvert !== convert) {
            this.lastTimestamp = timestamp;
            this.lastFormat = format;
            this.lastConvert = convert;
            this.cachedResult = undefined;
        }

        if (this.cachedResult === undefined) {
            this.cachedResult = this.formatDate(timestamp, format, convert);
        }

        return this.cachedResult;
    }

    /**
     * Format a date.
     *
     * @param timestamp Timestamp to format (in milliseconds). If not defined, use current time.
     * @param format Format to use. It should be a string code to handle i18n (e.g. core.strftimetime).
     * @param convert If true, convert the format from PHP to DayJS. Set it to false for DayJS formats.
     * @returns Formatted date.
     */
    protected formatDate(timestamp: string | number, format: string, convert?: boolean): string {
        timestamp = timestamp || Date.now();

        if (typeof timestamp === 'string') {
            // Convert the value to a number.
            const numberTimestamp = parseInt(timestamp, 10);
            if (isNaN(numberTimestamp)) {
                this.logger.error('Invalid value received', timestamp);

                return timestamp;
            }
            timestamp = numberTimestamp;
        }

        // Add "core." if needed.
        if (format.startsWith('strf') || format.startsWith('df')) {
            format = `core.${format}`;
        }

        if (convert === undefined) {
            // Initialize convert param. Set it to false if it's a core.df format, set it to true otherwise.
            convert = !format.startsWith('core.df');
        }

        return CoreTime.userDate(timestamp, format, convert);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
