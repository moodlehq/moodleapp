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

import { Route } from '@angular/compiler/src/core';
import { UrlSegment, UrlSegmentGroup } from '@angular/router';

import { mock } from '@/testing/utils';

import { buildRegExpUrlMatcher } from './app-routing.module';

describe('Routing utils', () => {

    it('matches paths using a RegExp', () => {
        const matcher = buildRegExpUrlMatcher(/foo(\/bar)*/);
        const route = mock<Route>();
        const segmentGroup = mock<UrlSegmentGroup>();
        const toUrlSegment = (path: string) => new UrlSegment(path, {});
        const testMatcher = (path: string, consumedParts: string[] | null) =>
            expect(matcher(path.split('/').map(toUrlSegment), segmentGroup, route))
                .toEqual(
                    consumedParts
                        ? { consumed: consumedParts.map(toUrlSegment) }
                        : null,
                );

        testMatcher('baz/foo/bar', null);
        testMatcher('foobar', null);
        testMatcher('foo', ['foo']);
        testMatcher('foo/baz', ['foo']);
        testMatcher('foo/bar/bar/baz', ['foo', 'bar', 'bar']);
    });

});
