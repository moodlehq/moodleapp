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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CorePushNotifications } from '@features/pushnotifications/services/pushnotifications';
import { AddonMessageOutputAirnotifier, AddonMessageOutputAirnotifierDevice } from '../../services/airnotifier';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the list of devices.
 */
@Component({
    selector: 'page-addon-message-output-airnotifier-devices',
    templateUrl: 'devices.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonMessageOutputAirnotifierDevicesPage implements OnInit, OnDestroy {

    platformDevices: AddonMessageOutputAirnotifierPlatformDevices[] = [];
    loaded = false;

    protected updateTimeout?: number;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.fetchDevices();
    }

    /**
     * Fetches the list of devices.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchDevices(): Promise<void> {
        try {
            const devices = await AddonMessageOutputAirnotifier.getUserDevices();
            this.formatDevices(devices);
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Add some calculated data for devices.
     *
     * @param devices Devices to format.
     */
    protected formatDevices(devices: AddonMessageOutputAirnotifierDevice[]): void {
        this.platformDevices = [];

        const formattedDevices: Record<string, AddonMessageOutputAirnotifierPlatformDevices> = {};
        const pushId = CorePushNotifications.getPushId();

        // Convert enabled to boolean and search current device.
        devices.forEach((device: AddonMessageOutputAirnotifierDeviceFormatted) => {
            if (formattedDevices[device.platform] === undefined) {
                formattedDevices[device.platform] = {
                    platform: device.platform,
                    devices: [],
                };
            }

            device.enable = !!device.enable;
            device.current = pushId === device.pushid;

            formattedDevices[device.platform].devices.push(device);

        });

        for (const platform in formattedDevices) {
            const devices = formattedDevices[platform];
            devices.devices.sort((a, b) => b.timemodified - a.timemodified);

            devices.platform = devices.platform.replace('-fcm', '');

            this.platformDevices.push(devices);
        }
    }

    /**
     * Update list of devices after a certain time. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updateDevicesAfterDelay(): void {
        // Cancel pending updates.
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = window.setTimeout(() => {
            this.updateTimeout = undefined;
            this.updateDevices();
        }, 5000);
    }

    /**
     * Fetch devices. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected async updateDevices(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonMessageOutputAirnotifier.invalidateUserDevices());

        await AddonMessageOutputAirnotifier.getUserDevices();
    }

    /**
     * Refresh the list of devices.
     *
     * @param refresher Refresher.
     */
    async refreshDevices(refresher: HTMLIonRefresherElement): Promise<void> {
        try {
            await CorePromiseUtils.ignoreErrors(AddonMessageOutputAirnotifier.invalidateUserDevices());

            await this.fetchDevices();
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Enable or disable a certain device.
     *
     * @param device The device object.
     * @param enable True to enable the device, false to disable it.
     */
    async enableDevice(device: AddonMessageOutputAirnotifierDeviceFormatted, enable: boolean): Promise<void> {
        device.updating = true;

        try {
            await AddonMessageOutputAirnotifier.enableDevice(device.id, enable);

            // Update the list of devices since it was modified.
            this.updateDevicesAfterDelay();
        } catch (error) {
            // Show error and revert change.
            CoreAlerts.showError(error);
            device.enable = !device.enable;
        } finally {
            device.updating = false;
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        // If there is a pending action to update devices, execute it right now.
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateDevices();
        }
    }

}

type AddonMessageOutputAirnotifierPlatformDevices = {
    platform: string;
    devices: AddonMessageOutputAirnotifierDeviceFormatted[];
};

/**
 * User device with some calculated data.
 */
type AddonMessageOutputAirnotifierDeviceFormatted = AddonMessageOutputAirnotifierDevice & {
    current?: boolean; // Calculated in the app. Whether it's the current device.
    updating?: boolean; // Calculated in the app. Whether the device enable is being updated right now.
};
