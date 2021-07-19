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
 * A cache to store values in memory to speed up processes.
 *
 * The data is organized by "entries" that are identified by an ID. Each entry can have multiple values stored,
 * and each value has its own timemodified.
 *
 * Values expire after a certain time.
 */
export class CoreCache {

    protected cacheStore: {
        [key: string]: CoreCacheEntry;
    } = {};

    /**
     * Clear the cache.
     */
    clear(): void {
        this.cacheStore = {};
    }

    /**
     * Get all the data stored in the cache for a certain id.
     *
     * @param id The ID to identify the entry.
     * @return The data from the cache. Undefined if not found.
     */
    getEntry(id: string): CoreCacheEntry {
        if (!this.cacheStore[id]) {
            this.cacheStore[id] = {};
        }

        return this.cacheStore[id];
    }

    /**
     * Get the status of a module from the "cache".
     *
     * @param id The ID to identify the entry.
     * @param name Name of the value to get.
     * @param ignoreInvalidate Whether it should always return the cached data, even if it's expired.
     * @return Cached value. Undefined if not cached or expired.
     */
    getValue<T = unknown>(id: string, name: string, ignoreInvalidate = false): T | undefined {
        const entry = this.getEntry(id);

        if (entry[name] && typeof entry[name].value != 'undefined') {
            const now = Date.now();
            // Invalidate after 5 minutes.
            if (ignoreInvalidate || entry[name].timemodified + 300000 >= now) {
                return entry[name].value;
            }
        }

        return undefined;
    }

    /**
     * Invalidate all the cached data for a certain entry.
     *
     * @param id The ID to identify the entry.
     */
    invalidate(id: string): void {
        const entry = this.getEntry(id);
        for (const name in entry) {
            entry[name].timemodified = 0;
        }
    }

    /**
     * Update the status of a module in the "cache".
     *
     * @param id The ID to identify the entry.
     * @param name Name of the value to set.
     * @param value Value to set.
     * @return The set value.
     */
    setValue<T>(id: string, name: string, value: T): T {
        const entry = this.getEntry(id);
        entry[name] = {
            value: value,
            timemodified: Date.now(),
        };

        return value;
    }

}

/**
 * Cache entry
 */
export type CoreCacheEntry = {
    [name: string]: {
        value?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        timemodified: number;
    };
};
