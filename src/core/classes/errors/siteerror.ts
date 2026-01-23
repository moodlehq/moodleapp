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

import { CoreError, CoreErrorOptions } from '@classes/errors/error';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';

/**
 * Error returned when performing operations regarding a site.
 */
export class CoreSiteError extends CoreError {

    supportConfig?: CoreUserSupportConfig;

    constructor(options: CoreSiteErrorOptions) {
        super(options.message, { title: options.title, debug: options.debug });

        this.supportConfig = options.supportConfig;
    }

    /**
     * @deprecated since 4.4. This getter should not be called directly, but it's defined for backwards compatibility with many
     * parts of the code that type errors as any and use it. We cannot rename those because the errors could also be
     * CoreWSError instances which do have an "errorcode" property.
     *
     * @returns error code.
     */
    get errorcode(): string | undefined {
        return this.debug?.code;
    }

}

export type CoreSiteErrorOptions = CoreErrorOptions & {
    message: string;

    // Configuration to use to contact site support. If this attribute is present, it means
    // that the error warrants contacting support.
    supportConfig?: CoreUserSupportConfig;
};
