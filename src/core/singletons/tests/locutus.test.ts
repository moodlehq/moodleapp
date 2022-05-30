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

import { Locutus } from '@singletons/locutus';

describe('Locutus singleton', () => {

    it('unserializes PHP strings', () => {
        expect(Locutus.unserialize('a:3:{s:1:"a";i:1;s:1:"b";i:2;s:3:"foo";s:3:"bar";}')).toEqual({
            a: 1,
            b: 2,
            foo: 'bar',
        });

        expect(Locutus.unserialize(
            'O:8:"stdClass":3:{s:3:"foo";s:3:"bar";s:5:"lorem";s:5:"ipsum";s:8:"subclass";O:8:"stdClass":1:{s:2:"ok";b:1;}}',
        )).toEqual({
            foo: 'bar',
            lorem: 'ipsum',
            subclass: {
                ok: true,
            },
        });
    });

    it('replaces text within a portion of a string', () => {
        const originalText = 'A sample text.';
        const newText = 'foo';

        expect(Locutus.substrReplace(originalText, newText, 0)).toEqual(newText);
        expect(Locutus.substrReplace(originalText, newText, 0, originalText.length)).toEqual(newText);
        expect(Locutus.substrReplace(originalText, newText, 0, 0)).toEqual(newText + originalText);
        expect(Locutus.substrReplace(originalText, newText, 9, -1)).toEqual('A sample foo.');
        expect(Locutus.substrReplace(originalText, newText, -5, -1)).toEqual('A sample foo.');
        expect(Locutus.substrReplace(originalText, newText, 2, 6)).toEqual('A foo text.');
    });

});
