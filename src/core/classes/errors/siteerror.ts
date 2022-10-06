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
import { CoreSitePublicConfigResponse } from '@classes/site';
import { CoreUserSupport } from '@features/user/services/support';

/**
 * Error returned when performing operations regarding a site.
 */
export class CoreSiteError extends CoreError {

    errorcode?: string;
    errorDetails?: string;
    contactSupport?: boolean;
    siteConfig?: CoreSitePublicConfigResponse;

    constructor(options: CoreSiteErrorOptions) {
        super(getErrorMessage(options));

        this.errorcode = options.errorcode;
        this.errorDetails = options.errorDetails;
        this.contactSupport = options.contactSupport;
        this.siteConfig = options.siteConfig;
    }

    /**
     * Get a url to contact site support.
     *
     * @returns Support page url.
     */
    getSupportPageUrl(): string {
        if (!this.siteConfig) {
            throw new CoreError('Can\'t get support page url');
        }

        return CoreUserSupport.getSupportPageUrl(this.siteConfig);
    }

    /**
     * Check whether the handling of this error allows users to contact support or not.
     *
     * @returns Whether to contact support or not.
     */
    canContactSupport(): boolean {
        if (!this.contactSupport || !this.siteConfig) {
            return false;
        }

        return CoreUserSupport.canContactSupport(this.siteConfig);
    }

}

/**
 * Get message to use in the error.
 *
 * @param options Error options.
 * @returns Error message.
 */
function getErrorMessage(options: CoreSiteErrorOptions): string {
    if (
        options.contactSupport &&
        (!options.siteConfig || !CoreUserSupport.canContactSupport(options.siteConfig))
    ) {
        return options.fallbackMessage ?? options.message;
    }

    return options.message;
}

export type CoreSiteErrorOptions = {
    message: string;
    fallbackMessage?: string; // Message to use when contacting support is not possible but warranted.
    errorcode?: string; // Technical error code useful for technical assistance.
    errorDetails?: string; // Technical error details useful for technical assistance.
    contactSupport?: boolean; // Whether this error warrants contacting site support or not.
    siteConfig?: CoreSitePublicConfigResponse;
};
