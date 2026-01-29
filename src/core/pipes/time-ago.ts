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
import { CoreLogger } from '@singletons/logger';
import { dayjs } from '@/core/utils/dayjs';
import { Subscription } from 'rxjs/internal/Subscription';

/**
 * Pipe to turn a UNIX timestamp to "time ago".
 */
@Pipe({
    name: 'coreTimeAgo',
    pure: false,
})
export class CoreTimeAgoPipe implements PipeTransform, OnDestroy {

    protected logger: CoreLogger;
    protected value?: string;
    protected subscription: Subscription;

    protected lastTimestamp?: number | string;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreTimeAgoPipe');

        this.subscription = Translate.onLangChange.subscribe(() => {
            this.value = undefined;
        });
    }

    /**
     * Pipes a timestamp into a "time ago" format.
     *
     * @param timestamp The UNIX timestamp (without milliseconds).
     * @returns Formatted time.
     */
    transform(timestamp: string | number): string {
        if (this.lastTimestamp !== timestamp) {
            this.lastTimestamp = timestamp;
            this.value = undefined;
        }

        if (this.value === undefined) {
            this.value = this.formatTimeAgo(timestamp);
        }

        return this.value;
    }

    /**
     * Turn a UNIX timestamp to "time ago".
     *
     * @param timestamp The UNIX timestamp (without milliseconds).
     * @returns Formatted time.
     */
    protected formatTimeAgo(timestamp: string | number): string {
        if (typeof timestamp === 'string') {
            // Convert the value to a number.
            const numberTimestamp = parseInt(timestamp, 10);
            if (isNaN(numberTimestamp)) {
                this.logger.error('Invalid value received', timestamp);

                return timestamp;
            }
            timestamp = numberTimestamp;
        }

        return Translate.instant('core.ago', { $a: dayjs(timestamp * 1000).fromNow(true) });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
