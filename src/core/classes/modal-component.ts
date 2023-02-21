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

import { ElementRef } from '@angular/core';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';

/**
 * Helper class to build modals.
 */
export class CoreModalComponent<T=unknown> {

    result: CorePromisedValue<T> = new CorePromisedValue();

    constructor({ nativeElement: element }: ElementRef<HTMLElement>) {
        CoreDirectivesRegistry.register(element, this);
    }

    /**
     * Close the modal.
     *
     * @param result Result data, or error instance if the modal was closed with a failure.
     */
    async close(result: T | Error): Promise<void> {
        if (result instanceof Error) {
            this.result.reject(result);

            return;
        }

        this.result.resolve(result);
    }

}
