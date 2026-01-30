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
 * Static class with helper functions for promises.
 */
export class CorePromiseUtils {

    protected static logger = CoreLogger.getInstance('CorePromiseUtils');

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Similar to Promise.all, but if a promise fails this function's promise won't be rejected until ALL promises have finished.
     *
     * @param promises Promises.
     */
    static async allPromises(promises: Promise<unknown>[]): Promise<void> {
        if (!promises || !promises.length) {
            return;
        }

        const getPromiseError = async (promise: unknown): Promise<Error | void> => {
            try {
                await promise;
            } catch (error) {
                return error;
            }
        };

        const errors = await Promise.all(promises.map(getPromiseError));
        const error = errors.find(error => !!error);

        if (error) {
            throw error;
        }
    }

    /**
     * Combination of allPromises and ignoreErrors functions.
     *
     * @param promises Promises.
     */
    static async allPromisesIgnoringErrors(promises: Promise<unknown>[]): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CorePromiseUtils.allPromises(promises));
    }

    /**
     * Execute promises one depending on the previous.
     *
     * @param orderedPromisesData Data to be executed.
     * @returns Promise resolved when all promises are resolved.
     */
    static async executeOrderedPromises(orderedPromisesData: OrderedPromiseData[]): Promise<void> {
        const promises: Promise<void>[] = [];
        let dependency = Promise.resolve();

        // Execute all the processes in order.
        for (const i in orderedPromisesData) {
            const data = orderedPromisesData[i];
            // Add the process to the dependency stack.
            const promise = dependency.finally(() => {
                try {
                    return data.function();
                } catch (e) {
                    CorePromiseUtils.logger.error(e.message);

                    return;
                }
            });
            promises.push(promise);

            // If the new process is blocking, we set it as the dependency.
            if (data.blocking) {
                dependency = promise;
            }
        }

        // Return when all promises are done.
        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Ignore errors from a promise.
     *
     * @param promise Promise to ignore errors.
     * @param fallback Value to return if the promise is rejected.
     * @returns Promise with ignored errors, resolving to the fallback result if provided.
     */
    static async ignoreErrors<Result>(promise?: Promise<Result>): Promise<Result | undefined>;
    static async ignoreErrors<Result, Fallback>(promise: Promise<Result>, fallback: Fallback): Promise<Result | Fallback>;
    static async ignoreErrors<Result, Fallback>(promise?: Promise<Result>, fallback?: Fallback):
        Promise<Result | Fallback | undefined> {
        try {
            const result = await promise;

            return result;
        } catch {
            // Ignore errors.
            return fallback;
        }
    }

    /**
     * Given a promise, returns true if it's rejected or false if it's resolved.
     *
     * @param promise Promise to check
     * @returns Promise resolved with boolean: true if the promise is rejected or false if it's resolved.
     */
    static async promiseFails(promise: Promise<unknown>): Promise<boolean> {
        try {
            await promise;

            return false;
        } catch {
            return true;
        }
    }

    /**
     * Given a promise, returns true if it's resolved or false if it's rejected.
     *
     * @param promise Promise to check
     * @returns Promise resolved with boolean: true if the promise it's resolved or false if it's rejected.
     */
    static async promiseWorks(promise: Promise<unknown>): Promise<boolean> {
        try {
            await promise;

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Set a timeout to a Promise. If the time passes before the Promise is resolved or rejected, it will be automatically
     * rejected.
     *
     * @param promise The promise to timeout.
     * @param time Number of milliseconds of the timeout.
     * @returns Promise with the timeout.
     */
    static timeoutPromise<T>(promise: Promise<T>, time: number): Promise<T> {
        return new Promise((resolve, reject): void => {
            let timedOut = false;
            const resolveBeforeTimeout = (value: T) => {
                if (timedOut) {
                    return;
                }
                resolve(value);
            };
            const timeout = setTimeout(
                () => {
                    reject({ timeout: true });
                    timedOut = true;
                },
                time,
            );

            promise
                .then(resolveBeforeTimeout)
                .catch(reject)
                .finally(() => clearTimeout(timeout));
        });
    }

}

/**
 * Data for each entry of executeOrderedPromises.
 */
export type OrderedPromiseData = {
    /**
     * Function to execute.
     */
    function: () => Promise<unknown>;

    /**
     * Whether the promise should block the following one.
     */
    blocking?: boolean;
};
