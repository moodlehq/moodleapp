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
import { DeviceId, DeviceInfo, Device as DeviceService } from '@capacitor/device';
import { makeSingleton } from '@singletons';

/**
 * Service wrapping the Native Device plugin.
 */
@Injectable({ providedIn: 'root' })
export class CoreDeviceService {

    /**
     * The device information.
     */
    deviceInfo?: DeviceInfo;

    /**
     * The device id.
     */
    deviceId?: DeviceId;

    /**
     * Load the device information and id.
     */
    async initialize(): Promise<void> {
        try {
            await this.getInfo();
        } catch {
            // Ignore errors.
        }

        try {
            await this.getId();
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Proxy of getInfo method of Device plugin.
     *
     * @returns Promise with device information.
     */
    async getInfo(): Promise<DeviceInfo> {
        if (this.deviceInfo) {
            return this.deviceInfo;
        }

        this.deviceInfo = await DeviceService.getInfo();

        return this.deviceInfo;
    }

    /**
     * Proxy of getId method of Device plugin.
     *
     * @returns Promise with device identifier.
     */
    async getId(): Promise<DeviceId> {
        if (this.deviceId) {
            return this.deviceId;
        }

        this.deviceId = await DeviceService.getId();

        return this.deviceId;
    }

}

export const CoreDevice = makeSingleton(CoreDeviceService);
