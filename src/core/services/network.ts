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
import { CorePlatform } from '@services/platform';
import { makeSingleton, Network } from '@singletons';

/**
 * Service to manage network information.
 */
@Injectable({ providedIn: 'root' })
export class CoreNetworkService {

    protected forceOffline = false;

    /**
     * Set value of forceOffline flag. If true, the app will think the device is offline.
     *
     * @param value Value to set.
     */
    setForceOffline(value: boolean): void {
        this.forceOffline = !!value;
    }

    /**
     * Returns whether we are online.
     *
     * @return Whether the app is online.
     */
    isOnline(): boolean {
        if (this.forceOffline) {
            return false;
        }

        if (!CorePlatform.isMobile()) {
            return navigator.onLine;
        }

        let online = Network.type !== null && Network.type != Network.Connection.NONE &&
            Network.type != Network.Connection.UNKNOWN;

        // Double check we are not online because we cannot rely 100% in Cordova APIs.
        if (!online && navigator.onLine) {
            online = true;
        }

        return online;
    }

    /**
     * Check if device uses a limited connection.
     *
     * @return Whether the device uses a limited connection.
     */
    isNetworkAccessLimited(): boolean {
        if (!CorePlatform.isMobile()) {
            return false;
        }

        const limited = [
            Network.Connection.CELL_2G,
            Network.Connection.CELL_3G,
            Network.Connection.CELL_4G,
            Network.Connection.CELL,
        ];

        return limited.indexOf(Network.type) > -1;
    }

    /**
     * Check if device uses a wifi connection.
     *
     * @return Whether the device uses a wifi connection.
     */
    isWifi(): boolean {
        return this.isOnline() && !this.isNetworkAccessLimited();
    }

}

export const CoreNetwork = makeSingleton(CoreNetworkService);
