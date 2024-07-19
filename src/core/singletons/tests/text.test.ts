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

import { CoreText } from '@singletons/text';

describe('CoreText singleton', () => {

    it('adds ending slashes', () => {
        const originalUrl = 'https://moodle.org';
        const url = CoreText.addEndingSlash(originalUrl);

        expect(url).toEqual('https://moodle.org/');
    });

    it('doesn\'t add duplicated ending slashes', () => {
        const originalUrl = 'https://moodle.org/';
        const url = CoreText.addEndingSlash(originalUrl);

        expect(url).toEqual('https://moodle.org/');
    });

    it('adds a starting slash if needed', () => {
        expect(CoreText.addStartingSlash('')).toEqual('/');
        expect(CoreText.addStartingSlash('foo')).toEqual('/foo');
        expect(CoreText.addStartingSlash('/foo')).toEqual('/foo');
    });

    it('remove ending slash if needed', () => {
        expect(CoreText.removeEndingSlash('/')).toEqual('');
        expect(CoreText.removeEndingSlash('foo')).toEqual('foo');
        expect(CoreText.removeEndingSlash('foo/')).toEqual('foo');
        expect(CoreText.removeEndingSlash('foo//')).toEqual('foo/');
    });

    it('remove starting slash if needed', () => {
        expect(CoreText.removeStartingSlash('/')).toEqual('');
        expect(CoreText.removeStartingSlash('foo')).toEqual('foo');
        expect(CoreText.removeStartingSlash('/foo')).toEqual('foo');
        expect(CoreText.removeStartingSlash('//foo')).toEqual('/foo');
    });

    it('matches glob patterns', () => {
        expect(CoreText.matchesGlob('/foo/bar', '/foo/bar')).toBe(true);
        expect(CoreText.matchesGlob('/foo/bar', '/foo/bar/')).toBe(false);
        expect(CoreText.matchesGlob('/foo', '/foo/*')).toBe(false);
        expect(CoreText.matchesGlob('/foo/', '/foo/*')).toBe(true);
        expect(CoreText.matchesGlob('/foo/bar', '/foo/*')).toBe(true);
        expect(CoreText.matchesGlob('/foo/bar/', '/foo/*')).toBe(false);
        expect(CoreText.matchesGlob('/foo/bar/baz', '/foo/*')).toBe(false);
        expect(CoreText.matchesGlob('/foo/bar/baz', '/foo/**')).toBe(true);
        expect(CoreText.matchesGlob('/foo/bar/baz/', '/foo/**')).toBe(true);
        expect(CoreText.matchesGlob('/foo/bar/baz', '**/baz')).toBe(true);
        expect(CoreText.matchesGlob('/foo/bar/baz', '**/bar')).toBe(false);
        expect(CoreText.matchesGlob('/foo/bar/baz', '/foo/ba?/ba?')).toBe(true);
    });

    it('replaces arguments', () => {
        // Arrange
        const url = 'http://campus.edu?device={{device}}&version={{version}}';
        const replacements = {
            device: 'iPhone or iPad',
            version: '1.2.3',
        };

        // Act
        const replaced = CoreText.replaceArguments(url, replacements, 'uri');

        // Assert
        expect(replaced).toEqual('http://campus.edu?device=iPhone%20or%20iPad&version=1.2.3');
    });

    it('counts words', () => {
        expect(CoreText.countWords('')).toEqual(0);
        expect(CoreText.countWords('one two three four')).toEqual(4);
        expect(CoreText.countWords('a\'b')).toEqual(1);
        expect(CoreText.countWords('1+1=2')).toEqual(1);
        expect(CoreText.countWords(' one-sided ')).toEqual(1);
        expect(CoreText.countWords('one&nbsp;two')).toEqual(2);
        expect(CoreText.countWords('email@example.com')).toEqual(1);
        expect(CoreText.countWords('first\\part second/part')).toEqual(2);
        expect(CoreText.countWords('<p>one two<br></br>three four</p>')).toEqual(4);
        expect(CoreText.countWords('<p>one two<br>three four</p>')).toEqual(4);
        expect(CoreText.countWords('<p>one two<br />three four</p>')).toEqual(4);
        expect(CoreText.countWords(' one ... three ')).toEqual(3);
        expect(CoreText.countWords('just...one')).toEqual(1);
        expect(CoreText.countWords(' one & three ')).toEqual(3);
        expect(CoreText.countWords('just&one')).toEqual(1);
        expect(CoreText.countWords('em—dash')).toEqual(2);
        expect(CoreText.countWords('en–dash')).toEqual(2);
        expect(CoreText.countWords('1³ £2 €3.45 $6,789')).toEqual(4);
        expect(CoreText.countWords('ブルース カンベッル')).toEqual(2);
        expect(CoreText.countWords('<p>one two</p><p>three four</p>')).toEqual(4);
        expect(CoreText.countWords('<p>one two</p><p><br/></p><p>three four</p>')).toEqual(4);
        expect(CoreText.countWords('<p>one</p><ul><li>two</li><li>three</li></ul><p>four.</p>')).toEqual(4);
        expect(CoreText.countWords('<p>em<b>phas</b>is.</p>')).toEqual(1);
        expect(CoreText.countWords('<p>em<i>phas</i>is.</p>')).toEqual(1);
        expect(CoreText.countWords('<p>em<strong>phas</strong>is.</p>')).toEqual(1);
        expect(CoreText.countWords('<p>em<em>phas</em>is.</p>')).toEqual(1);
        expect(CoreText.countWords('one\ntwo')).toEqual(2);
        expect(CoreText.countWords('one\rtwo')).toEqual(2);
        expect(CoreText.countWords('one\ttwo')).toEqual(2);
        expect(CoreText.countWords('one\vtwo')).toEqual(2);
        expect(CoreText.countWords('one\ftwo')).toEqual(2);
        expect(CoreText.countWords('SO<sub>4</sub><sup>2-</sup>')).toEqual(1);
        expect(CoreText.countWords('4+4=8 i.e. O(1) a,b,c,d I’m black&blue_really')).toEqual(6);
        expect(CoreText.countWords('<span>a</span><span>b</span>')).toEqual(1);
    });

});
