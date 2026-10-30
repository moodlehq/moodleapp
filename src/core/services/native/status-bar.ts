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
import { MoodleAppCapacitorPlugins } from 'capacitor-plugin-moodleapp';

/**
 * Controls edge-to-edge system bars while retaining the legacy StatusBar API.
 */
@Injectable({ providedIn: 'root' })
export class StatusBar {

    protected logger = CoreLogger.getInstance('CoreNativeStatusBar');
    protected pending: Promise<void> = Promise.resolve();
    protected statusStyle?: SystemBarsStyle;
    protected navigationStyle?: SystemBarsStyle;
    protected statusColor?: string;
    protected navigationColor?: string;
    protected initialized = false;

    /**
     * Restore app-specific icon styles after resuming the app.
     */
    initialize(): void {
        if (this.initialized || !CorePlatform.isMobile()) {
            return;
        }

        this.initialized = true;
        document.body.classList.add('core-native-system-bars');

        if (!CorePlatform.isMobile()) {
            return;
        }

        CorePlatform.resume.subscribe(() => {
            this.enqueue('restore appearance', async () => {
                if (this.statusStyle) {
                    await CapacitorSystemBars.setStyle({ style: this.statusStyle, bar: SystemBarType.StatusBar });
                }
                if (this.navigationStyle && CorePlatform.isAndroid()) {
                    await CapacitorSystemBars.setStyle({ style: this.navigationStyle, bar: SystemBarType.NavigationBar });
                }
                if (this.navigationColor && CorePlatform.isAndroid()) {
                    await MoodleAppCapacitorPlugins.systemBars.setNavigationBarColor({ color: this.navigationColor });
                }
            });
        });
    }

    /**
     * Set the status bar background colour and contrasting text style.
     *
     * @param hexString Background colour, including CSS hexadecimal shorthand.
     */
    setStatusBarColor(hexString: string): void {
        this.enqueue('set status bar background', async () => {
            const color = this.normalizeColor(hexString);
            if (color === this.statusColor) {
                return;
            }

            document.documentElement.style.setProperty('--core-status-bar-background', color);
            await this.setStatusStyle(this.getStyle(color));
            this.statusColor = color;
        });
    }

    /**
     * Set the Android navigation bar background colour and contrasting icon style.
     *
     * @param hexString Background colour, including CSS hexadecimal shorthand.
     */
    setNavigationBarColor(hexString: string): void {
        if (!CorePlatform.isAndroid()) {
            return;
        }

        this.enqueue('set navigation bar background', async () => {
            const color = this.normalizeColor(hexString);
            if (color === this.navigationColor) {
                return;
            }

            document.documentElement.style.setProperty('--core-navigation-bar-background', color);
            await MoodleAppCapacitorPlugins.systemBars.setNavigationBarColor({ color });
            const style = this.getStyle(color);
            await CapacitorSystemBars.setStyle({ style, bar: SystemBarType.NavigationBar });
            this.navigationStyle = style;
            this.navigationColor = color;
        });
    }

    /**
     * Hide the status bar, including the navigation bar on Android.
     */
    hide(): void {
        this.enqueue('hide system bars', async () => {
            await CapacitorSystemBars.hide(CorePlatform.isAndroid() ? undefined : { bar: SystemBarType.StatusBar });
            document.body.classList.add('core-status-bar-hidden');
        });
    }

    /**
     * Show the status bar, including the navigation bar on Android.
     */
    show(): void {
        this.enqueue('show system bars', async () => {
            await CapacitorSystemBars.show(CorePlatform.isAndroid() ? undefined : { bar: SystemBarType.StatusBar });
            document.body.classList.remove('core-status-bar-hidden');
        });
    }

    /**
     * Serialise native operations and report failures for the legacy synchronous API.
     *
     * @param action Operation description for error reporting.
     * @param operation Native operation.
     */
    protected enqueue(action: string, operation: () => Promise<void>): void {
        if (!CorePlatform.isMobile()) {
            return;
        }

        this.pending = this.pending.then(async () => {
            await CorePlatform.ready();

            return operation();
        }).catch(error => {
            this.logger.error(`Could not ${action}`, error);
        });
    }

    /**
     * Normalise the fork's optional hash and three-digit hexadecimal colour syntax.
     *
     * @param color Hexadecimal colour.
     * @returns Six-digit hexadecimal colour.
     */
    protected normalizeColor(color: string): string {
        if (!/^#?(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) {
            throw new Error(`Invalid system bar colour: ${color}`);
        }

        const hex = color.replace('#', '');

        return `#${hex.length === 3 ? hex.split('').map(component => component.repeat(2)).join('') : hex}`.toUpperCase();
    }

    /**
     * Preserve the fork's platform-specific contrast thresholds.
     *
     * @param color Normalised opaque colour.
     * @returns Background theme used by Capacitor to select contrasting icons.
     */
    protected getStyle(color: string): SystemBarsStyle {
        const [red, green, blue] = CoreColors.getColorRGBA(color).map(component => component / 255);
        const linear = (component: number) => component <= 0.04045
            ? component / 12.92
            : ((component + 0.055) / 1.055) ** 2.4;
        const brightness = CorePlatform.isAndroid()
            ? 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
            : (299 * red + 587 * green + 114 * blue) / 1000;

        return brightness < 0.5 ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
    }

    /**
     * Apply the top bar icon style and retain it for resume.
     *
     * @param style Background theme.
     */
    protected async setStatusStyle(style: SystemBarsStyle): Promise<void> {
        await CapacitorSystemBars.setStyle({ style, bar: SystemBarType.StatusBar });
        this.statusStyle = style;
        this.statusColor = undefined;
    }

}
export const CoreNativeStatusBar = makeSingleton(StatusBar);
