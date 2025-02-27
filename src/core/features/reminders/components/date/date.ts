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

import { CoreReminders } from '@features/reminders/services/reminders';
import { Component, Input, OnInit } from '@angular/core';
import { CoreTimeUtils } from '@services/utils/time';
import { Translate } from '@singletons';
import { CoreTime } from '@singletons/time';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreRemindersSetButtonComponent } from '../set-button/set-button';

/**
 * Component that displays a date to remind.
 */
@Component({
    selector: 'core-reminders-date',
    templateUrl: 'date.html',
    styleUrl: 'date.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreRemindersSetButtonComponent,
    ],
})
export class CoreRemindersDateComponent implements OnInit {

    @Input() component?: string;
    @Input() instanceId?: number;
    @Input() type?: string;
    @Input() label = '';
    @Input() time = 0;
    @Input() relativeTo = 0;
    @Input() title = '';
    @Input() url = '';

    showReminderButton = false;
    timebefore?: number; // Undefined means no reminder has been set.
    readableTime = '';

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.readableTime = this.getReadableTime(this.time, this.relativeTo);

        // If not set, button won't be shown.
        if (this.component === undefined || this.instanceId === undefined || this.type === undefined) {
            return;
        }

        const remindersEnabled = CoreReminders.isEnabled();
        this.showReminderButton = remindersEnabled && this.time > CoreTime.timestamp();

        if (!this.showReminderButton) {
            return;
        }

        const reminders = await CoreReminders.getReminders({
            instanceId: this.instanceId,
            component: this.component,
            type: this.type,
        });

        this.timebefore = reminders[0]?.timebefore;
    }

    /**
     * Returns the readable time.
     *
     * @param timestamp Timestamp.
     * @param relativeTo Base timestamp if timestamp is relative to this one.
     * @returns Readable time string.
     */
    protected getReadableTime(timestamp: number, relativeTo = 0): string {
        if (!relativeTo) {
            return CoreTimeUtils.userDate(timestamp * 1000, 'core.strftimedatetime', true);
        }

        return Translate.instant(
            'core.course.relativedatessubmissionduedate' + (timestamp > relativeTo ? 'after' : 'before'),
            {
                $a: {
                    datediffstr: relativeTo === timestamp ?
                        '0 ' + Translate.instant('core.secs') :
                        CoreTime.formatTime(relativeTo - timestamp, 3),
                },
            },
        );
    }

}
