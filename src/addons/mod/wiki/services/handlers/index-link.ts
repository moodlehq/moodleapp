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
import { ADDON_MOD_WIKI_COMPONENT, ADDON_MOD_WIKI_MODNAME } from '../../constants';

/**
 * Handler to treat links to wiki index.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiIndexLinkHandlerService extends CoreContentLinksModuleIndexHandler {

    name = 'AddonModWikiIndexLinkHandler';

    constructor() {
        super(ADDON_MOD_WIKI_COMPONENT, ADDON_MOD_WIKI_MODNAME, 'wid');
    }

    /**
     * @inheritdoc
     */
    getPageParams(url: string, params: Record<string, string>): Params {
        return {
            groupId: params.group || params.group === '0' ? Number(params.group) : undefined,
            userId: params.uid || params.uid === '0' ? Number(params.uid) : undefined,
            pageTitle: params.title,
        };
    }

}

export const AddonModWikiIndexLinkHandler = makeSingleton(AddonModWikiIndexLinkHandlerService);
