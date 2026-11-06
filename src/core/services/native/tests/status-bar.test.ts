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

import { StatusBar } from '../status-bar';
import { SystemBarsStyle } from '@capacitor/core';

describe('StatusBar', () => {

    let statusBar: StatusBar;

    beforeEach(() => {
        statusBar = new StatusBar();
    });

    it.each([
        ['#123456', '#123456'],
        ['#abc', '#AABBCC'],
        ['def', '#DDEEFF'],
        ['#00000000', '#FFFFFF'],
        ['#00000080', '#7F7F7F'],
        ['#FF644680', '#FFB1A2'],
        ['rgba(0, 0, 0, 0.5)', '#808080'],
        ['transparent', '#FFFFFF'],
    ])('gets the same style for %s and %s', (color, opaqueColor) => {
        expect(statusBar['getStyle'](color)).toEqual(statusBar['getStyle'](opaqueColor));
    });

    it('gets the correct style for light colours', () => {
        expect(statusBar['getStyle']('#FFFFFF')).toEqual(SystemBarsStyle.Light);
    });

    it('gets the correct style for dark colours', () => {
        expect(statusBar['getStyle']('#000000')).toEqual(SystemBarsStyle.Dark);
    });

    it('rejects invalid colours', () => {
        expect(() => statusBar['getStyle']('invalid')).toThrow('Invalid system bar colour: invalid');
    });

});
