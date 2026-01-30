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

import { CoreLogger } from './logger';

/**
 * Static class with helper functions to apply JSON patches.
 * Only supports 'add', 'remove' and 'replace' operations.
 * It supports some custom syntax to identify array entries besides using numeric indexes:
 * - [key=value]: search an object in the array where the property 'key' has the value 'value'.
 * - value: search an element in the array with the given value (only for arrays of primitive types).
 *
 * See the RFC 6902 for more information: https://datatracker.ietf.org/doc/html/rfc6902.
 */
export class CoreJsonPatch {

    protected static logger = CoreLogger.getInstance('CoreJsonPatch');

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Apply multiple JSON patches to an object or array. The original object/array is modified.
     *
     * @param objOrArray Object or array to apply the patches to.
     * @param patches Array of patch operations to apply.
     * @returns The modified object or array.
     */
    static applyPatches<T = unknown>(objOrArray: T, patches: JsonPatchOperation[]): T {
        patches.forEach((patch) => {
            try {
                CoreJsonPatch.applyPatch(objOrArray, patch);
            } catch (error) {
                CoreJsonPatch.logger.error('Error applying patch:', error, patch);
            }
        });

        return objOrArray;
    }

    /**
     * Apply a JSON patch operation to an object or array. The original object/array is modified.
     *
     * @param objOrArray Object or array to apply the patch to.
     * @param patch Patch operation to apply.
     * @returns The modified object or array.
     */
    static applyPatch<T = unknown>(objOrArray: T, patch: JsonPatchOperation): T {
        if (patch.op !== 'add' && patch.op !== 'remove' && patch.op !== 'replace') {
            throw new Error(`Unsupported operation: ${patch.op}`);
        }

        const keys = patch.path.split('/');

        let target = objOrArray;
        for (let i = 1; i < keys.length - 1; i++) {
            if (Array.isArray(target)) {
                const index = CoreJsonPatch.getArrayIndex(target, keys[i], false);
                target = target[index];
            } else if (typeof target === 'object' && target !== null) {
                target = target[keys[i]];
            } else {
                const type = target === null ? 'null' : typeof target;
                throw new Error(`Invalid path: ${patch.path}. '${keys[i]}' parent is not an object or an array: ${type}`);
            }
        }

        if (Array.isArray(target)) {
            CoreJsonPatch.applyArrayOperation(target, keys[keys.length - 1], patch);
        } else if (typeof target === 'object' && target !== null) {
            CoreJsonPatch.applyObjectOperation(target as Record<string, unknown>, keys[keys.length - 1], patch);
        } else {
            const type = target === null ? 'null' : typeof target;
            throw new Error(`Invalid path: ${patch.path}. '${keys[keys.length - 2]}' parent is not an object or an array: ${type}`);
        }

        return objOrArray;
    }

    /**
     * Apply an operation to an array.
     *
     * @param target Array to modify.
     * @param key Key of the element to modify.
     * @param patch Patch operation to apply.
     */
    protected static applyArrayOperation(target: unknown[], key: string, patch: JsonPatchOperation): void {
        const index = CoreJsonPatch.getArrayIndex(target, key, patch.op === 'add');

        switch (patch.op) {
            case 'add':
                target.splice(index, 0, patch.value);
                break;
            case 'remove':
                target.splice(index, 1);
                break;
            case 'replace':
                target[index] = patch.value;
                break;
        }
    }

    /**
     * Apply an operation to an object.
     *
     * @param target Object to modify.
     * @param key Key of the element to modify.
     * @param patch Patch operation to apply.
     */
    protected static applyObjectOperation(target: Record<string, unknown>, key: string, patch: JsonPatchOperation): void {
        if (patch.op === 'add' || patch.op === 'replace') {
            target[key] = patch.value;
        } else if (patch.op === 'remove') {
            delete target[key];
        }
    }

    /**
     * Given a value of a path and an array, get the index of an element in an array.
     *
     * @param array Array to search the element in.
     * @param pathValue Value of the path used to get the index.
     * @param allowIndexEnd Whether to allow returning an index equal to array.length (used when adding values).
     * @returns Index of the element or null if not found.
     */
    protected static getArrayIndex(array: unknown[], pathValue: string, allowIndexEnd = false): number {
        if (pathValue === '-') {
            if (!allowIndexEnd) {
                throw new Error('Using \'-\' is only allowed when adding elements to the end of the array.');
            }

            return array.length;
        }

        let index = parseInt(pathValue, 10);
        if (!isNaN(index)) {
            if (index < 0 || index >= array.length) {
                throw new Error(`Numeric index ${pathValue} out of array bounds: ${JSON.stringify(array)}`);
            }

            return index;
        }

        // First check [key=value] format to search elements in the array.
        const matches = pathValue.match(/^\[([^=]+)=([^\]]+)\]$/);
        if (matches) {
            // When finding by key=value, assume the array is an array of objects.
            index = (<Record<string, unknown>[]> array).findIndex(item => String(item[matches[1]]) === matches[2]);
            if (index === -1) {
                throw new Error(`Element with ${matches[1]}=${matches[2]} not found in array: ${JSON.stringify(array)}`);
            }

            return index;
        }

        // Support identifying items by value in case of arrays of primitive types.
        index = array.findIndex(item => String(item) === pathValue);
        if (index === -1) {
            throw new Error(`Element with value ${pathValue} not found in array: ${JSON.stringify(array)}`);
        }

        return index;
    }

}

/**
 * Operation to patch a JSON.
 */
export type JsonPatchOperation = {
    op: 'add' | 'remove' | 'replace';
    path: string;
    value?: unknown;
};
