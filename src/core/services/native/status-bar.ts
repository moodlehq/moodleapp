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
import { SystemBars as CapacitorSystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';
import { makeSingleton } from '@singletons';
import { CorePlatform } from '@services/platform';
import { CoreColors } from '@static/colors';
import { CoreLogger } from '@static/logger';

/**
 * Controls edge-to-edge system bar icon styles and visibility.
 */
@Injectable({ providedIn: 'root' })
export class StatusBar {

    protected logger = CoreLogger.getInstance('CoreNativeStatusBar');
    protected statusStyle?: SystemBarsStyle;
    protected navigationStyle?: SystemBarsStyle;
    protected initialized = false;

    /**
     * Restore app-specific icon styles after resuming the app.
     */
    initialize(): void {
        if (this.initialized || !CorePlatform.isMobile()) {
            return;
        }

        this.initialized = true;

        CorePlatform.resume.subscribe(async () => {
            if (this.statusStyle) {
                try {
                    await CapacitorSystemBars.setStyle({ style: this.statusStyle, bar: SystemBarType.StatusBar });
                } catch (error) {
                    this.logger.error('Could not restore status bar appearance', error);
                }
            }
            if (this.navigationStyle && CorePlatform.isAndroid()) {
                try {
                    await CapacitorSystemBars.setStyle({ style: this.navigationStyle, bar: SystemBarType.NavigationBar });
                } catch (error) {
                    this.logger.error('Could not restore navigation bar appearance', error);
                }
            }
        });
    }

    /**
     * Set the status bar text style to contrast with the supplied background colour.
     *
     * @param color Background colour in any supported CSS format.
     */
    async setStatusBarColor(color: string): Promise<void> {
        if (!CorePlatform.isMobile()) {
            return;
        }

        const style = this.getStyle(color);
        await CapacitorSystemBars.setStyle({ style, bar: SystemBarType.StatusBar });
        this.statusStyle = style;
    }

    /**
     * Set the Android navigation bar icon style to contrast with the supplied background colour.
     *
     * @param color Background colour in any supported CSS format.
     */
    async setNavigationBarColor(color: string): Promise<void> {
        if (!CorePlatform.isAndroid()) {
            return;
        }

        const style = this.getStyle(color);
        await CapacitorSystemBars.setStyle({ style, bar: SystemBarType.NavigationBar });
        this.navigationStyle = style;
    }

    /**
     * Hide the system bars, including the home indicator on iOS.
     */
    async hide(): Promise<void> {
        if (!CorePlatform.isMobile()) {
            return;
        }

        await CapacitorSystemBars.hide();
    }

    /**
     * Show the system bars, including the home indicator on iOS.
     */
    async show(): Promise<void> {
        if (!CorePlatform.isMobile()) {
            return;
        }

        await CapacitorSystemBars.show();
    }

    /**
     * Preserve the fork's platform-specific contrast thresholds.
     *
     * @param color Background colour in any supported CSS format.
     * @returns Background theme used by Capacitor to select contrasting icons.
     */
    protected getStyle(color: string): SystemBarsStyle {
        const cssColor = /^(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(color) ? `#${color}` : color;
        const rgba = CoreColors.getColorRGBA(cssColor);
        if (rgba.length < 3) {
            throw new Error(`Invalid system bar colour: ${color}`);
        }

        // Preserve the existing white background used when blending translucent colours.
        // Computed CSS colours can round alpha, changing the contrast at the threshold.
        const alpha = /^#[\da-f]{8}$/i.test(cssColor) ? parseInt(cssColor.slice(-2), 16) / 255 : rgba[3] ?? 1;
        const [red, green, blue] = rgba.slice(0, 3)
            .map(component => Math.round(component * alpha + 255 * (1 - alpha)) / 255);
        const linear = (component: number) => component <= 0.04045
            ? component / 12.92
            : ((component + 0.055) / 1.055) ** 2.4;
        const brightness = CorePlatform.isAndroid()
            ? 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
            : (299 * red + 587 * green + 114 * blue) / 1000;

        return brightness < 0.5 ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
    }

}
export const CoreNativeStatusBar = makeSingleton(StatusBar);
