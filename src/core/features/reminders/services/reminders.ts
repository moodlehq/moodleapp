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

import { Injectable } from '@angular/core';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreSites } from '@services/sites';
import { CoreTime } from '@static/time';
import { makeSingleton, Translate } from '@singletons';
import { CoreReminderDBRecord, REMINDERS_TABLE } from './database/reminders';
import { ILocalNotification } from '@awesome-cordova-plugins/local-notifications/ngx';
import { CorePlatform } from '@services/platform';
import { CoreConstants, CoreTimeConstants } from '@/core/constants';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@static/events';
import { lazyMap, LazyMap } from '@/core/utils/lazy-map';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { asyncInstance, AsyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import {
    CoreRemindersUnits,
    REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED,
    REMINDERS_DEFAULT_NOTIFICATION_TIME_SETTING,
    REMINDERS_DEFAULT_REMINDER_TIMEBEFORE,
    REMINDERS_DISABLED,
    REMINDERS_UNITS_LABELS,
} from '../constants';

/**
 * Service to handle reminders.
 */
@Injectable({ providedIn: 'root' })
export class CoreRemindersService {

    /**
     * @deprecated since 5.0. Use REMINDERS_DEFAULT_REMINDER_TIMEBEFORE instead.
     */
    static readonly DEFAULT_REMINDER_TIMEBEFORE = REMINDERS_DEFAULT_REMINDER_TIMEBEFORE;
    /**
     * @deprecated since 5.0. Use REMINDERS_DISABLED instead.
     */
    static readonly DISABLED = REMINDERS_DISABLED;

    /**
     * @deprecated since 5.0. Use REMINDERS_DEFAULT_NOTIFICATION_TIME_SETTING instead.
     */
    static readonly DEFAULT_NOTIFICATION_TIME_SETTING = REMINDERS_DEFAULT_NOTIFICATION_TIME_SETTING;
    /**
     * @deprecated since 5.0. Use REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED instead.
     */
    static readonly DEFAULT_NOTIFICATION_TIME_CHANGED = REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED;

    protected remindersTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreReminderDBRecord>>>;

    constructor() {
        this.remindersTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(REMINDERS_TABLE, {
                    siteId,
                    config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                    onDestroy: () => delete this.remindersTables[siteId],
                }),
            ),
        );
    }

    /**
     * Initialize the service.
     */
    async initialize(): Promise<void> {
        if (!this.isEnabled()) {
            return;
        }

        await this.cleanUpOldReminders();

        await this.scheduleAllNotifications();

        CoreEvents.on(REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED, async (data) => {
            const site = await CoreSites.getSite(data.siteId);
            const siteId = site.getId();

            // Get all the events that have a default reminder.
            const reminders = await this.getRemindersWithDefaultTime(siteId);

            // Reschedule all the default reminders.
            await Promise.all(reminders.map((reminder) =>
                this.scheduleNotification(reminder, siteId)));
        });
    }

    /**
     * Returns if Reminders are enabled.
     *
     * @returns True if reminders are enabled and available, false otherwise.
     */
    isEnabled(): boolean {
        return true;
    }

    /**
     * Save reminder to Database.
     *
     * @param reminder Reminder to set.
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done. Rejected on failure.
     */
    async addReminder(reminder: CoreReminderData, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        const reminderId = await this.remindersTables[siteId].insert(reminder);

        const reminderRecord: CoreReminderDBRecord = Object.assign(reminder, { id: reminderId });

        await this.scheduleNotification(reminderRecord, siteId);
    }

    /**
     * Update a reminder from local Db.
     *
     * @param reminder Fields to update.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     * @returns Promise resolved when the reminder data is updated.
     */
    async updateReminder(
        reminder: CoreReminderDBRecord,
        siteId?: string,
    ): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        await this.remindersTables[siteId].update(reminder, { id: reminder.id });

        // Reschedule.
        await this.scheduleNotification(reminder, siteId);
    }

    /**
     * Update all reminders of a component and instance from local Db.
     *
     * @param newFields Fields to update.
     * @param selector Reminder selector.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     * @returns Promise resolved when the reminder data is updated.
     */
    async updateReminders(
        newFields: Partial<CoreReminderData>,
        selector: CoreReminderSelector,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const reminders = await this.getReminders(selector, site.getId());

        await Promise.all(reminders.map((reminder) => {
            reminder = Object.assign(reminder, newFields);

            return this.updateReminder(reminder, site.getId());
        }));
    }

    /**
     * Get all reminders from local Db.
     *
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     * @returns Promise resolved when the reminder data is retrieved.
     */
    async getAllReminders(siteId?: string): Promise<CoreReminderDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        return this.remindersTables[siteId].getMany(undefined, {
            sorting: [
                { time: 'asc' },
            ],
        });
    }

    /**
     * Get all reminders of a component and instance from local Db.
     *
     * @param selector Reminder selector.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     * @returns Promise resolved when the reminder data is retrieved.
     */
    async getReminders(selector: CoreReminderSelector, siteId?: string): Promise<CoreReminderDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        return this.remindersTables[siteId].getMany(selector, {
            sorting: [
                { time: 'asc' },
            ],
        });
    }

    /**
     * Get all reminders of a component with default time.
     *
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     * @returns Promise resolved when the reminder data is retrieved.
     */
    protected async getRemindersWithDefaultTime(siteId?: string): Promise<CoreReminderDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        return this.remindersTables[siteId].getMany({ timebefore: REMINDERS_DEFAULT_REMINDER_TIMEBEFORE }, {
            sorting: [
                { time: 'asc' },
            ],
        });
    }

    /**
     * Remove a reminder and cancel the notification.
     *
     * @param id Reminder ID.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     */
    async removeReminder(id: number, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        const reminder = await this.remindersTables[siteId].getOneByPrimaryKey({ id });

        if (this.isEnabled()) {
            await this.cancelReminder(id, reminder.component, siteId);
        }

        await this.remindersTables[siteId].deleteByPrimaryKey({ id });
    }

    /**
     * Remove all reminders of the same element.
     *
     * @param selector Reminder selector.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     */
    async removeReminders(selector: CoreReminderSelector, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        if (this.isEnabled()) {
            const reminders = await this.getReminders(selector, siteId);

            await Promise.all(reminders.map((reminder) =>
                this.cancelReminder(reminder.id, reminder.component, siteId)));
        }

        await this.remindersTables[siteId].delete(selector);
    }

    /**
     * Cancel a notification for a reminder.
     *
     * @param reminderId Reminder Id to cancel.
     * @param component Reminder component.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     * @returns Promise resolved when done.
     */
    async cancelReminder(reminderId: number, component: string, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        return CoreLocalNotifications.cancel(reminderId, component, siteId);
    }

    /**
     * Schedules a notification. If local notification plugin is not enabled, resolve the promise.
     *
     * @param reminder Reminder to schedule.
     * @param siteId Site ID the reminder belongs to. If not defined, use current site.
     */
    async scheduleNotification(
        reminder: CoreReminderDBRecord,
        siteId?: string,
    ): Promise<void> {
        if (!this.isEnabled()) {
            return;
        }

        siteId ??= CoreSites.getCurrentSiteId();

        const notificationTime = await this.getReminderNotificationTime(reminder, siteId);
        if (!notificationTime) {
            await this.cleanUpReminderIfNeeded(reminder, undefined, siteId);

            return;
        }

        const notificationData: CoreRemindersPushNotificationData = {
            reminderId: reminder.id,
            instanceId: reminder.instanceId,
            siteId,
        };

        const notification: ILocalNotification = {
            id: reminder.id,
            title: reminder.title,
            text: CoreTime.userDate(reminder.time * 1000, 'core.strftimedaydatetime', true),
            icon: 'file://assets/img/icons/calendar.png',
            trigger: {
                at: new Date(notificationTime * 1000),
            },
            data: notificationData,
        };

        await CoreLocalNotifications.schedule(notification, reminder.component, siteId);
    }

    /**
     * Clean up old reminders, removing them if they're expired or invalid.
     */
    protected async cleanUpOldReminders(): Promise<void> {
        await CorePlatform.ready();

        const siteIds = await CoreSites.getSitesIds();
        await Promise.all(siteIds.map(async (siteId) => {
            const reminders = await this.getAllReminders(siteId);
            const defaultNotificationTime = await this.getDefaultNotificationTime(siteId);
            await Promise.all(reminders.map((reminder) =>
                this.cleanUpReminderIfNeeded(reminder, defaultNotificationTime, siteId)));
        }));
    }

    /**
     * Clean up a reminder if it is expired or disabled, it will be deleted/cancelled.
     *
     * @param reminder Reminder to check or clean up.
     * @param defaultNotificationTime Default notification time. If not defined, it will be retrieved.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     */
    protected async cleanUpReminderIfNeeded(
        reminder: CoreReminderDBRecord,
        defaultNotificationTime?: number,
        siteId?: string,
    ): Promise<void> {
        const now = CoreTime.timestamp();
        // If event time is one month in the past, completely delete it.
        // This can happen with default disabled reminders.
        const oneMonthAgo = now - CoreTimeConstants.SECONDS_MONTH;

        if (reminder.time < oneMonthAgo) {
            await this.removeReminder(reminder.id, siteId);

            return;
        }

        const timebefore = reminder.timebefore === REMINDERS_DEFAULT_REMINDER_TIMEBEFORE
            ? (defaultNotificationTime ?? await this.getDefaultNotificationTime(siteId))
            : reminder.timebefore;

        if (timebefore === REMINDERS_DISABLED) {
            // Notification disabled. Cancel.
            await this.cancelReminder(reminder.id, reminder.component, siteId);

            return;
        }

        const notificationTime = reminder.time - timebefore;

        // If reminder time is one month in the past, completely delete it.
        if (notificationTime < oneMonthAgo) {
            await this.removeReminder(reminder.id, siteId);

            return;
        }

        if (notificationTime <= now) {
            // This reminder is over, don't schedule. Cancel if it was scheduled.
            await this.cancelReminder(reminder.id, reminder.component, siteId);

            return;
        }

    }

    /**
     * Get the notification time for a reminder. If the reminder is disabled/expired, 0 will be returned.
     *
     * @param reminder Reminder to get the notification time for.
     * @param siteId ID of the site the reminder belongs to. If not defined, use current site.
     * @returns Notification time, or 0 if the reminder is disabled or expired.
     */
    protected async getReminderNotificationTime(reminder: CoreReminderDBRecord, siteId?: string): Promise<number> {
        const timebefore = reminder.timebefore === REMINDERS_DEFAULT_REMINDER_TIMEBEFORE
            ? await this.getDefaultNotificationTime(siteId)
            : reminder.timebefore;

        if (timebefore === REMINDERS_DISABLED) {
            return 0;
        }

        const notificationTime = reminder.time - timebefore;
        const now = CoreTime.timestamp();

        if (notificationTime <= now) {
            return 0;
        }

        return notificationTime;
    }

    /**
     * Get the all saved reminders and schedule the notification.
     * Return early if local notification plugin is enabled because they should be already scheduled.
     */
    async scheduleAllNotifications(): Promise<void> {
        await CorePlatform.ready();

        if (CoreLocalNotifications.isPluginAvailable()) {
            // Notifications are already scheduled on reminder creation.
            // Only webapp needs to schedule them on app start.
            return;
        }

        const siteIds = await CoreSites.getSitesIds();
        await Promise.all(siteIds.map(async (siteId) => {
            const reminders = await this.getAllReminders(siteId);
            await Promise.all(reminders.map((reminder) =>
                this.scheduleNotification(reminder, siteId)));
        }));
    }

    /**
     * Given a value and a unit, return the translated label.
     *
     * @param value Value.
     * @param unit Unit.
     * @param addDefaultLabel Whether to add the "Default" text.
     * @returns Translated label.
     */
    getUnitValueLabel(value: number, unit: CoreRemindersUnits, addDefaultLabel = false): string {
        if (value === REMINDERS_DISABLED) {
            return Translate.instant('core.settings.disabled');
        }

        if (value === 0) {
            return Translate.instant('core.reminders.atthetime');
        }

        const unitsLabel = value === 1 ?
            REMINDERS_UNITS_LABELS.single[unit] :
            REMINDERS_UNITS_LABELS.multi[unit];

        const label = Translate.instant('core.reminders.timebefore', {
            units: Translate.instant(unitsLabel),
            value: value,
        });

        if (addDefaultLabel) {
            return Translate.instant('core.defaultvalue', { $a: label });
        }

        return label;
    }

    /**
     * Given a number of seconds, convert it to a unit&value format compatible with reminders.
     *
     * @param seconds Number of seconds.
     * @returns Value and unit.
     */
    static convertSecondsToValueAndUnit(seconds?: number): CoreReminderValueAndUnit {
        if (seconds === undefined || seconds < 0) {
            return {
                value: REMINDERS_DISABLED,
                unit: CoreRemindersUnits.MINUTE,
            };
        } else if (seconds === 0) {
            return {
                value: 0,
                unit: CoreRemindersUnits.MINUTE,
            };
        } else if (seconds % CoreRemindersUnits.WEEK === 0) {
            return {
                value: seconds / CoreRemindersUnits.WEEK,
                unit: CoreRemindersUnits.WEEK,
            };
        } else if (seconds % CoreRemindersUnits.DAY === 0) {
            return {
                value: seconds / CoreRemindersUnits.DAY,
                unit: CoreRemindersUnits.DAY,
            };
        } else if (seconds % CoreRemindersUnits.HOUR === 0) {
            return {
                value: seconds / CoreRemindersUnits.HOUR,
                unit: CoreRemindersUnits.HOUR,
            };
        } else {
            return {
                value: seconds / CoreRemindersUnits.MINUTE,
                unit: CoreRemindersUnits.MINUTE,
            };
        }
    }

    /**
     * Get the configured default notification time.
     *
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolved with the default time (in seconds).
     */
    async getDefaultNotificationTime(siteId?: string): Promise<number> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const key = `${REMINDERS_DEFAULT_NOTIFICATION_TIME_SETTING}#${siteId}`;

        return CoreConfig.get(key, CoreConstants.CONFIG.calendarreminderdefaultvalue || CoreTimeConstants.SECONDS_HOUR);
    }

    /**
     * Set the default notification time.
     *
     * @param time New default time.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolved when stored.
     */
    async setDefaultNotificationTime(time: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const key = `${REMINDERS_DEFAULT_NOTIFICATION_TIME_SETTING}#${siteId}`;

        await CoreConfig.set(key, time);

        CoreEvents.trigger(REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED, { time }, siteId);
    }

}

export const CoreReminders = makeSingleton(CoreRemindersService);

export type CoreReminderData = Omit<CoreReminderDBRecord, 'id'>;

/**
 * Additional data sent in push notifications, with some calculated data.
 */
export type CoreRemindersPushNotificationData = {
    reminderId: number;
    instanceId: number;
    siteId: string;
};

export type CoreReminderNotificationOptions = {
    title: string;
};

/**
 * Value and unit for reminders.
 */
export type CoreReminderValueAndUnit = {
    value: number;
    unit: CoreRemindersUnits;
};

export type CoreReminderSelector = {
    instanceId: number;
    component: string;
    type?: string;
};
