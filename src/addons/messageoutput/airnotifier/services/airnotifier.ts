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

import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreCacheUpdateFrequency, CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents, CoreEventSiteData } from '@singletons/events';
import { CoreOpener } from '@singletons/opener';
import { CorePath } from '@singletons/path';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CorePrompts } from '@services/overlays/prompts';

const ROOT_CACHE_KEY = 'mmaMessageOutputAirnotifier:';

/**
 * Service to handle Airnotifier message output.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessageOutputAirnotifierProvider {

    /**
     * Initialize.
     */
    initialize(): void {
        CoreEvents.on(CoreEvents.DEVICE_REGISTERED_IN_MOODLE, async (data: CoreEventSiteData) => {
            // Get user devices to make Moodle send the devices data to Airnotifier.
            this.getUserDevices(true, data.siteId);
        });

        CoreEvents.on(CoreEvents.LOGIN, (data) => {
            this.warnPushDisabledForAdmin(data.siteId);
        });
    }

    /**
     * Enables or disables a device.
     *
     * @param deviceId Device ID.
     * @param enable True to enable, false to disable.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success.
     */
    async enableDevice(deviceId: number, enable: boolean, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const data: AddonMessageOutputAirnotifierEnableDeviceWSParams = {
            deviceid: deviceId,
            enable: !!enable,
        };

        const result = await site.write<AddonMessageOutputAirnotifierEnableDeviceWSResponse>(
            'message_airnotifier_enable_device',
            data,
        );

        if (result.success) {
            return;
        }

        // Fail. Reject with warning message if any.
        if (result.warnings?.length) {
            throw new CoreWSError(result.warnings[0]);
        }

        throw new CoreError('Error enabling device');
    }

    /**
     * Get the cache key for the is system configured call.
     *
     * @returns Cache key.
     */
    protected getSystemConfiguredCacheKey(): string {
        return ROOT_CACHE_KEY + 'isAirnotifierConfigured';
    }

    /**
     * Check if airnotifier is configured.
     *
     * @param options Options.
     * @returns Promise resolved with boolean: whether it's configured.
     */
    async isSystemConfigured(options: CoreSitesCommonWSOptions = {}): Promise<boolean> {
        const site = await CoreSites.getSite(options.siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSystemConfiguredCacheKey(),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<number>('message_airnotifier_is_system_configured', {}, preSets);

        return result === 1;
    }

    /**
     * Get the cache key for the get user devices call.
     *
     * @returns Cache key.
     */
    protected getUserDevicesCacheKey(): string {
        return ROOT_CACHE_KEY + 'userDevices';
    }

    /**
     * Get user devices.
     *
     * @param ignoreCache Whether to ignore cache.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the devices.
     */
    async getUserDevices(ignoreCache?: boolean, siteId?: string): Promise<AddonMessageOutputAirnotifierDevice[]> {

        const site = await CoreSites.getSite(siteId);

        const data: AddonMessageOutputAirnotifierGetUserDevicesWSParams = {
            appid: CoreConstants.CONFIG.app_id,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserDevicesCacheKey(),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const result = await site.read<AddonMessageOutputAirnotifierGetUserDevicesWSResponse>(
            'message_airnotifier_get_user_devices',
            data,
            preSets,
        );

        return result.devices;
    }

    /**
     * Invalidate get user devices.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateUserDevices(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getUserDevicesCacheKey());
    }

    /**
     * Is user is an admin and push are disabled, notify him.
     *
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async warnPushDisabledForAdmin(siteId?: string): Promise<void> {
        if (!siteId) {
            return;
        }

        try {
            const site = await CoreSites.getSite(siteId);

            if (!site.getInfo()?.userissiteadmin) {
                // Not an admin or we don't know, stop.
                return;
            }

            // Check if the admin already asked not to be reminded.
            const dontAsk = await site.getLocalSiteConfig('AddonMessageOutputAirnotifierDontRemindDisabled', 0);
            if (dontAsk) {
                return;
            }

            // Check if airnotifier is configured.
            const isConfigured = await this.isSystemConfigured({
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            });

            if (isConfigured) {
                return;
            }

            // Warn the admin.
            const dontShowAgain = await CorePrompts.show(
                Translate.instant('addon.messageoutput_airnotifier.pushdisabledwarning'),
                'checkbox',
                {
                    placeholderOrLabel: Translate.instant('core.dontshowagain'),
                    buttons: [
                        {
                            text: Translate.instant('core.ok'),
                        },
                        {
                            text: Translate.instant('core.goto', { $a: Translate.instant('core.settings.settings') }),
                            handler: (data, resolve) => {
                                resolve(data[0]);

                                const url = CorePath.concatenatePaths(
                                    site.getURL(),
                                    site.isVersionGreaterEqualThan('3.11') ?
                                        'message/output/airnotifier/checkconfiguration.php' :
                                        'admin/message.php',
                                );

                                // Don't try auto-login, admins cannot use it.
                                CoreOpener.openInBrowser(url, {
                                    showBrowserWarning: false,
                                });
                            },
                        },
                    ],
                },
            );

            if (dontShowAgain) {
                await site.setLocalSiteConfig('AddonMessageOutputAirnotifierDontRemindDisabled', 1);
            }
        } catch {
            // Ignore errors.
        }
    }

}

export const AddonMessageOutputAirnotifier = makeSingleton(AddonMessageOutputAirnotifierProvider);

/**
 * Device data returned by WS message_airnotifier_get_user_devices.
 */
export type AddonMessageOutputAirnotifierDevice = {
    id: number; // Device id (in the message_airnotifier table).
    appid: string; // The app id, something like com.ictkerala.ksfe.
    name: string; // The device name, 'occam' or 'iPhone' etc.
    model: string; // The device model 'Nexus4' or 'iPad1,1' etc.
    platform: string; // The device platform 'iOS' or 'Android' etc.
    version: string; // The device version '6.1.2' or '4.2.2' etc.
    pushid: string; // The device PUSH token/key/identifier/registration id.
    uuid: string; // The device UUID.
    enable: number | boolean; // Whether the device is enabled or not.
    timecreated: number; // Time created.
    timemodified: number; // Time modified.
};

/**
 * Params of message_airnotifier_enable_device WS.
 */
export type AddonMessageOutputAirnotifierEnableDeviceWSParams = {
    deviceid: number; // The device id.
    enable: boolean; // True for enable the device, false otherwise.
};

/**
 * Result of WS message_airnotifier_enable_device.
 */
export type AddonMessageOutputAirnotifierEnableDeviceWSResponse = {
    success: boolean; // True if success.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of message_airnotifier_get_user_devices WS.
 */
export type AddonMessageOutputAirnotifierGetUserDevicesWSParams = {
    appid: string; // App unique id (usually a reversed domain).
    userid?: number; // User id, 0 for current user.
};

/**
 * Result of WS message_airnotifier_get_user_devices.
 */
export type AddonMessageOutputAirnotifierGetUserDevicesWSResponse = {
    devices: AddonMessageOutputAirnotifierDevice[]; // List of devices.
    warnings?: CoreWSExternalWarning[];
};
