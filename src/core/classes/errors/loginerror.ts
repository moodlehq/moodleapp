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

import { CoreSiteError, CoreSiteErrorOptions } from '@classes/errors/siteerror';

/**
 * Error returned when performing operations during login.
 */
export class CoreLoginError extends CoreSiteError {

    title?: string;
    critical?: boolean;
    loggedOut?: boolean;

    constructor(options: CoreLoginErrorOptions) {
        super(options);

        this.title = options.title;
        this.critical = options.critical;
        this.loggedOut = options.loggedOut;
    }

}

export type CoreLoginErrorOptions = CoreSiteErrorOptions & {
    title?: string; // Error title.
    critical?: boolean; // Whether the error is important enough to abort the operation.
    loggedOut?: boolean; // Whether site has been marked as logged out.
};
