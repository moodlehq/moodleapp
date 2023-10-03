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
function createAsyncInstanceWrapper<
    TLazyInstance extends TEagerInstance,
    TEagerInstance extends AsyncObject = Partial<TLazyInstance>
>(
    lazyConstructor?: () => TLazyInstance | Promise<TLazyInstance>,
): AsyncInstanceWrapper<TLazyInstance, TEagerInstance> {
    let promisedInstance: CorePromisedValue<TLazyInstance> | null = null;
    let eagerInstance: TEagerInstance;

    return {
        get instance() {
            return promisedInstance?.value ?? undefined;
        },
        get eagerInstance() {
            return eagerInstance;
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
        setEagerInstance(instance) {
            eagerInstance = instance;
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
 * Check whether the given value is a method.
 *
 * @param value Value.
 * @returns Whether the given value is a method.
 */
function isMethod(value: unknown): value is (...args: unknown[]) => unknown {
    return typeof value === 'function';
}

/**
 * Asynchronous instance wrapper.
 */
export interface AsyncInstanceWrapper<
    TLazyInstance extends TEagerInstance,
    TEagerInstance extends AsyncObject = Partial<TLazyInstance>
> {
    instance?: TLazyInstance;
    eagerInstance?: TEagerInstance;
    getInstance(): Promise<TLazyInstance>;
    getProperty<P extends keyof TLazyInstance>(property: P): Promise<TLazyInstance[P]>;
    setInstance(instance: TLazyInstance): void;
    setEagerInstance(eagerInstance: TEagerInstance): void;
    setLazyConstructor(lazyConstructor: () => TLazyInstance | Promise<TLazyInstance>): void;
    resetInstance(): void;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type AsyncObject = object;

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
export type AsyncInstance<TLazyInstance extends TEagerInstance, TEagerInstance extends AsyncObject = Partial<TLazyInstance>> =
    AsyncInstanceWrapper<TLazyInstance, TEagerInstance> & {
        [k in keyof TLazyInstance]: AsyncMethod<TLazyInstance[k]>;
    };

/**
 * Create an asynchronous instance proxy, where all methods will be callable directly but will become asynchronous. If the
 * underlying instance hasn't been set, methods will be resolved once it is.
 *
 * @param lazyConstructor Constructor to use the first time the instance is needed.
 * @returns Asynchronous instance.
 */
export function asyncInstance<TLazyInstance extends TEagerInstance, TEagerInstance extends AsyncObject = Partial<TLazyInstance>>(
    lazyConstructor?: () => TLazyInstance | Promise<TLazyInstance>,
): AsyncInstance<TLazyInstance, TEagerInstance> {
    const wrapper = createAsyncInstanceWrapper<TLazyInstance, TEagerInstance>(lazyConstructor);

    return new Proxy(wrapper, {
        get: (target, property, receiver) => {
            if (property in target) {
                return Reflect.get(target, property, receiver);
            }

            if (wrapper.instance) {
                const value = Reflect.get(wrapper.instance, property, receiver);

                return isMethod(value)
                    ? async (...args: unknown[]) => value.call(wrapper.instance, ...args)
                    : value;
            }

            if (wrapper.eagerInstance && property in wrapper.eagerInstance) {
                return Reflect.get(wrapper.eagerInstance, property, receiver);
            }

            return async (...args: unknown[]) => {
                const instance = await wrapper.getInstance();
                const method = Reflect.get(instance, property, receiver);

                if (!isMethod(method)) {
                    throw new Error(`'${property.toString()}' is not a function`);
                }

                return method.call(instance, ...args);
            };
        },
    }) as AsyncInstance<TLazyInstance, TEagerInstance>;
}
