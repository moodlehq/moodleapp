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

import { Component, Input, OnInit } from '@angular/core';
import {
    CoreReminders,
    CoreRemindersService,
    CoreRemindersUnits,
    CoreReminderValueAndUnit,
} from '@features/reminders/services/reminders';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreWait } from '@singletons/wait';
import { PopoverController } from '@singletons';
import { CoreRemindersSetReminderCustomComponent } from '../set-reminder-custom/set-reminder-custom';

/**
 * This component is meant to display a popover with the reminder options.
 */
@Component({
    templateUrl: 'set-reminder-menu.html',
    styleUrls: ['set-reminder-menu.scss'],
})
export class CoreRemindersSetReminderMenuComponent implements OnInit {

    @Input() initialValue?: number;
    @Input() eventTime?: number;
    @Input() noReminderLabel = '';

    currentValue = '0m';
    customLabel = '';

    protected customValue = 10;
    protected customUnits = CoreRemindersUnits.MINUTE;

    presetOptions = [
        {
            radioValue: '0m',
            value: 0,
            unit: CoreRemindersUnits.MINUTE,
            label: '',
            enabled: true,
        },
        {
            radioValue: '1h',
            value: 1,
            unit: CoreRemindersUnits.HOUR,
            label: '',
            enabled: true,
        },
        {
            radioValue: '12h',
            value: 12,
            unit: CoreRemindersUnits.HOUR,
            label: '',
            enabled: true,
        },
        {
            radioValue: '1d',
            value: 1,
            unit: CoreRemindersUnits.DAY,
            label: '',
            enabled: true,
        },
    ];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.presetOptions.forEach((option) => {
            option.label = CoreReminders.getUnitValueLabel(option.value, option.unit);
            option.enabled = this.isValidTime(option.unit, option.value);
        });

        const initialValue = CoreRemindersService.convertSecondsToValueAndUnit(this.initialValue);
        if (initialValue.value === CoreRemindersService.DISABLED) {
            this.currentValue = 'disabled';

            return;
        }

        // Search if it's one of the preset options.
        const option = this.presetOptions.find(option =>
            option.value === initialValue?.value && option.unit === initialValue.unit);

        if (option) {
            this.currentValue = option.radioValue;
        } else {
            // It's a custom value.
            this.currentValue = 'custom';
            this.customValue = initialValue.value;
            this.customUnits = initialValue.unit;
            this.customLabel = CoreReminders.getUnitValueLabel(this.customValue, this.customUnits);
        }
    }

    /**
     * Set the reminder.
     *
     * @param value Value to set.
     */
    setReminder(value?: string): void {
        const option = this.presetOptions.find(option => option.radioValue === value);

        if (!option) {
            PopoverController.dismiss();

            return;
        }

        PopoverController.dismiss({ timeBefore: option.unit * option.value });
    }

    /**
     * Disable the reminder.
     */
    disableReminder(): void {
        PopoverController.dismiss({ timeBefore: undefined });
    }

    /**
     * Check the time is on the future.
     *
     * @param unit Time unit.
     * @param value Time value.
     * @returns Wether is a valid time or not.
     */
    protected isValidTime(unit: number, value: number): boolean {
        if (!this.eventTime) {
            return true;
        }

        const timebefore = unit * value;

        return (this.eventTime - timebefore) * 1000 > Date.now();
    }

    /**
     * Custom value input clicked.
     *
     * @param ev Click event.
     */
    async setCustom(ev: Event): Promise<void> {
        ev.stopPropagation();
        ev.preventDefault();

        const reminderTime = await CoreDomUtils.openPopover<CoreReminderValueAndUnit>({
            component: CoreRemindersSetReminderCustomComponent,
            componentProps: {
                customValue: this.customValue,
                customUnits: this.customUnits,
            },
            waitForDismissCompleted: true, // To be able to close parent popup.
        });

        if (reminderTime === undefined) {
            // User canceled.
            return;
        }

        this.currentValue = 'custom';
        this.customValue = reminderTime.value;
        this.customUnits = reminderTime.unit;
        this.customLabel = CoreReminders.getUnitValueLabel(this.customValue, this.customUnits);

        // Let the dimissed popover to be removed.
        await CoreWait.nextTick();

        PopoverController.dismiss({ timeBefore: Math.abs(this.customValue) * this.customUnits });
    }

}
