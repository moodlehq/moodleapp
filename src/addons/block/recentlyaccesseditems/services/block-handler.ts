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
import { AddonBlockRecentlyAccessedItemsComponent } from '../components/recentlyaccesseditems/recentlyaccesseditems';
import { CoreBlockBaseHandler } from '@features/block/classes/base-block-handler';
import { makeSingleton } from '@singletons';

/**
 * Block handler.
 */
@Injectable( { providedIn: 'root' })
export class AddonBlockRecentlyAccessedItemsHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockRecentlyAccessedItems';
    blockName = 'recentlyaccesseditems';

    /**
     * Returns the data needed to render the block.
     *
     * @param block The block to render.
     * @param contextLevel The context where the block will be used.
     * @param instanceId The instance ID associated with the context level.
     * @return Data or promise resolved with the data.
     */
    getDisplayData(): CoreBlockHandlerData{

        return {
            title: 'addon.block_recentlyaccesseditems.pluginname',
            class: 'addon-block-recentlyaccesseditems',
            component: AddonBlockRecentlyAccessedItemsComponent,
        };
    }

}

export const AddonBlockRecentlyAccessedItemsHandler = makeSingleton(AddonBlockRecentlyAccessedItemsHandlerService);
