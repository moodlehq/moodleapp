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
import { Params } from '@angular/router';
import { CoreContentLinksModuleIndexHandler } from '@features/contentlinks/classes/module-index-handler';
import { makeSingleton } from '@singletons';
import { AddonModBook } from '../book';

/**
 * Handler to treat links to book.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBookIndexLinkHandlerService extends CoreContentLinksModuleIndexHandler {

    name = 'AddonModBookLinkHandler';

    constructor() {
        super('AddonModBook', 'book', 'b');
    }

    /**
     * Get the mod params necessary to open an activity.
     *
     * @param url      The URL to treat.
     * @param params   The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @return List of params to pass to navigateToModule / navigateToModuleByInstance.
     */
    getPageParams(url: string, params: Record<string, string>): Params {
        return params.chapterid ? { chapterId: parseInt(params.chapterid, 10) } : {};
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     *
     * @return Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string): Promise<boolean> {
        return AddonModBook.isPluginEnabled(siteId);
    }

}

export const AddonModBookIndexLinkHandler = makeSingleton(AddonModBookIndexLinkHandlerService);
