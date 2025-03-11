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
import { CoreNavigationOptions } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonModBook } from '../book';
import { ADDON_MOD_BOOK_COMPONENT, ADDON_MOD_BOOK_MODNAME } from '../../constants';

/**
 * Handler to treat links to book.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBookIndexLinkHandlerService extends CoreContentLinksModuleIndexHandler {

    name = 'AddonModBookLinkHandler';

    constructor() {
        super(ADDON_MOD_BOOK_COMPONENT, ADDON_MOD_BOOK_MODNAME, 'b');
    }

    /**
     * @inheritdoc
     */
    getModNavOptions(url: string, params: Record<string, string>): CoreNavigationOptions {
        const chapterId = params.chapterid ? parseInt(params.chapterid, 10) : undefined;

        return {
            nextNavigation: {
                path: 'contents',
                options: {
                    params: {
                        chapterId,
                    },
                },
            },
        };
    }

    /**
     * @inheritdoc
     */
    getPageParams(url: string, params: Record<string, string>): Params {
        return params.chapterid ? { chapterId: parseInt(params.chapterid, 10) } : {};
    }

    /**
     * @inheritdoc
     */
    isEnabled(siteId: string): Promise<boolean> {
        return AddonModBook.isPluginEnabled(siteId);
    }

}

export const AddonModBookIndexLinkHandler = makeSingleton(AddonModBookIndexLinkHandlerService);
