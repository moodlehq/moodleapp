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

import { Injectable } from '@angular/core';
import { CoreDelegate, CoreDelegateHandler } from '../../../classes/delegate';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreEventsProvider } from '../../../providers/events';

export interface CoreUserProfileFieldHandler extends CoreDelegateHandler  {

    /**
     * Return the Component to use to display the user profile field.
     *
     * @param  {any}     field          User field to get the data for.
     * @param  {boolean} [signup]       True if user is in signup page.
     * @param  {string}  [registerAuth] Register auth method. E.g. 'email'.
     * @return {any} The component to use, undefined if not found.
     */
    getComponent(field: any, signup: boolean, registerAuth: string): any;

    /**
     * Get the data to send for the field based on the input data.
     * @param  {any}     field          User field to get the data for.
     * @param  {boolean} signup         True if user is in signup page.
     * @param  {string}  [registerAuth] Register auth method. E.g. 'email'.
     * @param  {any}     model          Model with the input data.
     * @return {Promise<CoreUserProfileFieldHandlerData>|CoreUserProfileFieldHandlerData}  Data to send for the field.
     */
    getData?(field: any, signup: boolean, registerAuth: string, model: any):
        Promise<CoreUserProfileFieldHandlerData> | CoreUserProfileFieldHandlerData;
};

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
};

/**
 * Service to interact with user profile fields. Provides functions to register a plugin.
 */
@Injectable()
export class CoreUserProfileFieldDelegate extends CoreDelegate {
    protected handlers: {[s: string]: CoreUserProfileFieldHandler} = {};
    protected enabledHandlers: {[s: string]: CoreUserProfileFieldHandler} = {};

    constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            protected eventsProvider: CoreEventsProvider) {
        super('CoreUserProfileFieldDelegate', loggerProvider, sitesProvider, eventsProvider);
    }

    /**
     * Get the component to use to display an user field.
     *
     * @param  {any} field      User field to get the directive for.
     * @param  {boolean} signup         True if user is in signup page.
     * @param  {string}  registerAuth   Register auth method. E.g. 'email'
     * @return {any} The component to use, undefined if not found.
     */
    getComponent(field: any, signup: boolean, registerAuth: string) : any {
        let type = field.type || field.datatype;
        return this.executeFunction(type, 'getComponent', [field, signup, registerAuth]);
    }

    /**
     * Get the data to send for a certain field based on the input data.
     *
     * @param  {any}     field          User field to get the data for.
     * @param  {boolean} signup         True if user is in signup page.
     * @param  {string}  registerAuth   Register auth method. E.g. 'email'.
     * @param  {any}     model          Model with the input data.
     * @return {Promise<any>}           Data to send for the field.
     */
    getDataForField(field: any, signup: boolean, registerAuth: string, model: any): Promise<any> {
        let handler = this.getHandler(field, signup);

        if (handler) {
            let name = 'profile_field_' + field.shortname;
            if (handler.getData) {
                return Promise.resolve(handler.getData(field, signup, registerAuth, model));
            } else if (field.shortname && typeof model[name] != 'undefined') {
                // Handler doesn't implement the function, but the model has data for the field.
                return Promise.resolve({
                    type: field.type || field.datatype,
                    name: name,
                    value: model[name]
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
     * @param  {any}     model          Model with the input data.
     * @return {Promise<any>}           Data to send.
     */
    getDataForFields(fields: any[], signup = false, registerAuth = "", model: any): Promise<any> {
        let result = [],
            promises = [];

        fields.forEach((field) => {
            this.getDataForField(field, signup, registerAuth, model).then((data) => {
                result.push(data);
            }).catch(() => {
                // Ignore errors.
            });
        });

        return Promise.all(promises).then(() => {
            return result;
        });
    }

    /**
     * Get a handler.
     *
     * @param  {any}     field      User field to get the directive for.
     * @param  {boolean} signup     True if user is in signup page.
     * @return {any}                Handler.
     */
    protected getHandler(field: any, signup: boolean): any {
        let type = field.type || field.datatype;

        if (signup) {
            if (this.handlers[type]) {
                return this.handlers[type];
            }
            return false;
        }

        return this.enabledHandlers[type];
    }
}
