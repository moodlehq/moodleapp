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
 * Error returned by WS.
 */
export class CoreAjaxWSError extends CoreSiteError {

    exception?: string; // Name of the Moodle exception.
    warningcode?: string;
    link?: string; // Link to the site.
    moreinfourl?: string; // Link to a page with more info.
    debuginfo?: string; // Debug info. Only if debug mode is enabled.
    backtrace?: string; // Backtrace. Only if debug mode is enabled.
    available?: number; // Whether the AJAX call is available. 0 if unknown, 1 if available, -1 if not available.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(error: any, available?: number) {
        super(getErrorOptions(error));

        this.exception = error.exception;
        this.warningcode = error.warningcode;
        this.link = error.link;
        this.moreinfourl = error.moreinfourl;
        this.debuginfo = error.debuginfo;
        this.backtrace = error.backtrace;
        this.available = available ?? (
            this.debug
                ? (this.debug.code == 'invalidrecord' ? -1 : 1)
                : 0
        );
    }

}

/**
 * Get error options from unknown error instance.
 *
 * @param error The error.
 * @returns Options
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getErrorOptions(error: any): CoreSiteErrorOptions {
    const options: CoreSiteErrorOptions = {
        message: error.message || error.error,
    };

    if ('debug' in error) {
        options.debug = error.debug;
    }

    if ('errorcode' in error) {
        options.debug = {
            code: error.errorcode,
            details: error.message || error.error,
        };
    }

    return options;
}
