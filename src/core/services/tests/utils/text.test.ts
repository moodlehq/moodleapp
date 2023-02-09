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

import { CoreTextUtilsProvider } from '@services/utils/text';
import { DomSanitizer } from '@singletons';

import { mockSingleton } from '@/testing/utils';
import { CorePlatform } from '@services/platform';

describe('CoreTextUtilsProvider', () => {

    const config = { platform: 'android' };
    let textUtils: CoreTextUtilsProvider;

    beforeEach(() => {
        mockSingleton(CorePlatform, [], { isAndroid: () => config.platform === 'android' });
        mockSingleton(DomSanitizer, [], { bypassSecurityTrustUrl: url => url });

        textUtils = new CoreTextUtilsProvider();
    });

    it('adds ending slashes', () => {
        const originalUrl = 'https://moodle.org';
        const url = textUtils.addEndingSlash(originalUrl);

        expect(url).toEqual('https://moodle.org/');
    });

    it('doesn\'t add duplicated ending slashes', () => {
        const originalUrl = 'https://moodle.org/';
        const url = textUtils.addEndingSlash(originalUrl);

        expect(url).toEqual('https://moodle.org/');
    });

    it('builds address URL for Android platforms', () => {
        // Arrange
        const address = 'Moodle Spain HQ';

        config.platform = 'android';

        // Act
        const url = textUtils.buildAddressURL(address);

        // Assert
        expect(url).toEqual('geo:0,0?q=Moodle%20Spain%20HQ');

        expect(DomSanitizer.bypassSecurityTrustUrl).toHaveBeenCalled();
        expect(CorePlatform.isAndroid).toHaveBeenCalled();
    });

    it('builds address URL for non-Android platforms', () => {
        // Arrange
        const address = 'Moodle Spain HQ';

        config.platform = 'ios';

        // Act
        const url = textUtils.buildAddressURL(address);

        // Assert
        expect(url).toEqual('http://maps.google.com?q=Moodle%20Spain%20HQ');

        expect(DomSanitizer.bypassSecurityTrustUrl).toHaveBeenCalled();
        expect(CorePlatform.isAndroid).toHaveBeenCalled();
    });

    it('doesn\'t build address if it\'s already a URL', () => {
        const address = 'https://moodle.org';

        const url = textUtils.buildAddressURL(address);

        expect(url).toEqual(address);

        expect(DomSanitizer.bypassSecurityTrustUrl).toHaveBeenCalled();
    });

    it('matches glob patterns', () => {
        expect(textUtils.matchesGlob('/foo/bar', '/foo/bar')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar', '/foo/bar/')).toBe(false);
        expect(textUtils.matchesGlob('/foo', '/foo/*')).toBe(false);
        expect(textUtils.matchesGlob('/foo/', '/foo/*')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar', '/foo/*')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/', '/foo/*')).toBe(false);
        expect(textUtils.matchesGlob('/foo/bar/baz', '/foo/*')).toBe(false);
        expect(textUtils.matchesGlob('/foo/bar/baz', '/foo/**')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/baz/', '/foo/**')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/baz', '**/baz')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/baz', '**/bar')).toBe(false);
        expect(textUtils.matchesGlob('/foo/bar/baz', '/foo/ba?/ba?')).toBe(true);
    });

    it('replaces arguments', () => {
        // Arrange
        const url = 'http://campus.edu?device={{device}}&version={{version}}';
        const replacements = {
            device: 'iPhone or iPad',
            version: '1.2.3',
        };

        // Act
        const replaced = textUtils.replaceArguments(url, replacements, 'uri');

        // Assert
        expect(replaced).toEqual('http://campus.edu?device=iPhone%20or%20iPad&version=1.2.3');
    });

});
