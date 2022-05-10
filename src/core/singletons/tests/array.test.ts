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

import { CoreArray } from '@singletons/array';

describe('CoreArray singleton', () => {

    it('flattens arrays', () => {
        expect(CoreArray.flatten([])).toEqual([]);
        expect(CoreArray.flatten<number>([[1, 2], [3, 4], [5, 6]])).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('gets array without an item', () => {
        const originalArray = ['foo', 'bar', 'baz'];

        expect(CoreArray.withoutItem(originalArray, 'bar')).toEqual(['foo', 'baz']);
        expect(CoreArray.withoutItem(originalArray, 'not found')).toEqual(['foo', 'bar', 'baz']);
    });

});
