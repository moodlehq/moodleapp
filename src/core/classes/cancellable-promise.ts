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
 * Promise whose execution can be cancelled.
 */
export class CoreCancellablePromise<T = unknown> extends CorePromise<T> {

    /**
     * Create a new resolved promise.
     *
     * @returns Resolved promise.
     */
    static resolve(): CoreCancellablePromise<void>;
    static resolve<T>(result: T): CoreCancellablePromise<T>;
    static resolve<T>(result?: T): CoreCancellablePromise<T> {
        return new this(resolve => result ? resolve(result) : (resolve as () => void)(), () => {
            // Nothing to do here.
        });
    }

    protected cancelPromise: () => void;

    constructor(
        executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: Error) => void) => void,
        cancelPromise: () => void,
    ) {
        super(new Promise(executor));

        this.cancelPromise = cancelPromise;
    }

    /**
     * Cancel promise.
     *
     * After this method is called, the promise will remain unresolved forever. Make sure that after calling
     * this method there aren't any references to this object, or it could cause memory leaks.
     */
    cancel(): void {
        this.cancelPromise();
    }

}
