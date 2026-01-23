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
import { CoreMainMenuHomeDelegate } from '../home-delegate';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '../mainmenu-delegate';
import { MAIN_MENU_HOME_PAGE_NAME } from '@features/mainmenu/constants';

/**
 * Handler to add Home into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreMainMenuHomeHandlerService implements CoreMainMenuHandler {

    name = 'CoreHome';
    priority = 1200;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        await CoreMainMenuHomeDelegate.waitForReady();

        return CoreMainMenuHomeDelegate.hasHandlers(true);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fas-house',
            title: 'core.mainmenu.home',
            page: MAIN_MENU_HOME_PAGE_NAME,
            class: 'core-home-handler',
        };
    }

}

export const CoreMainMenuHomeHandler = makeSingleton(CoreMainMenuHomeHandlerService);
