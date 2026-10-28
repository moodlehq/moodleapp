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
import { cordova } from '@awesome-cordova-plugins/core';
import { StatusBar as StatusBarService } from '@awesome-cordova-plugins/status-bar/ngx';
import { makeSingleton } from '@singletons';

const CordovaStatusBar = makeSingleton(StatusBarService);

/**
 * Service wrapping the Moodle Cordova StatusBar fork.
 */
@Injectable({ providedIn: 'root' })
export class StatusBar {

    /**
     * Whether the status bar is currently visible.
     *
     * @returns Visibility reported by the Cordova plugin.
     */
    get isVisible(): boolean {
        return CordovaStatusBar.isVisible;
    }

    set isVisible(visible: boolean) {
        CordovaStatusBar.isVisible = visible;
    }

    /**
     * Set whether the status bar overlays the WebView.
     *
     * @param doesOverlay Whether the status bar overlays the WebView.
     */
    overlaysWebView(doesOverlay: boolean): void {
        CordovaStatusBar.overlaysWebView(doesOverlay);
    }

    /**
     * Use dark status bar text on a light background.
     */
    styleDefault(): void {
        CordovaStatusBar.styleDefault();
    }

    /**
     * Use light status bar text on a dark background.
     */
    styleLightContent(): void {
        CordovaStatusBar.styleLightContent();
    }

    /**
     * Set the status bar background using a Cordova colour name.
     *
     * @param colorName Background colour name.
     */
    backgroundColorByName(colorName: string): void {
        CordovaStatusBar.backgroundColorByName(colorName);
    }

    /**
     * Set the status bar background colour and contrasting text style.
     *
     * @param hexString Background colour, including CSS hexadecimal shorthand.
     */
    backgroundColorByHexString(hexString: string): void {
        CordovaStatusBar.backgroundColorByHexString(hexString);
    }

    /**
     * Set the Android navigation bar background colour and contrasting icon style.
     *
     * @param hexString Background colour, including CSS hexadecimal shorthand.
     */
    navigationBackgroundColorByHexString(hexString: string): void {
        cordova(CordovaStatusBar, 'navigationBackgroundColorByHexString', { sync: true }, [hexString]);
    }

    /**
     * Hide the status bar, including the navigation bar on Android.
     */
    hide(): void {
        CordovaStatusBar.hide();
    }

    /**
     * Show the status bar, including the navigation bar on Android.
     */
    show(): void {
        CordovaStatusBar.show();
    }

}
export const CoreNativeStatusBar = makeSingleton(StatusBar);
