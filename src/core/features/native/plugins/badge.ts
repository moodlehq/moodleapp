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
import { Badge as CapacitorBadge } from '@capawesome/capacitor-badge';

/**
 * Badge plugin wrapper.
 *
 * @deprecated since 6.0. Directly managed by CoreAppBadge.
 */
@Injectable({ providedIn: 'root' })
export class Badge {

    /**
     * Clear the badge of the app icon.
     *
     * @returns true.
     */
    async clear(): Promise<boolean> {
        await CapacitorBadge.clear();

        return true;
    }

    /**
     * Set the badge of the app icon.
     *
     * @param badgeNumber  The new badge number.
     * @returns Number set as the new badge number.
     */
    async set(badgeNumber: number): Promise<number>{
        await CapacitorBadge.set({ count: badgeNumber });

        return badgeNumber;
    }

    /**
     * Get the badge of the app icon.
     *
     * @returns Number representing the current badge count.
     */
    async get(): Promise<number>{
        return (await CapacitorBadge.get()).count;
    }

    /**
     * Increase the badge number.
     *
     * @param increaseBy  Count to add to the current badge number
     * @returns Number set as the new badge number.
     */
    async increase(increaseBy = 1): Promise<number>{
        const currentCount = await this.get();
        await CapacitorBadge.set({ count: currentCount + increaseBy });

        return currentCount + increaseBy;
    }

    /**
     * Decrease the badge number.
     *
     * @param decreaseBy  Count to subtract from the current badge number
     * @returns Number set as the new badge number.
     */
    async decrease(decreaseBy = 1): Promise<number>{
        const currentCount = await this.get();
        const nextCount = Math.max(0, currentCount - decreaseBy);
        await CapacitorBadge.set({ count: nextCount });

        return nextCount;
    }

    /**
     * Check support to show badges.
     *
     * @returns Promise resolving to a boolean indicating if badges are supported.
     */
    async isSupported(): Promise<boolean>{
        return (await CapacitorBadge.isSupported()).isSupported;
    }

    /**
     * Determine if the app has permission to show badges.
     *
     * @returns Promise resolving to the permission status.
     */
    async hasPermission(): Promise<boolean>{
        return (await CapacitorBadge.checkPermissions()).display === 'granted';
    }

    /**
     * Register permission to set badge notifications
     *
     * @returns Promise resolving when the permission request has been completed.
     */
    async requestPermission(): Promise<boolean>{
        return (await CapacitorBadge.requestPermissions()).display === 'granted';
    }

}
