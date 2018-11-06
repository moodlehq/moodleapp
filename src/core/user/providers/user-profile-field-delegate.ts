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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreEventsProvider } from '@providers/events';

export interface CoreUserProfileFieldHandler extends CoreDelegateHandler {
    /**
     * Type of the field the handler supports. E.g. 'checkbox'.
     * @type {string}
     */
    type: string;

    /**
     * Return the Component to use to display the user profile field.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any>;

    /**
     * Get the data to send for the field based on the input data.
     * @param  {any}     field          User field to get the data for.
     * @param  {boolean} signup         True if user is in signup page.
     * @param  {string}  [registerAuth] Register auth method. E.g. 'email'.
     * @param  {any}     formValues     Form Values.
     * @return {Promise<CoreUserProfileFieldHandlerData>|CoreUserProfileFieldHandlerData}  Data to send for the field.
     */
    getData?(field: any, signup: boolean, registerAuth: string, formValues: any):
        Promise<CoreUserProfileFieldHandlerData> | CoreUserProfileFieldHandlerData;
}

export interface CoreUserProfileFieldHandlerData {
    /**
     * Name to display.
     * @type {string}
     */
    name: string;

    /**
     * Field type.
     * @type {string}
     */
    type?: string;

    /**
     * Value of the field.
     * @type {any}
     */
    value: any;
}

/**
 * Service to interact with user profile fields. Provides functions to register a plugin.
 */
@Injectable()
export class CoreUserProfileFieldDelegate extends CoreDelegate {
    protected handlerNameProperty = 'type';

    constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            protected eventsProvider: CoreEventsProvider) {
        super('CoreUserProfileFieldDelegate', loggerProvider, sitesProvider, eventsProvider);
    }

    /**
     * Get the component to use to display an user field.
     *
     * @param {Injector} injector Injector.
     * @param  {any} field      User field to get the directive for.
     * @param  {boolean} signup         True if user is in signup page.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getComponent(injector: Injector, field: any, signup: boolean): Promise<any> {
        const type = field.type || field.datatype;
        let result;
        if (signup) {
            result = this.executeFunction(type, 'getComponent', [injector]);
        } else {
            result = this.executeFunctionOnEnabled(type, 'getComponent', [injector]);
        }

        return Promise.resolve(result).catch((err) => {
            this.logger.error('Error getting component for field', type, err);
        });
    }

    /**
     * Get the data to send for a certain field based on the input data.
     *
     * @param  {any}     field          User field to get the data for.
     * @param  {boolean} signup         True if user is in signup page.
     * @param  {string}  registerAuth   Register auth method. E.g. 'email'.
     * @param  {any}     formValues     Form values.
     * @return {Promise<any>}           Data to send for the field.
     */
    getDataForField(field: any, signup: boolean, registerAuth: string, formValues: any): Promise<any> {
        const type = field.type || field.datatype,
            handler = <CoreUserProfileFieldHandler> this.getHandler(type, !signup);

        if (handler) {
            const name = 'profile_field_' + field.shortname;
            if (handler.getData) {
                return Promise.resolve(handler.getData(field, signup, registerAuth, formValues));
            } else if (field.shortname && typeof formValues[name] != 'undefined') {
                // Handler doesn't implement the function, but the form has data for the field.
                return Promise.resolve({
                    type: type,
                    name: name,
                    value: formValues[name]
                });
            }
        }

        return Promise.reject(null);
    }

    /**
     * Get the data to send for a list of fields based on the input data.
     *
     * @param  {any[]}   fields           User fields to get the data for.
     * @param  {boolean} [signup]       True if user is in signup page.
     * @param  {string}  [registerAuth] Register auth method. E.g. 'email'.
     * @param  {any}     formValues     Form values.
     * @return {Promise<any>}           Data to send.
     */
    getDataForFields(fields: any[], signup: boolean = false, registerAuth: string = '', formValues: any): Promise<any> {
        const result = [],
            promises = [];

        if (!fields) {
            return Promise.resolve([]);
        }

        fields.forEach((field) => {
            promises.push(this.getDataForField(field, signup, registerAuth, formValues).then((data) => {
                if (data) {
                    result.push(data);
                }
            }).catch(() => {
                // Ignore errors.
            }));
        });

        return Promise.all(promises).then(() => {
            return result;
        });
    }
}
