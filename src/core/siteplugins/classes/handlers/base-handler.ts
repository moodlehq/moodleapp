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

import { CoreDelegateHandler } from '@classes/delegate';

/**
 * Super class for handlers for site plugins.
 */
export class CoreSitePluginsBaseHandler implements CoreDelegateHandler {

    constructor(public name: string) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
