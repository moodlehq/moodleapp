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

}
