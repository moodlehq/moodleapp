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
import { CoreTag } from '../tag';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';

/**
 * Handler to inject an option into main menu.
 */
@Injectable({ providedIn: 'root' })
export class CoreTagMainMenuHandlerService implements CoreMainMenuHandler {

    static readonly PAGE_NAME = 'tag';

    name = 'CoreTag';
    priority = 400;

    /**
     * Check if the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        const available = await CoreTag.areTagsAvailable();
        if (!available) {
            return false;
        }

        // The only way to check whether tags are enabled on web is to perform a WS call.
        return CoreUtils.promiseWorks(CoreTag.getTagCollections());
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fas-tags',
            title: 'core.tag.tags',
            page: CoreTagMainMenuHandlerService.PAGE_NAME,
            class: 'core-tag-search-handler',
        };
    }

}

export const CoreTagMainMenuHandler = makeSingleton(CoreTagMainMenuHandlerService);
