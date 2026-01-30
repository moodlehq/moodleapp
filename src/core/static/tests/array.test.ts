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

import { CoreArray } from '@static/array';

describe('CoreArray', () => {

    it('gets array without an item', () => {
        const originalArray = ['foo', 'bar', 'baz'];

        expect(CoreArray.withoutItem(originalArray, 'bar')).toEqual(['foo', 'baz']);
        expect(CoreArray.withoutItem(originalArray, 'not found')).toEqual(['foo', 'bar', 'baz']);
    });

    it('gets unique array', () => {
        const originalArray = ['foo', 'bar', 'foo', 'baz'];

        expect(CoreArray.unique(originalArray)).toEqual(['foo', 'bar', 'baz']);
    });

    it('filters array by regexp', () => {
        const originalArray = ['foo', 'bar', 'baz', 'qux'];

        expect(CoreArray.filterByRegexp(originalArray, /ba/)).toEqual(['bar', 'baz']);
        expect(CoreArray.filterByRegexp(originalArray, /foo/)).toEqual(['foo']);
        expect(CoreArray.filterByRegexp([], /foo/)).toEqual([]);
    });

});
