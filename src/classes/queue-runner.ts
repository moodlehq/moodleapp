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

import { CoreUtils, PromiseDefer } from '@providers/utils/utils';

/**
 * Function to add to the queue.
 */
export type CoreQueueRunnerFunction<T> = (...args: any[]) => T | Promise<T>;

/**
 * Queue item.
 */
export type CoreQueueRunnerItem<T = any> = {
    /**
     * Item ID.
     */
    id: string;

    /**
     * Function to execute.
     */
    fn: CoreQueueRunnerFunction<T>;

    /**
     * Deferred with a promise resolved/rejected with the result of the function.
     */
    deferred: PromiseDefer;
};

/**
 * Options to pass to add item.
 */
export type CoreQueueRunnerAddOptions = {
    /**
     * Whether to allow having multiple entries with same ID in the queue.
     */
    allowRepeated?: boolean;
};

/**
 * A queue to prevent having too many concurrent executions.
 */
export class CoreQueueRunner {
    protected queue: {[id: string]: CoreQueueRunnerItem} = {};
    protected orderedQueue: CoreQueueRunnerItem[] = [];
    protected numberRunning = 0;

    constructor(protected maxParallel: number = 1) { }

    /**
     * Get unique ID.
     *
     * @param id ID.
     * @return Unique ID.
     */
    protected getUniqueId(id: string): string {
        let newId = id;
        let num = 1;

        do {
            newId = id + '-' + num;
            num++;
        } while (newId in this.queue);

        return newId;
    }

    /**
     * Process next item in the queue.
     *
     * @return Promise resolved when next item has been treated.
     */
    protected async processNextItem(): Promise<void> {
        if (!this.orderedQueue.length || this.numberRunning >= this.maxParallel) {
            // Queue is empty or max number of parallel runs reached, stop.
            return;
        }

        const item = this.orderedQueue.shift();
        this.numberRunning++;

        try {
            const result = await item.fn();

            item.deferred.resolve(result);
        } catch (error) {
            item.deferred.reject(error);
        } finally {
            delete this.queue[item.id];
            this.numberRunning--;

            this.processNextItem();
        }
    }

    /**
     * Add an item to the queue.
     *
     * @param id ID.
     * @param fn Function to call.
     * @param options Options.
     * @return Promise resolved when the function has been executed.
     */
    run<T>(id: string, fn: CoreQueueRunnerFunction<T>, options?: CoreQueueRunnerAddOptions): Promise<T> {
        options = options || {};

        if (id in this.queue) {
            if (!options.allowRepeated) {
                // Item already in queue, return its promise.
                return this.queue[id].deferred.promise;
            }

            id = this.getUniqueId(id);
        }

        // Add the item in the queue.
        const item = {
            id,
            fn,
            deferred: CoreUtils.instance.promiseDefer(),
        };

        this.queue[id] = item;
        this.orderedQueue.push(item);

        // Process next item if we haven't reached the max yet.
        this.processNextItem();

        return item.deferred.promise;
    }
}
