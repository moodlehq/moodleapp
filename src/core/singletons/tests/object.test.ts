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

import { CoreObject } from '@singletons/object';

describe('CoreObject singleton', () => {

    it('compares two values, checking all subproperties if needed', () => {
        expect(CoreObject.deepEquals(1, 1)).toBe(true);
        expect(CoreObject.deepEquals(1, 2)).toBe(false);
        expect(CoreObject.deepEquals(NaN, NaN)).toBe(true);
        expect(CoreObject.deepEquals(NaN, 0)).toBe(false);

        expect(CoreObject.deepEquals('foo', 'foo')).toBe(true);
        expect(CoreObject.deepEquals('foo', 'bar')).toBe(false);

        expect(CoreObject.deepEquals(true, true)).toBe(true);
        expect(CoreObject.deepEquals(true, false)).toBe(false);

        expect(CoreObject.deepEquals(null, null)).toBe(true);
        expect(CoreObject.deepEquals(undefined, undefined)).toBe(true);
        expect(CoreObject.deepEquals(null, undefined)).toBe(false);

        const firstObject = {
            foo: 'bar',
            subobject: {
                foo: 'bar',
                subobject: {
                    foo: 'bar',
                    items: [1, 2, 3],
                },
            },
        };
        const secondObject = {
            foo: 'bar',
            subobject: {
                foo: 'bar',
                subobject: {
                    foo: 'bar',
                    items: [1, 2, 3],
                },
            },
        };

        expect(CoreObject.deepEquals(firstObject, secondObject)).toBe(true);

        secondObject.foo = 'baz';
        expect(CoreObject.deepEquals(firstObject, secondObject)).toBe(false);

        secondObject.foo = 'bar';
        secondObject.subobject.foo = 'baz';
        expect(CoreObject.deepEquals(firstObject, secondObject)).toBe(false);

        secondObject.subobject.foo = 'bar';
        secondObject.subobject.subobject.foo = 'baz';
        expect(CoreObject.deepEquals(firstObject, secondObject)).toBe(false);

        secondObject.subobject.subobject.foo = 'bar';
        secondObject.subobject.subobject.items[0] = 0;
        expect(CoreObject.deepEquals(firstObject, secondObject)).toBe(false);

        secondObject.subobject.subobject.items[0] = 1;
        expect(CoreObject.deepEquals(firstObject, secondObject)).toBe(true);
    });

    it('gets all property names', () => {
        expect(CoreObject.getAllPropertyNames(null)).toEqual(new Set([]));
        expect(CoreObject.getAllPropertyNames(undefined)).toEqual(new Set([]));
        expect(CoreObject.getAllPropertyNames(1)).toEqual(new Set([]));
        expect(CoreObject.getAllPropertyNames('foo')).toEqual(new Set([]));

        expect(CoreObject.getAllPropertyNames({
            foo: 1,
            bar: 2,
            doSomething: () => {
                // Nothing to do.
            },
        })).toEqual(new Set(['foo', 'bar', 'doSomething']));

        expect(CoreObject.getAllPropertyNames(new TestParentClass()))
            .toEqual(new Set(['constructor', 'foo', 'bar', 'baz', 'doSomething']));
        expect(CoreObject.getAllPropertyNames(new TestSubClass()))
            .toEqual(new Set(['constructor', 'foo', 'bar', 'baz', 'doSomething', 'sub', 'doSomethingElse']));
    });

    it('checks if an object is empty', () => {
        expect(CoreObject.isEmpty({})).toEqual(true);
        expect(CoreObject.isEmpty({ foo: 1 })).toEqual(false);
    });

    it('creates a copy of an object with certain properties (using a list)', () => {
        const originalObject = {
            foo: 1,
            bar: 2,
            baz: 3,
        };

        expect(CoreObject.only(originalObject, [])).toEqual({});
        expect(CoreObject.only(originalObject, ['foo'])).toEqual({
            foo: 1,
        });
        expect(CoreObject.only(originalObject, ['foo', 'baz'])).toEqual({
            foo: 1,
            baz: 3,
        });
        expect(CoreObject.only(originalObject, ['foo', 'bar', 'baz'])).toEqual(originalObject);
        expect(originalObject).toEqual({
            foo: 1,
            bar: 2,
            baz: 3,
        });
    });

    it('creates a copy of an object with certain properties (using a regular expression)', () => {
        const originalObject = {
            foo: 1,
            bar: 2,
            baz: 3,
        };

        expect(CoreObject.only(originalObject, /.*/)).toEqual(originalObject);
        expect(CoreObject.only(originalObject, /^ba.*/)).toEqual({
            bar: 2,
            baz: 3,
        });
        expect(CoreObject.only(originalObject, /(foo|bar)/)).toEqual({
            foo: 1,
            bar: 2,
        });
        expect(CoreObject.only(originalObject, /notfound/)).toEqual({});
        expect(originalObject).toEqual({
            foo: 1,
            bar: 2,
            baz: 3,
        });
    });

    it('creates a copy of an object without certain properties', () => {
        const originalObject = {
            foo: 1,
            bar: 2,
            baz: 3,
        };

        expect(CoreObject.without(originalObject, [])).toEqual(originalObject);
        expect(CoreObject.without(originalObject, ['foo'])).toEqual({
            bar: 2,
            baz: 3,
        });
        expect(CoreObject.without(originalObject, ['foo', 'baz'])).toEqual({
            bar: 2,
        });
        expect(originalObject).toEqual({
            foo: 1,
            bar: 2,
            baz: 3,
        });
    });

    it('creates a copy of an object without null/undefined properties', () => {
        const objectWithoutEmpty = {
            bool: false,
            num: 0,
            nan: NaN,
            str: '',
            obj: {},
            arr: [],
        };

        expect(CoreObject.withoutEmpty({
            ...objectWithoutEmpty,
            foo: null,
            bar: undefined,
            baz: null,
        })).toEqual(objectWithoutEmpty);
    });

    it('creates a copy of an object without undefined properties', () => {
        const objectWithoutUndefined = {
            bool: false,
            num: 0,
            nan: NaN,
            str: '',
            obj: {},
            arr: [],
            foo: null,
        };

        expect(CoreObject.withoutUndefined({
            ...objectWithoutUndefined,
            bar: undefined,
            baz: undefined,
        })).toEqual(objectWithoutUndefined);
    });

});

class TestParentClass {

    foo = 1;
    protected bar = 2;
    private baz = 3;

    protected doSomething(): void {
        // Nothing to do.
    }

}

class TestSubClass extends TestParentClass {

    foo = 10;
    protected bar = 20;
    private sub = 30;

    protected doSomethingElse(): void {
        // Nothing to do.
    }

}
