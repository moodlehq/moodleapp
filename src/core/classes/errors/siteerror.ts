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
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';

/**
 * Error returned when performing operations regarding a site.
 */
export class CoreSiteError extends CoreError {

    errorcode?: string;
    errorDetails?: string;
    supportConfig?: CoreUserSupportConfig;

    constructor(options: CoreSiteErrorOptions) {
        super(getErrorMessage(options));

        this.errorcode = options.errorcode;
        this.errorDetails = options.errorDetails;
        this.supportConfig = options.supportConfig;
    }

}

/**
 * Get message to use in the error.
 *
 * @param options Error options.
 * @returns Error message.
 */
function getErrorMessage(options: CoreSiteErrorOptions): string {
    if ('supportConfig' in options && !options.supportConfig?.canContactSupport()) {
        return options.fallbackMessage ?? options.message;
    }

    return options.message;
}

export type CoreSiteErrorOptions = {
    message: string;
    fallbackMessage?: string; // Message to use when contacting support is not possible but warranted.
    errorcode?: string; // Technical error code useful for technical assistance.
    errorDetails?: string; // Technical error details useful for technical assistance.

    // Configuration to use to contact site support. If this attribute is present, it means
    // that the error warrants contacting support.
    supportConfig?: CoreUserSupportConfig;
};
