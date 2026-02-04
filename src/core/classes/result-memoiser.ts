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

import { CoreObject } from '@static/object';

/**
 * Class to memoise the result of some calculation to avoid unnecessary recalculations.
 * It's particularly useful for impure pipes.
 * It's recommended to use basic types as parameters to optimise performance, but objects can be used as well.
 */
export class CoreResultMemoiser<T> {

    protected cachedResult?: T;
    protected lastParams: unknown[] = [];

    /**
     * Get the cached result if valid.
     *
     * @param params Parameters used to calculate the cached result.
     * @returns The cached result, or undefined if not set.
     */
    get(...params: unknown[]): T | undefined {
        return this.isValid(...params) ? this.cachedResult : undefined;
    }

    /**
     * Check if the provided keys match the last cached keys.
     *
     * @param params Parameters used to calculate the cached result.
     * @returns Whether the cached result is valid.
     */
    isValid(...params: unknown[]): boolean {
        if (this.cachedResult === undefined || params.length !== this.lastParams.length) {
            return false;
        }

        return params.every((param, index) => typeof param === 'object' ?
            CoreObject.deepEquals(param, this.lastParams[index]) :
            param === this.lastParams[index]);
    }

    /**
     * Clear the cache.
     */
    invalidate(): void {
        this.cachedResult = undefined;
        this.lastParams = [];
    }

    /**
     * Get a memoised result. If the cached result is valid, it returns it.
     * Otherwise, it executes the provided function, caches the result, and returns it.
     *
     * @param fn The function to calculate the result.
     * @param params Parameters that identify the result.
     * @returns The cached or newly calculated result.
     */
    memoise(fn: () => T, ...params: unknown[]): T {
        const cachedResult = this.get(...params);
        if (cachedResult !== undefined) {
            return cachedResult;
        }

        const result = fn();
        this.set(result, ...params);

        return result;
    }

    /**
     * Update the cache.
     *
     * @param result The result to cache.
     * @param params Parameters used to calculate the cached result.
     */
    set(result: T, ...params: unknown[]): void {
        this.cachedResult = result;
        this.lastParams = params;
    }

}
