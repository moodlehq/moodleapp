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
import { ILocalNotification } from '@ionic-native/local-notifications';
import { NotificationEventResponse, PushOptions, RegistrationEventResponse } from '@ionic-native/push/ngx';

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CorePushNotificationsDelegate } from './push-delegate';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreConfig } from '@services/config';
import { CoreConstants } from '@/core/constants';
import { CoreSite, CoreSiteInfo } from '@classes/site';
import { makeSingleton, Badge, Push, Device, Translate, ApplicationInit, NgZone } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreEvents } from '@singletons/events';
import {
    APP_SCHEMA,
    BADGE_TABLE_NAME,
    PENDING_UNREGISTER_TABLE_NAME,
    REGISTERED_DEVICES_TABLE_NAME,
    CorePushNotificationsPendingUnregisterDBRecord,
    CorePushNotificationsRegisteredDeviceDBRecord,
    CorePushNotificationsBadgeDBRecord,
} from './database/pushnotifications';
import { CoreError } from '@classes/errors/error';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreMainMenuProvider } from '@features/mainmenu/services/mainmenu';
import { AsyncInstance, asyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { CoreObject } from '@singletons/object';
import { lazyMap, LazyMap } from '@/core/utils/lazy-map';
import { CorePlatform } from '@services/platform';

/**
 * Service to handle push notifications.
 */
@Injectable({ providedIn: 'root' })
export class CorePushNotificationsProvider {

    static readonly COMPONENT = 'CorePushNotificationsProvider';

    protected logger: CoreLogger;
    protected pushID?: string;
    protected badgesTable = asyncInstance<CoreDatabaseTable<CorePushNotificationsBadgeDBRecord, 'siteid' | 'addon'>>();
    protected pendingUnregistersTable =
        asyncInstance<CoreDatabaseTable<CorePushNotificationsPendingUnregisterDBRecord, 'siteid'>>();

    protected registeredDevicesTables:
        LazyMap<AsyncInstance<CoreDatabaseTable<CorePushNotificationsRegisteredDeviceDBRecord, 'appid' | 'uuid'>>>;

    constructor() {
        this.logger = CoreLogger.getInstance('CorePushNotificationsProvider');
        this.registeredDevicesTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable<CorePushNotificationsRegisteredDeviceDBRecord, 'appid' | 'uuid'>(
                    REGISTERED_DEVICES_TABLE_NAME,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        primaryKeyColumns: ['appid', 'uuid'],
                        onDestroy: () => delete this.registeredDevicesTables[siteId],
                    },
                ),
            ),
        );
    }

    /**
     * Initialize the service.
     *
     * @returns Promise resolved when done.
     */
    async initialize(): Promise<void> {
        await Promise.all([
            this.initializeDatabase(),
            this.initializeDefaultChannel(),
        ]);

        // Now register the device to receive push notifications. Don't block for this.
        this.registerDevice();

        CoreEvents.on(CoreEvents.NOTIFICATION_SOUND_CHANGED, () => {
            // Notification sound has changed, register the device again to update the sound setting.
            this.registerDevice();
        });

        // Register device on Moodle site when login.
        CoreEvents.on(CoreEvents.LOGIN, async () => {
            try {
                await this.registerDeviceOnMoodle();
            } catch (error) {
                this.logger.warn('Can\'t register device', error);
            }
        });

        CoreEvents.on(CoreEvents.SITE_DELETED, async (site) => {
            try {
                await Promise.all([
                    this.unregisterDeviceOnMoodle(site),
                    this.cleanSiteCounters(site.getId()),
                ]);
            } catch (error) {
                this.logger.warn('Can\'t unregister device', error);
            }
        });

        CoreEvents.on(CoreMainMenuProvider.MAIN_MENU_HANDLER_BADGE_UPDATED, (data) => {
            this.updateAddonCounter(data.handler, data.value, data.siteId);
        });

        // Listen for local notification clicks (generated by the app).
        CoreLocalNotifications.registerClick<CorePushNotificationsNotificationBasicData>(
            CorePushNotificationsProvider.COMPONENT,
            (notification) => {
                // Log notification open event.
                this.logEvent('moodle_notification_open', notification, true);

                this.notificationClicked(notification);
            },
        );

        // Listen for local notification dismissed events.
        CoreLocalNotifications.registerObserver<CorePushNotificationsNotificationBasicData>(
            'clear',
            CorePushNotificationsProvider.COMPONENT,
            (notification) => {
                // Log notification dismissed event.
                this.logEvent('moodle_notification_dismiss', notification, true);
            },
        );
    }

    /**
     * Initialize the default channel for Android.
     *
     * @returns Promise resolved when done.
     */
    protected async initializeDefaultChannel(): Promise<void> {
        await CorePlatform.ready();

        // Create the default channel.
        this.createDefaultChannel();

        Translate.onLangChange.subscribe(() => {
            // Update the channel name.
            this.createDefaultChannel();
        });
    }

    /**
     * Initialize database.
     *
     * @returns Promise resolved when done.
     */
    protected async initializeDatabase(): Promise<void> {
        try {
            await CoreApp.createTablesFromSchema(APP_SCHEMA);
        } catch (e) {
            // Ignore errors.
        }

        const database = CoreApp.getDB();
        const badgesTable = new CoreDatabaseTableProxy<CorePushNotificationsBadgeDBRecord, 'siteid' | 'addon'>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            database,
            BADGE_TABLE_NAME,
            ['siteid', 'addon'],
        );
        const pendingUnregistersTable = new CoreDatabaseTableProxy<CorePushNotificationsPendingUnregisterDBRecord, 'siteid'>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            database,
            PENDING_UNREGISTER_TABLE_NAME,
            ['siteid'],
        );

        await Promise.all([
            badgesTable.initialize(),
            pendingUnregistersTable.initialize(),
        ]);

        this.badgesTable.setInstance(badgesTable);
        this.pendingUnregistersTable.setInstance(pendingUnregistersTable);
    }

    /**
     * Check whether the device can be registered in Moodle to receive push notifications.
     *
     * @returns Whether the device can be registered in Moodle.
     */
    canRegisterOnMoodle(): boolean {
        return !!this.pushID && CorePlatform.isMobile();
    }

    /**
     * Delete all badge records for a given site.
     *
     * @param siteId Site ID.
     * @returns Resolved when done.
     */
    async cleanSiteCounters(siteId: string): Promise<void> {
        try {
            await this.badgesTable.delete({ siteid: siteId });
        } finally {
            this.updateAppCounter();
        }
    }

    /**
     * Create the default push channel. It is used to change the name.
     *
     * @returns Promise resolved when done.
     */
    protected async createDefaultChannel(): Promise<void> {
        if (!CorePlatform.isAndroid()) {
            return;
        }

        try {
            await Push.createChannel({
                id: 'PushPluginChannel',
                description: Translate.instant('core.misc'),
                importance: 4,
            });
        } catch (error) {
            this.logger.error('Error changing push channel name', error);
        }
    }

    /**
     * Enable or disable Firebase analytics.
     *
     * @param enable Whether to enable or disable.
     * @returns Promise resolved when done.
     */
    async enableAnalytics(enable: boolean): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = <any> window; // This feature is only present in our fork of the plugin.

        if (!CoreConstants.CONFIG.enableanalytics || !win.PushNotification?.enableAnalytics) {
            return;
        }

        await new Promise<void>(resolve => {
            win.PushNotification.enableAnalytics(resolve, (error) => {
                this.logger.error('Error enabling or disabling Firebase analytics', enable, error);

                resolve();
            }, !!enable);
        });
    }

    /**
     * Returns options for push notifications based on device.
     *
     * @returns Promise with the push options resolved when done.
     */
    protected async getOptions(): Promise<PushOptions> {
        let soundEnabled = true;

        if (CoreLocalNotifications.canDisableSound()) {
            soundEnabled = await CoreConfig.get<boolean>(CoreConstants.SETTINGS_NOTIFICATION_SOUND, true);
        }

        return {
            android: {
                sound: !!soundEnabled,
                icon: 'smallicon',
                iconColor: CoreConstants.CONFIG.notificoncolor,
            },
            ios: {
                alert: 'true',
                badge: true,
                sound: !!soundEnabled,
            },
            windows: {
                sound: !!soundEnabled,
            },
        };
    }

    /**
     * Get the pushID for this device.
     *
     * @returns Push ID.
     */
    getPushId(): string | undefined {
        return this.pushID;
    }

    /**
     * Get data to register the device in Moodle.
     *
     * @returns Data.
     */
    protected getRegisterData(): CoreUserAddUserDeviceWSParams {
        if (!this.pushID) {
            throw new CoreError('Cannot get register data because pushID is not set.');
        }

        return {
            appid:      CoreConstants.CONFIG.app_id,
            name:       Device.manufacturer || '',
            model:      Device.model,
            platform:   Device.platform + '-fcm',
            version:    Device.version,
            pushid:     this.pushID,
            uuid:       Device.uuid,
        };
    }

    /**
     * Get Sitebadge counter from the database.
     *
     * @param siteId Site ID.
     * @returns Promise resolved with the stored badge counter for the site.
     */
    getSiteCounter(siteId: string): Promise<number> {
        return this.getAddonBadge(siteId);
    }

    /**
     * Log a firebase event.
     *
     * @param name Name of the event.
     * @param data Data of the event.
     * @param filter Whether to filter the data. This is useful when logging a full notification.
     * @returns Promise resolved when done. This promise is never rejected.
     */
    async logEvent(name: string, data: Record<string, unknown>, filter?: boolean): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = <any> window; // This feature is only present in our fork of the plugin.

        if (!CoreConstants.CONFIG.enableanalytics || !win.PushNotification?.logEvent) {
            return;
        }

        // Check if the analytics is enabled by the user.
        const enabled = await CoreConfig.get<boolean>(CoreConstants.SETTINGS_ANALYTICS_ENABLED, true);
        if (!enabled) {
            return;
        }

        await new Promise<void>(resolve => {
            win.PushNotification.logEvent(resolve, (error) => {
                this.logger.error('Error logging firebase event', name, error);
                resolve();
            }, name, data, !!filter);
        });
    }

    /**
     * Log a firebase view_item event.
     *
     * @param itemId The item ID.
     * @param itemName The item name.
     * @param itemCategory The item category.
     * @param wsName Name of the WS.
     * @param data Other data to pass to the event.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done. This promise is never rejected.
     */
    logViewEvent(
        itemId: number | string | undefined,
        itemName: string | undefined,
        itemCategory: string | undefined,
        wsName: string,
        data?: Record<string, unknown>,
        siteId?: string,
    ): Promise<void> {
        data = data || {};

        // Add "moodle" to the name of all extra params.
        data = CoreUtils.prefixKeys(data, 'moodle');
        data.moodleaction = wsName;
        data.moodlesiteid = siteId || CoreSites.getCurrentSiteId();

        if (itemId) {
            data.item_id = itemId;
        }
        if (itemName) {
            data.item_name = itemName;
        }
        if (itemCategory) {
            data.item_category = itemCategory;
        }

        return this.logEvent('view_item', data, false);
    }

    /**
     * Log a firebase view_item_list event.
     *
     * @param itemCategory The item category.
     * @param wsName Name of the WS.
     * @param data Other data to pass to the event.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done. This promise is never rejected.
     */
    logViewListEvent(itemCategory: string, wsName: string, data?: Record<string, unknown>, siteId?: string): Promise<void> {
        data = data || {};

        // Add "moodle" to the name of all extra params.
        data = CoreUtils.prefixKeys(data, 'moodle');
        data.moodleaction = wsName;
        data.moodlesiteid = siteId || CoreSites.getCurrentSiteId();

        if (itemCategory) {
            data.item_category = itemCategory;
        }

        return this.logEvent('view_item_list', data, false);
    }

    /**
     * Function called when a push notification is clicked. Redirect the user to the right state.
     *
     * @param data Notification data.
     * @returns Promise resolved when done.
     */
    async notificationClicked(data: CorePushNotificationsNotificationBasicData): Promise<void> {
        await ApplicationInit.donePromise;

        CorePushNotificationsDelegate.clicked(data);
    }

    /**
     * This function is called when we receive a Notification from APNS or a message notification from GCM.
     * The app can be in foreground or background,
     * if we are in background this code is executed when we open the app clicking in the notification bar.
     *
     * @param notification Notification received.
     * @returns Promise resolved when done.
     */
    async onMessageReceived(notification: NotificationEventResponse): Promise<void> {
        const rawData: CorePushNotificationsNotificationBasicRawData = notification ? notification.additionalData : {};

        // Parse some fields and add some extra data.
        const data: CorePushNotificationsNotificationBasicData = Object.assign(rawData, {
            title: notification.title,
            message: notification.message,
            customdata: typeof rawData.customdata == 'string' ?
                CoreTextUtils.parseJSON<Record<string, unknown>>(rawData.customdata, {}) : rawData.customdata,
        });

        let site: CoreSite | undefined;

        if (data.site) {
            site = await CoreSites.getSite(data.site);
        } else if (data.siteurl) {
            site = await CoreSites.getSiteByUrl(data.siteurl);
        }

        data.site = site?.getId();

        if (!CoreUtils.isTrueOrOne(data.foreground)) {
            // The notification was clicked.
            return this.notificationClicked(data);
        }

        const localNotif: ILocalNotification = {
            id: Number(data.notId) || 1,
            data: data,
            title: notification.title,
            text: notification.message,
            channel: 'PushPluginChannel',
        };
        const isAndroid = CorePlatform.isAndroid();
        const extraFeatures = CoreUtils.isTrueOrOne(data.extrafeatures);

        if (extraFeatures && isAndroid && CoreUtils.isFalseOrZero(data.notif)) {
            // It's a message, use messaging style. Ionic Native doesn't specify this option.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any> localNotif).text = [
                {
                    message: notification.message,
                    person: data.sender ?? (data.conversationtype == '2' ? data.userfromfullname : ''),
                    personIcon: data.senderImage,
                },
            ];
        }

        if (extraFeatures && isAndroid) {
            // Use a different icon if needed.
            localNotif.icon = notification.image;
            // This feature isn't supported by the official plugin, we use a fork.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any> localNotif).iconType = data['image-type'];

            localNotif.summary = data.summaryText;

            if (data.picture) {
                localNotif.attachments = [data.picture];
            }
        }

        CoreLocalNotifications.schedule(localNotif, CorePushNotificationsProvider.COMPONENT, data.site || '', true);

        await this.notifyReceived(notification, data);

    }

    /**
     * Notify that a notification was received.
     *
     * @param notification Notification.
     * @param data Notification data.
     * @returns Promise resolved when done.
     */
    protected async notifyReceived(
        notification: NotificationEventResponse,
        data: CorePushNotificationsNotificationBasicData,
    ): Promise<void> {
        await ApplicationInit.donePromise;

        CorePushNotificationsDelegate.received(data);
    }

    /**
     * Unregisters a device from a certain Moodle site.
     *
     * @param site Site to unregister from.
     * @returns Promise resolved when device is unregistered.
     */
    async unregisterDeviceOnMoodle(site: CoreSite): Promise<void> {
        if (!site || !CorePlatform.isMobile()) {
            throw new CoreError('Cannot unregister device');
        }

        this.logger.debug(`Unregister device on Moodle: '${site.getId()}'`);

        const data: CoreUserRemoveUserDeviceWSParams = {
            appid: CoreConstants.CONFIG.app_id,
            uuid:  Device.uuid,
        };
        let response: CoreUserRemoveUserDeviceWSResponse;

        try {
            response = await site.write<CoreUserRemoveUserDeviceWSResponse>('core_user_remove_user_device', data);
        } catch (error) {
            if (CoreUtils.isWebServiceError(error) || CoreUtils.isExpiredTokenError(error)) {
                // Cannot unregister. Don't try again.
                await CoreUtils.ignoreErrors(this.pendingUnregistersTable.delete({
                    token: site.getToken(),
                    siteid: site.getId(),
                }));

                throw error;
            }

            // Store the pending unregister so it's retried again later.
            await this.pendingUnregistersTable.insert({
                siteid: site.getId(),
                siteurl: site.getURL(),
                token: site.getToken(),
                info: JSON.stringify(site.getInfo()),
            });

            return;
        }

        if (!response.removed) {
            throw new CoreError('Cannot unregister device');
        }

        await CoreUtils.ignoreErrors(Promise.all([
            // Remove the device from the local DB.
            this.registeredDevicesTables[site.getId()].delete(this.getRegisterData()),
            // Remove pending unregisters for this site.
            this.pendingUnregistersTable.deleteByPrimaryKey({ siteid: site.getId() }),
        ]));
    }

    /**
     * Update Counter for an addon. It will update the refered siteId counter and the total badge.
     * It will return the updated addon counter.
     *
     * @param addon Registered addon name to set the badge number.
     * @param value The number to be stored.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the stored badge counter for the addon on the site.
     */
    async updateAddonCounter(addon: string, value: number, siteId?: string): Promise<number> {
        if (!CorePushNotificationsDelegate.isCounterHandlerRegistered(addon)) {
            return 0;
        }

        siteId = siteId || CoreSites.getCurrentSiteId();

        await this.saveAddonBadge(value, siteId, addon);
        await this.updateSiteCounter(siteId);

        return value;
    }

    /**
     * Update total badge counter of the app.
     *
     * @returns Promise resolved with the stored badge counter for the site.
     */
    async updateAppCounter(): Promise<number> {
        const sitesIds = await CoreSites.getSitesIds();

        const counters = await Promise.all(sitesIds.map((siteId) => this.getAddonBadge(siteId)));

        const total = counters.reduce((previous, counter) => previous + counter, 0);

        if (CorePlatform.isMobile()) {
            // Set the app badge on mobile.
            await Badge.set(total);
        }

        return total;
    }

    /**
     * Update counter for a site using the stored addon data. It will update the total badge application number.
     * It will return the updated site counter.
     *
     * @param siteId Site ID.
     * @returns Promise resolved with the stored badge counter for the site.
     */
    async updateSiteCounter(siteId: string): Promise<number> {
        const addons = CorePushNotificationsDelegate.getCounterHandlers();

        const counters = await Promise.all(Object.values(addons).map((addon) => this.getAddonBadge(siteId, addon)));

        const total = counters.reduce((previous, counter) => previous + counter, 0);

        // Save the counter on site.
        await this.saveAddonBadge(total, siteId);

        await this.updateAppCounter();

        return total;
    }

    /**
     * Register a device in Apple APNS or Google GCM.
     *
     * @returns Promise resolved when the device is registered.
     */
    async registerDevice(): Promise<void> {
        try {
            // Check if sound is enabled for notifications.
            const options = await this.getOptions();

            const pushObject = Push.init(options);

            pushObject.on('notification').subscribe((notification: NotificationEventResponse | {registrationType: string}) => {
                // Execute the callback in the Angular zone, so change detection doesn't stop working.
                NgZone.run(() => {
                    if ('registrationType' in notification) {
                        // Not a valid notification, ignore.
                        return;
                    }

                    this.logger.log('Received a notification', notification);
                    this.onMessageReceived(notification);
                });
            });

            pushObject.on('registration').subscribe((data: RegistrationEventResponse) => {
                // Execute the callback in the Angular zone, so change detection doesn't stop working.
                NgZone.run(() => {
                    this.pushID = data.registrationId;
                    if (!CoreSites.isLoggedIn()) {
                        return;
                    }

                    this.registerDeviceOnMoodle().catch((error) => {
                        this.logger.warn('Can\'t register device', error);
                    });
                });
            });

            pushObject.on('error').subscribe((error: Error) => {
                // Execute the callback in the Angular zone, so change detection doesn't stop working.
                NgZone.run(() => {
                    this.logger.warn('Error with Push plugin', error);
                });
            });
        } catch (error) {
            this.logger.warn(error);

            throw error;
        }
    }

    /**
     * Registers a device on a Moodle site if needed.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param forceUnregister Whether to force unregister and register.
     * @returns Promise resolved when device is registered.
     */
    async registerDeviceOnMoodle(siteId?: string, forceUnregister?: boolean): Promise<void> {
        this.logger.debug('Register device on Moodle.');

        if (!this.canRegisterOnMoodle()) {
            return Promise.reject(null);
        }

        const site = await CoreSites.getSite(siteId);

        try {

            const data = this.getRegisterData();
            let result = {
                unregister: true,
                register: true,
            };

            if (!forceUnregister) {
                // Check if the device is already registered.
                result = await this.shouldRegister(data, site);
            }

            if (result.unregister) {
                // Unregister the device first.
                await CoreUtils.ignoreErrors(this.unregisterDeviceOnMoodle(site));
            }

            if (result.register) {
                // Now register the device.
                await site.write('core_user_add_user_device', CoreUtils.clone(data));

                CoreEvents.trigger(CoreEvents.DEVICE_REGISTERED_IN_MOODLE, {}, site.getId());

                // Insert the device in the local DB.
                await CoreUtils.ignoreErrors(this.registeredDevicesTables[site.getId()].insert(data));
            }
        } finally {
            // Remove pending unregisters for this site.
            await CoreUtils.ignoreErrors(this.pendingUnregistersTable.deleteByPrimaryKey({ siteid: site.getId() }));
        }
    }

    /**
     * Get the addon/site badge counter from the database.
     *
     * @param siteId Site ID.
     * @param addon Registered addon name. If not defined it will store the site total.
     * @returns Promise resolved with the stored badge counter for the addon or site or 0 if none.
     */
    protected async getAddonBadge(siteId?: string, addon: string = 'site'): Promise<number> {
        try {
            const entry = await this.badgesTable.getOne({ siteid: siteId, addon });

            return entry?.number || 0;
        } catch (err) {
            return 0;
        }
    }

    /**
     * Retry pending unregisters.
     *
     * @param siteId If defined, retry only for that site if needed. Otherwise, retry all pending unregisters.
     * @returns Promise resolved when done.
     */
    async retryUnregisters(siteId?: string): Promise<void> {
        const results = await this.pendingUnregistersTable.getMany(CoreObject.withoutEmpty({ siteid: siteId }));

        await Promise.all(results.map(async (result) => {
            // Create a temporary site to unregister.
            const tmpSite = CoreSitesFactory.makeSite(
                result.siteid,
                result.siteurl,
                result.token,
                CoreTextUtils.parseJSON<CoreSiteInfo | null>(result.info, null) || undefined,
            );

            await this.unregisterDeviceOnMoodle(tmpSite);
        }));
    }

    /**
     * Save the addon/site badgecounter on the database.
     *
     * @param value The number to be stored.
     * @param siteId Site ID. If not defined, use current site.
     * @param addon Registered addon name. If not defined it will store the site total.
     * @returns Promise resolved with the stored badge counter for the addon or site.
     */
    protected async saveAddonBadge(value: number, siteId?: string, addon: string = 'site'): Promise<number> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await this.badgesTable.insert({
            siteid: siteId,
            addon,
            number: value, // eslint-disable-line id-blacklist
        });

        return value;
    }

    /**
     * Check if device should be registered (and unregistered first).
     *
     * @param data Data of the device.
     * @param site Site to use.
     * @returns Promise resolved with booleans: whether to register/unregister.
     */
    protected async shouldRegister(
        data: CoreUserAddUserDeviceWSParams,
        site: CoreSite,
    ): Promise<{register: boolean; unregister: boolean}> {

        // Check if the device is already registered.
        const records = await CoreUtils.ignoreErrors(
            this.registeredDevicesTables[site.getId()].getMany({
                appid: data.appid,
                uuid: data.uuid,
                name: data.name,
                model: data.model,
                platform: data.platform,
            }),
        );

        let isStored = false;
        let versionOrPushChanged = false;

        (records || []).forEach((record) => {
            if (record.version == data.version && record.pushid == data.pushid) {
                // The device is already stored.
                isStored = true;
            } else {
                // The version or pushid has changed.
                versionOrPushChanged = true;
            }
        });

        if (isStored) {
            // The device has already been registered, no need to register it again.
            return {
                register: false,
                unregister: false,
            };
        } else if (versionOrPushChanged) {
            // This data can be updated by calling register WS, no need to call unregister.
            return {
                register: true,
                unregister: false,
            };
        } else {
            return {
                register: true,
                unregister: true,
            };
        }
    }

}

export const CorePushNotifications = makeSingleton(CorePushNotificationsProvider);

/**
 * Additional data sent in push notifications.
 */
export type CorePushNotificationsNotificationBasicRawData = {
    customdata?: string; // Custom data.
    extrafeatures?: string; // "1" if the notification uses extrafeatures, "0" otherwise.
    foreground?: boolean; // Whether the app was in foreground.
    'image-type'?: string; // How to display the notification image.
    moodlecomponent?: string; // Moodle component that triggered the notification.
    name?: string; // A name to identify the type of notification.
    notId?: string; // Notification ID.
    notif?: string; // "1" if it's a notification, "0" if it's a Moodle message.
    site?: string; // ID of the site sending the notification.
    siteurl?: string; // URL of the site the notification is related to.
    usertoid?: string; // ID of user receiving the push.
    conversationtype?: string; // Conversation type. Only if it's a push generated by a Moodle message.
    userfromfullname?: string; // Fullname of user sending the push. Only if it's a push generated by a Moodle message.
    userfromid?: string; // ID of user sending the push. Only if it's a push generated by a Moodle message.
    picture?: string; // Notification big picture. "Extra" feature.
    summaryText?: string; // Notification summary text. "Extra" feature.
    sender?: string; // Name of the user who sent the message. "Extra" feature.
    senderImage?: string; // Image of the user who sent the message. "Extra" feature.
};

/**
 * Additional data sent in push notifications, with some calculated data.
 */
export type CorePushNotificationsNotificationBasicData = Omit<CorePushNotificationsNotificationBasicRawData, 'customdata'> & {
    title?: string; // Notification title.
    message?: string; // Notification message.
    customdata?: Record<string, unknown>; // Parsed custom data.
};

/**
 * Params of core_user_remove_user_device WS.
 */
export type CoreUserRemoveUserDeviceWSParams = {
    uuid: string; // The device UUID.
    appid?: string; // The app id, if empty devices matching the UUID for the user will be removed.
};

/**
 * Data returned by core_user_remove_user_device WS.
 */
export type CoreUserRemoveUserDeviceWSResponse = {
    removed: boolean; // True if removed, false if not removed because it doesn't exists.
    warnings?: CoreWSExternalWarning[];
};
/**
 * Params of core_user_add_user_device WS.
 */
export type CoreUserAddUserDeviceWSParams = {
    appid: string; // The app id, usually something like com.moodle.moodlemobile.
    name: string; // The device name, 'occam' or 'iPhone' etc.
    model: string; // The device model 'Nexus4' or 'iPad1,1' etc.
    platform: string; // The device platform 'iOS' or 'Android' etc.
    version: string; // The device version '6.1.2' or '4.2.2' etc.
    pushid: string; // The device PUSH token/key/identifier/registration id.
    uuid: string; // The device UUID.
};

/**
 * Data returned by core_user_add_user_device WS.
 */
export type CoreUserAddUserDeviceWSResponse = CoreWSExternalWarning[][];
