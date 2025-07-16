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

import { Component, input, computed, signal } from '@angular/core';
import { CoreBaseModule } from '@/core/base.module';
import { CoreConstants } from '@/core/constants';
import { dayjs } from '@/core/utils/dayjs';
import { CoreTime } from '@singletons/time';
import { CoreUser } from '@features/user/services/user';

/**
 * Component to show a date in a human readable format. It's equivalent to Moodle's humandate renderable.
 */
@Component({
    selector: 'core-human-date',
    templateUrl: 'core-human-date.html',
    styleUrl: 'human-date.scss',
    imports: [
        CoreBaseModule,
    ],
})
export class CoreHumanDateComponent {

    readonly timestamp = input.required<number>(); // The timestamp in milliseconds.
    readonly nearSeconds = input<number | null>(CoreConstants.SECONDS_DAY * 1000); // Milliseconds to considere the date near.
    readonly timeOnly = input<boolean>(false); // Whether to show only the time.
    readonly link = input<string | undefined>(undefined); // If set, the date will be a link to this URL.
    readonly langTimeFormat = input<string>('strftimedaydatetime'); // Language string to use for the time format.
    readonly useRelatives = input<boolean>(true); // Whether to use human relative terminology (e.g. Today).

    readonly absoluteDate = computed(() => CoreTime.userDate(
        this.timestamp(),
        'core.' + (dayjs(this.timestamp()).year() === dayjs().year() ? 'strftimedayshort' : 'strftimedaydate'),
    ));

    readonly relativeDate = computed(() => this.useRelatives() ? CoreTime.formatRelativeDate(this.timestamp()) : null);

    readonly date = computed(() => this.timeOnly() ? null : (this.relativeDate() ?? this.absoluteDate()));

    readonly needTitle = computed(() => this.relativeDate() !== null || this.timeOnly());

    readonly isPast = computed(() => this.timestamp() < Date.now());

    readonly isNear = computed(() => {
        const nearSeconds = this.nearSeconds();
        if (nearSeconds === null) {
            return false;
        }

        const diff = this.timestamp() - Date.now();

        return diff > 0 && diff < nearSeconds;
    });

    readonly time = computed(() => this.timeFormat() === undefined ? null : CoreTime.userDate(this.timestamp(), this.timeFormat()));

    protected readonly timeFormat = signal<string | undefined>(undefined);

    constructor() {
        this.loadPreferredTimeFormat();
    }

    /**
     * Load preferred time format.
     */
    protected async loadPreferredTimeFormat(): Promise<void> {
        const timeFormat = await CoreUser.getPreferredTimeFormat();

        this.timeFormat.set(timeFormat);
    }

}
