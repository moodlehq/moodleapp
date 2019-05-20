// (C) Copyright 2015 Martin Dougiamas
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
     * @param {number} deviceId Device ID.
     * @param {boolean} enable True to enable, false to disable.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if success.
     */
    enableDevice(deviceId: number, enable: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                deviceid: deviceId,
                enable: enable ? 1 : 0
            };

            return site.write('message_airnotifier_enable_device', data).then((result) => {
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
     * @return {string} Cache key.
     */
    protected getUserDevicesCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'userDevices';
    }

    /**
     * Get user devices.
     *
     * @param {string} [siteId] Site ID. If not defined, use current site.
     * @return {Promise<any>} Promise resolved with the devices.
     */
    getUserDevices(siteId?: string): Promise<any> {
        this.logger.debug('Get user devices');

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                appid: CoreConfigConstants.app_id
            };
            const preSets = {
                cacheKey: this.getUserDevicesCacheKey(),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            return site.read('message_airnotifier_get_user_devices', data, preSets).then((data) => {
                return data.devices;
            });
        });
    }

    /**
     * Invalidate get user devices.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when data is invalidated.
     */
    invalidateUserDevices(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserDevicesCacheKey());
        });
    }

    /**
     * Returns whether or not the plugin is enabled for the current site.
     *
     * @return {boolean} True if enabled, false otherwise.
     * @since 3.2
     */
    isEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('message_airnotifier_enable_device') &&
                this.sitesProvider.wsAvailableInCurrentSite('message_airnotifier_get_user_devices');
    }
}
