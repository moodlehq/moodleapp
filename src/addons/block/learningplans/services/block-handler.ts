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
import { CoreBlockOnlyTitleComponent } from '@features/block/components/only-title-block/only-title-block';
import { CoreBlockBaseHandler } from '@features/block/classes/base-block-handler';
import { makeSingleton } from '@singletons';
import { ADDON_COMPETENCY_LEARNING_PLANS_PAGE } from '@addons/competency/constants';

/**
 * Block handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockLearningPlansHandlerService extends CoreBlockBaseHandler {

    name = 'AddonBlockLearningPlans';
    blockName = 'lp';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        // Aspire School: Disable learning plans block for K-12
        return false;
    }

    /**
     * Returns the data needed to render the block.
     *
     * @returns Data or promise resolved with the data.
     */
    getDisplayData(): CoreBlockHandlerData {
        return {
            title: 'addon.block_learningplans.pluginname',
            class: 'addon-block-learning-plans',
            component: CoreBlockOnlyTitleComponent,
            link: ADDON_COMPETENCY_LEARNING_PLANS_PAGE,
            navOptions: {
                preferCurrentTab: false,
            },
        };
    }

}

export const AddonBlockLearningPlansHandler = makeSingleton(AddonBlockLearningPlansHandlerService);
