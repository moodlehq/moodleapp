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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, model } from '@angular/core';
import { CoreRemindersUnits } from '@features/reminders/constants';
import { PopoverController } from '@singletons';

/**
 * This component is meant to set a custom reminder
 */
@Component({
    templateUrl: 'set-reminder-custom.html',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreRemindersSetReminderCustomComponent {

    readonly customValue = model(10);
    readonly customUnits = model(CoreRemindersUnits.MINUTE);

    readonly customUnitsOptions: readonly Readonly<{ value: CoreRemindersUnits; label: string }>[] = [
        {
            value: CoreRemindersUnits.MINUTE,
            label: 'core.minutes',
        },
        {
            value: CoreRemindersUnits.HOUR,
            label: 'core.hours',
        },
        {
            value: CoreRemindersUnits.DAY,
            label: 'core.days',
        },
        {
            value: CoreRemindersUnits.WEEK,
            label: 'core.weeks',
        },
    ];

    /**
     * Set custom reminder.
     */
    set(): void {
        // Return it as an object because 0 means undefined if not.
        PopoverController.dismiss({ value: this.customValue(), unit: this.customUnits() });
    }

    /**
     * Close popup.
     */
    cancel(): void {
        PopoverController.dismiss();
    }

}
