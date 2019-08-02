// (C) Copyright 2015 Martin Dougiamas
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
import { CoreTagProvider } from './tag';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@core/mainmenu/providers/delegate';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Handler to inject an option into main menu.
 */
@Injectable()
export class CoreTagMainMenuHandler implements CoreMainMenuHandler {
    name = 'CoreTag';
    priority = 300;

    constructor(private tagProvider: CoreTagProvider, private utils: CoreUtilsProvider) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean | Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.tagProvider.areTagsAvailable().then((available) => {
            if (!available) {
                return false;
            }

            // The only way to check whether tags are enabled on web is to perform a WS call.
            return this.utils.promiseWorks(this.tagProvider.getTagCollections());
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreMainMenuHandlerData} Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'pricetags',
            title: 'core.tag.tags',
            page: 'CoreTagSearchPage',
            class: 'core-tag-search-handler'
        };
    }
}
