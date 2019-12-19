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

import { Injectable, Injector } from '@angular/core';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';

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
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(injector: Injector): any | Promise<any>;

    /**
     * Prepare original values to be shown and compared.
     *
     * @param form Original data of the form.
     * @param workshopId WorkShop Id
     * @return Promise resolved with original values sorted.
     */
     getOriginalValues?(form: any, workshopId: number): Promise<any[]>;

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param originalValues Original values of the form.
     * @param currentValues Current values of the form.
     * @return True if data has changed, false otherwise.
     */
    hasDataChanged?(originalValues: any[], currentValues: any[]): boolean;

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param currentValues Current values of the form.
     * @param form Assessment form data.
     * @return Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(currentValues: any[], form: any): Promise<any>;
}

/**
 * Delegate to register workshop assessment strategy handlers.
 * You can use this service to register your own assessment strategy handlers to be used in a workshop.
 */
 @Injectable()
 export class AddonWorkshopAssessmentStrategyDelegate extends CoreDelegate {

     protected handlerNameProperty = 'strategyName';

     constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
             protected eventsProvider: CoreEventsProvider) {
         super('AddonWorkshopAssessmentStrategyDelegate', loggerProvider, sitesProvider, eventsProvider);
     }

    /**
     * Check if an assessment strategy plugin is supported.
     *
     * @param workshopStrategy Assessment strategy name.
     * @return True if supported, false otherwise.
     */
    isPluginSupported(workshopStrategy: string): boolean {
        return this.hasHandler(workshopStrategy, true);
    }

    /**
     * Get the directive to use for a certain assessment strategy plugin.
     *
     * @param injector Injector.
     * @param workshopStrategy Assessment strategy name.
     * @return The component, undefined if not found.
     */
    getComponentForPlugin(injector: Injector, workshopStrategy: string): Promise<any> {
        return this.executeFunctionOnEnabled(workshopStrategy, 'getComponent', [injector]);
    }

    /**
     * Prepare original values to be shown and compared depending on the strategy selected.
     *
     * @param workshopStrategy Workshop strategy.
     * @param form Original data of the form.
     * @param workshopId Workshop ID.
     * @return Resolved with original values sorted.
     */
    getOriginalValues(workshopStrategy: string, form: any, workshopId: number): Promise<any[]> {
        return Promise.resolve(this.executeFunctionOnEnabled(workshopStrategy, 'getOriginalValues', [form, workshopId]) || []);
    }

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param workshop Workshop.
     * @param originalValues Original values of the form.
     * @param currentValues Current values of the form.
     * @return True if data has changed, false otherwise.
     */
    hasDataChanged(workshop: any, originalValues: any[], currentValues: any[]): boolean {
        return this.executeFunctionOnEnabled(workshop.strategy, 'hasDataChanged', [originalValues, currentValues]) || false;
    }

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param workshopStrategy Workshop strategy to follow.
     * @param currentValues Current values of the form.
     * @param form Assessment form data.
     * @return Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(workshopStrategy: string, currentValues: any, form: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(workshopStrategy, 'prepareAssessmentData', [currentValues, form]));
    }
}
