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
    ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_RUBRIC_NAME,
    ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_RUBRIC_STRATEGY_NAME,
} from '@addons/mod/workshop/assessment/constants';

export class AddonModWorkshopAssessmentStrategyRubricHandlerService {

    name = ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_RUBRIC_NAME;
    strategyName = ADDON_MOD_WORKSHOP_ASSESSMENT_STRATEGY_RUBRIC_STRATEGY_NAME;

}

/**
 * Get assessment strategy handler instance.
 *
 * @returns Assessment strategy handler.
 */
export function getAssessmentStrategyHandlerInstance(): AddonWorkshopAssessmentStrategyHandler {
    const lazyHandler = asyncInstance(async () => {
        const { AddonModWorkshopAssessmentStrategyRubricHandler } = await import('./handler-lazy');

        return AddonModWorkshopAssessmentStrategyRubricHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModWorkshopAssessmentStrategyRubricHandlerService());

    return lazyHandler;
}
