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

import { Injectable } from '@angular/core';

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreSite } from '@classes/site';
import { makeSingleton } from '@singletons';

/**
 * Handler to support the TeX notation filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterTexHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterTexHandler';
    filterName = 'tex';

    /**
     * Check if the filter should be applied in a certain site based on some filter options.
     *
     * @param options Options.
     * @param site Site.
     * @return Whether filter should be applied.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        // This filter is handled by Moodle, nothing to do in the app.
        return false;
    }

}

export const AddonFilterTexHandler = makeSingleton(AddonFilterTexHandlerService);
