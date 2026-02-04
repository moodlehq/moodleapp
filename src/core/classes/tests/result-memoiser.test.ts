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

import { CoreResultMemoiser } from '@classes/result-memoiser';

describe('CoreResultMemoiser', () => {

    it('should cache and retrieve results with set, get, and isValid', () => {
        const memoiser = new CoreResultMemoiser<string>();

        // Initially, no result is cached.
        expect(memoiser.get()).toBeUndefined();
        expect(memoiser.get('param1')).toBeUndefined();
        expect(memoiser.isValid()).toBe(false);
        expect(memoiser.isValid('param1')).toBe(false);

        // Set a result with parameters.
        memoiser.set('result', 'param1', 'param2');
        expect(memoiser.get('param1', 'param2')).toBe('result');
        expect(memoiser.isValid('param1', 'param2')).toBe(true);

        // Wrong params return undefined and are invalid.
        expect(memoiser.get('param1', 'different')).toBeUndefined();
        expect(memoiser.get('param1')).toBeUndefined();
        expect(memoiser.get('param1', 'param2', 'extra')).toBeUndefined();
        expect(memoiser.isValid('param1')).toBe(false);
        expect(memoiser.isValid('param1', 'param2', 'extra')).toBe(false);

        // Overwrite with new params.
        memoiser.set('second', 'param3');
        expect(memoiser.get('param1', 'param2')).toBeUndefined();
        expect(memoiser.get('param3')).toBe('second');

        // Handle no parameters.
        memoiser.set('42');
        expect(memoiser.get()).toBe('42');

        // Handle falsy values.
        const memoiserFalsy = new CoreResultMemoiser<string | number | boolean | null>();
        memoiserFalsy.set('', 'empty');
        expect(memoiserFalsy.get('empty')).toBe('');

        memoiserFalsy.set(0, 'zero');
        expect(memoiserFalsy.get('zero')).toBe(0);

        memoiserFalsy.set(false, 'false');
        expect(memoiserFalsy.get('false')).toBe(false);

        memoiserFalsy.set(null, 'null');
        expect(memoiserFalsy.get('null')).toBe(null);
    });

    it('should validate params with primitive types', () => {
        const memoiser = new CoreResultMemoiser<string>();
        memoiser.set('result', 'string', 123, true, null, undefined);

        expect(memoiser.isValid('string', 123, true, null, undefined)).toBe(true);
        expect(memoiser.isValid('different', 123, true, null, undefined)).toBe(false);
        expect(memoiser.isValid('string', 456, true, null, undefined)).toBe(false);
        expect(memoiser.isValid('string', 123, false, null, undefined)).toBe(false);
    });

    it('should validate params with objects and arrays using deep equality', () => {
        const memoiser = new CoreResultMemoiser<string>();
        const obj = { a: 1, b: { c: 2 } };
        memoiser.set('result', obj);

        // Object deep equality.
        expect(memoiser.isValid({ a: 1, b: { c: 2 } })).toBe(true);
        expect(memoiser.isValid({ a: 1, b: { c: 3 } })).toBe(false);
        expect(memoiser.isValid({ a: 1 })).toBe(false);

        // Array deep equality.
        memoiser.set('array-result', [1, 2, 3]);
        expect(memoiser.isValid([1, 2, 3])).toBe(true);
        expect(memoiser.isValid([1, 2])).toBe(false);
        expect(memoiser.isValid([1, 2, 4])).toBe(false);
        expect(memoiser.isValid([1, 2, 3, 4])).toBe(false);

        // Mixed primitives and objects.
        memoiser.set('mixed', 'string', 123, { key: 'value' }, true);
        expect(memoiser.isValid('string', 123, { key: 'value' }, true)).toBe(true);
        expect(memoiser.isValid('string', 123, { key: 'different' }, true)).toBe(false);
    });

    it('should clear cache with invalidate', () => {
        const memoiser = new CoreResultMemoiser<string>();
        memoiser.set('result', 'param1', 'param2', 'param3');

        expect(memoiser.get('param1', 'param2', 'param3')).toBe('result');
        expect(memoiser.isValid('param1', 'param2', 'param3')).toBe(true);

        memoiser.invalidate();

        expect(memoiser.get('param1', 'param2', 'param3')).toBeUndefined();
        expect(memoiser.isValid('param1', 'param2', 'param3')).toBe(false);
    });

    it('should memoise function results', () => {
        const memoiser = new CoreResultMemoiser<string>();
        const fn = jest.fn(() => 'result');

        // First call executes function and caches.
        let result = memoiser.memoise(fn, 'param1');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(result).toBe('result');
        expect(memoiser.get('param1')).toBe('result');

        // Second call with same params uses cache.
        result = memoiser.memoise(fn, 'param1');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(result).toBe('result');

        // Different params re-execute.
        memoiser.invalidate();
        const fn2 = jest.fn((param: string) => `result-${param}`);
        memoiser.memoise(() => fn2('param1'), 'param1');
        memoiser.memoise(() => fn2('param2'), 'param2');
        expect(fn2).toHaveBeenCalledTimes(2);
        expect(memoiser.get('param1')).toBe(undefined);
        expect(memoiser.get('param2')).toBe('result-param2');

        // Object parameters.
        const memoiserObj = new CoreResultMemoiser<string>();
        const fnObj = jest.fn(() => 'result');
        memoiserObj.memoise(fnObj, { a: 1 });
        memoiserObj.memoise(fnObj, { a: 1 }); // Same object structure
        memoiserObj.memoise(fnObj, { a: 2 }); // Different object
        expect(fnObj).toHaveBeenCalledTimes(2);
        expect(memoiserObj.get({ a: 1 })).toBe(undefined);
        expect(memoiserObj.get({ a: 2 })).toBe('result');

        // Complex return types
        const memoiserComplex = new CoreResultMemoiser<{ value: string; count: number }>();
        const fnComplex = jest.fn((param: string) => ({ value: `result-${param}`, count: 42 }));
        const result1 = memoiserComplex.memoise(() => fnComplex('first'), 'param');
        const result2 = memoiserComplex.memoise(() => fnComplex('second'), 'param');
        expect(fnComplex).toHaveBeenCalledTimes(1);
        expect(result1).toEqual({ value: 'result-first', count: 42 });
        expect(result2).toBe(result1); // Same reference
    });

});
