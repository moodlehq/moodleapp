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
 * Singleton with helper functions for colors.
 */
export class CoreColors {

    /**
     * Returns better contrast color.
     *
     * @param color Black or white texts.
     * @return True if white contrasts better than black. False otherwise.
     */
    static isWhiteContrastingBetter(color: string): boolean {
        return CoreColors.luma(color) < 165;
    }

    /**
     * Returns the same color 10% darker to be used as status bar on Android.
     *
     * @param color Color to get darker.
     * @return Darker Hex RGB color.
     */
    static darker(color: string, percent: number = 10): string {
        percent = 1 - (percent / 100);
        const components = CoreColors.hexToRGB(color);
        components.red = Math.floor(components.red * percent);
        components.green = Math.floor(components.green * percent);
        components.blue = Math.floor(components.blue * percent);

        return CoreColors.RGBToHex(components);
    }

    /**
     * Returns the hex code from any color css type (ie named).
     *
     * @param color Color in any format.
     * @returns Color in hex format.
     */
    static getColorHex(color: string): string {
        const d = document.createElement('div');
        d.style.color = color;
        document.body.appendChild(d);

        // Color in RGB .
        const rgba = getComputedStyle(d).color.match(/\d+/g)!.map((a) => parseInt(a, 10));

        const hex = [0,1,2].map(
            (idx) => this.componentToHex(rgba[idx]),
        ).join('');

        document.body.removeChild(d);

        return '#'+hex;
    }

    /**
     * Gets the luma of a color.
     *
     * @param color Hex RGB color.
     * @return Luma number based on SMPTE C, Rec. 709 weightings.
     */
    protected static luma(color: string): number {
        const rgb = CoreColors.hexToRGB(color);

        return (rgb.red * 0.2126) + (rgb.green * 0.7152) + (rgb.blue * 0.0722);
    }

    /**
     * Converts Hex RGB to Color components.
     *
     * @param color Hexadec RGB Color.
     * @return RGB color components.
     */
    static hexToRGB(color: string): ColorComponents {
        if (color.charAt(0) == '#') {
            color = color.substr(1);
        }

        if (color.length === 3) {
            color = color.charAt(0) + color.charAt(0) + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2);
        } else if (color.length !== 6) {
            throw('Invalid hex color: ' + color);
        }

        return {
            red: parseInt(color.substr(0, 2), 16),
            green: parseInt(color.substr(2, 2), 16),
            blue: parseInt(color.substr(4, 2), 16),
        };

    }

    /**
     * Converts RGB components to Hex string.
     *
     * @param color Color components.
     * @return RGB color in string.
     */
    protected static RGBToHex(color: ColorComponents): string {
        return '#' + CoreColors.componentToHex(color.red) +
            CoreColors.componentToHex(color.green) +
            CoreColors.componentToHex(color.blue);

    }

    /**
     * Converts a color component from decimal to hexadec.
     *
     * @param c color component in decimal.
     * @return Hexadec of the color component.
     */
    protected static componentToHex(c: number): string {
        return ('0' + c.toString(16)).slice(-2);
    }

}
