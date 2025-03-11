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

import { AuthEmailSignupProfileField } from '@features/login/services/login-helper';
import { CoreUserProfileField } from '@features/user/services/user';
import { CoreUserProfileFieldHandler, CoreUserProfileFieldHandlerData } from '@features/user/services/user-profile-field-delegate';
import { CoreFormFields } from '@singletons/form';
import { makeSingleton } from '@singletons';

/**
 * Checkbox user profile field handlers.
 */
@Injectable({ providedIn: 'root' })
export class AddonUserProfileFieldCheckboxHandlerService implements CoreUserProfileFieldHandler {

    name = 'AddonUserProfileFieldCheckbox';
    type = 'checkbox';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns Promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Get the data to send for the field based on the input data.
     *
     * @param field User field to get the data for.
     * @param signup True if user is in signup page.
     * @param registerAuth Register auth method. E.g. 'email'.
     * @param formValues Form Values.
     * @returns Data to send for the field.
     */
    async getData(
        field: AuthEmailSignupProfileField | CoreUserProfileField,
        signup: boolean,
        registerAuth: string,
        formValues: CoreFormFields,
    ): Promise<CoreUserProfileFieldHandlerData | undefined> {
        const name = `profile_field_${field.shortname}`;

        if (formValues[name] !== undefined) {
            return {
                type: 'checkbox',
                name: name,
                value: formValues[name] ? 1 : 0,
            };
        }
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonUserProfileFieldCheckboxComponent } = await import('../../component/checkbox');

        return AddonUserProfileFieldCheckboxComponent;
    }

}

export const AddonUserProfileFieldCheckboxHandler = makeSingleton(AddonUserProfileFieldCheckboxHandlerService);
