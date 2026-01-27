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

import { Pretty } from '@/core/utils/types';

type ValueWithoutEmpty<T> = T extends null | undefined ? never : T;
type ValueWithoutUndefined<T> = T extends undefined ? never : T;

export type CoreObjectWithoutEmpty<T> = Pretty<{
    [k in keyof T]: ValueWithoutEmpty<T[k]>;
}>;

export type CoreObjectWithoutUndefined<T> = Pretty<{
    [k in keyof T]: ValueWithoutUndefined<T[k]>;
}>;

/**
 * Singleton with helper functions for objects.
 */
export class CoreObject {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Returns a value of an object and deletes it from the object.
     *
     * @param obj Object.
     * @param key Key of the value to consume.
     * @returns Whether objects are equal.
     */
    static consumeKey<T, K extends keyof T>(obj: T, key: K): T[K] {
        const value = obj[key];
        delete obj[key];

        return value;
    }

    /**
     * Check if two objects have the same shape and the same leaf values.
     *
     * @param a First object.
     * @param b Second object.
     * @returns Whether objects are equal.
     */
    static deepEquals<T=unknown>(a: T, b: T): boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    /**
     * Get all the properties names of an object, including the inherited ones except the ones from Object.prototype.
     *
     * @param object Object to get its properties.
     * @returns Set of property names.
     */
    static getAllPropertyNames(object: unknown): Set<string> {
        if (typeof object !== 'object' || object === null || object === Object.prototype) {
            // Not an object or we already reached root level.
            return new Set<string>([]);
        }

        const properties = CoreObject.getAllPropertyNames(Object.getPrototypeOf(object));

        Object.getOwnPropertyNames(object).forEach(property => properties.add(property));

        return properties;
    }

    /**
     * Check whether the given object is empty.
     *
     * @param object Object.
     * @returns Whether the given object is empty.
     */
    static isEmpty(object: Record<string, unknown>): boolean {
        return Object.keys(object).length === 0;
    }

    /**
     * Return an object including only certain keys.
     *
     * @param obj Object.
     * @param keysOrRegex If array is supplied, keys to include. Otherwise, regular expression used to filter keys.
     * @returns New object with only the specified keys.
     */
    static only<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
    static only<T extends object>(obj: T, regex: RegExp): Partial<T>;
    static only<T extends object, K extends keyof T>(obj: T, keysOrRegex: K[] | RegExp): Pick<T, K> | Partial<T> {
        const newObject: Partial<T> = {};

        if (Array.isArray(keysOrRegex)) {
            for (const key of keysOrRegex) {
                newObject[key] = obj[key];
            }
        } else {
            const originalKeys = Object.keys(obj);

            for (const key of originalKeys) {
                if (key.match(keysOrRegex)) {
                    newObject[key] = obj[key];
                }
            }
        }

        return newObject;
    }

    /**
     * Create a new object without the specified keys.
     *
     * @param obj Object.
     * @param keys Keys to remove from the new object.
     * @returns New object without the specified keys.
     */
    static without<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
        const newObject: T = { ...obj };

        for (const key of keys) {
            delete newObject[key];
        }

        return newObject;
    }

    /**
     * Create a new object without empty values (null or undefined).
     *
     * @param obj Objet.
     * @returns New object without empty values.
     */
    static withoutEmpty<T extends object>(obj: T): CoreObjectWithoutEmpty<T> {
        const cleanObj = {};

        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                continue;
            }

            cleanObj[key] = value;
        }

        return cleanObj as CoreObjectWithoutEmpty<T>;
    }

    /**
     * Create a new object without undefined values.
     *
     * @param obj Objet.
     * @returns New object without undefined values.
     */
    static withoutUndefined<T extends object>(obj: T): CoreObjectWithoutUndefined<T> {
        const cleanObj = {};

        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined) {
                continue;
            }

            cleanObj[key] = value;
        }

        return cleanObj as CoreObjectWithoutUndefined<T>;
    }

    /**
     * Tests to see whether two arrays or objects have the same value at a particular key.
     * Missing values are replaced by '', and the values are compared with ===.
     * Booleans and numbers are cast to string before comparing.
     *
     * @param obj1 The first object or array.
     * @param obj2 The second object or array.
     * @param key Key to check.
     * @returns Whether the two objects/arrays have the same value (or lack of one) for a given key.
     */
    static sameAtKeyMissingIsBlank(
        obj1: Record<string, unknown> | unknown[],
        obj2: Record<string, unknown> | unknown[],
        key: string,
    ): boolean {
        let value1 = obj1[key] !== undefined ? obj1[key] : '';
        let value2 = obj2[key] !== undefined ? obj2[key] : '';

        if (typeof value1 == 'number' || typeof value1 == 'boolean') {
            value1 = `${value1}`;
        }
        if (typeof value2 == 'number' || typeof value2 == 'boolean') {
            value2 = `${value2}`;
        }

        return value1 === value2;
    }

    /**
     * Stringify an object, sorting the properties. It doesn't sort arrays, only object properties. E.g.:
     * {b: 2, a: 1} -> '{"a":1,"b":2}'
     *
     * @param obj Object to stringify.
     * @returns Stringified object.
     */
    static sortAndStringify(obj: Record<string, unknown>): string {
        return JSON.stringify(CoreObject.sortProperties(obj));
    }

    /**
     * Given an object, sort its properties and the properties of all the nested objects.
     *
     * @param obj The object to sort. If it isn't an object, the original value will be returned.
     * @returns Sorted object.
     */
    static sortProperties<T>(obj: T): T {
        if (obj != null && typeof obj === 'object' && !Array.isArray(obj)) {
            // It's an object, sort it.
            return Object.keys(obj).sort().reduce((accumulator, key) => {
                // Always call sort with the value. If it isn't an object, the original value will be returned.
                accumulator[key] = CoreObject.sortProperties(obj[key]);

                return accumulator;
            }, {} as T);
        }

        return obj;
    }

    /**
     * Given an object, sort its values. Values need to be primitive values, it cannot have subobjects.
     *
     * @param obj The object to sort. If it isn't an object, the original value will be returned.
     * @returns Sorted object.
     */
    static sortValues<T>(obj: T): T {
        if (typeof obj === 'object' && !Array.isArray(obj)) {
            // It's an object, sort it. Convert it to an array to be able to sort it and then convert it back to object.
            const array = CoreObject.toArrayOfObjects(obj as Record<string, unknown>, 'name', 'value', false, true);

            return CoreObject.toKeyValueMap(array, 'name', 'value') as unknown as T;
        }

        return obj;
    }

    /**
     * Converts an object into an array, losing the keys.
     *
     * @param obj Object to convert.
     * @returns Array with the values of the object but losing the keys.
     */
    static toArray<T>(obj: Record<string, T>): T[] {
        return Object.keys(obj).map((key) => obj[key]);
    }

    /**
     * Converts an object into an array of objects, where each entry is an object containing
     * the key and value of the original object.
     * For example, it can convert {size: 2} into [{name: 'size', value: 2}].
     *
     * @param obj Object to convert.
     * @param keyName Name of the properties where to store the keys.
     * @param valueName Name of the properties where to store the values.
     * @param sortByKey True to sort keys alphabetically, false otherwise. Has priority over sortByValue.
     * @param sortByValue True to sort values alphabetically, false otherwise.
     * @returns Array of objects with the name & value of each property.
     */
    static toArrayOfObjects<
        A extends Record<string,unknown> = Record<string, unknown>,
        O extends Record<string, unknown> = Record<string, unknown>,
    >(
        obj: O,
        keyName: string,
        valueName: string,
        sortByKey?: boolean,
        sortByValue?: boolean,
    ): A[] {
        // Get the entries from an object or primitive value.
        const getEntries = (elKey: string, value: unknown): Record<string, unknown>[] | unknown => {
            if (value === undefined || value == null) {
                // Filter undefined and null values.
                return;
            } else if (CoreObject.isObject(value)) {
                // It's an object, return at least an entry for each property.
                const keys = Object.keys(value);
                let entries: unknown[] = [];

                keys.forEach((key) => {
                    const newElKey = elKey ? `${elKey}[${key}]` : key;
                    const subEntries = getEntries(newElKey, value[key]);

                    if (subEntries) {
                        entries = entries.concat(subEntries);
                    }
                });

                return entries;
            } else {
                // Not an object, return a single entry.
                const entry = {};
                entry[keyName] = elKey;
                entry[valueName] = value;

                return entry;
            }
        };

        if (!obj) {
            return [];
        }

        // "obj" will always be an object, so "entries" will always be an array.
        const entries = getEntries('', obj) as A[];
        if (sortByKey || sortByValue) {
            return entries.sort((a, b) => {
                if (sortByKey) {
                    return (a[keyName] as number) >= (b[keyName] as number) ? 1 : -1;
                } else {
                    return (a[valueName] as number) >= (b[valueName] as number) ? 1 : -1;
                }
            });
        }

        return entries;
    }

    /**
     * Converts an array of objects into an object with key and value. The opposite of objectToArrayOfObjects.
     * For example, it can convert [{name: 'size', value: 2}] into {size: 2}.
     *
     * @param objects List of objects to convert.
     * @param keyName Name of the properties where the keys are stored.
     * @param valueName Name of the properties where the values are stored.
     * @param keyPrefix Key prefix if neededs to delete it.
     * @returns Object.
     */
    static toKeyValueMap<T = unknown>(
        objects: Record<string, unknown>[],
        keyName: string,
        valueName: string,
        keyPrefix?: string,
    ): { [name: string]: T } {
        const prefixSubstr = keyPrefix ? keyPrefix.length : 0;
        const mapped = {};
        objects.forEach((item) => {
            const keyValue = item[keyName] as string;
            const key = prefixSubstr > 0 ? keyValue.substring(prefixSubstr) : keyValue;
            mapped[key] = item[valueName];
        });

        return mapped;
    }

    /**
     * Convert an object to a format of GET param. E.g.: {a: 1, b: 2} -> a=1&b=2
     *
     * @param object Object to convert.
     * @param removeEmpty Whether to remove params whose value is null/undefined.
     * @returns GET params.
     */
    static toGetParams(object: Record<string, unknown>, removeEmpty = true): string {
        // First of all, flatten the object so all properties are in the first level.
        const flattened = CoreObject.flatten(object);
        let result = '';
        let joinChar = '';

        for (const name in flattened) {
            let value = flattened[name];

            if (removeEmpty && (value === null || value === undefined)) {
                continue;
            }

            if (typeof value === 'boolean') {
                value = value ? 1 : 0;
            }

            result += `${joinChar + name  }=${value}`;
            joinChar = '&';
        }

        return result;
    }

    /**
     * Add a prefix to all the keys in an object.
     *
     * @param data Object.
     * @param prefix Prefix to add.
     * @returns Prefixed object.
     */
    static prefixKeys(data: Record<string, unknown>, prefix: string): Record<string, unknown> {
        const newObj = {};
        const keys = Object.keys(data);

        keys.forEach((key) => {
            newObj[prefix + key] = data[key];
        });

        return newObj;
    }

    /**
     * Function to enumerate enum keys.
     *
     * @param enumeration Enumeration object.
     * @returns Keys of the enumeration.
     */
    static enumKeys<O extends object, K extends keyof O = keyof O>(enumeration: O): K[] {
        return Object.keys(enumeration).filter(k => Number.isNaN(+k)) as K[];
    }

    /**
     * Check if a value is an object.
     *
     * @param object Variable.
     * @returns Type guard indicating if this is an object.
     */
    static isObject(object: unknown): object is Record<string, unknown> {
        return typeof object === 'object' && object !== null;
    }

    /**
     * Flatten an object, moving subobjects' properties to the first level.
     * It supports 2 notations: dot notation and square brackets.
     * E.g.: {a: {b: 1, c: 2}, d: 3} -> {'a.b': 1, 'a.c': 2, d: 3}
     *
     * @param obj Object to flatten.
     * @param useDotNotation Whether to use dot notation '.' or square brackets '['.
     * @returns Flattened object.
     */
    static flatten(obj: Record<string, unknown>, useDotNotation?: boolean): Record<string, unknown> {
        const toReturn = {};

        for (const name in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, name)) {
                continue;
            }

            const value = obj[name];
            if (typeof value === 'object' && !Array.isArray(value)) {
                const flatObject = CoreObject.flatten(value as Record<string, unknown>);
                for (const subName in flatObject) {
                    if (!Object.prototype.hasOwnProperty.call(flatObject, subName)) {
                        continue;
                    }

                    const newName = useDotNotation ? `${name}.${subName}` : `${name}[${subName}]`;
                    toReturn[newName] = flatObject[subName];
                }
            } else {
                toReturn[name] = value;
            }
        }

        return toReturn;
    }

    /**
     * Compare two objects. This function won't compare functions and proto properties, it's a basic compare.
     * Also, this will only check if itemA's properties are in itemB with same value. This function will still
     * return true if itemB has more properties than itemA.
     *
     * @param itemA First object.
     * @param itemB Second object.
     * @param maxLevels Number of levels to reach if 2 objects are compared.
     * @param level Current deep level (when comparing objects).
     * @param undefinedIsNull True if undefined is equal to null. Defaults to true.
     * @returns Whether both items are equal.
     */
    static basicLeftCompare(
        itemA: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        itemB: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        maxLevels = 0,
        level = 0,
        undefinedIsNull = true,
    ): boolean {
        if (typeof itemA == 'function' || typeof itemB == 'function') {
            return true; // Don't compare functions.
        }

        if (typeof itemA === 'object' && typeof itemB === 'object') {
            if (level >= maxLevels) {
                return true; // Max deep reached.
            }

            let equal = true;
            for (const name in itemA) {
                const value = itemA[name];
                if (name == '$$hashKey') {
                    // Ignore $$hashKey property since it's a "calculated" property.
                    continue;
                }

                if (!CoreObject.basicLeftCompare(value, itemB[name], maxLevels, level + 1)) {
                    equal = false;
                }
            }

            return equal;
        }

        if (undefinedIsNull && (
            (itemA === undefined && itemB === null) || (itemA === null && itemB === undefined))) {
            return true;
        }

        // We'll treat "2" and 2 as the same value.
        const floatA = parseFloat(itemA);
        const floatB = parseFloat(itemB);

        if (!isNaN(floatA) && !isNaN(floatB)) {
            return floatA == floatB;
        }

        return itemA === itemB;
    }

}
