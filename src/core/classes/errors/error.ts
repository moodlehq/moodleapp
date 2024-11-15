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

import { CoreErrorObject } from '@services/error-helper';

/**
 * Base Error class.
 *
 * The native Error class cannot be extended in Typescript without restoring the prototype chain, extend this
 * class instead.
 *
 * @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
 */
export class CoreError extends Error {

    debug?: CoreErrorDebug;

    constructor(message?: string, debug?: CoreErrorDebug) {
        super(message);

        // Fix prototype chain: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);

        this.debug = debug;
    }

}

/**
 * Debug information of the error.
 */
export type CoreErrorDebug = {
    code?: string; // Technical error code useful for technical assistance.
    details: string; // Technical error details useful for technical assistance.
};

export type CoreAnyError = string | CoreError | CoreErrorObject | null | undefined;
