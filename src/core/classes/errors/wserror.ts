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
 * Error returned by WS.
 */
export class CoreWSError extends CoreError {

    exception?: string; // Name of the Moodle exception.
    errorcode?: string;
    warningcode?: string;
    link?: string; // Link to the site.
    moreinfourl?: string; // Link to a page with more info.
    debuginfo?: string; // Debug info. Only if debug mode is enabled.
    backtrace?: string; // Backtrace. Only if debug mode is enabled.

    constructor(error: CoreWSErrorData) {
        super(error.message);

        this.exception = error.exception;
        this.errorcode = error.errorcode;
        this.warningcode = error.warningcode;
        this.link = error.link;
        this.moreinfourl = error.moreinfourl;
        this.debuginfo = error.debuginfo;
        this.backtrace = error.backtrace;
    }

}

type CoreWSErrorData = {
    message?: string;
    exception?: string; // Name of the Moodle exception.
    errorcode?: string;
    warningcode?: string;
    link?: string; // Link to the site.
    moreinfourl?: string; // Link to a page with more info.
    debuginfo?: string; // Debug info. Only if debug mode is enabled.
    backtrace?: string; // Backtrace. Only if debug mode is enabled.
};
