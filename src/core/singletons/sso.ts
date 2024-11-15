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

import { CorePromisedValue } from '@classes/promised-value';

/**
 * Singleton with helper functions for Single Sign On.
 */
export class CoreSSO {

    private static ssoAuthenticationDeferred?: CorePromisedValue<void>;

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Start an SSO authentication process.
     * Please notice that this function should be called when the app receives the new token from the browser,
     * NOT when the browser is opened.
     */
    static startSSOAuthentication(): void {
        CoreSSO.ssoAuthenticationDeferred = new CorePromisedValue();

        // Resolve it automatically after 10 seconds (it should never take that long).
        const cancelTimeout = setTimeout(() => CoreSSO.finishSSOAuthentication(), 10000);

        // If the promise is resolved because finishSSOAuthentication is called, stop the cancel promise.
        // eslint-disable-next-line promise/catch-or-return
        CoreSSO.ssoAuthenticationDeferred.then(() => clearTimeout(cancelTimeout));
    }

    /**
     * Finish an SSO authentication process.
     */
    static finishSSOAuthentication(): void {
        if (!CoreSSO.ssoAuthenticationDeferred) {
            return;
        }

        CoreSSO.ssoAuthenticationDeferred.resolve();
        CoreSSO.ssoAuthenticationDeferred = undefined;
    }

    /**
     * Check if there's an ongoing SSO authentication process.
     *
     * @returns Whether there's a SSO authentication ongoing.
     */
    static isSSOAuthenticationOngoing(): boolean {
        return !!CoreSSO.ssoAuthenticationDeferred;
    }

    /**
     * Returns a promise that will be resolved once SSO authentication finishes.
     *
     * @returns Promise resolved once SSO authentication finishes.
     */
    static async waitForSSOAuthentication(): Promise<void> {
        await CoreSSO.ssoAuthenticationDeferred;
    }

}
