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
import { CoreNetwork } from '@services/network';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CorePlatform } from '@services/platform';

/**
 * Apply the network connection mode forced from the developer options (development and testing builds only).
 */
export default async function(): Promise<void> {
    if (!CoreConstants.isDevOrTestingBuild()) {
        return;
    }

    const mode = await CoreNetwork.restoreForcedConnectionMode();
    if (!mode) {
        return;
    }

    // Don't block the app start while waiting to show the reminder.
    showReminder(mode);
}

/**
 * Show a reminder that the network connection mode is forced.
 *
 * @param mode Forced connection mode.
 */
async function showReminder(mode: string): Promise<void> {
    await CorePlatform.ready();

    await CoreToasts.show({
        message: `Developer option: network connection forced to ${mode}`,
        duration: ToastDuration.LONG,
    });
}
