// (C) Copyright 2015 Martin Dougiamas
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
import { Badge } from '@ionic-native/badge';
import { CoreAppProvider } from '@providers/app';

/**
 * Emulates the Cordova Push plugin in desktop apps and in browser.
 */
@Injectable()
export class BadgeMock implements Badge {

    constructor(private appProvider: CoreAppProvider) {}

    /**
     * Clear the badge of the app icon.
     *
     * @returns {Promise<boolean>}
     */
    clear(): Promise<boolean> {
        return Promise.reject('clear is only supported in mobile devices');
    }

    /**
     * Set the badge of the app icon.
     * @param {number} badgeNumber  The new badge number.
     * @returns {Promise<any>}
     */
    set(badgeNumber: number): Promise<any> {
        if (!this.appProvider.isDesktop()) {
            return Promise.reject('set is not supported in browser');
        }

        try {
            const app = require('electron').remote.app;
            if (app.setBadgeCount(badgeNumber)) {
                return Promise.resolve();
            } else {
                return Promise.reject(null);
            }
        } catch (ex) {
            return Promise.reject(ex);
        }
    }

    /**
     * Get the badge of the app icon.
     *
     * @returns {Promise<any>}
     */
    get(): Promise<any> {
        if (!this.appProvider.isDesktop()) {
            return Promise.reject('get is not supported in browser');
        }

        try {
            const app = require('electron').remote.app;

            return Promise.resolve(app.getBadgeCount());
        } catch (ex) {
            return Promise.reject(ex);
        }
    }

    /**
     * Increase the badge number.
     *
     * @param {number} increaseBy  Count to add to the current badge number
     * @returns {Promise<any>}
     */
    increase(increaseBy: number): Promise<any> {
        return Promise.reject('increase is only supported in mobile devices');
    }

    /**
     * Decrease the badge number.
     *
     * @param {number} decreaseBy  Count to subtract from the current badge number
     * @returns {Promise<any>}
     */
    decrease(decreaseBy: number): Promise<any> {
        return Promise.reject('decrease is only supported in mobile devices');
    }

    /**
     * Check support to show badges.
     *
     * @returns {Promise<any>}
     */
    isSupported(): Promise<any> {
        return Promise.reject('isSupported is only supported in mobile devices');
    }

    /**
     * Determine if the app has permission to show badges.
     *
     * @returns {Promise<any>}
     */
    hasPermission(): Promise<any> {
        return Promise.reject('hasPermission is only supported in mobile devices');
    }

    /**
     * Register permission to set badge notifications
     *
     * @returns {Promise<any>}
     */
    requestPermission(): Promise<any> {
        return Promise.reject('requestPermission is only supported in mobile devices');
    }
}
