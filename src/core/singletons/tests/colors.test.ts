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

import { CoreColors } from '@singletons/colors';

describe('CoreColors singleton', () => {

    it('determines if white contrast is better', () => {
        expect(CoreColors.isWhiteContrastingBetter('#000000')).toBe(true);
        expect(CoreColors.isWhiteContrastingBetter('#999999')).toBe(true);
        expect(CoreColors.isWhiteContrastingBetter('#aaaaaa')).toBe(false);
        expect(CoreColors.isWhiteContrastingBetter('#ffffff')).toBe(false);
        expect(CoreColors.isWhiteContrastingBetter('#ff0000')).toBe(true);
        expect(CoreColors.isWhiteContrastingBetter('#00ff00')).toBe(false);
        expect(CoreColors.isWhiteContrastingBetter('#0000ff')).toBe(true);
        expect(CoreColors.isWhiteContrastingBetter('#ff00ff')).toBe(true);
        expect(CoreColors.isWhiteContrastingBetter('#ffff00')).toBe(false);
    });

    it('makes color darker', () => {
        expect(CoreColors.darker('#ffffff', 50)).toEqual('#7f7f7f');
        expect(CoreColors.darker('#ffffff', 20)).toEqual('#cccccc');
        expect(CoreColors.darker('#ffffff', 80)).toEqual('#323232');
        expect(CoreColors.darker('#aabbcc', 40)).toEqual('#66707a');
    });

    it('makes color lighter', () => {
        expect(CoreColors.lighter('#000000', 50)).toEqual('#7f7f7f');
        expect(CoreColors.lighter('#000000', 20)).toEqual('#333333');
        expect(CoreColors.lighter('#000000', 80)).toEqual('#cccccc');
        expect(CoreColors.lighter('#223344', 40)).toEqual('#7a848e');
    });

    it('gets color hex value', () => {
        expect(CoreColors.getColorHex('#123456')).toEqual('#123456');
        expect(CoreColors.getColorHex('rgb(255, 100, 70)')).toEqual('#ff6446');
        expect(CoreColors.getColorHex('rgba(255, 100, 70, 0.5)')).toEqual('#ff6446');

        // @todo There are problems when testing color names (e.g. violet) or hsf colors.
        // They work fine in real browsers but not in unit tests.
    });

    it('gets color RGBA value', () => {
        expect(CoreColors.getColorRGBA('#123456')).toEqual([18, 52, 86]);
        expect(CoreColors.getColorRGBA('rgb(255, 100, 70)')).toEqual([255, 100, 70]);
        expect(CoreColors.getColorRGBA('rgba(255, 100, 70, 0.5)')).toEqual([255, 100, 70, 0.5]);

        // @todo There are problems when testing color names (e.g. violet) or hsf colors.
        // They work fine in real browsers but not in unit tests.
    });

    it('converts hex to rgb', () => {
        expect(CoreColors.hexToRGB('#000000')).toEqual({
            red: 0,
            green: 0,
            blue: 0,
        });
        expect(CoreColors.hexToRGB('#ffffff')).toEqual({
            red: 255,
            green: 255,
            blue: 255,
        });
        expect(CoreColors.hexToRGB('#aabbcc')).toEqual({
            red: 170,
            green: 187,
            blue: 204,
        });
    });

    it('gets toolbar background color', () => {
        document.body.style.setProperty('--core-header-toolbar-background', '#aabbcc');
        expect(CoreColors.getToolbarBackgroundColor()).toEqual('#aabbcc');

        const header = document.createElement('ion-header');
        const toolbar = document.createElement('ion-toolbar');
        toolbar.style.setProperty('--background', '#123456');
        header.appendChild(toolbar);
        document.body.appendChild(header);

        expect(CoreColors.getToolbarBackgroundColor()).toEqual('#123456');
    });

});
