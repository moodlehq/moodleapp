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
export class Device {

    /**
     * Get the version of Cordova running on the device.
     *
     * @deprecated since 6.0. Cordova is not available anymore.
     */
    cordova = 'Cordova is not available anymore.';

    /**
     * The device.model returns the name of the device's model or product. The value is set
     * by the device manufacturer and may be different across versions of the same product.
     *
     * @deprecated since 6.0 Use getInfo().model.
     */
    model = '';

    /**
     * Get the device's operating system name.
     *
     * @deprecated since 6.0 Use getInfo().platform.
     */
    platform = '';

    /**
     * Get the operating system version.
     *
     * @deprecated since 6.0 Use getInfo().osVersion.
     */
    version = '';

    /**
     * Get the device's manufacturer.
     *
     * @deprecated since 6.0 Use getInfo().manufacturer.
     */
    manufacturer = '';

    /**
     * Whether the device is running on a simulator.
     *
     * @deprecated since 6.0 Use getInfo().isVirtual.
     */
    isVirtual = false;

    /**
     * Get the device hardware serial number.
     *
     * @deprecated since 6.0 Use getInfo().serial.
     */
    serial = '';

    /**
     * Get the Android device's SDK version. (Android-only)
     *
     * @deprecated since 6.0 Use getInfo().androidSDKVersion.
     */
    sdkVersion?: string;

    /**
     * Detect if app is running on a macOS desktop with Apple Silicon.
     *
     * @deprecated since 6.0 Use getInfo().operatingSystem and compare to 'mac'.
     */
    isiOSAppOnMac = 'false';

    /**
     * The device information.
     */
    deviceInfo?: DeviceInfo;

    /**
     * The device id.
     */
    deviceId?: DeviceId;

    /**
     * Get the device's Universally Unique Identifier (UUID).
     */
    uuid = '';

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

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.model = this.deviceInfo.model;
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.platform = this.deviceInfo.platform;
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.version = this.deviceInfo.osVersion;
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.manufacturer = this.deviceInfo.manufacturer;
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.isVirtual = this.deviceInfo.isVirtual;
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.sdkVersion = this.deviceInfo.androidSDKVersion?.toString();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.isiOSAppOnMac = (this.deviceInfo.operatingSystem === 'mac').toString();

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
        this.uuid = this.deviceId.identifier;

        return this.deviceId; // Add this line to return the device identifier.
    }

}
export const CoreNativeDevice = makeSingleton(Device);
