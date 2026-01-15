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

import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { makeSingleton } from '@singletons';

/**
 * Handler to add Contact Us tab to main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreContactUsMainMenuHandlerService implements CoreMainMenuHandler {

    static readonly PAGE_NAME = 'contactus';

    name = 'CoreContactUs';
    priority = 500; // Higher priority to appear in More menu

    /**
     * Check if the handler is enabled for a user on a site.
     *
     * @returns Whether the handler is enabled.
     */
    async isEnabled(): Promise<boolean> {
        // Always enabled for all users
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fas-phone',
            title: 'Contact Us',
            page: CoreContactUsMainMenuHandlerService.PAGE_NAME,
            class: 'core-contactus-handler',
        };
    }

}

export const CoreContactUsMainMenuHandler = makeSingleton(CoreContactUsMainMenuHandlerService);
