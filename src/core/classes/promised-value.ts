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

import { CorePromise } from '@classes/promise';

/**
 * Promise wrapper to expose result synchronously.
 */
export class CorePromisedValue<T = unknown> extends CorePromise<T> {

    /**
     * Wrap an existing promise.
     *
     * @param promise Promise.
     * @returns Promised value.
     */
    static from<T>(promise: Promise<T>): CorePromisedValue<T> {
        const promisedValue = new CorePromisedValue<T>();

        promise
            .then(value => promisedValue.resolve(value))
            .catch(error => promisedValue.reject(error));

        return promisedValue;
    }

    protected resolvedValue?: T;
    protected rejectedReason?: Error;
    protected resolvePromise!: (result: T) => void;
    protected rejectPromise!: (error?: Error) => void;

    constructor() {
        let resolvePromise!: (result: T) => void;
        let rejectPromise!: (error?: Error) => void;

        const nativePromise = new Promise<T>((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        super(nativePromise);

        this.resolvePromise = resolvePromise;
        this.rejectPromise = rejectPromise;
    }

    /**
     * @returns Promise.
     * @deprecated since 4.1. The instance can be directly used as a promise.
     */
    get promise(): Promise<T> {
        return this;
    }

    get value(): T | null {
        return this.resolvedValue ?? null;
    }

    /**
     * Check whether the promise resolved successfully.
     *
     * @returns Whether the promise resolved successfuly.
     */
    isResolved(): this is { value: T } {
        return 'resolvedValue' in this;
    }

    /**
     * Check whether the promise was rejected.
     *
     * @returns Whether the promise was rejected.
     */
    isRejected(): boolean {
        return 'rejectedReason' in this;
    }

    /**
     * Check whether the promise is settled.
     *
     * @returns Whether the promise is settled.
     */
    isSettled(): boolean {
        return this.isResolved() || this.isRejected();
    }

    /**
     * Resolve the promise.
     *
     * @param value Promise result.
     */
    resolve(value: T): void {
        if (this.isSettled()) {
            delete this.rejectedReason;

            this.resetNativePromise();
        }

        this.resolvedValue = value;
        this.resolvePromise(value);
    }

    /**
     * Reject the promise.
     *
     * @param reason Rejection reason.
     */
    reject(reason?: Error): void {
        if (this.isSettled()) {
            delete this.resolvedValue;

            this.resetNativePromise();
        }

        this.rejectedReason = reason;
        this.rejectPromise(reason);
    }

    /**
     * Reset status and value.
     */
    reset(): void {
        delete this.resolvedValue;
        delete this.rejectedReason;

        this.resetNativePromise();
    }

    /**
     * Reset native promise and callbacks.
     */
    protected resetNativePromise(): void {
        this.nativePromise = new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        });
    }

}
