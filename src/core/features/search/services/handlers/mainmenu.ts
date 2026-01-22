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
import { makeSingleton } from '@singletons';
import { CoreMainMenuHandler, CoreMainMenuPageNavHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreSearchGlobalSearch } from '@features/search/services/global-search';

export const CORE_SEARCH_PAGE_NAME = 'search';

/**
 * Handler to inject an option into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreSearchMainMenuHandlerService implements CoreMainMenuHandler {

    name = 'CoreSearch';
    priority = 575;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return CoreSearchGlobalSearch.isEnabled();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuPageNavHandlerData {
        return {
            icon: 'fas-magnifying-glass',
            title: 'core.search.globalsearch',
            page: CORE_SEARCH_PAGE_NAME,
            class: 'core-search-handler',
        };
    }

}

export const CoreSearchMainMenuHandler = makeSingleton(CoreSearchMainMenuHandlerService);
