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

    // overlaysWebView(true) doesn't seem to do anything with cordova-android 15+ because Cordova applies margins to the WebView
    // from system bar insets in Android 14- (see setOnApplyWindowInsetsListener in CordovaActivity.java). However, a bug was
    // reported when using overlaysWebView(false) in Android 7 and 8, so set it to true just in case.
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

        // Update the CSS variable with the keyboard height.
        // On iOS, the variable is updated in the forked Cordova keyboard plugin.
        rootStyle.setProperty('--keyboard-height', `${keyboardHeight}px`);
    };

    systemInsetListener.addListener(update);
    imeInsetListener.addListener(update);
}
