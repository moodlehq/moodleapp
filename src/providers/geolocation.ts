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
import { Coordinates } from '@ionic-native/geolocation';
import { CoreApp } from '@providers/app';
import { Geolocation, Diagnostic, makeSingleton } from '@singletons/core.singletons';
import { CoreError } from '@classes/error';

export enum CoreGeolocationErrorReason {
    PermissionDenied = 'permission-denied',
    LocationNotEnabled = 'location-not-enabled',
}

export class CoreGeolocationError extends CoreError {

    readonly reason: CoreGeolocationErrorReason;

    constructor(reason: CoreGeolocationErrorReason) {
        super(`GeolocationError: ${reason}`);

        this.reason = reason;
    }

}

@Injectable()
export class CoreGeolocationProvider {

    /**
     * Get current user coordinates.
     *
     * @throws {CoreGeolocationError}
     */
    async getCoordinates(): Promise<Coordinates> {
        try {
            await this.authorizeLocation();
            await this.enableLocation();

            const result = await Geolocation.instance.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 30000,
            });

            return result.coords;
        } catch (error) {
            if (this.isCordovaPermissionDeniedError(error)) {
                throw new CoreGeolocationError(CoreGeolocationErrorReason.PermissionDenied);
            }

            throw error;
        }
    }

    /**
     * Make sure that using device location has been authorized and ask for permission if it hasn't.
     *
     * @throws {CoreGeolocationError}
     */
    async authorizeLocation(): Promise<void> {
        await this.doAuthorizeLocation();
    }

    /**
     * Make sure that location is enabled and open settings to enable it if necessary.
     *
     * @throws {CoreGeolocationError}
     */
    async enableLocation(): Promise<void> {
        let locationEnabled = await Diagnostic.instance.isLocationEnabled();

        if (locationEnabled) {
            // Location is enabled.
            return;
        }

        if (!CoreApp.instance.isIOS()) {
            await Diagnostic.instance.switchToLocationSettings();
            await CoreApp.instance.waitForResume(30000);

            locationEnabled = await Diagnostic.instance.isLocationEnabled();
        }

        if (!locationEnabled) {
            throw new CoreGeolocationError(CoreGeolocationErrorReason.LocationNotEnabled);
        }
    }

    /**
     * Recursive implementation of authorizeLocation method, protected to avoid exposing the failOnDeniedOnce parameter.
     *
     * @param failOnDeniedOnce Throw an exception if the permission has been denied once.
     * @throws {CoreGeolocationError}
     */
    protected async doAuthorizeLocation(failOnDeniedOnce: boolean = false): Promise<void> {
        const authorizationStatus = await Diagnostic.instance.getLocationAuthorizationStatus();

        switch (authorizationStatus) {
            // This constant is hard-coded because it is not declared in @ionic-native/diagnostic v4.
            case 'DENIED_ONCE':
                if (failOnDeniedOnce) {
                    throw new CoreGeolocationError(CoreGeolocationErrorReason.PermissionDenied);
                }
            // Fall through.
            case Diagnostic.instance.permissionStatus.NOT_REQUESTED:
                await Diagnostic.instance.requestLocationAuthorization();
                await CoreApp.instance.waitForResume(500);
                await this.doAuthorizeLocation(true);

                return;
            case Diagnostic.instance.permissionStatus.GRANTED:
            case Diagnostic.instance.permissionStatus.GRANTED_WHEN_IN_USE:
                // Location is authorized.
                return;
            case Diagnostic.instance.permissionStatus.DENIED:
            default:
                throw new CoreGeolocationError(CoreGeolocationErrorReason.PermissionDenied);
        }
    }

    /**
     * Check whether an error was caused by a PERMISSION_DENIED from the cordova plugin.
     *
     * @param error Error.
     */
    protected isCordovaPermissionDeniedError(error?: any): boolean {
        return error && 'code' in error && 'PERMISSION_DENIED' in error && error.code === error.PERMISSION_DENIED;
    }

}

export class CoreGeolocation extends makeSingleton(CoreGeolocationProvider) {}
