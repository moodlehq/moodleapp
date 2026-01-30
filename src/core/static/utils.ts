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

import { Translate } from '@singletons';
import { CoreLogger } from './logger';
import { CoreObject } from './object';
import { CoreFileUtils } from './file-utils';

/**
 * Static class with utils helper functions.
 */
export class CoreUtils {

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    protected static readonly DONT_CLONE = ['[object FileEntry]', '[object DirectoryEntry]', '[object DOMFileSystem]'];

    protected static logger = CoreLogger.getInstance('CoreUtils');
    protected static uniqueIds: { [name: string]: number } = {};

    /**
     * Clone a variable. It should be an object, array or primitive type.
     *
     * @param source The variable to clone.
     * @param level Depth we are right now inside a cloned object. It's used to prevent reaching max call stack size.
     * @returns Cloned variable.
     */
    static clone<T>(source: T, level = 0): T {
        if (level >= 20) {
            // Max 20 levels.
            CoreUtils.logger.error('Max depth reached when cloning object.', source);

            return source;
        }

        if (CoreFileUtils.valueIsFileEntry(source)) {
            // Don't clone FileEntry. It has a lot of depth and they shouldn't be modified.
            return source;
        } else if (Array.isArray(source)) {
            // Clone the array and all the entries.
            const newArray = [] as unknown as T;
            for (let i = 0; i < source.length; i++) {
                newArray[i] = CoreUtils.clone(source[i], level + 1);
            }

            return newArray;
        } else if (CoreObject.isObject(source)) {
            // Check if the object shouldn't be copied.
            if (source.toString && CoreUtils.DONT_CLONE.indexOf(source.toString()) !== -1) {
                // Object shouldn't be copied, return it as it is.
                return source;
            }

            // Clone the object and all the subproperties.
            const newObject = {} as T;
            for (const name in source) {
                newObject[name] = CoreUtils.clone(source[name], level + 1);
            }

            return newObject;
        } else {
            // Primitive type or unknown, return it as it is.
            return source;
        }
    }

    /**
     * Given a float, prints it nicely. Localized floats must not be used in calculations!
     * Based on Moodle's format_float.
     *
     * @param float The float to print.
     * @returns Locale float.
     */
    static formatFloat(float: unknown): string {
        if (float === undefined || float === null || typeof float === 'boolean') {
            return '';
        }

        const localeSeparator = Translate.instant('core.decsep');

        const floatString = String(float);

        return floatString.replace('.', localeSeparator);
    }

    /**
     * Returns a tree formatted from a plain list.
     * List has to be sorted by depth to allow this function to work correctly. Errors can be thrown if a child node is
     * processed before a parent node.
     *
     * @param list List to format.
     * @param parentFieldName Name of the parent field to match with children.
     * @param idFieldName Name of the children field to match with parent.
     * @param rootParentId The id of the root.
     * @param maxDepth Max Depth to convert to tree. Children found will be in the last level of depth.
     * @returns Array with the formatted tree, children will be on each node under children field.
     */
    static formatTree<T>(
        list: T[],
        parentFieldName = 'parent',
        idFieldName = 'id',
        rootParentId = 0,
        maxDepth = 5,
    ): TreeNode<T>[] {
        const map = {};
        const mapDepth = {};
        const tree: TreeNode<T>[] = [];

        // Create a map first to avoid problems with not sorted.
        list.forEach((node: TreeNode<T>, index): void => {
            const id = node[idFieldName];

            if (id === undefined) {
                CoreUtils.logger.error(`Node with incorrect ${idFieldName}:${id} found on formatTree`);
            }

            if (node.children === undefined) {
                node.children = [];
            }
            map[id] = index;
        });

        list.forEach((node: TreeNode<T>): void => {
            const id = node[idFieldName];
            const parent = node[parentFieldName];

            if (id === undefined || parent === undefined) {
                CoreUtils.logger.error(`Node with incorrect ${idFieldName}:${id}
                    or ${parentFieldName}:${parent} found on formatTree`);
            }

            // Use map to look-up the parents.
            if (parent !== rootParentId) {
                const parentNode = list[map[parent]] as TreeNode<T>;
                if (parentNode) {
                    if (mapDepth[parent] === maxDepth) {
                        // Reached max level of depth. Proceed with flat order. Find parent object of the current node.
                        const parentOfParent = parentNode[parentFieldName];
                        if (parentOfParent) {
                            // This element will be the child of the node that is two levels up the hierarchy
                            // (i.e. the child of node.parent.parent).
                            (list[map[parentOfParent]] as TreeNode<T>).children.push(node);
                            // Assign depth level to the same depth as the parent (i.e. max depth level).
                            mapDepth[id] = mapDepth[parent];
                            // Change the parent to be the one that is two levels up the hierarchy.
                            node[parentFieldName] = parentOfParent;
                        } else {
                            CoreUtils.logger.error(`Node parent of parent:${parentOfParent} not found on formatTree`);
                        }
                    } else {
                        parentNode.children.push(node);
                        // Increase the depth level.
                        mapDepth[id] = mapDepth[parent] + 1;
                    }
                } else {
                    CoreUtils.logger.error(`Node parent:${parent} not found on formatTree`);
                }
            } else {
                tree.push(node);

                // Root elements are the first elements in the tree structure, therefore have the depth level 1.
                mapDepth[id] = 1;
            }
        });

        return tree;
    }

    /**
     * Get a unique ID for a certain name.
     *
     * @param name The name to get the ID for.
     * @returns Unique ID.
     */
    static getUniqueId(name: string): number {
        if (!CoreUtils.uniqueIds[name]) {
            CoreUtils.uniqueIds[name] = 0;
        }

        return ++CoreUtils.uniqueIds[name];
    }

    /**
     * Return true if the param is false (bool), 0 (number) or "0" (string).
     *
     * @param value Value to check.
     * @returns Whether the value is false, 0 or "0".
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static isFalseOrZero(value: any): boolean {
        return value !== undefined && (value === false || value === 'false' || parseInt(value, 10) === 0);
    }

    /**
     * Return true if the param is true (bool), 1 (number) or "1" (string).
     *
     * @param value Value to check.
     * @returns Whether the value is true, 1 or "1".
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static isTrueOrOne(value: any): boolean {
        return value !== undefined && (value === true || value === 'true' || parseInt(value, 10) === 1);
    }

    /**
     * Given a list (e.g. a,b,c,d,e) this function returns an array of 1->a, 2->b, 3->c etc.
     * Taken from make_menu_from_list on moodlelib.php (not the same but similar).
     *
     * @param list The string to explode into array bits
     * @param defaultLabel Element that will become default option, if not defined, it won't be added.
     * @param separator The separator used within the list string. Default ','.
     * @param defaultValue Element that will become default option value. Default 0.
     * @returns The now assembled array
     */
    static makeMenuFromList<T>(
        list: string,
        defaultLabel?: string,
        separator = ',',
        defaultValue?: T,
    ): CoreMenuItem<T>[] {
        // Split and format the list.
        const split = list.split(separator).map((label, index) => ({
            label: label.trim(),
            value: index + 1,
        })) as { label: string; value: T | number }[];

        if (defaultLabel) {
            split.unshift({
                label: defaultLabel,
                value: defaultValue || 0,
            });
        }

        return split;
    }

    /**
     * Converts locale specific floating point/comma number back to a standard float number.
     * Do NOT try to do any math operations before this conversion on any user submitted floats!
     * Based on Moodle's unformat_float function.
     *
     * @param localeFloat Locale aware float representation.
     * @param strict If true, then check the input and return false if it is not a valid number.
     * @returns False if bad format, empty string if empty value or the parsed float if not.
     */
    static unformatFloat(localeFloat: string | number | null | undefined, strict?: boolean): false | '' | number {
        // Bad format on input type number.
        if (localeFloat === undefined) {
            return false;
        }

        // Empty (but not zero).
        if (localeFloat === null) {
            return '';
        }

        // Convert float to string.
        localeFloat = String(localeFloat);
        localeFloat = localeFloat.trim();

        if (localeFloat === '') {
            return '';
        }

        localeFloat = localeFloat.replace(' ', ''); // No spaces - those might be used as thousand separators.
        localeFloat = localeFloat.replace(Translate.instant('core.decsep'), '.');

        // Use Number instead of parseFloat because the latter truncates the number when it finds ",", while Number returns NaN.
        // If the number still has "," then it means it's not a valid separator.
        const parsedFloat = Number(localeFloat);

        // Bad format.
        if (strict && (!isFinite(parsedFloat) || isNaN(parsedFloat))) {
            return false;
        }

        return parsedFloat;
    }

    /**
     * Debounce a function so consecutive calls are ignored until a certain time has passed since the last call.
     *
     * @param fn Function to debounce.
     * @param delay Time that must pass until the function is called.
     * @returns Debounced function.
     */
    static debounce<T extends unknown[]>(fn: (...args: T) => unknown, delay: number): (...args: T) => void {
        let timeoutID: number;

        const debounced = (...args: T): void => {
            clearTimeout(timeoutID);

            timeoutID = window.setTimeout(() => fn(...args), delay);
        };

        return debounced;
    }

    /**
     * Throttle a function so consecutive calls are ignored until a certain time has passed since the last executed call.
     *
     * @param fn Function to throttle.
     * @param duration Time that must pass until the function is called.
     * @returns Throttled function.
     */
    static throttle<T extends unknown[]>(fn: (...args: T) => unknown, duration: number): (...args: T) => void {
        let shouldWait = false;

        const throttled = (...args: T): void => {
            if (!shouldWait) {
                fn(...args);

                shouldWait = true;

                setTimeout(() => {
                    shouldWait = false;
                }, duration);
            }
        };

        return throttled;
    }

 }

export type TreeNode<T> = T & { children: TreeNode<T>[] };

/**
 * Menu item.
 */
export type CoreMenuItem<T = number> = {
    label: string;
    value: T | number;
};
