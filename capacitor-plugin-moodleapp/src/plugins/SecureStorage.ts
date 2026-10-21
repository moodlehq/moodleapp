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

import { registerPlugin } from '@capacitor/core';

const NativeSecureStorage = registerPlugin<NativeSecureStoragePlugin>('MoodleAppSecureStorage');

/**
 * Allows retrieving and storing items in secure storage.
 */
export class SecureStorage {

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

        return NativeSecureStorage.get({ names, collection });
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

        await NativeSecureStorage.store({ data, collection });
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

        await NativeSecureStorage.delete({ names, collection });
    }

    /**
     * Delete all values for a certain collection.
     *
     * @param collection The collection to delete.
     */
    async deleteCollection(collection: string): Promise<void> {
        await NativeSecureStorage.deleteCollection({ collection });
    }

}

type NativeSecureStoragePlugin = {
    get(options: SecureStorageGetOptions): Promise<Record<string, string>>;
    store(options: SecureStorageStoreOptions): Promise<void>;
    delete(options: SecureStorageDeleteOptions): Promise<void>;
    deleteCollection(options: SecureStorageDeleteCollectionOptions): Promise<void>;
};

type SecureStorageGetOptions = {
    names: string[];
    collection: string;
};

type SecureStorageStoreOptions = {
    data: Record<string, string>;
    collection: string;
};

type SecureStorageDeleteOptions = {
    names: string[];
    collection: string;
};

type SecureStorageDeleteCollectionOptions = {
    collection: string;
};
