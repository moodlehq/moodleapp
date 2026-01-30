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
import { CoreIcons } from '@static/icons';

describe('CoreIcons', () => {

    it('replaces CSS icon with the correspondant ion-icon', async () => {
        const icon = document.createElement('i');

        // Not an icon
        icon.className = 'test';
        expect((await CoreIcons.replaceCSSIcon(icon)))
            .toEqual(undefined);

        icon.className = 'fas fanoicon';
        expect((await CoreIcons.replaceCSSIcon(icon)))
            .toEqual(undefined);

        icon.className = 'fa-solid fanoicon';
        expect((await CoreIcons.replaceCSSIcon(icon)))
            .toEqual(undefined);

        // Font awesome 6
        icon.className = 'fa-solid fa-face-awesome';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/solid/face-awesome.svg');

        icon.className = 'fa-regular fa-face-awesome';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/regular/face-awesome.svg');

        icon.className = 'fa-light fa-face-awesome';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/regular/face-awesome.svg');

        icon.className = 'fa-brands fa-facebook';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/brands/facebook.svg');

        // Font awesome 5
        icon.className = 'fas fa-yin-yang';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/solid/yin-yang.svg');

        icon.className = 'far fa-wrench';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/regular/wrench.svg');

        icon.className = 'fab fa-youtube';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/brands/youtube.svg');

        // Font awesome 4.7
        icon.className = 'fa fa-address-book';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/solid/address-book.svg');

        icon.className = 'fa fa-address-book-o';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/regular/address-book.svg');

        // Aliases
        icon.className = 'fas fa-battery-5';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/solid/battery-full.svg');

        icon.className = 'fa fa-check-square';
        expect((await CoreIcons.replaceCSSIcon(icon))?.getAttribute('src'))
            .toEqual('assets/fonts/font-awesome/solid/square-check.svg');
    });

    it('prefixes icons names', () => {
        // Arrange.
        CoreConstants.CONFIG.iconsPrefixes = {
            foo: {
                bar: ['fo', 'for'],
                baz: ['foz'],
            },
            lorem: {
                ipsum: ['lorip'],
            },
        };

        // Act and assert.
        expect(CoreIcons.prefixIconName('foo', 'bar', 'myicon')).toEqual('fo-myicon');
        expect(CoreIcons.prefixIconName('foo', 'baz', 'myicon')).toEqual('foz-myicon');
        expect(CoreIcons.prefixIconName('lorem', 'ipsum', 'myicon')).toEqual('lorip-myicon');
        expect(CoreIcons.prefixIconName('invalid', 'invalid', 'myicon')).toEqual('myicon');
    });

    it('check if an icon is prefixed', () => {
        // Arrange.
        CoreConstants.CONFIG.iconsPrefixes = {
            foo: {
                bar: ['fo', 'for'],
                baz: ['foz'],
            },
            lorem: {
                ipsum: ['lorip'],
            },
        };

        // Act and assert.
        expect(CoreIcons.isIconNamePrefixed('fo-myicon')).toEqual(true);
        expect(CoreIcons.isIconNamePrefixed('foz-myicon')).toEqual(true);
        expect(CoreIcons.isIconNamePrefixed('lorip-myicon')).toEqual(true);
        expect(CoreIcons.isIconNamePrefixed('myicon')).toEqual(false);
        expect(CoreIcons.isIconNamePrefixed('fox-myicon')).toEqual(false);
    });

});
