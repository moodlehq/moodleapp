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
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { makeSingleton } from '@singletons';
import { AddonCompetency } from '../competency';

/**
 * Handler to inject an option into main menu.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyMainMenuHandlerService implements CoreMainMenuHandler {

    static readonly PAGE_NAME = 'competency';

    name = 'AddonCompetency';
    priority = 500;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        // Check the user has at least one learn plan available.
        const plans = await AddonCompetency.getLearningPlans();

        return plans.length > 0;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'fas-route',
            title: 'addon.competency.myplans',
            page: AddonCompetencyMainMenuHandlerService.PAGE_NAME,
            class: 'addon-competency-handler',
        };
    }

}
export const AddonCompetencyMainMenuHandler = makeSingleton(AddonCompetencyMainMenuHandlerService);
