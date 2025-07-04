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

import { Injectable, Type } from '@angular/core';
import { CoreDelegateHandler, CoreDelegate } from '@classes/delegate';
import { makeSingleton } from '@singletons';
import { CoreFormFields } from '@singletons/form';
import { AddonModWorkshopGetAssessmentFormDefinitionData, AddonModWorkshopGetAssessmentFormFieldsParsedData } from './workshop';
import { CoreSites } from '@services/sites';
import { ADDON_MOD_WORKSHOP_FEATURE_NAME } from '../constants';

/**
 * Interface that all assessment strategy handlers must implement.
 */
export interface AddonWorkshopAssessmentStrategyHandler extends CoreDelegateHandler {
    /**
     * The name of the assessment strategy. E.g. 'accumulative'.
     */
    strategyName: string;

    /**
     * Return the Component to render the plugin.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(): Promise<Type<unknown>> | Type<unknown>;

    /**
     * Prepare original values to be shown and compared.
     *
     * @param form Original data of the form.
     * @param workshopId WorkShop Id
     * @returns Promise resolved with original values sorted.
     */
    getOriginalValues?(
        form: AddonModWorkshopGetAssessmentFormDefinitionData,
        workshopId: number,
    ): Promise<AddonModWorkshopGetAssessmentFormFieldsParsedData[]>;

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param originalValues Original values of the form.
     * @param currentValues Current values of the form.
     * @returns True if data has changed, false otherwise.
     */
    hasDataChanged?(
        originalValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
        currentValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
    ): Promise<boolean> | boolean;

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param currentValues Current values of the form.
     * @param form Assessment form data.
     * @returns Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(
        currentValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
        form: AddonModWorkshopGetAssessmentFormDefinitionData,
    ): Promise<CoreFormFields<unknown>>;
}

/**
 * Delegate to register workshop assessment strategy handlers.
 * You can use this service to register your own assessment strategy handlers to be used in a workshop.
 */
@Injectable({ providedIn: 'root' })
export class AddonWorkshopAssessmentStrategyDelegateService extends CoreDelegate<AddonWorkshopAssessmentStrategyHandler> {

    protected handlerNameProperty = 'strategyName';

    constructor() {
        super();
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return !(await CoreSites.isFeatureDisabled(ADDON_MOD_WORKSHOP_FEATURE_NAME));
    }

    /**
     * Check if an assessment strategy plugin is supported.
     *
     * @param workshopStrategy Assessment strategy name.
     * @returns True if supported, false otherwise.
     */
    isPluginSupported(workshopStrategy: string): boolean {
        return this.hasHandler(workshopStrategy, true);
    }

    /**
     * Get the directive to use for a certain assessment strategy plugin.
     *
     * @param workshopStrategy Assessment strategy name.
     * @returns The component, undefined if not found.
     */
    getComponentForPlugin(workshopStrategy: string): Promise<Type<unknown>> | Type<unknown> | undefined {
        return this.executeFunctionOnEnabled(workshopStrategy, 'getComponent');
    }

    /**
     * Prepare original values to be shown and compared depending on the strategy selected.
     *
     * @param workshopStrategy Workshop strategy.
     * @param form Original data of the form.
     * @param workshopId Workshop ID.
     * @returns Resolved with original values sorted.
     */
    getOriginalValues(
        workshopStrategy: string,
        form: AddonModWorkshopGetAssessmentFormDefinitionData,
        workshopId: number,
    ): Promise<AddonModWorkshopGetAssessmentFormFieldsParsedData[]> {
        return Promise.resolve(this.executeFunctionOnEnabled(workshopStrategy, 'getOriginalValues', [form, workshopId]) || []);
    }

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param workshopStrategy Workshop strategy.
     * @param originalValues Original values of the form.
     * @param currentValues Current values of the form.
     * @returns True if data has changed, false otherwise.
     */
    hasDataChanged(
        workshopStrategy: string,
        originalValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
        currentValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
    ): Promise<boolean> {
        return Promise.resolve(
            this.executeFunctionOnEnabled(workshopStrategy, 'hasDataChanged', [originalValues, currentValues]) || false,
        );
    }

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param workshopStrategy Workshop strategy to follow.
     * @param currentValues Current values of the form.
     * @param form Assessment form data.
     * @returns Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(
        workshopStrategy: string,
        currentValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
        form: AddonModWorkshopGetAssessmentFormDefinitionData,
    ): Promise<CoreFormFields<unknown> | undefined> {
        return Promise.resolve(this.executeFunctionOnEnabled(workshopStrategy, 'prepareAssessmentData', [currentValues, form]));
    }

}
export const AddonWorkshopAssessmentStrategyDelegate = makeSingleton(AddonWorkshopAssessmentStrategyDelegateService);
