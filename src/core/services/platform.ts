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
import { Platform } from '@ionic/angular';
import { Device, makeSingleton } from '@singletons';

/**
 * Extend Ionic's Platform service.
 */
@Injectable({ providedIn: 'root' })
export class CorePlatformService extends Platform {

    /**
     * Get platform major version number.
     *
     * @returns The platform major number.
     */
    getPlatformMajorVersion(): number {
        if (!this.isMobile()) {
            return 0;
        }

        return Number(Device.version?.split('.')[0]);
    }

    /**
     * Checks if the app is running in an Android mobile or tablet device.
     *
     * @returns Whether the app is running in an Android mobile or tablet device.
     */
    isAndroid(): boolean {
        return this.isMobile() && this.is('android');
    }

    /**
     * Checks if the app is running in an iOS mobile or tablet device.
     *
     * @returns Whether the app is running in an iOS mobile or tablet device.
     */
    isIOS(): boolean {
        return this.isMobile() && !this.is('android');
    }

    /**
     * Checks if the app is running in an iPad device.
     *
     * @returns Whether the app is running in an iPad device.
     */
    isIPad(): boolean {
        return this.isIOS() && this.is('ipad');
    }

    /**
     * Checks if the app is running in an iPhone device.
     *
     * @returns Whether the app is running in an iPhone device.
     */
    isIPhone(): boolean {
        return this.isIOS() && this.is('iphone');
    }

    /**
     * Checks if the app is running in a mobile or tablet device (Cordova).
     *
     * @returns Whether the app is running in a mobile or tablet device.
     */
    isMobile(): boolean {
        return this.is('cordova');
    }

    /**
     * Check whether the device is configured to reduce motion.
     *
     * @returns Whether the device is configured to reduce motion.
     */
    prefersReducedMotion(): boolean {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Checks whether media capture is supported.
     *
     * @returns Whether media capture is supported.
     */
    supportsMediaCapture(): boolean {
        return 'mediaDevices' in navigator;
    }

    /**
     * Checks whether web assembly is supported.
     *
     * @returns Whether web assembly is supported.
     */
    supportsWebAssembly(): boolean {
        return 'WebAssembly' in window;
    }

}

export const CorePlatform = makeSingleton(CorePlatformService);
