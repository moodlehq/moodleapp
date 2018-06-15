// (C) Copyright 2015 Martin Dougiamas
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
     * @type {string}
     */
    strategyName: string;

    /**
     * Return the Component to render the plugin.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(injector: Injector): any | Promise<any>;

    /**
     * Prepare original values to be shown and compared.
     *
     * @param  {any}    form       Original data of the form.
     * @param  {number} workshopId WorkShop Id
     * @return {Promise<any[]>}    Promise resolved with original values sorted.
     */
     getOriginalValues?(form: any, workshopId: number): Promise<any[]>;

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param  {any[]} originalValues Original values of the form.
     * @param  {any[]} currentValues  Current values of the form.
     * @return {boolean}              True if data has changed, false otherwise.
     */
    hasDataChanged?(originalValues: any[], currentValues: any[]): boolean;

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param  {any{}} currentValues Current values of the form.
     * @param  {any}   form          Assessment form data.
     * @return {Promise<any>}        Promise resolved with the data to be sent. Or rejected with the input errors object.
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
     * @param  {string} workshopStrategy Assessment strategy name.
     * @return {boolean}                 True if supported, false otherwise.
     */
    isPluginSupported(workshopStrategy: string): boolean {
        return this.hasHandler(workshopStrategy, true);
    }

    /**
     * Get the directive to use for a certain assessment strategy plugin.
     *
     * @param {Injector} injector Injector.
     * @param  {string} workshopStrategy Assessment strategy name.
     * @return {any}                     The component, undefined if not found.
     */
    getComponentForPlugin(injector: Injector, workshopStrategy: string): Promise<any> {
        return this.executeFunctionOnEnabled(workshopStrategy, 'getComponent', [injector]);
    }

    /**
     * Prepare original values to be shown and compared depending on the strategy selected.
     *
     * @param  {string} workshopStrategy Workshop strategy.
     * @param  {any}    form             Original data of the form.
     * @param  {number} workshopId       Workshop ID.
     * @return {Promise<any[]>}          Resolved with original values sorted.
     */
    getOriginalValues(workshopStrategy: string, form: any, workshopId: number): Promise<any[]> {
        return Promise.resolve(this.executeFunctionOnEnabled(workshopStrategy, 'getOriginalValues', [form, workshopId]) || []);
    }

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param  {any}   workshop       Workshop.
     * @param  {any[]} originalValues Original values of the form.
     * @param  {any[]} currentValues  Current values of the form.
     * @return {boolean}              True if data has changed, false otherwise.
     */
    hasDataChanged(workshop: any, originalValues: any[], currentValues: any[]): boolean {
        return this.executeFunctionOnEnabled(workshop.strategy, 'hasDataChanged', [originalValues, currentValues]) || false;
    }

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param  {string} workshopStrategy Workshop strategy to follow.
     * @param  {any{}}  currentValues    Current values of the form.
     * @param  {any}    form             Assessment form data.
     * @return {Promise<any>}            Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(workshopStrategy: string, currentValues: any, form: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(workshopStrategy, 'prepareAssessmentData', [currentValues, form]));
    }
}
