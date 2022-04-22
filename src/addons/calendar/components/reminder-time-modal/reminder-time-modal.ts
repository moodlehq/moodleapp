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

import { AddonCalendar, AddonCalendarReminderUnits, AddonCalendarValueAndUnit } from '@addons/calendar/services/calendar';
import { Component, Input, OnInit } from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { ModalController } from '@singletons';

/**
 * Modal to choose a reminder time.
 */
@Component({
    selector: 'addon-calendar-new-reminder-modal',
    templateUrl: 'reminder-time-modal.html',
})
export class AddonCalendarReminderTimeModalComponent implements OnInit {

    @Input() initialValue?: AddonCalendarValueAndUnit;
    @Input() allowDisable?: boolean;

    radioValue = '5m';
    customValue = '10';
    customUnits = AddonCalendarReminderUnits.MINUTE;

    presetOptions = [
        {
            radioValue: '5m',
            value: 5,
            unit: AddonCalendarReminderUnits.MINUTE,
            label: '',
        },
        {
            radioValue: '10m',
            value: 10,
            unit: AddonCalendarReminderUnits.MINUTE,
            label: '',
        },
        {
            radioValue: '30m',
            value: 30,
            unit: AddonCalendarReminderUnits.MINUTE,
            label: '',
        },
        {
            radioValue: '1h',
            value: 1,
            unit: AddonCalendarReminderUnits.HOUR,
            label: '',
        },
        {
            radioValue: '12h',
            value: 12,
            unit: AddonCalendarReminderUnits.HOUR,
            label: '',
        },
        {
            radioValue: '1d',
            value: 1,
            unit: AddonCalendarReminderUnits.DAY,
            label: '',
        },
    ];

    customUnitsOptions = [
        {
            value: AddonCalendarReminderUnits.MINUTE,
            label: 'core.minutes',
        },
        {
            value: AddonCalendarReminderUnits.HOUR,
            label: 'core.hours',
        },
        {
            value: AddonCalendarReminderUnits.DAY,
            label: 'core.days',
        },
        {
            value: AddonCalendarReminderUnits.WEEK,
            label: 'core.weeks',
        },
    ];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.presetOptions.forEach((option) => {
            option.label = AddonCalendar.getUnitValueLabel(option.value, option.unit);
        });

        if (!this.initialValue) {
            return;
        }

        if (this.initialValue.value === 0) {
            this.radioValue = 'disabled';
        } else {
            // Search if it's one of the preset options.
            const option = this.presetOptions.find(option =>
                option.value === this.initialValue?.value && option.unit === this.initialValue.unit);

            if (option) {
                this.radioValue = option.radioValue;
            } else {
                // It's a custom value.
                this.radioValue = 'custom';
                this.customValue = String(this.initialValue.value);
                this.customUnits = this.initialValue.unit;
            }
        }
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Save the reminder.
     */
    saveReminder(): void {
        if (this.radioValue === 'disabled') {
            ModalController.dismiss(0);
        } else if (this.radioValue === 'custom') {
            const value = parseInt(this.customValue, 10);
            if (!value) {
                CoreDomUtils.showErrorModal('core.errorinvalidform', true);

                return;
            }

            ModalController.dismiss(Math.abs(value) * this.customUnits);
        } else {
            const option = this.presetOptions.find(option => option.radioValue === this.radioValue);
            if (!option) {
                return;
            }

            ModalController.dismiss(option.unit * option.value);
        }
    }

    /**
     * Custom value input clicked.
     *
     * @param ev Click event.
     */
    async customInputClicked(ev: Event): Promise<void> {
        if (this.radioValue === 'custom') {
            return;
        }

        this.radioValue = 'custom';

        const target = <HTMLInputElement | HTMLElement | null> ev.target;
        if (target) {
            CoreDomUtils.focusElement(target);
        }
    }

}
