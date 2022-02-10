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
 * Promise wrapper to expose result synchronously.
 */
export class CorePromisedValue<T = unknown> implements Promise<T> {

    /**
     * Wrap an existing promise.
     *
     * @param promise Promise.
     * @returns Promised value.
     */
    static from<T>(promise: Promise<T>): CorePromisedValue<T> {
        const promisedValue = new CorePromisedValue<T>();

        promise
            .then(promisedValue.resolve.bind(promisedValue))
            .catch(promisedValue.reject.bind(promisedValue));

        return promisedValue;
    }

    private _resolvedValue?: T;
    private _rejectedReason?: Error;
    declare private promise: Promise<T>;
    declare private _resolve: (result: T) => void;
    declare private _reject: (error?: Error) => void;

    constructor() {
        this.initPromise();
    }

    [Symbol.toStringTag]: string;

    get value(): T | null {
        return this._resolvedValue ?? null;
    }

    /**
     * Check whether the promise resolved successfully.
     *
     * @return Whether the promise resolved successfuly.
     */
    isResolved(): this is { value: T } {
        return '_resolvedValue' in this;
    }

    /**
     * Check whether the promise was rejected.
     *
     * @return Whether the promise was rejected.
     */
    isRejected(): boolean {
        return '_rejectedReason' in this;
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
     * @inheritdoc
     */
    then<TResult1 = T, TResult2 = never>(
        onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onRejected?: ((reason: Error) => TResult2 | PromiseLike<TResult2>) | undefined | null,
    ): Promise<TResult1 | TResult2> {
        return this.promise.then(onFulfilled, onRejected);
    }

    /**
     * @inheritdoc
     */
    catch<TResult = never>(
        onRejected?: ((reason: Error) => TResult | PromiseLike<TResult>) | undefined | null,
    ): Promise<T | TResult> {
        return this.promise.catch(onRejected);
    }

    /**
     * @inheritdoc
     */
    finally(onFinally?: (() => void) | null): Promise<T> {
        return this.promise.finally(onFinally);
    }

    /**
     * Resolve the promise.
     *
     * @param value Promise result.
     */
    resolve(value: T): void {
        if (this.isSettled()) {
            delete this._rejectedReason;

            this.initPromise();
        }

        this._resolvedValue = value;
        this._resolve(value);
    }

    /**
     * Reject the promise.
     *
     * @param value Rejection reason.
     */
    reject(reason?: Error): void {
        if (this.isSettled()) {
            delete this._resolvedValue;

            this.initPromise();
        }

        this._rejectedReason = reason;
        this._reject(reason);
    }

    /**
     * Initialize the promise and the callbacks.
     */
    private initPromise(): void {
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

}
