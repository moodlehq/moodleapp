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

import { CorePromisedValue } from '@classes/promised-value';

/**
 * Function to add to the queue.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CoreQueueRunnerFunction<T> = (...args: any[]) => T | Promise<T>;

/**
 * Queue item.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    deferred: CorePromisedValue<T>;

    /**
     * Item's priority. Only used if usePriority=true.
     */
    priority: number;
};

/**
 * Options to pass to add item.
 */
export type CoreQueueRunnerAddOptions = {
    /**
     * Whether to allow having multiple entries with same ID in the queue.
     */
    allowRepeated?: boolean;

    /**
     * If usePriority=true, the priority of the item. Higher priority means it will be executed first.
     * Please notice that the first item is always run immediately, so it's not affected by the priority.
     */
    priority?: number;
};

/**
 * A queue to prevent having too many concurrent executions.
 */
export class CoreQueueRunner {

    protected queue: {[id: string]: CoreQueueRunnerItem} = {};
    protected orderedQueue: CoreQueueRunnerItem[] = [];
    protected numberRunning = 0;

    /**
     * Constructor.
     *
     * @param maxParallel Max number of parallel executions.
     * @param usePriority If true, the queue will be ordered by priority.
     */
    constructor(protected maxParallel: number = 1, protected usePriority = false) { }

    /**
     * Get unique ID.
     *
     * @param id ID.
     * @returns Unique ID.
     */
    protected getUniqueId(id: string): string {
        let newId = id;
        let num = 1;

        do {
            newId = `${id}-${num}`;
            num++;
        } while (newId in this.queue);

        return newId;
    }

    /**
     * Process next item in the queue.
     *
     * @returns Promise resolved when next item has been treated.
     */
    protected async processNextItem(): Promise<void> {
        if (!this.orderedQueue.length || this.numberRunning >= this.maxParallel) {
            // Queue is empty or max number of parallel runs reached, stop.
            return;
        }

        const item = this.orderedQueue.shift();
        if (!item) {
            // No item found.
            return;
        }

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
     * @returns Promise resolved when the function has been executed.
     */
    run<T>(fn: CoreQueueRunnerFunction<T>, options?: CoreQueueRunnerAddOptions): Promise<T>;
    run<T>(id: string, fn: CoreQueueRunnerFunction<T>, options?: CoreQueueRunnerAddOptions): Promise<T>;
    run<T>(
        idOrFn: string | CoreQueueRunnerFunction<T>,
        fnOrOptions?: CoreQueueRunnerFunction<T> | CoreQueueRunnerAddOptions,
        options: CoreQueueRunnerAddOptions = {},
    ): Promise<T> {
        let id = typeof idOrFn === 'string' ? idOrFn : this.getUniqueId('anonymous');
        const fn = typeof idOrFn === 'function' ? idOrFn : fnOrOptions as CoreQueueRunnerFunction<T>;

        options = typeof fnOrOptions === 'object' ? fnOrOptions : options;

        if (id in this.queue) {
            if (!options.allowRepeated) {
                // Item already in queue, return its promise.
                return this.queue[id].deferred;
            }

            id = this.getUniqueId(id);
        }

        // Add the item in the queue.
        const item = {
            id,
            fn,
            deferred: new CorePromisedValue<T>(),
            priority: options.priority ?? 0,
        };

        this.queue[id] = item;
        this.orderedQueue.push(item);
        if (this.usePriority) {
            this.orderedQueue.sort((a, b) => b.priority - a.priority);
        }

        // Process next item if we haven't reached the max yet.
        this.processNextItem();

        return item.deferred;
    }

}
