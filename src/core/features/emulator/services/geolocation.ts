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
import { Translate } from '@singletons';
import { CoreUrl } from '@singletons/url';

/**
 * Emulates the Cordova Geolocation plugin in desktop apps and in browser.
 *
 * @deprecated since 5.0. Geo location is no longer available in the app.
 */
@Injectable()
export class Geolocation {

    /**
     * Get the device's current position.
     *
     * @deprecated since 5.0. Geo location is no longer available in the app.
     */
    async getCurrentPosition(): Promise<void> {
        throw new CoreError(Translate.instant('core.locationnolongeravailable', {
            howToObtain: Translate.instant('core.howtoobtaincoordinates', {
                url: CoreUrl.buildMapsURL(),
            }),
        }));
    }

    /**
     * Watch the current device's position. Clear the watch by unsubscribing from
     * Observable changes.
     *
     * @deprecated since 5.0. Geo location is no longer available in the app.
     */
    watchPosition(): void {
        throw new CoreError(Translate.instant('core.locationnolongeravailable', {
            howToObtain: Translate.instant('core.howtoobtaincoordinates', {
                url: CoreUrl.buildMapsURL(),
            }),
        }));
    }

}
