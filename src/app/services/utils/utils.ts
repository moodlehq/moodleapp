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

import { Injectable } from '@angular/core';
import { CoreLogger } from '@singletons/logger';
import { makeSingleton } from '@singletons/core.singletons';

/*
 * "Utils" service with helper functions.
 */
@Injectable()
export class CoreUtilsProvider {
    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreUtilsProvider');
    }

    /**
     * Similar to Promise.all, but if a promise fails this function's promise won't be rejected until ALL promises have finished.
     *
     * @param promises Promises.
     * @return Promise resolved if all promises are resolved and rejected if at least 1 promise fails.
     */
    allPromises(promises: Promise<any>[]): Promise<any> {
        if (!promises || !promises.length) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject): void => {
            const total = promises.length;
            let count = 0;
            let hasFailed = false;
            let error;

            promises.forEach((promise) => {
                promise.catch((err) => {
                    hasFailed = true;
                    error = err;
                }).finally(() => {
                    count++;

                    if (count === total) {
                        // All promises have finished, reject/resolve.
                        if (hasFailed) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    }
                });
            });
        });
    }

    /**
     * Execute promises one depending on the previous.
     *
     * @param orderedPromisesData Functions to be executed.
     * @return Promise resolved when all promises are resolved.
     */
    executeOrderedPromises(orderedPromisesData: OrderedPromiseData[]): Promise<any> {
        const promises = [];
        let dependency = Promise.resolve();

        // Execute all the processes in order.
        for (const i in orderedPromisesData) {
            const data = orderedPromisesData[i];

            // Add the process to the dependency stack.
            const promise = dependency.finally(() => {
                try {
                    return data.function();
                } catch (e) {
                    this.logger.error(e.message);

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
        return this.allPromises(promises);
    }

    /**
     * Similar to AngularJS $q.defer().
     *
     * @return The deferred promise.
     */
    promiseDefer<T>(): PromiseDefer<T> {
        const deferred: PromiseDefer<T> = {};

        deferred.promise = new Promise((resolve, reject): void => {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });

        return deferred;
    }
}

export class CoreUtils extends makeSingleton(CoreUtilsProvider) {}

/**
 * Data for each entry of executeOrderedPromises.
 */
export type OrderedPromiseData = {
    /**
     * Function to execute.
     */
    function: () => Promise<any>;

    /**
     * Whether the promise should block the following one.
     */
    blocking?: boolean;
};

/**
 * Deferred promise. It's similar to the result of $q.defer() in AngularJS.
 */
export type PromiseDefer<T> = {
    /**
     * The promise.
     */
    promise?: Promise<T>;

    /**
     * Function to resolve the promise.
     *
     * @param value The resolve value.
     */
    resolve?: (value?: T) => void;

    /**
     * Function to reject the promise.
     *
     * @param reason The reject param.
     */
    reject?: (reason?: any) => void;
};
