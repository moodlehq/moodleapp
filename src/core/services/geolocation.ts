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
import { CoreError } from '@classes/errors/error';
import { makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreUrl } from '@singletons/url';

/**
 * @deprecated since 5.0. Geo location is no longer available in the app.
 */
@Injectable({ providedIn: 'root' })
export class CoreGeolocationProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreGeolocationProvider');
    }

    /**
     * Get current user coordinates.
     *
     * @throws {CoreGeolocationError}
     * @returns Promise resolved with the geolocation coordinates.
     * @deprecated since 5.0. Geo location is no longer available in the app.
     */
    async getCoordinates(): Promise<void> {
        throw new CoreError(Translate.instant('core.locationnolongeravailable', {
            howToObtain: Translate.instant('core.howtoobtaincoordinates', {
                url: CoreUrl.buildMapsURL(),
            }),
        }));
    }

    /**
     * Make sure that using device location has been authorized and ask for permission if it hasn't.
     *
     * @deprecated since 5.0. Geo location is no longer available in the app.
     */
    async authorizeLocation(): Promise<void> {
        return;
    }

    /**
     * Make sure that location is enabled and open settings to enable it if necessary.
     *
     * @deprecated since 5.0. Geo location is no longer available in the app.
     */
    async enableLocation(): Promise<void> {
        return;
    }

    /**
     * Prechecks if it can request location services.
     *
     * @returns If location can be requested.
     * @deprecated since 5.0. Geo location is no longer available in the app.
     */
    async canRequest(): Promise<boolean> {
        return false;
    }

}

/**
 * @deprecated since 5.0. Geo location is no longer available in the app.
 */
export const CoreGeolocation = makeSingleton(CoreGeolocationProvider); // eslint-disable-line @typescript-eslint/no-deprecated

/**
 * @deprecated since 5.0. Geo location is no longer available in the app.
 */
export enum CoreGeolocationErrorReason {
    PERMISSION_DENIED = 'permission-denied',
    LOCATION_NOT_ENABLED = 'location-not-enabled',
}

/**
 * @deprecated since 5.0. Geo location is no longer available in the app.
 */
export class CoreGeolocationError extends CoreError {

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    reason: CoreGeolocationErrorReason;

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    constructor(reason: CoreGeolocationErrorReason) {
        super(`GeolocationError: ${reason}`);

        this.reason = reason;
    }

}
