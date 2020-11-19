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

import { CoreError } from '@classes/errors/error';

/**
 * Error returned when performing operations regarding a site (check if it exists, authenticate user, etc.).
 */
export class CoreSiteError extends CoreError {

    errorcode?: string;
    critical?: boolean;
    loggedOut?: boolean;

    constructor(protected error: SiteError) {
        super(error.message);

        this.errorcode = error.errorcode;
        this.critical = error.critical;
        this.loggedOut = error.loggedOut;
    }

}

export type SiteError = {
    message: string;
    errorcode?: string;
    critical?: boolean; // Whether the error is important enough to abort the operation.
    loggedOut?: boolean; // Whether site has been marked as logged out.
};
