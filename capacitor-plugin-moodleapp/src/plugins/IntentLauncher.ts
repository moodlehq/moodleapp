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

const NativeIntentLauncher = registerPlugin<IntentLauncherNativePlugin>('MoodleAppIntentLauncher');

/**
 * Launches Android activities.
 */
export class IntentLauncher {

    /**
     * Start an activity with the action VIEW.
     *
     * @param options Options.
     * @returns Resolves when the activity is started.
     */
    async startViewActivity(options: IntentLauncherViewOptions): Promise<void> {
        return NativeIntentLauncher.startViewActivity(options);
    }

}

type IntentLauncherNativePlugin = {
    startViewActivity(options: IntentLauncherViewOptions): Promise<void>;
};

export type IntentLauncherViewOptions = {
    url: string; // URL to view.
    type?: string; // MIME type of the data.
};
