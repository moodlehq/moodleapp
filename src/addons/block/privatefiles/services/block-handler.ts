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
import { ADDON_PRIVATE_FILES_PAGE_NAME } from '@addons/privatefiles/constants';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockPrivateFilesHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockPrivateFiles';
    blockName = 'private_files';

    /**
     * @inheritdoc
     */
    async getDisplayData(): Promise<CoreBlockHandlerData> {
        const { CoreBlockOnlyTitleComponent } = await import('@features/block/components/only-title-block/only-title-block');

        return {
            title: 'addon.block_privatefiles.pluginname',
            class: 'addon-block-private-files',
            component: CoreBlockOnlyTitleComponent,
            link: ADDON_PRIVATE_FILES_PAGE_NAME,
            linkParams: { root: 'my' },
            navOptions: {
                preferCurrentTab: false,
            },
        };
    }

}

export const AddonBlockPrivateFilesHandler = makeSingleton(AddonBlockPrivateFilesHandlerService);
