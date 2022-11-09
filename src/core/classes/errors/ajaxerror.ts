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
 * Generic error returned by an Ajax call.
 */
export class CoreAjaxError extends CoreSiteError {

    available = 1; // @deprecated since app 4.0. AJAX endpoint should always be available in supported Moodle versions.
    status?: number;

    constructor(messageOrOptions: string | CoreSiteErrorOptions, available?: number, status?: number) {
        super(typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions);

        this.status = status;
    }

}
