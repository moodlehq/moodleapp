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
    static only<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
    static only<T>(obj: T, regex: RegExp): Partial<T>;
    static only<T, K extends keyof T>(obj: T, keysOrRegex: K[] | RegExp): Pick<T, K> | Partial<T> {
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
    static withoutEmpty<T>(obj: T): CoreObjectWithoutEmpty<T> {
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
    static withoutUndefined<T>(obj: T): CoreObjectWithoutUndefined<T> {
        const cleanObj = {};

        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined) {
                continue;
            }

            cleanObj[key] = value;
        }

        return cleanObj as CoreObjectWithoutUndefined<T>;
    }

}
