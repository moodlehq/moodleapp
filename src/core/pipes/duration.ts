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
import { CoreLogger } from '@singletons/logger';
import { CoreTime } from '@singletons/time';

/**
 * Filter to turn a number of seconds to a duration. E.g. 60 -> 1 minute.
 */
@Pipe({
    name: 'coreDuration',
    standalone: true,
})
export class CoreDurationPipe implements PipeTransform {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreBytesToSizePipe');
    }

    /**
     * Turn a number of seconds to a duration. E.g. 60 -> 1 minute.
     *
     * @param seconds The number of seconds.
     * @returns Formatted duration.
     */
    transform(seconds: string | number): string {
        if (typeof seconds == 'string') {
            // Convert the value to a number.
            const numberSeconds = parseInt(seconds, 10);
            if (isNaN(numberSeconds)) {
                this.logger.error('Invalid value received', seconds);

                return seconds;
            }
            seconds = numberSeconds;
        }

        return CoreTime.formatTime(seconds);
    }

}
