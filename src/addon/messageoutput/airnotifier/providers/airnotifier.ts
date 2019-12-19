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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreConfigConstants } from '../../../../configconstants';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning } from '@providers/ws';

/**
 * Service to handle Airnotifier message output.
 */
@Injectable()
export class AddonMessageOutputAirnotifierProvider {

    protected ROOT_CACHE_KEY = 'mmaMessageOutputAirnotifier:';
    protected logger: any;

    constructor(loggerProvider: CoreLoggerProvider, private sitesProvider: CoreSitesProvider) {
        this.logger = loggerProvider.getInstance('AddonMessageOutputAirnotifier');
    }

    /**
     * Enables or disables a device.
     *
     * @param deviceId Device ID.
     * @param enable True to enable, false to disable.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success.
     */
    enableDevice(deviceId: number, enable: boolean, siteId?: string): Promise<void> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                deviceid: deviceId,
                enable: enable ? 1 : 0
            };

            return site.write('message_airnotifier_enable_device', data)
                    .then((result: AddonMessageOutputAirnotifierEnableDeviceResult) => {

                if (!result.success) {
                    // Fail. Reject with warning message if any.
                    if (result.warnings && result.warnings.length) {
                        return Promise.reject(result.warnings[0].message);
                    }

                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Get the cache key for the get user devices call.
     *
     * @return Cache key.
     */
    protected getUserDevicesCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'userDevices';
    }

    /**
     * Get user devices.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the devices.
     */
    getUserDevices(siteId?: string): Promise<AddonMessageOutputAirnotifierDevice[]> {
        this.logger.debug('Get user devices');

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                appid: CoreConfigConstants.app_id
            };
            const preSets = {
                cacheKey: this.getUserDevicesCacheKey(),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            return site.read('message_airnotifier_get_user_devices', data, preSets)
                    .then((data: AddonMessageOutputAirnotifierGetUserDevicesResult) => {
                return data.devices;
            });
        });
    }

    /**
     * Invalidate get user devices.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateUserDevices(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserDevicesCacheKey());
        });
    }

    /**
     * Returns whether or not the plugin is enabled for the current site.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('message_airnotifier_enable_device') &&
                this.sitesProvider.wsAvailableInCurrentSite('message_airnotifier_get_user_devices');
    }
}

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
 * Result of WS message_airnotifier_enable_device.
 */
export type AddonMessageOutputAirnotifierEnableDeviceResult = {
    success: boolean; // True if success.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS message_airnotifier_get_user_devices.
 */
export type AddonMessageOutputAirnotifierGetUserDevicesResult = {
    devices: AddonMessageOutputAirnotifierDevice[]; // List of devices.
    warnings?: CoreWSExternalWarning[];
};
