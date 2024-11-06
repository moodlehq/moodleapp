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

import { AddonWorkshopAssessmentStrategyHandler } from '@addons/mod/workshop/services/assessment-strategy-delegate';
import { AddonModWorkshopGetAssessmentFormFieldsParsedData } from '@addons/mod/workshop/services/workshop';
import { Type } from '@angular/core';
import { CoreFormFields } from '@singletons/form';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to display a workshop assessment strategy site plugin.
 */
export class CoreSitePluginsWorkshopAssessmentStrategyHandler
    extends CoreSitePluginsBaseHandler
    implements AddonWorkshopAssessmentStrategyHandler {

    constructor(public name: string, public strategyName: string) {
        super(name);
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { CoreSitePluginsWorkshopAssessmentStrategyComponent } =
            await import('@features/siteplugins/components/workshop-assessment-strategy/workshop-assessment-strategy');

        return CoreSitePluginsWorkshopAssessmentStrategyComponent;
    }

    /**
     * @inheritdoc
     */
    async getOriginalValues(): Promise<AddonModWorkshopGetAssessmentFormFieldsParsedData[]> {
        return [];
    }

    /**
     * @inheritdoc
     */
    hasDataChanged(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async prepareAssessmentData(): Promise<CoreFormFields> {
        return {};
    }

}
