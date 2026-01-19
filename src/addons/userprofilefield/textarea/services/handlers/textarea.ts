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

import { CoreUserProfileFieldHandler, CoreUserProfileFieldHandlerData } from '@features/user/services/user-profile-field-delegate';
import { CoreText, DEFAULT_TEXT_FORMAT } from '@singletons/text';
import { AuthEmailSignupProfileField } from '@features/login/services/signup';
import { CoreUserProfileField } from '@features/user/services/user';
import { makeSingleton } from '@singletons';
import { CoreFormFields } from '@singletons/form';

/**
 * Textarea user profile field handlers.
 */
@Injectable({ providedIn: 'root' })
export class AddonUserProfileFieldTextareaHandlerService implements CoreUserProfileFieldHandler {

    name = 'AddonUserProfileFieldTextarea';
    type = 'textarea';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
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

        if (formValues[name]) {
            let text = <string> formValues[name] || '';
            // Add some HTML to the message in case the user edited with textarea.
            text = CoreText.formatHtmlLines(text);

            return {
                type: 'textarea',
                name: name,
                value: JSON.stringify({
                    text: text,
                    format: DEFAULT_TEXT_FORMAT, // Always send this format.
                }),
            };
        }
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonUserProfileFieldTextareaComponent } = await import('../../component/textarea');

        return AddonUserProfileFieldTextareaComponent;
    }

}

export const AddonUserProfileFieldTextareaHandler = makeSingleton(AddonUserProfileFieldTextareaHandlerService);
