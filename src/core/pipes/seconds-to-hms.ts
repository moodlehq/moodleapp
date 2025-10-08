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

import { CoreText } from '@singletons/text';
import { CoreLogger } from '@singletons/logger';
import { CoreTimeConstants } from '@/core/constants';

/**
 * Pipe to convert a number of seconds to Hours:Minutes:Seconds.
 *
 * This converts a number of seconds to Hours:Minutes:Seconds. If the number of seconds is negative, returns 00:00:00.
 */
@Pipe({
    name: 'coreSecondsToHMS',
})
export class CoreSecondsToHMSPipe implements PipeTransform {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreSecondsToHMSPipe');
    }

    /**
     * Convert a number of seconds to Hours:Minutes:Seconds.
     *
     * @param seconds Number of seconds.
     * @returns Formatted seconds.
     */
    transform(seconds: string | number, showHours: boolean = true): string {
        if (typeof seconds === 'string') {
            // Convert the value to a number.
            const numberSeconds = parseInt(seconds, 10);
            if (isNaN(numberSeconds)) {
                this.logger.error('Invalid value received', seconds);

                return seconds;
            }
            seconds = numberSeconds;
        } else if (!seconds || seconds < 0) {
            seconds = 0;
        }

        // Don't allow decimals.
        seconds = Math.floor(seconds);

        const hours = Math.floor(seconds / CoreTimeConstants.SECONDS_HOUR);
        seconds -= hours * CoreTimeConstants.SECONDS_HOUR;
        const minutes = Math.floor(seconds / CoreTimeConstants.SECONDS_MINUTE);
        seconds -= minutes * CoreTimeConstants.SECONDS_MINUTE;

        return showHours
            ? `${CoreText.twoDigits(hours)}:${CoreText.twoDigits(minutes)}:${CoreText.twoDigits(seconds)}`
            : `${CoreText.twoDigits(minutes)}:${CoreText.twoDigits(seconds)}`;
    }

}
