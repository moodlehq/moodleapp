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

/**
 * Singleton with helper functions for arrays.
 */
export class CoreArray {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Converts an array of objects to an object, using a property of each entry as the key.
     * It can also be used to convert an array of strings to an object where the keys are the elements of the array.
     * E.g. [{id: 10, name: 'A'}, {id: 11, name: 'B'}] => {10: {id: 10, name: 'A'}, 11: {id: 11, name: 'B'}}
     *
     * @param array The array to convert.
     * @param propertyName The name of the property to use as the key. If not provided, the whole item will be used.
     * @param result Object where to put the properties. If not defined, a new object will be created.
     * @returns The object.
     */
    static toObject<T>(
        array: T[] = [],
        propertyName?: string,
        result: Record<string | number | symbol, T> = {},
    ): Record<string | number | symbol, T> {
        for (const entry of array) {
            const key: string | number | symbol = propertyName ? entry[propertyName] : entry;

            result[key] = entry;
        }

        return result;
    }

    /**
     * Converts an array of objects to an indexed array, using a property of each entry as the key.
     * Every entry will contain an array of the found objects of the property identifier.
     * E.g. [{id: 10, name: 'A'}, {id: 10, name: 'B'}] => {10: [ {id: 10, name: 'A'}, {id: 10, name: 'B'} ] }
     *
     * @param array The array to convert.
     * @param propertyName The name of the property to use as the key. If not provided, the whole item will be used.
     * @param result Object where to put the properties. If not defined, a new object will be created.
     * @returns The object.
     */
    static toObjectMultiple<T>(
        array: T[] = [],
        propertyName?: string,
        result: Record<string, T[]> = {},
    ): Record<string, T[]> {
        for (const entry of array) {
            const key = propertyName ? entry[propertyName] : entry;
            if (result[key] === undefined) {
                result[key] = [];
            }

            result[key].push(entry);
        }

        return result;
    }

    /**
     * Flatten the first dimension of a multi-dimensional array.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat#reduce_and_concat
     *
     * @param arr Original array.
     * @returns Flattened array.
     * @deprecated since 4.4 Use Array.prototype.flat() instead.
     */
    static flatten<T>(arr: T[][]): T[] {
        // eslint-disable-next-line no-console
        console.warn('CoreArray.flatten is deprecated and will be removed soon. Please use array \'flat\' instead.');

        return arr.flat();
    }

    /**
     * Obtain a new array without the specified item.
     *
     * @param arr Array.
     * @param item Item to remove.
     * @returns Array without the specified item.
     */
    static withoutItem<T>(arr: T[], item: T): T[] {
        const newArray = [...arr];
        const index = arr.indexOf(item);

        if (index !== -1) {
            newArray.splice(index, 1);
        }

        return newArray;
    }

    /**
     * Return an array without duplicate values.
     *
     * @param array The array to treat.
     * @param [key] Key of the property that must be unique. If not specified, the whole entry.
     * @returns Array without duplicate values.
     */
    static unique<T>(array: T[], key?: string): T[] {
        const unique = {}; // Use an object to make it faster to check if it's duplicate.

        return array.filter(entry => {
            const value = key ? entry[key] : entry;

            if (value in unique) {
                return false;
            }

            unique[value] = true;

            return true;
        });
    }

    /**
     * Given an array of strings, return only the ones that match a regular expression.
     *
     * @param array Array to filter.
     * @param regex RegExp to apply to each string.
     * @returns Filtered array.
     */
    static filterByRegexp(array: string[], regex: RegExp): string[] {
        if (!array || !array.length) {
            return [];
        }

        return array.filter((entry) => {
            const matches = entry.match(regex);

            return matches && matches.length;
        });
    }

    /**
     * Merge two arrays, removing duplicate values.
     *
     * @param array1 The first array.
     * @param array2 The second array.
     * @param [key] Key of the property that must be unique. If not specified, the whole entry.
     * @returns Merged array.
     */
    static mergeWithoutDuplicates<T>(array1: T[], array2: T[], key?: string): T[] {
        return CoreArray.unique(array1.concat(array2), key) as T[];
    }

    /**
     * Gets the index of the first string that matches a regular expression.
     *
     * @param array Array to search.
     * @param regex RegExp to apply to each string.
     * @returns Index of the first string that matches the RegExp. -1 if not found.
     */
    static indexOfRegexp(array: string[], regex: RegExp): number {
        if (!array || !array.length) {
            return -1;
        }

        for (let i = 0; i < array.length; i++) {
            const entry = array[i];
            const matches = entry.match(regex);

            if (matches && matches.length) {
                return i;
            }
        }

        return -1;
    }

}
