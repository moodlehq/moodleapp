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

import { CoreApp } from '@services/app';
import { CoreAnyError, CoreError } from '@classes/errors/error';
import { Geolocation, Diagnostic, makeSingleton } from '@singletons';
import { CoreUtils } from './utils/utils';

@Injectable({ providedIn: 'root' })
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

            const result = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 30000,
            });

            return result.coords;
        } catch (error) {
            if (this.isCordovaPermissionDeniedError(error)) {
                throw new CoreGeolocationError(CoreGeolocationErrorReason.PERMISSION_DENIED);
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
        let locationEnabled = await Diagnostic.isLocationEnabled();

        if (locationEnabled) {
            // Location is enabled.
            return;
        }

        if (!CoreApp.isIOS()) {
            Diagnostic.switchToLocationSettings();
            await CoreApp.waitForResume(30000);

            locationEnabled = await Diagnostic.isLocationEnabled();
        }

        if (!locationEnabled) {
            throw new CoreGeolocationError(CoreGeolocationErrorReason.LOCATION_NOT_ENABLED);
        }
    }

    /**
     * Recursive implementation of authorizeLocation method, protected to avoid exposing the failOnDeniedOnce parameter.
     *
     * @param failOnDeniedOnce Throw an exception if the permission has been denied once.
     * @throws {CoreGeolocationError}
     */
    protected async doAuthorizeLocation(failOnDeniedOnce: boolean = false): Promise<void> {
        const authorizationStatus = await Diagnostic.getLocationAuthorizationStatus();
        switch (authorizationStatus) {
            case Diagnostic.permissionStatus.DENIED_ONCE:
                if (failOnDeniedOnce) {
                    throw new CoreGeolocationError(CoreGeolocationErrorReason.PERMISSION_DENIED);
                }
            // Fall through.
            case Diagnostic.permissionStatus.NOT_REQUESTED:
                await Diagnostic.requestLocationAuthorization();
                await CoreApp.waitForResume(500);
                await this.doAuthorizeLocation(true);

                return;
            case Diagnostic.permissionStatus.GRANTED:
            case Diagnostic.permissionStatus.GRANTED_WHEN_IN_USE:
                // Location is authorized.
                return;
            default:
                throw new CoreGeolocationError(CoreGeolocationErrorReason.PERMISSION_DENIED);
        }
    }

    /**
     * Check whether an error was caused by a PERMISSION_DENIED from the cordova plugin.
     *
     * @param error Error.
     */
    protected isCordovaPermissionDeniedError(error?: CoreAnyError | GeolocationPositionError): boolean {
        return !!error &&
            typeof error == 'object' &&
            'code' in error &&
            'PERMISSION_DENIED' in error &&
            error.code === error.PERMISSION_DENIED;
    }

    /**
     * Prechecks if it can request location services.
     *
     * @return If location can be requested.
     */
    async canRequest(): Promise<boolean> {
        return CoreUtils.promiseWorks(Diagnostic.getLocationAuthorizationStatus());
    }

}

export const CoreGeolocation = makeSingleton(CoreGeolocationProvider);

export enum CoreGeolocationErrorReason {
    PERMISSION_DENIED = 'permission-denied',
    LOCATION_NOT_ENABLED = 'location-not-enabled',
}

export class CoreGeolocationError extends CoreError {

    reason: CoreGeolocationErrorReason;

    constructor(reason: CoreGeolocationErrorReason) {
        super(`GeolocationError: ${reason}`);

        this.reason = reason;
    }

}

/**
 * Imported interface type from Web api.
 * https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError
 */
interface GeolocationPositionError {
    code: number;
    message: string;
    PERMISSION_DENIED: number; // eslint-disable-line @typescript-eslint/naming-convention
    POSITION_UNAVAILABLE: number; // eslint-disable-line @typescript-eslint/naming-convention
    TIMEOUT: number; // eslint-disable-line @typescript-eslint/naming-convention
};
