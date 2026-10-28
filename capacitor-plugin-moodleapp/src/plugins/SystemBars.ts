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

const SystemBarsPlugin = registerPlugin<SystemBarsPlugin>('MoodleAppSystemBars');

/**
 * Legacy Android navigation bar backgrounds, complementing Capacitor SystemBars.
 */
export class SystemBars {

    /**
     * Apply a native background on Android API 26-34.
     *
     * @param options Opaque hexadecimal background colour.
     * @param options.color Background colour in #RRGGBB format.
     * @returns Whether the OS supports applying a native navigation bar colour.
     */
    setNavigationBarColor(options: { color: string }): Promise<{ applied: boolean }> {
        return SystemBarsPlugin.setNavigationBarColor(options);
    }

}

type SystemBarsPlugin = {
    setNavigationBarColor(options: { color: string }): Promise<{ applied: boolean }>;
};
