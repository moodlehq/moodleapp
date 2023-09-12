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

import { SecureStorage } from 'cordova-plugin-moodleapp';

/**
 * Mock for SecureStorage plugin. It will store the data without being encrypted.
 */
export class SecureStorageMock implements SecureStorage {

    /**
     * Get one or more values.
     *
     * @param names Names of the values to get.
     * @param collection The collection where the values are stored.
     * @returns Object with name -> value. If a name isn't found it won't be included in the result.
     */
    async get(names: string | string[], collection: string): Promise<Record<string, string>> {
        if (typeof names === 'string') {
            names = [names];
        }

        const result: Record<string, string> = {};

        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (!name) {
                continue;
            }

            const storedValue = localStorage.getItem(this.getPrefixedName(name, collection));
            if (storedValue !== null) {
                result[name] = storedValue;
            }
        }

        return result;
    }

    /**
     * Get the prefix to add to a name, including the collection.
     *
     * @param collection Collection name.
     * @returns Prefix.
     */
    private getCollectionPrefix(collection: string): string {
        return `SecureStorage_${collection}_`;
    }

    /**
     * Get the full name to retrieve, store or delete an item.
     *
     * @param name Name inside collection.
     * @param collection Collection name.
     * @returns Full name.
     */
    private getPrefixedName(name: string, collection: string): string {
        return this.getCollectionPrefix(collection) + name;
    }

    /**
     * Set one or more values.
     *
     * @param data Object with values to store, in format name -> value. Null or undefined valid values will be ignored.
     * @param collection The collection where to store the values.
     */
    async store(data: Record<string, string>, collection: string): Promise<void> {
        for (const name in data) {
            const value = data[name];
            if (value === undefined || value === null) {
                delete data[name];
            } else if (typeof value !== 'string') {
                throw new Error(`SecureStorage: Invalid value for ${name}. Expected string, received ${typeof value}`);
            }
        }

        for (const name in data) {
            if (!name) {
                continue;
            }

            const value = data[name];
            localStorage.setItem(this.getPrefixedName(name, collection), value);
        }
    }

    /**
     * Delete one or more values.
     *
     * @param names Names to delete.
     * @param collection The collection where to delete the values.
     */
    async delete(names: string | string[], collection: string): Promise<void> {
        if (typeof names === 'string') {
            names = [names];
        }

        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (!name) {
                continue;
            }

            localStorage.removeItem(this.getPrefixedName(name, collection));
        }
    }

    /**
     * Delete all values for a certain collection.
     *
     * @param collection The collection to delete.
     */
    async deleteCollection(collection: string): Promise<void> {
        const names = Object.keys(localStorage);
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (name.startsWith(this.getCollectionPrefix(collection))) {
                localStorage.removeItem(name);
            }
        }
    }

}
