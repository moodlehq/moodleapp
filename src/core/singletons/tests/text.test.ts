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

});
