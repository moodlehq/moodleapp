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

import { CoreSites } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreConstants } from '@/core/constants';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { makeSingleton } from '@singletons';
import { CoreEvents, CoreEventSiteData } from '@singletons/events';

const ROOT_CACHE_KEY = 'mmaMessageOutputAirnotifier:';

/**
 * Service to handle Airnotifier message output.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessageOutputAirnotifierProvider {

    constructor() {
        CoreEvents.on(CoreEvents.DEVICE_REGISTERED_IN_MOODLE, async (data: CoreEventSiteData) => {
            // Get user devices to make Moodle send the devices data to Airnotifier.
            this.getUserDevices(true, data.siteId);
        });
    }

    /**
     * Enables or disables a device.
     *
     * @param deviceId Device ID.
     * @param enable True to enable, false to disable.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success.
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
     * Get the cache key for the get user devices call.
     *
     * @return Cache key.
     */
    protected getUserDevicesCacheKey(): string {
        return ROOT_CACHE_KEY + 'userDevices';
    }

    /**
     * Get user devices.
     *
     * @param ignoreCache Whether to ignore cache.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the devices.
     */
    async getUserDevices(ignoreCache?: boolean, siteId?: string): Promise<AddonMessageOutputAirnotifierDevice[]> {

        const site = await CoreSites.getSite(siteId);

        const data: AddonMessageOutputAirnotifierGetUserDevicesWSParams = {
            appid: CoreConstants.CONFIG.app_id,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserDevicesCacheKey(),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
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
     * @return Promise resolved when data is invalidated.
     */
    async invalidateUserDevices(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getUserDevicesCacheKey());
    }

    /**
     * Returns whether or not the plugin is enabled for the current site.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isEnabled(): boolean {
        return CoreSites.wsAvailableInCurrentSite('message_airnotifier_enable_device') &&
                CoreSites.wsAvailableInCurrentSite('message_airnotifier_get_user_devices');
    }

}

export const AddonMessageOutputAirnotifier = makeSingleton(AddonMessageOutputAirnotifierProvider);

/**
 * Device data returned by WS message_airnotifier_get_user_devices.
 */
export type AddonMessageOutputAirnotifierDevice = {
    id: number; // Device id (in the message_airnotifier table).
    appid: string; // The app id, something like com.moodle.moodlemobile.
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
