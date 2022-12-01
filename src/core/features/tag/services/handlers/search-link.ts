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

import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { CoreTag } from '../tag';

/**
 * Handler to treat links to tag search.
 */
@Injectable({ providedIn: 'root' })
export class CoreTagSearchLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreTagSearchLinkHandler';
    pattern = /\/tag\/search\.php/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId): void => {
                const pageParams = {
                    collectionId: parseInt(params.tc, 10) || 0,
                    query: params.query || '',
                };

                CoreNavigator.navigateToSitePath('/tag/search', { params: pageParams, siteId });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string): Promise<boolean> {
        return CoreTag.areTagsAvailable(siteId);
    }

}

export const CoreTagSearchLinkHandler = makeSingleton(CoreTagSearchLinkHandlerService);
