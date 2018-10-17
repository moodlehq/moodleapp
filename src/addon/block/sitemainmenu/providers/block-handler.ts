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

import { Injectable, Injector } from '@angular/core';
import { CoreBlockHandler, CoreBlockHandlerData } from '@core/block/providers/delegate';
import { AddonBlockSiteMainMenuComponent } from '../components/sitemainmenu/sitemainmenu';

/**
 * Course nav handler.
 */
@Injectable()
export class AddonBlockSiteMainMenuHandler implements CoreBlockHandler {
    name = 'AddonBlockSiteMainMenuHandler';
    blockName = 'site_main_menu';

    constructor() {
        // Nothing to do.
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Returns the data needed to render the block.
     *
     * @param {Injector} injector Injector.
     * @param {any} block The block to render.
     * @param {string} contextLevel The context where the block will be used.
     * @param {number} instanceId The instance ID associated with the context level.
     * @return {CoreBlockHandlerData|Promise<CoreBlockHandlerData>} Data or promise resolved with the data.
     */
    getDisplayData?(injector: Injector, block: any, contextLevel: string, instanceId: number)
            : CoreBlockHandlerData | Promise<CoreBlockHandlerData> {

        return {
            title: 'addon.block_sitemainmenu.pluginname',
            class: 'addon-block-sitemainmenu',
            component: AddonBlockSiteMainMenuComponent
        };
    }
}
