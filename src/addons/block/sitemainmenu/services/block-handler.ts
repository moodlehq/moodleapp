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
import { CoreBlockHandlerData } from '@features/block/services/block-delegate';
import { CoreBlockBaseHandler } from '@features/block/classes/base-block-handler';
import { makeSingleton } from '@singletons';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockSiteMainMenuHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockSiteMainMenu';
    blockName = 'site_main_menu';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        // Aspire School: Disable site main menu block
        return false;
    }

    /**
     * Returns the data needed to render the block.
     *
     * @returns Data or promise resolved with the data.
     */
    async getDisplayData(): Promise<CoreBlockHandlerData> {
        const { AddonBlockSiteMainMenuComponent } = await import('../components/sitemainmenu/sitemainmenu');

        return {
            title: 'addon.block_sitemainmenu.pluginname',
            class: 'addon-block-sitemainmenu',
            component: AddonBlockSiteMainMenuComponent,
        };
    }

}

export const AddonBlockSiteMainMenuHandler = makeSingleton(AddonBlockSiteMainMenuHandlerService);
