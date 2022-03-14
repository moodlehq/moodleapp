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
 * Create a wrapper to hold an asynchronous instance.
 *
 * @param lazyConstructor Constructor to use the first time the instance is needed.
 * @returns Asynchronous instance wrapper.
 */
function createAsyncInstanceWrapper<T>(lazyConstructor?: () => T | Promise<T>): AsyncInstanceWrapper<T> {
    let promisedInstance: CorePromisedValue<T> | null = null;

    return {
        get instance() {
            return promisedInstance?.value ?? undefined;
        },
        async getInstance() {
            if (!promisedInstance) {
                promisedInstance = new CorePromisedValue();

                if (lazyConstructor) {
                    const instance = await lazyConstructor();

                    promisedInstance.resolve(instance);
                }
            }

            return promisedInstance;
        },
        async getProperty(property) {
            const instance = await this.getInstance();

            return instance[property];
        },
        setInstance(instance) {
            if (!promisedInstance) {
                promisedInstance = new CorePromisedValue();
            } else if (promisedInstance.isSettled()) {
                promisedInstance.reset();
            }

            promisedInstance.resolve(instance);
        },
        setLazyConstructor(constructor) {
            if (!promisedInstance) {
                lazyConstructor = constructor;

                return;
            }

            if (!promisedInstance.isResolved()) {
                // eslint-disable-next-line promise/catch-or-return
                Promise
                    .resolve(constructor())
                    .then(instance => promisedInstance?.isResolved() || promisedInstance?.resolve(instance));
            }
        },
        resetInstance() {
            if (!promisedInstance) {
                return;
            }

            promisedInstance.reset();
        },
    };
}

/**
 * Asynchronous instance wrapper.
 */
export interface AsyncInstanceWrapper<T> {
    instance?: T;
    getInstance(): Promise<T>;
    getProperty<P extends keyof T>(property: P): Promise<T[P]>;
    setInstance(instance: T): void;
    setLazyConstructor(lazyConstructor: () => T | Promise<T>): void;
    resetInstance(): void;
}

/**
 * Asynchronous version of a method.
 */
export type AsyncMethod<T> =
    T extends (...args: infer Params) => infer Return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? T extends (...args: Params) => Promise<any>
            ? T
            : (...args: Params) => Promise<Return>
        : never;

/**
 * Asynchronous instance.
 *
 * All methods are converted to their asynchronous version, and properties are available asynchronously using
 * the getProperty method.
 */
export type AsyncInstance<T> = AsyncInstanceWrapper<T> & {
    [k in keyof T]: AsyncMethod<T[k]>;
};

/**
 * Create an asynchronous instance proxy, where all methods will be callable directly but will become asynchronous. If the
 * underlying instance hasn't been set, methods will be resolved once it is.
 *
 * @param lazyConstructor Constructor to use the first time the instance is needed.
 * @returns Asynchronous instance.
 */
export function asyncInstance<T>(lazyConstructor?: () => T | Promise<T>): AsyncInstance<T> {
    const wrapper = createAsyncInstanceWrapper<T>(lazyConstructor);

    return new Proxy(wrapper, {
        get: (target, property, receiver) => {
            if (property in target) {
                return Reflect.get(target, property, receiver);
            }

            return async (...args: unknown[]) => {
                const instance = await wrapper.getInstance();

                return instance[property](...args);
            };
        },
    }) as AsyncInstance<T>;
}
