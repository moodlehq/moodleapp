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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';
import { AddonMessageOutputAirnotifierProvider, AddonMessageOutputAirnotifierDevice } from '../../providers/airnotifier';

/**
 * Page that displays the list of devices.
 */
@IonicPage({ segment: 'addon-message-output-airnotifier-devices' })
@Component({
    selector: 'page-addon-message-output-airnotifier-devices',
    templateUrl: 'devices.html',
})
export class AddonMessageOutputAirnotifierDevicesPage implements OnDestroy {

    devices: AddonMessageOutputAirnotifierDeviceFormatted[] = [];
    devicesLoaded = false;

    protected updateTimeout: any;

    constructor(private domUtils: CoreDomUtilsProvider, private airnotifierProivder: AddonMessageOutputAirnotifierProvider,
            private pushNotificationsProvider: CorePushNotificationsProvider ) {
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchDevices();
    }

    /**
     * Fetches the list of devices.
     *
     * @return Promise resolved when done.
     */
    protected fetchDevices(): Promise<any> {
        return this.airnotifierProivder.getUserDevices().then((devices) => {
            const pushId = this.pushNotificationsProvider.getPushId();

            // Convert enabled to boolean and search current device.
            devices.forEach((device: AddonMessageOutputAirnotifierDeviceFormatted) => {
                device.enable = !!device.enable;
                device.current = pushId && pushId == device.pushid;
            });

            this.devices = devices;
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            this.devicesLoaded = true;
        });
    }

    /**
     * Update list of devices after a certain time. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updateDevicesAfterDelay(): void {
        // Cancel pending updates.
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = setTimeout(() => {
            this.updateTimeout = null;
            this.updateDevices();
        }, 5000);
    }

    /**
     * Fetch devices. The purpose is to store the updated data, it won't be reflected in the view.
     */
    protected updateDevices(): void {
        this.airnotifierProivder.invalidateUserDevices().finally(() => {
            this.airnotifierProivder.getUserDevices();
        });
    }

    /**
     * Refresh the list of devices.
     *
     * @param refresher Refresher.
     */
    refreshDevices(refresher: any): void {
        this.airnotifierProivder.invalidateUserDevices().finally(() => {
            this.fetchDevices().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Enable or disable a certain device.
     *
     * @param device The device object.
     * @param enable True to enable the device, false to disable it.
     */
    enableDevice(device: AddonMessageOutputAirnotifierDeviceFormatted, enable: boolean): void {
        device.updating = true;

        this.airnotifierProivder.enableDevice(device.id, enable).then(() => {
            // Update the list of devices since it was modified.
            this.updateDevicesAfterDelay();
        }).catch((message) => {
            // Show error and revert change.
            this.domUtils.showErrorModal(message);
            device.enable = !device.enable;
        }).finally(() => {
            device.updating = false;
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        // If there is a pending action to update devices, execute it right now.
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateDevices();
        }
    }
}

/**
 * User device with some calculated data.
 */
type AddonMessageOutputAirnotifierDeviceFormatted = AddonMessageOutputAirnotifierDevice & {
    current?: boolean; // Calculated in the app. Whether it's the current device.
    updating?: boolean; // Calculated in the app. Whether the device enable is being updated right now.
};
