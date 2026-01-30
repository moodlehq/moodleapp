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

import { CoreError } from '@classes/errors/error';
import { ILocalNotification, ILocalNotificationAction, LocalNotifications } from '@awesome-cordova-plugins/local-notifications/ngx';
import { Observable, Subject } from 'rxjs';
import { CoreWait } from '@static/wait';
import { CorePlatform } from '@services/platform';

/**
 * Mock LocalNotifications service.
 */
export class LocalNotificationsMock extends LocalNotifications {

    protected scheduledNotifications: ILocalNotification[] = [];
    protected triggeredNotifications: ILocalNotification[] = [];
    protected presentNotifications: Record<number, Notification> = {};
    protected nextTimeout = 0;
    protected hasGranted?: boolean;
    protected observables = {
        trigger: new Subject<ILocalNotification>(),
        click: new Subject<ILocalNotification>(),
        clear: new Subject<Notification>(),
        clearall: new Subject<void>(),
        cancel: new Subject<ILocalNotification>(),
        cancelall: new Subject<void>(),
        schedule: new Subject<ILocalNotification>(),
        update: new Subject<ILocalNotification>(),
    };

    /**
     * @inheritdoc
     */
    schedule(options?: ILocalNotification | Array<ILocalNotification>): void {
        this.hasPermission().then(() => {
            // Do not check permission here, it could be denied by Selenium.
            if (!options) {
                return;
            }

            if (!Array.isArray(options)) {
                options = [options];
            }

            this.scheduledNotifications = this.scheduledNotifications.concat(options);
            this.scheduledNotifications.sort((a, b) =>
                (a.trigger?.at?.getTime() || 0) - (b.trigger?.at?.getTime() || 0));

            options.forEach((notification) => {
                this.observables.schedule.next(notification);
            });

            this.scheduleNotifications();

            return;
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Flush pending notifications.
     */
    flush(): void {
        for (const notification of this.scheduledNotifications) {
            this.sendNotification(notification);
        }

        this.scheduledNotifications = [];
    }

    /**
     * Sets timeout for next nofitication.
     */
    protected scheduleNotifications(): void {
        window.clearTimeout(this.nextTimeout);

        const nextNotification = this.scheduledNotifications[0];
        if (!nextNotification) {
            return;
        }

        const notificationTime = nextNotification.trigger?.at?.getTime() || 0;
        const timeout = notificationTime - Date.now();
        if (timeout <= 0) {
            this.triggerNextNotification();

            return;
        }

        this.nextTimeout = window.setTimeout(() => {
            this.triggerNextNotification();
        }, timeout);
    }

    /**
     * Shows the next notification.
     */
    protected triggerNextNotification(): void {
        const dateNow = Date.now();

        const nextNotification = this.scheduledNotifications[0];
        if (!nextNotification) {
            return;
        }

        const notificationTime = nextNotification.trigger?.at?.getTime() || 0;
        if (notificationTime === 0 || notificationTime <= dateNow) {
            this.sendNotification(nextNotification);
            this.scheduledNotifications.shift();
            this.triggerNextNotification();
        } else {
            this.scheduleNotifications();
        }
    }

    /**
     * Send notification.
     *
     * @param localNotification Notification.
     */
    protected sendNotification(localNotification: ILocalNotification): void {
        const body = Array.isArray(localNotification.text) ? localNotification.text.join() : localNotification.text;
        const notification = new Notification(localNotification.title || '', {
            body,
            data: localNotification.data,
            icon: localNotification.icon,
            requireInteraction: true,
            tag: localNotification.data?.component,
        });

        this.triggeredNotifications.push(localNotification);

        this.observables.trigger.next(localNotification);

        notification.addEventListener('click', () => {
            this.observables.click.next(localNotification);

            notification.close();
            if (localNotification.id) {
                delete(this.presentNotifications[localNotification.id]);
            }
        });

        if (localNotification.id) {
            this.presentNotifications[localNotification.id] = notification;

            notification.addEventListener('close', () => {
                delete(this.presentNotifications[localNotification.id ?? 0]);
            });
        }
    }

    /**
     * @inheritdoc
     */
    update(options?: ILocalNotification): void {
        if (!options?.id) {
            return;
        }
        const index = this.scheduledNotifications.findIndex((notification) => notification.id === options.id);
        if (index < 0) {
            return;
        }

        this.observables.update.next(options);

        this.scheduledNotifications[index] = options;
    }

    /**
     * @inheritdoc
     */
    async clear(notificationId: number | Array<number>): Promise<void> {
        if (!Array.isArray(notificationId)) {
            notificationId = [notificationId];
        }

        notificationId.forEach((id) => {
            if (!this.presentNotifications[id]) {
                return;
            }

            this.presentNotifications[id].close();

            this.observables.clear.next(this.presentNotifications[id]);
            delete this.presentNotifications[id];
        });
    }

    /**
     * @inheritdoc
     */
    async clearAll(): Promise<void> {
        for (const x in this.presentNotifications) {
            this.presentNotifications[x].close();
        }
        this.presentNotifications = {};

        this.observables.clearall.next();

    }

    /**
     * @inheritdoc
     */
    async cancel(notificationId: number | Array<number>): Promise<void> {
        if (!Array.isArray(notificationId)) {
            notificationId = [notificationId];
        }

        notificationId.forEach((id) => {
            const index = this.scheduledNotifications.findIndex((notification) => notification.id === id);
            this.observables.cancel.next(this.scheduledNotifications[index]);

            this.scheduledNotifications.splice(index, 1);
        });

        this.scheduleNotifications();
    }

    /**
     * @inheritdoc
     */
    async cancelAll(): Promise<void> {
        window.clearTimeout(this.nextTimeout);
        this.scheduledNotifications = [];

        this.observables.cancelall.next();
    }

    /**
     * @inheritdoc
     */
    async isPresent(notificationId: number): Promise<boolean> {
        return !!this.presentNotifications[notificationId];
    }

    /**
     * @inheritdoc
     */
    async isScheduled(notificationId: number): Promise<boolean> {
        return this.scheduledNotifications.some((notification) => notification.id === notificationId);
    }

    /**
     * @inheritdoc
     */
    async isTriggered(notificationId: number): Promise<boolean> {
        return this.triggeredNotifications.some((notification) => notification.id === notificationId);

    }

    /**
     * @inheritdoc
     */
    async getIds(): Promise<Array<number>> {
        const ids = await this.getScheduledIds();
        const triggeredIds = await this.getTriggeredIds();

        return Promise.resolve(ids.concat(triggeredIds));
    }

    /**
     * @inheritdoc
     */
    async getTriggeredIds(): Promise<Array<number>> {
        const ids = this.triggeredNotifications
            .map((notification) => notification.id || 0)
            .filter((id) => id > 0);

        return ids;
    }

    /**
     * @inheritdoc
     */
    async getScheduledIds(): Promise<Array<number>> {
        const ids = this.scheduledNotifications
            .map((notification) => notification.id || 0)
            .filter((id) => id > 0);

        return ids;
    }

    /**
     * @inheritdoc
     */
    async get(notificationId: number): Promise<ILocalNotification> {
        const notification = this.scheduledNotifications
            .find((notification) => notification.id === notificationId);

        if (!notification) {
            throw new Error('Invalid Notification Id.');
        }

        return notification;
    }

    /**
     * @inheritdoc
     */
    async getAll(): Promise<Array<ILocalNotification>> {
        return this.scheduledNotifications.concat(this.triggeredNotifications);
    }

    /**
     * @inheritdoc
     */
    async getAllScheduled(): Promise<Array<ILocalNotification>> {
        return this.scheduledNotifications;
    }

    /**
     * @inheritdoc
     */
    async getAllTriggered(): Promise<Array<ILocalNotification>> {
        return this.triggeredNotifications;
    }

    /**
     * @inheritdoc
     */
    async registerPermission(): Promise<boolean> {
        // We need to ask the user for permission
        const permissionRequests = [Notification.requestPermission()];

        if (CorePlatform.isAutomated()) {
            // In some testing environments, Notification.requestPermission gets stuck and never returns.
            // Given that we don't actually need browser notifications to work in Behat tests, we can just
            // continue if the permissions haven't been granted after 1 second.
            permissionRequests.push(CoreWait.wait(1000).then(() => 'granted'));
        }

        const permission = await Promise.race(permissionRequests);

        this.hasGranted = permission === 'granted';

        // If the user accepts, let's create a notification
        return this.hasGranted;
    }

    /**
     * @inheritdoc
     */
    async hasPermission(): Promise<boolean> {
        if (this.hasGranted !== undefined) {
            return this.hasGranted;
        }

        if (!('Notification' in window)) {
            // Check if the browser supports notifications
            throw new CoreError('This browser does not support desktop notification');
        }

        return this.registerPermission();
    }

    /**
     * @inheritdoc
     */
    async addActions(groupId: unknown,  actions: Array<ILocalNotificationAction>): Promise<Array<ILocalNotificationAction>> {
        // Not implemented.
        return actions;
    }

    /**
     * @inheritdoc
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async removeActions(groupId: unknown): Promise<unknown> {
        // Not implemented.
        return;
    }

    /**
     * @inheritdoc
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async hasActions(groupId: unknown): Promise<boolean> {
        // Not implemented.
        return false;
    }

    /**
     * @inheritdoc
     */
    async getDefaults(): Promise<unknown> {
        // Not implemented.
        return;
    }

    /**
     * @inheritdoc
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async setDefaults(defaults: unknown): Promise<unknown> {
        // Not implemented.
        return;
    }

    /**
     * @inheritdoc
     */
    on(eventName: string): Observable<unknown> {
        if (!this.observables[eventName]) {
            this.observables[eventName] = new Subject<ILocalNotification>();
        }

        return this.observables[eventName];
    }

    /**
     * @inheritdoc
     */
    fireEvent(eventName: string, args: unknown): void {
        if (!this.observables[eventName]) {
            return;
        }

        this.observables[eventName].next(args);
    }

    /**
     * @inheritdoc
     */
    async fireQueuedEvents(): Promise<unknown> {
        return this.triggerNextNotification();
    }

}
