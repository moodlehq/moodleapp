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

import { asyncInstance } from '@/core/utils/async-instance';
import { AddonWorkshopAssessmentStrategyHandler } from '@addons/mod/workshop/services/assessment-strategy-delegate';
import {
    ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_NUMERRORS_NAME,
    ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_NUMERRORS_STRATEGY_NAME,
} from '@addons/mod/workshop/assessment/constants';
import type { AddonModWorkshopAssessmentStrategyNumErrorsHandlerLazyService } from './handler-lazy';

export class AddonModWorkshopAssessmentStrategyNumErrorsHandlerService
    implements Partial<AddonWorkshopAssessmentStrategyHandler> {

    name = ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_NUMERRORS_NAME;
    strategyName = ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_NUMERRORS_STRATEGY_NAME;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}

/**
 * Get assessment strategy handler instance.
 *
 * @returns Assessment strategy handler.
 */
export function getAssessmentStrategyHandlerInstance(): AddonWorkshopAssessmentStrategyHandler {
    const lazyHandler = asyncInstance<
        AddonModWorkshopAssessmentStrategyNumErrorsHandlerLazyService,
        AddonModWorkshopAssessmentStrategyNumErrorsHandlerService
    >(async () => {
        const { AddonModWorkshopAssessmentStrategyNumErrorsHandler } = await import('./handler-lazy');

        return AddonModWorkshopAssessmentStrategyNumErrorsHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModWorkshopAssessmentStrategyNumErrorsHandlerService());
    lazyHandler.setLazyMethods([
        'getComponent',
        'getOriginalValues',
        'hasDataChanged',
        'prepareAssessmentData',
    ]);

    return lazyHandler;
}
