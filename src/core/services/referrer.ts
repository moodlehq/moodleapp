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
import { makeSingleton } from '@singletons';
import { CoreConfig } from './config';
import { CoreNative } from '@features/native/services/native';

/**
 * Manage referrers.
 */
@Injectable({ providedIn: 'root' })
export class CoreReferrerService {

    protected static readonly INSTALL_REFERRER_CONSUMED = 'install_referrer_consumed';

    /**
     * Consume the install referrer URL (Android only).
     * This function will try to retrieve the siteurl supplied as referrer to Google Play.
     *
     * @returns Referrer URL, undefined if not supported, already consumed or no referrer URL.
     */
    async consumeInstallReferrerUrl(): Promise<string | undefined> {
        const installReferrerPlugin = CoreNative.plugin('installReferrer');
        if (!installReferrerPlugin) {
            return;
        }

        // Only get the referrer URL once, it's only needed when the app is installed.
        const referredConsumed = await CoreConfig.get(CoreReferrerService.INSTALL_REFERRER_CONSUMED, 0);
        if (referredConsumed) {
            return;
        }

        try {
            const result = await installReferrerPlugin.getReferrer();

            const siteUrlMatch = (result.referrer ?? '').match(/siteurl=([^&]+)/);

            return siteUrlMatch?.[1];
        } catch {
            // Error getting referrer, it probably means Google Play is not available.
        } finally {
            await CoreConfig.set(CoreReferrerService.INSTALL_REFERRER_CONSUMED, 1);
        }
    }

}

export const CoreReferrer = makeSingleton(CoreReferrerService);
