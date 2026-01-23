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

import { CorePath } from '@singletons/path';

describe('CorePath', () => {

    it('calculates relative paths from one folder to another', () => {
        expect(CorePath.calculateRelativePath('foo/bar', 'foo/bar')).toEqual('');
        expect(CorePath.calculateRelativePath('/foo/bar', 'foo/bar/')).toEqual('');
        expect(CorePath.calculateRelativePath('foo/bar', 'foo/baz')).toEqual('../baz');
        expect(CorePath.calculateRelativePath('foo', 'baz')).toEqual('../baz');
        expect(CorePath.calculateRelativePath('foo/bar/baz', 'foo/baz')).toEqual('../../baz');
        expect(CorePath.calculateRelativePath('foo/baz', 'foo/bar/baz')).toEqual('../bar/baz');
        expect(CorePath.calculateRelativePath('foo/bar/baz', 'foo/bar')).toEqual('../');
        expect(CorePath.calculateRelativePath('foo/bar', 'foo/bar/baz')).toEqual('baz');
        expect(CorePath.calculateRelativePath('', 'foo')).toEqual('foo');
        expect(CorePath.calculateRelativePath('foo', '')).toEqual('../');
    });

    it('changes relative paths to a different folder', () => {
        expect(CorePath.changeRelativePath('foo/bar', 'test.png', 'foo/bar')).toEqual('test.png');
        expect(CorePath.changeRelativePath('/foo/bar', 'test.png', 'foo/bar/')).toEqual('test.png');
        expect(CorePath.changeRelativePath('foo/bar', 'test.png', 'foo/baz')).toEqual('../bar/test.png');
        expect(CorePath.changeRelativePath('foo/bar', '../xyz/test.png', 'foo/baz')).toEqual('../bar/../xyz/test.png');
        expect(CorePath.changeRelativePath('foo', 'bar/test.png', 'baz')).toEqual('../foo/bar/test.png');
        expect(CorePath.changeRelativePath('foo/bar/baz', 'test.png', 'foo/baz')).toEqual('../bar/baz/test.png');
        expect(CorePath.changeRelativePath('foo/bar/baz', 'test.png', 'foo/bar')).toEqual('baz/test.png');
        expect(CorePath.changeRelativePath('foo/bar/baz', 'test.png', 'foo/bar/xyz')).toEqual('../baz/test.png');
        expect(CorePath.changeRelativePath('', 'test.png', 'foo')).toEqual('../test.png');
        expect(CorePath.changeRelativePath('foo', 'test.png', '')).toEqual('foo/test.png');
    });

    it('concatenates paths', () => {
        expect(CorePath.concatenatePaths('', 'foo/bar')).toEqual('foo/bar');
        expect(CorePath.concatenatePaths('foo/bar', '')).toEqual('foo/bar');
        expect(CorePath.concatenatePaths('foo', 'bar')).toEqual('foo/bar');
        expect(CorePath.concatenatePaths('foo/', 'bar')).toEqual('foo/bar');
        expect(CorePath.concatenatePaths('foo', '/bar')).toEqual('foo/bar');
        expect(CorePath.concatenatePaths('foo/', '/bar')).toEqual('foo/bar');
        expect(CorePath.concatenatePaths('foo/bar', 'baz')).toEqual('foo/bar/baz');
    });

    it('checks ancestor paths', () => {
        expect(CorePath.pathIsAncestor('/foo', '/foo/bar')).toEqual(true);
        expect(CorePath.pathIsAncestor('/foo/', '/foo/bar')).toEqual(true);
        expect(CorePath.pathIsAncestor('/foo', '/foo/bar/baz')).toEqual(true);
        expect(CorePath.pathIsAncestor('/foo/baz', '/foo/bar')).toEqual(false);
        expect(CorePath.pathIsAncestor('/foo/bar', '/foo/bar')).toEqual(false);
        expect(CorePath.pathIsAncestor('/foo/b', '/foo/bar')).toEqual(false);
    });

    it('resolves relative paths', () => {
        expect(CorePath.resolveRelativePath('/foo/bar', '')).toEqual('/foo/bar');
        expect(CorePath.resolveRelativePath('/foo/bar', '/baz/xyz')).toEqual('/baz/xyz');
        expect(CorePath.resolveRelativePath('/foo/bar', '../baz')).toEqual('/foo/baz');
        expect(CorePath.resolveRelativePath('/foo/bar/', '../baz/')).toEqual('/foo/baz');
        expect(CorePath.resolveRelativePath('/foo/bar', 'baz/xyz')).toEqual('/foo/bar/baz/xyz');
        expect(CorePath.resolveRelativePath('/foo/bar', './baz/xyz')).toEqual('/foo/bar/baz/xyz');
        expect(CorePath.resolveRelativePath('foo/bar', './baz/xyz')).toEqual('foo/bar/baz/xyz');
        expect(CorePath.resolveRelativePath('./foo/bar', './baz/xyz')).toEqual('./foo/bar/baz/xyz');
        expect(CorePath.resolveRelativePath('/foo', '../../../bar')).toEqual('/bar');
    });
});
