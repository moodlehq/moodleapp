// (C) Copyright 2015 Martin Dougiamas
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
    protected cacheStore = {};

    constructor() {
        // Nothing to do.
    }

    /**
     * Clear the cache.
     */
    clear(): void {
        this.cacheStore = {};
    }

    /**
     * Get all the data stored in the cache for a certain id.
     *
     * @param {any} id The ID to identify the entry.
     * @return {any} The data from the cache. Undefined if not found.
     */
    getEntry(id: any): any {
        if (!this.cacheStore[id]) {
            this.cacheStore[id] = {};
        }

        return this.cacheStore[id];
    }

    /**
     * Get the status of a module from the "cache".
     *
     * @param {any} id The ID to identify the entry.
     * @param {string} name Name of the value to get.
     * @param {boolean} [ignoreInvalidate] Whether it should always return the cached data, even if it's expired.
     * @return {any} Cached value. Undefined if not cached or expired.
     */
    getValue(id: any, name: string, ignoreInvalidate?: boolean): any {
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
     * @param {any} id The ID to identify the entry.
     */
    invalidate(id: any): void {
        const entry = this.getEntry(id);
        for (const name in entry) {
            entry[name].timemodified = 0;
        }
    }

    /**
     * Update the status of a module in the "cache".
     *
     * @param {any} id The ID to identify the entry.
     * @param {string} name Name of the value to set.
     * @param {any} value Value to set.
     * @return {any} The set value.
     */
    setValue(id: any, name: string, value: any): any {
        const entry = this.getEntry(id);
        entry[name] = {
            value: value,
            timemodified: Date.now()
        };

        return value;
    }
}
