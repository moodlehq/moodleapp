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
 * Base class to use for implementing custom Promises.
 */
export abstract class CorePromise<T = unknown> implements Promise<T> {

    protected nativePromise: Promise<T>;

    constructor(nativePromise: Promise<T>) {
        this.nativePromise = nativePromise;
    }

    [Symbol.toStringTag]: string;

    /**
     * @inheritdoc
     */
    then<TResult1 = T, TResult2 = never>(
        onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onRejected?: ((reason: Error) => TResult2 | PromiseLike<TResult2>) | undefined | null,
    ): Promise<TResult1 | TResult2> {
        return this.nativePromise.then(onFulfilled, onRejected);
    }

    /**
     * @inheritdoc
     */
    catch<TResult = never>(
        onRejected?: ((reason: Error) => TResult | PromiseLike<TResult>) | undefined | null,
    ): Promise<T | TResult> {
        return this.nativePromise.catch(onRejected);
    }

    /**
     * @inheritdoc
     */
    finally(onFinally?: (() => void) | null): Promise<T> {
        return this.nativePromise.finally(onFinally);
    }

}
