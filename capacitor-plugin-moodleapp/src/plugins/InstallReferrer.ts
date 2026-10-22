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

import { registerPlugin } from '@capacitor/core';

const NativeInstallReferrer = registerPlugin<InstallReferrerNativePlugin>('MoodleAppInstallReferrer');

/**
 * Allows retrieving install referrer data.
 * https://developer.android.com/google/play/installreferrer
 */
export class InstallReferrer {

    /**
     * Get referrer data.
     *
     * @returns Referrer data.
     */
    async getReferrer(): Promise<InstallReferrerResult> {
        return NativeInstallReferrer.getReferrer();
    }

}

type InstallReferrerNativePlugin = {
    getReferrer(): Promise<InstallReferrerResult>;
};

export type InstallReferrerResult = {
    referrer: string;
    clickTime: number;
    appInstallTime: number;
    instantExperienceLaunched: boolean;
};
