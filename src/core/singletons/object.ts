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

export type CoreObjectWithoutEmpty<T> = {
    [k in keyof T]: T[k] extends undefined | null ? never : T[k];
};

export type CoreObjectWithoutUndefined<T> = {
    [k in keyof T]: T[k] extends undefined ? never : T[k];
};

/**
 * Singleton with helper functions for objects.
 */
export class CoreObject {

    /**
     * Check if two objects have the same shape and the same leaf values.
     *
     * @param a First object.
     * @param b Second object.
     * @return Whether objects are equal.
     */
    static deepEquals<T=unknown>(a: T, b: T): boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    /**
     * Get all the properties names of an object, including the inherited ones except the ones from Object.prototype.
     *
     * @param object Object to get its properties.
     * @return Set of property names.
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
     * @return Whether the given object is empty.
     */
    static isEmpty(object: Record<string, unknown>): boolean {
        return Object.keys(object).length === 0;
    }

    /**
     * Create a new object without the specified keys.
     *
     * @param obj Object.
     * @param keys Keys to remove from the new object.
     * @return New object without the specified keys.
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
     * @return New object without empty values.
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
     * @return New object without undefined values.
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
