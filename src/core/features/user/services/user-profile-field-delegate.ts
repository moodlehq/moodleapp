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

import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreError } from '@classes/errors/error';
import { AuthEmailSignupProfileField } from '@features/login/services/login-helper';
import { makeSingleton } from '@singletons';
import { CoreUserProfileField } from './user';

/**
 * Interface that all user profile field handlers must implement.
 */
export interface CoreUserProfileFieldHandler extends CoreDelegateHandler {
    /**
     * Type of the field the handler supports. E.g. 'checkbox'.
     */
    type: string;

    /**
     * Return the Component to use to display the user profile field.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> | Promise<Type<unknown>>;

    /**
     * Get the data to send for the field based on the input data.
     *
     * @param field User field to get the data for.
     * @param signup True if user is in signup page.
     * @param registerAuth Register auth method. E.g. 'email'.
     * @param formValues Form Values.
     * @returns Data to send for the field.
     */
    getData?(
        field: AuthEmailSignupProfileField | CoreUserProfileField,
        signup: boolean,
        registerAuth: string,
        formValues: Record<string, unknown>,
    ): Promise<CoreUserProfileFieldHandlerData | undefined>;
}

export interface CoreUserProfileFieldHandlerData {
    /**
     * Name of the custom field.
     */
    name: string;

    /**
     * The type of the custom field
     */
    type: string;

    /**
     * Value of the custom field.
     */
    value: unknown;
}

/**
 * Service to interact with user profile fields.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserProfileFieldDelegateService extends CoreDelegate<CoreUserProfileFieldHandler> {

    protected handlerNameProperty = 'type';

    /**
     * Get the type of a field.
     *
     * @param field The field to get its type.
     * @returns The field type.
     */
    protected getType(field: AuthEmailSignupProfileField | CoreUserProfileField): string {
        return ('type' in field ? field.type : field.datatype) || '';
    }

    /**
     * Get the component to use to display an user field.
     *
     * @param field User field to get the directive for.
     * @param signup True if user is in signup page.
     * @returns Promise resolved with component to use, undefined if not found.
     */
    async getComponent(
        field: AuthEmailSignupProfileField | CoreUserProfileField,
        signup: boolean,
    ): Promise<Type<unknown> | undefined> {
        const type = this.getType(field);

        try {
            if (signup) {
                return await this.executeFunction(type, 'getComponent', []);
            } else {
                return await this.executeFunctionOnEnabled(type, 'getComponent', []);
            }
        } catch (error) {
            this.logger.error('Error getting component for field', type, error);
        }
    }

    /**
     * Get the data to send for a certain field based on the input data.
     *
     * @param field User field to get the data for.
     * @param signup True if user is in signup page.
     * @param registerAuth Register auth method. E.g. 'email'.
     * @param formValues Form values.
     * @returns Data to send for the field.
     */
    async getDataForField(
        field: AuthEmailSignupProfileField | CoreUserProfileField,
        signup: boolean,
        registerAuth: string,
        formValues: Record<string, unknown>,
    ): Promise<CoreUserProfileFieldHandlerData | undefined> {
        const type = this.getType(field);
        const handler = this.getHandler(type, !signup);

        if (handler) {
            const name = `profile_field_${field.shortname}`;

            if (handler.getData) {
                return handler.getData(field, signup, registerAuth, formValues);
            } else if (field.shortname && formValues[name] !== undefined) {
                // Handler doesn't implement the function, but the form has data for the field.
                return {
                    type: type,
                    name: name,
                    value: formValues[name],
                };
            }
        }

        throw new CoreError('User profile field handler not found.');
    }

    /**
     * Get the data to send for a list of fields based on the input data.
     *
     * @param fields User fields to get the data for.
     * @param signup True if user is in signup page.
     * @param registerAuth Register auth method. E.g. 'email'.
     * @param formValues Form values.
     * @returns Data to send.
     */
    async getDataForFields(
        fields: (AuthEmailSignupProfileField | CoreUserProfileField)[] | undefined,
        signup: boolean = false,
        registerAuth: string = '',
        formValues: Record<string, unknown>,
    ): Promise<CoreUserProfileFieldHandlerData[]> {
        if (!fields) {
            return [];
        }

        const result: CoreUserProfileFieldHandlerData[] = [];

        await Promise.all(fields.map(async (field) => {
            try {
                const data = await this.getDataForField(field, signup, registerAuth, formValues);

                if (data) {
                    result.push(data);
                }
            } catch {
                // Ignore errors.
            }
        }));

        return result;
    }

    /**
     * Check if any of the profile fields is not supported in the app.
     *
     * @param fields List of fields.
     * @returns Whether any of the profile fields is not supported in the app.
     */
    hasRequiredUnsupportedField(fields?: AuthEmailSignupProfileField[]): boolean {
        if (!fields || !fields.length) {
            return false;
        }

        return fields.some((field) => field.required && !this.hasHandler(this.getType(field)));
    }

}

export const CoreUserProfileFieldDelegate = makeSingleton(CoreUserProfileFieldDelegateService);
