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

import { CoreTimeConstants } from '@/core/constants';

/**
 * Units to set a reminder.
 */
export enum CoreRemindersUnits {
    MINUTE = CoreTimeConstants.SECONDS_MINUTE,
    HOUR = CoreTimeConstants.SECONDS_HOUR,
    DAY = CoreTimeConstants.SECONDS_DAY,
    WEEK = CoreTimeConstants.SECONDS_WEEK,
}

export const REMINDERS_UNITS_LABELS = {
    single: {
        [CoreRemindersUnits.MINUTE]: 'core.minute',
        [CoreRemindersUnits.HOUR]: 'core.hour',
        [CoreRemindersUnits.DAY]: 'core.day',
        [CoreRemindersUnits.WEEK]: 'core.week',
    },
    multi: {
        [CoreRemindersUnits.MINUTE]: 'core.minutes',
        [CoreRemindersUnits.HOUR]: 'core.hours',
        [CoreRemindersUnits.DAY]: 'core.days',
        [CoreRemindersUnits.WEEK]: 'core.weeks',
    },
};

export const REMINDERS_DEFAULT_REMINDER_TIMEBEFORE = -1;
export const REMINDERS_DISABLED = -1;

export const REMINDERS_DEFAULT_NOTIFICATION_TIME_SETTING = 'CoreRemindersDefaultNotification';
export const REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED = 'CoreRemindersDefaultNotificationChangedEvent';
