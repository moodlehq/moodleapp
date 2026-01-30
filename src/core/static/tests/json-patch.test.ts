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

import { CoreJsonPatch, JsonPatchOperation } from '@static/json-patch';

class NoErrorThrownError extends Error {}

describe('CoreJsonPatch', () => {

    it('should apply add operation', () => {
        const obj = { a: 1 };

        CoreJsonPatch.applyPatch(obj, { op: 'add', path: '/b', value: 2 });
        expect(obj).toEqual({ a: 1, b: 2 });

        CoreJsonPatch.applyPatch(obj, { op: 'add', path: '/c', value: 3 });
        expect(obj).toEqual({ a: 1, b: 2, c: 3 });

        const arr = [1, 2, 3];

        CoreJsonPatch.applyPatch(arr, { op: 'add', path: '/1', value: 1.5 });
        expect(arr).toEqual([1, 1.5, 2, 3]);

        CoreJsonPatch.applyPatch(arr, { op: 'add', path: '/0', value: 0 });
        expect(arr).toEqual([0, 1, 1.5, 2, 3]);

        CoreJsonPatch.applyPatch(arr, { op: 'add', path: '/-', value: 4 });
        expect(arr).toEqual([0, 1, 1.5, 2, 3, 4]);
    });

    it('should apply replace operation', () => {
        const obj = { a: 1, b: 2, c: { d: 4 } };

        CoreJsonPatch.applyPatch(obj, { op: 'replace', path: '/b', value: 3 });
        expect(obj).toEqual({ a: 1, b: 3, c: { d: 4 } });

        CoreJsonPatch.applyPatch(obj, { op: 'replace', path: '/c', value: 4 });
        expect(obj).toEqual({ a: 1, b: 3, c: 4 });

        CoreJsonPatch.applyPatch(obj, { op: 'replace', path: '/c', value: { z: 6 } });
        expect(obj).toEqual({ a: 1, b: 3, c: { z: 6 } });

        const arr = [1, 2, 3];

        CoreJsonPatch.applyPatch(arr, { op: 'replace', path: '/0', value: 1.5 });
        expect(arr).toEqual([1.5, 2, 3]);

        CoreJsonPatch.applyPatch(arr, { op: 'replace', path: '/2', value: { value: 3.5 } });
        expect(arr).toEqual([1.5, 2, { value: 3.5 }]);
    });

    it('should apply remove operation', () => {
        const obj = { a: 1, b: 2, c: 3 };

        CoreJsonPatch.applyPatch(obj, { op: 'remove', path: '/b' });
        expect(obj).toEqual({ a: 1, c: 3 });

        CoreJsonPatch.applyPatch(obj, { op: 'remove', path: '/a' });
        expect(obj).toEqual({ c: 3 });

        const arr = [1, 2, 3];

        CoreJsonPatch.applyPatch(arr, { op: 'remove', path: '/1' });
        expect(arr).toEqual([1, 3]);

        CoreJsonPatch.applyPatch(arr, { op: 'remove', path: '/0' });
        expect(arr).toEqual([3]);
    });

    it('should apply operations to nested items and arrays', () => {
        const obj = { a: 1, childobj: { aa: 1, subchildobj: { aaa: 1 } } };

        CoreJsonPatch.applyPatch(obj, { op: 'add', path: '/childobj/bb', value: 2 });
        expect(obj).toEqual({ a: 1, childobj: { aa: 1, bb: 2, subchildobj: { aaa: 1 } } });

        CoreJsonPatch.applyPatch(obj, { op: 'add', path: '/childobj/subchildobj/bbb', value: 2 });
        expect(obj).toEqual({ a: 1, childobj: { aa: 1, bb: 2, subchildobj: { aaa: 1, bbb: 2 } } });

        const arr = [{ id: 1, items: ['a'] }, { id: 2, items: ['1'] }, { id: 3, items: [] }];

        CoreJsonPatch.applyPatch(arr, { op: 'add', path: '/0/items/-', value: 'b' });
        expect(arr).toEqual([{ id: 1, items: ['a', 'b'] }, { id: 2, items: ['1'] }, { id: 3, items: [] }]);

        CoreJsonPatch.applyPatch(arr, { op: 'add', path: '/2/items/-', value: 'foo' });
        expect(arr).toEqual([{ id: 1, items: ['a', 'b'] }, { id: 2, items: ['1'] }, { id: 3, items: ['foo'] }]);
    });

    it('can search elements in arrays using key=value syntax', () => {
        const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];

        CoreJsonPatch.applyPatch(arr, { op: 'replace', path: '/[id=2]', value: { id: 2, a: 1 } });
        expect(arr).toEqual([{ id: 1 }, { id: 2, a: 1 }, { id: 3 }]);

        CoreJsonPatch.applyPatch(arr, { op: 'remove', path: '/[id=3]' });
        expect(arr).toEqual([{ id: 1 }, { id: 2, a: 1 }]);

        // It can also be used to identify nested elements.
        const obj = { items: [{ id: 1, subitems: ['a'] }, { id: 2, subitems: ['1'] }, { id: 3, subitems: [] }] };

        CoreJsonPatch.applyPatch(obj, { op: 'add', path: '/items/[id=2]/subitems/-', value: '2' });
        expect(obj).toEqual({ items: [{ id: 1, subitems: ['a'] }, { id: 2, subitems: ['1', '2'] }, { id: 3, subitems: [] }] });

        CoreJsonPatch.applyPatch(obj, { op: 'remove', path: '/items/[id=1]/subitems/0' });
        expect(obj).toEqual({ items: [{ id: 1, subitems: [] }, { id: 2, subitems: ['1', '2'] }, { id: 3, subitems: [] }] });

        CoreJsonPatch.applyPatch(obj, { op: 'replace', path: '/items/[id=3]/id', value: 4 });
        expect(obj).toEqual({ items: [{ id: 1, subitems: [] }, { id: 2, subitems: ['1', '2'] }, { id: 4, subitems: [] }] });
    });

    it('can search elements in arrays using primitive values', () => {
        const stringArr = ['a', 'b', 'c'];

        CoreJsonPatch.applyPatch(stringArr, { op: 'replace', path: '/b', value: 'beta' });
        expect(stringArr).toEqual(['a', 'beta', 'c']);

        CoreJsonPatch.applyPatch(stringArr, { op: 'remove', path: '/a' });
        expect(stringArr).toEqual(['beta', 'c']);
    });

    it('should throw an error for invalid operations', () => {
        const captureError = (call: () => unknown): Error => {
            try {
                call();

                throw new NoErrorThrownError();
            } catch (error) {
                return error;
            }
        };

        // Path contains a property that doesn't exist.
        let error = captureError(() => CoreJsonPatch.applyPatch({}, { op: 'add', path: '/a/b', value: 1 }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);
        error = captureError(() => CoreJsonPatch.applyPatch({ a: 1 }, { op: 'remove', path: '/a/b' }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);

        // Index out of bounds.
        error = captureError(() => CoreJsonPatch.applyPatch([1], { op: 'add', path: '/1', value: 2 }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);
        error = captureError(() => CoreJsonPatch.applyPatch([1], { op: 'add', path: '/-1', value: 0 }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);
        error = captureError(() => CoreJsonPatch.applyPatch([1], { op: 'remove', path: '/1' }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);

        // Use - when searching in an array.
        error = captureError(() => CoreJsonPatch.applyPatch([{ id: 1 }], { op: 'replace', path: '/-/id', value: 2 }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);

        // Element not found using key=value syntax.
        error = captureError(() => CoreJsonPatch.applyPatch([{ id: 1 }], { op: 'remove', path: '/[id=2]' }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);

        // Element not found using primitive value.
        error = captureError(() => CoreJsonPatch.applyPatch(['a'], { op: 'remove', path: '/b' }));
        expect(error).not.toBeInstanceOf(NoErrorThrownError);
    });

    it('applyPatches should continue applying patches even if one fails', () => {
        const obj = { a: 1, b: 2, c: 3, items: [] };

        const patches: JsonPatchOperation[] = [
            { op: 'replace', path: '/a', value: 10 },
            { op: 'remove', path: '/d' }, // This will fail.
            { op: 'replace', path: '/b', value: 20 },
            { op: 'replace', path: '/items/1', value: 'a' }, // This will fail.
            { op: 'replace', path: '/c', value: 30 },
        ];

        CoreJsonPatch.applyPatches(obj, patches);
        expect(obj).toEqual({ a: 10, b: 20, c: 30, items: [] });
    });

});
