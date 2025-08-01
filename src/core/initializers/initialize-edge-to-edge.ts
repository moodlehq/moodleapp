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

import { CorePlatform } from '@services/platform';
import { StatusBar } from '@singletons';
import { Inset, InsetMask } from '@totalpave/cordova-plugin-insets';

/**
 * Enables edge-to-edge support on Android.
 */
export default async function(): Promise<void> {
    await CorePlatform.ready();

    if (!CorePlatform.isAndroid()) {
        return;
    }

    // Enable edge-to-edge. Required on Android 14 and previous versions.
    StatusBar.overlaysWebView(true);

    // Listener for system bars and cutout inset changes.
    const systemInsetListener = await Inset.create({
        // eslint-disable-next-line no-bitwise
        mask: InsetMask.SYSTEM_BARS | InsetMask.DISPLAY_CUTOUT,
        includeRoundedCorners: false,
    });

    // Listener for keyboard height changes.
    // We need to update safe area and keyboard height CSS variables at the same time.
    const imeInsetListener = await Inset.create({
        mask: InsetMask.IME,
        includeRoundedCorners: false,
    });

    const update = () => {
        const insets = systemInsetListener.getInset();
        const keyboardHeight = imeInsetListener.getInset().bottom;

        // Update safe area CSS variables.
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--ion-safe-area-left', `${insets.left}px`);
        rootStyle.setProperty('--ion-safe-area-right', `${insets.right}px`);
        rootStyle.setProperty('--ion-safe-area-top', `${insets.top}px`);
        rootStyle.setProperty('--ion-safe-area-bottom', `${keyboardHeight > 0 ? 0 : insets.bottom}px`);

        // Update the CSS variable with the kebyoard height.
        // On iOS, the variable is updated in the forked Cordova keyboard plugin.
        rootStyle.setProperty('--keyboard-height', `${keyboardHeight}px`);
    };

    systemInsetListener.addListener(update);
    imeInsetListener.addListener(update);
}
