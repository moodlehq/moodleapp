// (C) Copyright 2015 Martin Dougiamas
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
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreSite } from '../../../classes/site';

/**
 * Service that provides some features regarding lists of courses and categories.
 */
@Injectable()
export class AddonCalendarProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider) {
        this.logger = logger.getInstance('AddonCalendarProvider');
    }

    /**
     * Check if Calendar is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isCalendarDisabledInSite(site?: CoreSite) : boolean {
        site = site || this.sitesProvider.getCurrentSite();
        return site.isFeatureDisabled('$mmSideMenuDelegate_mmaCalendar');
    }

}
