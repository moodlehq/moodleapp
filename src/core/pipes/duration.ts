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
import { CoreTime } from '@singletons/time';
import { Subscription } from 'rxjs';

/**
 * Filter to turn a number of seconds to a duration. E.g. 60 -> 1 minute.
 */
@Pipe({
    name: 'coreDuration',
    pure: false,
})
export class CoreDurationPipe implements PipeTransform, OnDestroy {

    protected logger: CoreLogger;
    protected value?: string;
    protected subscription: Subscription;

    protected lastSeconds?: number | string;
    protected lastPrecision?: number;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreBytesToSizePipe');

        this.subscription = Translate.onLangChange.subscribe(() => {
            this.value = undefined;
        });
    }

    /**
     * Turn a number of seconds to a duration. E.g. 60 -> 1 minute.
     *
     * @param seconds The number of seconds.
     * @param precision Number of elements to have in precision.
     * @returns Formatted duration.
     */
    transform(seconds: number, precision = 2): string {
        if (this.lastSeconds !== seconds || this.lastPrecision !== precision) {
            this.lastSeconds = seconds;
            this.lastPrecision = precision;
            this.value = undefined;
        }

        if (this.value === undefined) {
            this.value = CoreTime.formatTime(seconds, precision);
        }

        return this.value;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
