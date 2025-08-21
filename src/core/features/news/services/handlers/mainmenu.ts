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
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';

/**
 * Handler to add News into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreNewsMainMenuHandlerService implements CoreMainMenuHandler {

    static readonly PAGE_NAME = 'news';

    name = 'CoreNews';
    priority = 850; // Higher than messages (800) but lower than home (1200)

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        // Always enabled for Aspire School
        return true;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fas-bullhorn',
            title: 'core.news.news',
            page: CoreNewsMainMenuHandlerService.PAGE_NAME,
            class: 'core-news-handler',
        };
    }

}

export const CoreNewsMainMenuHandler = makeSingleton(CoreNewsMainMenuHandlerService);