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

import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { Translate } from '@singletons';
import { CoreLogger } from '@static/logger';
import { CoreTime } from '@static/time';
import { Subscription } from 'rxjs';
import { CoreResultMemoiser } from '@classes/result-memoiser';

/**
 * Filter to turn a number of seconds to a duration. E.g. 60 -> 1 minute.
 */
@Pipe({
    name: 'coreDuration',
    pure: false,
})
export class CoreDurationPipe implements PipeTransform, OnDestroy {

    protected logger: CoreLogger;
    protected memoiser = new CoreResultMemoiser<string>();
    protected subscription: Subscription;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreDurationPipe');

        this.subscription = Translate.onLangChange.subscribe(() => {
            this.memoiser.invalidate();
        });
    }

    /**
     * Turn a number of seconds to a duration. E.g. 60 -> 1 minute.
     *
     * @param seconds The number of seconds.
     * @param precision Number of elements to have in precision.
     * @returns Formatted duration.
     */
    transform(seconds: string | number, precision = 2): string {
        return this.memoiser.memoise(
            () => this.formatTime(seconds, precision),
            seconds,
            precision,
        );
    }

    /**
     * Format duration given the number of seconds.
     *
     * @param seconds Number of seconds.
     * @param precision Number of elements to have in precision.
     * @returns Formatted time.
     */
    protected formatTime(seconds: string | number, precision: number): string {
        if (typeof seconds === 'string') {
            // Convert the value to a number.
            const numberSeconds = parseInt(seconds, 10);
            if (isNaN(numberSeconds)) {
                this.logger.error('Invalid value received', seconds);

                return seconds;
            }

            seconds = numberSeconds;
        }

        return CoreTime.formatTime(seconds, precision);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
