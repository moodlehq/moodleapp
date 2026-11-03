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

import { CoreConstants } from '@/core/constants';
import { Injectable } from '@angular/core';
import { ActivityAction, IntentLauncher, IOSSettings } from '@capgo/capacitor-intent-launcher';
import { CorePlatform } from '@services/platform';
import { makeSingleton } from '@singletons';

/**
 * Service to launch native intents on the device.
 */
@Injectable({ providedIn: 'root' })
export class IntentLauncherService {

    /**
     * Starts a view activity with the specified options.
     *
     * @param options ViewActivityIntent containing the data and type for the activity to be started.
     */
    async startViewActivity(options: ViewActivityIntent): Promise<void> {
        if (!CorePlatform.isAndroid()) {
            return;
        }

        await IntentLauncher.startActivityAsync({ data: options.data, type: options.type, action: ActivityAction.VIEW });
    }

    /**
     * Opens the native app settings of the device.
     */
    async openNativeAppSettings(): Promise<void> {
        if (!CorePlatform.isMobile()) {
            return;
        }

        if (CorePlatform.isIOS()) {
            await IntentLauncher.openIOSSettings({ option: IOSSettings.App });
        } else {
            await IntentLauncher.startActivityAsync({
                action: ActivityAction.APPLICATION_DETAILS_SETTINGS,
                data: 'package:' + CoreConstants.CONFIG.app_id,
            });
        }
    }

}
export const CoreIntentLauncher = makeSingleton(IntentLauncherService);

/**
 * Options for IntentLauncher.startActivity.
 */
type ViewActivityIntent = {
    data?: string;
    type?: string;
};
