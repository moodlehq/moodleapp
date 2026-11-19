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
import type { DeviceId, DeviceInfo } from '@capacitor/device';
import { CoreDevice } from '@services/native/device';

/**
 * Device plugin wrapper to keep the Cordova API working in site plugins.
 *
 * @deprecated since 6.0. Use CoreDevice instead.
 */
@Injectable({ providedIn: 'root' })
export class Device {

    /**
     * Get the version of Cordova running on the device.
     */
    cordova = 'Cordova is not available anymore.';

    /**
     * The device.model returns the name of the device's model or product. The value is set
     * by the device manufacturer and may be different across versions of the same product.
     *
     * @returns Device model.
     */
    get model(): string {
        return CoreDevice.deviceInfo?.model ?? '';
    }

    /**
     * Get the device's operating system name.
     *
     * @returns Platform name.
     */
    get platform(): string {
        return CoreDevice.deviceInfo?.platform ?? '';
    }

    /**
     * Get the operating system version.
     *
     * @returns OS version.
     */
    get version(): string {
        return CoreDevice.deviceInfo?.osVersion ?? '';
    }

    /**
     * Get the device's manufacturer.
     *
     * @returns Manufacturer.
     */
    get manufacturer(): string {
        return CoreDevice.deviceInfo?.manufacturer ?? '';
    }

    /**
     * Whether the device is running on a simulator.
     *
     * @returns Whether the device is virtual.
     */
    get isVirtual(): boolean {
        return CoreDevice.deviceInfo?.isVirtual ?? false;
    }

    /**
     * Get the device hardware serial number.
     *
     */
    serial = '';

    /**
     * Get the Android device's SDK version. (Android-only)
     *
     * @returns Android SDK version.
     */
    get sdkVersion(): string | undefined {
        return CoreDevice.deviceInfo?.androidSDKVersion?.toString();
    }

    /**
     * Detect if app is running on a macOS desktop with Apple Silicon.
     *
     * @returns 'true' if running as an iOS app on macOS, 'false' otherwise.
     */
    get isiOSAppOnMac(): string {
        return (CoreDevice.deviceInfo?.operatingSystem === 'mac').toString();
    }

    /**
     * The device information.
     *
     * @returns Device information.
     */
    get deviceInfo(): DeviceInfo | undefined {
        return CoreDevice.deviceInfo;
    }

    /**
     * The device id.
     *
     * @returns Device id.
     */
    get deviceId(): DeviceId | undefined {
        return CoreDevice.deviceId;
    }

    /**
     * Get the device's Universally Unique Identifier (UUID).
     *
     * @returns Device UUID.
     */
    get uuid(): string {
        return CoreDevice.deviceId?.identifier ?? '';
    }

    /**
     * Proxy of getInfo method of Device plugin.
     *
     * @returns Promise with device information.
     */
    async getInfo(): Promise<DeviceInfo> {
        return await CoreDevice.getInfo();
    }

    /**
     * Proxy of getId method of Device plugin.
     *
     * @returns Promise with device identifier.
     */
    async getId(): Promise<DeviceId> {
        return await CoreDevice.getId();
    }

}
