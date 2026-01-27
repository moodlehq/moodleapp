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

/**
 * Color components contained within a rgb color.
 */
interface ColorComponents {
    red: number; // Red component of an RGB color [0-255].
    green: number; // Green component of an RGB color [0-255].
    blue: number; // Blue component of an RGB color [0-255].
}

/**
 * Ionic color names.
 */
export enum CoreIonicColorNames {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    SUCCESS = 'success',
    WARNING = 'warning',
    DANGER = 'danger',
    INFO = 'info',
    DARK = 'dark',
    MEDIUM = 'medium',
    LIGHT = 'light',
    NONE = '',
}

/**
 * Singleton with helper functions for colors.
 */
export class CoreColors {

    protected static readonly BLACK_TRANSPARENT_COLORS =
        ['rgba(0, 0, 0, 0)', 'transparent', '#00000000', '#0000', 'hsl(0, 0%, 0%, 0)'];

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Check if a color is valid.
     * Accepted formats are rgb, rgba, hsl, hsla, hex and named colors.
     *
     * @param color Color in any format.
     * @returns Whether color is valid.
     */
    static isValid(color: string): boolean {
        return CoreColors.getColorRGBA(color).length >= 3;
    }

    /**
     * Returns better contrast color.
     *
     * @param color Black or white texts.
     * @returns True if white contrasts better than black. False otherwise.
     */
    static isWhiteContrastingBetter(color: string): boolean {
        return CoreColors.luma(color) < 165;
    }

    /**
     * Returns the same color % darker. Returned color is always hex, unless the color isn't valid.
     *
     * @param color Color to get darker.
     * @returns Darker Hex RGB color.
     */
    static darker(color: string, percent = 48): string {
        const inversePercent = 1 - (percent / 100);

        const rgba = CoreColors.getColorRGBA(color);
        if (rgba.length < 3) {
            return color; // Color not valid, return original value.
        }

        const red = Math.floor(rgba[0] * inversePercent);
        const green = Math.floor(rgba[1] * inversePercent);
        const blue = Math.floor(rgba[2] * inversePercent);

        return rgba[3] !== undefined ?
            CoreColors.getColorHex(`rgba(${red}, ${green}, ${blue}, ${rgba[3]})`) :
            CoreColors.getColorHex(`rgb(${red}, ${green}, ${blue})`);
    }

    /**
     * Returns the same color % lighter. Returned color is always hex, unless the color isn't valid.
     *
     * @param color Color to get lighter.
     * @returns Lighter Hex RGB color.
     */
    static lighter(color: string, percent = 80): string {
        percent = percent / 100;
        const inversePercent = 1 - percent;

        const rgba = CoreColors.getColorRGBA(color);
        if (rgba.length < 3) {
            return color; // Color not valid, return original value.
        }

        const red = Math.floor(255 * percent + rgba[0] * inversePercent);
        const green = Math.floor(255 * percent + rgba[1] * inversePercent);
        const blue = Math.floor(255 * percent + rgba[2] * inversePercent);

        return rgba[3] !== undefined ?
            CoreColors.getColorHex(`rgba(${red}, ${green}, ${blue}, ${rgba[3]})`) :
            CoreColors.getColorHex(`rgb(${red}, ${green}, ${blue})`);
    }

    /**
     * Returns the hex code from any color css type (ie named).
     *
     * @param color Color in any format.
     * @returns Color in hex format.
     */
    static getColorHex(color: string): string {
        const rgba = CoreColors.getColorRGBA(color);
        if (rgba.length < 3) {
            return '';
        }

        let hex = [0,1,2].map(
            (idx) => CoreColors.componentToHex(rgba[idx]),
        ).join('');

        if (rgba.length > 3) {
            hex += CoreColors.componentToHex(Math.round(rgba[3] * 255));
        }

        return `#${hex}`;
    }

    /**
     * Returns RGBA color from any color format.
     * Only works with RGB, RGBA, HSL, HSLA, hex and named colors.
     *
     * @param color Color in any format.
     * @returns Red, green, blue and alpha.
     */
    static getColorRGBA(color: string): number[] {
        if (!color.match(/rgba?\(.*\)/)) {
            // Convert the color to RGB format.
            // Use backgroundColor instead of color because it detects invalid colors like rgb(0, 80) or #0F.
            const originalColor = color;
            const d = document.createElement('span');
            d.style.backgroundColor = color;
            document.body.appendChild(d);

            color = getComputedStyle(d).backgroundColor;
            document.body.removeChild(d);

            // Check that the color is valid. Some invalid colors return rgba(0, 0, 0, 0).
            if (
                !color.match(/rgba?\(.*\)/) ||
                (color === 'rgba(0, 0, 0, 0)' && !CoreColors.BLACK_TRANSPARENT_COLORS.includes(originalColor))
            ) {
                return [];
            }
        }

        const matches = color.match(/\d+(\.\d+)?|\.\d+/g) || [];
        if (matches.length < 3) {
            return [];
        }

        return matches.map((a, index) => index < 3 ? parseInt(a, 10) : parseFloat(a));
    }

    /**
     * Gets the luma of a color.
     *
     * @param color Hex RGB color.
     * @returns Luma number based on SMPTE C, Rec. 709 weightings.
     */
    protected static luma(color: string): number {
        const rgba = CoreColors.getColorRGBA(color);
        if (rgba.length < 3) {
            return 0; // Color not valid.
        }

        return (rgba[0] * 0.2126) + (rgba[1] * 0.7152) + (rgba[2] * 0.0722);
    }

    /**
     * Converts Hex RGB to Color components.
     *
     * @param color Hexadec RGB Color.
     * @returns RGB color components.
     * @deprecated since 5.0. Use getColorRGBA instead.
     */
    static hexToRGB(color: string): ColorComponents {
        const rgba = CoreColors.getColorRGBA(color);

        return {
            red: rgba[0] ?? 0,
            green: rgba[1] ?? 0,
            blue: rgba[2] ?? 0,
        };

    }

    /**
     * Converts a color component from decimal to hexadec.
     *
     * @param c color component in decimal.
     * @returns Hexadec of the color component.
     */
    protected static componentToHex(c: number): string {
        return (`0${c.toString(16)}`).slice(-2);
    }

    /**
     * Get the toolbar's current background color.
     *
     * @returns Color in hex format.
     */
    static getToolbarBackgroundColor(): string {
        const element = document.querySelector('ion-header ion-toolbar');
        let color: string;

        if (element) {
            color = getComputedStyle(element).getPropertyValue('--background').trim();
        } else {
            // Fallback, it won't always work.
            color = getComputedStyle(document.body).getPropertyValue('--core-header-toolbar-background').trim();
        }

        return CoreColors.getColorHex(color);
    }

    /**
     * Get the bottom page current background color. Bottom bar if shown or page background otherwise.
     *
     * @returns Color in hex format.
     */
    static getBottomPageBackgroundColor(): string {
        const element = document.querySelector('ion-tabs.placement-bottom:not(.tabshidden) ion-tab-bar.mainmenu-tabs');
        let color: string;

        if (element) {
            color = getComputedStyle(element).getPropertyValue('--background').trim();
        } else {
            // Fallback, it won't always work.
            color = getComputedStyle(document.body).getPropertyValue('--ion-background-color').trim();
        }

        return CoreColors.getColorHex(color);
    }

}
