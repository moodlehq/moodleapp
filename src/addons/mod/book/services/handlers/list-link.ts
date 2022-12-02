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
import { CoreContentLinksModuleListHandler } from '@features/contentlinks/classes/module-list-handler';
import { makeSingleton } from '@singletons';
import { AddonModBook } from '../book';

/**
 * Handler to treat links to book list page.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBookListLinkHandlerService extends CoreContentLinksModuleListHandler {

    name = 'AddonModBookListLinkHandler';

    constructor() {
        super('AddonModBook', 'book');
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @returns Whether the handler is enabled for the URL and site.
     */
    isEnabled(): Promise<boolean> {
        return AddonModBook.isPluginEnabled();
    }

}

export const AddonModBookListLinkHandler = makeSingleton(AddonModBookListLinkHandlerService);
