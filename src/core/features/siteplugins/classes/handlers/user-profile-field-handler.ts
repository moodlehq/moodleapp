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

import { Type } from '@angular/core';

import { AuthEmailSignupProfileField } from '@features/login/services/login-helper';
import { CoreUserProfileField } from '@features/user/services/user';
import { CoreUserProfileFieldHandler, CoreUserProfileFieldHandlerData } from '@features/user/services/user-profile-field-delegate';
import { CoreFormFields } from '@singletons/form';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to display a site plugin in the user profile.
 */
export class CoreSitePluginsUserProfileFieldHandler extends CoreSitePluginsBaseHandler implements CoreUserProfileFieldHandler {

    constructor(name: string, public type: string) {
        super(name);
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { CoreSitePluginsUserProfileFieldComponent } =
            await import('@features/siteplugins/components/user-profile-field/user-profile-field');

        return CoreSitePluginsUserProfileFieldComponent;
    }

    /**
     * @inheritdoc
     */
    async getData(
        field: AuthEmailSignupProfileField | CoreUserProfileField,
        signup: boolean,
        registerAuth: string,
        formValues: CoreFormFields,
    ): Promise<CoreUserProfileFieldHandlerData> {
        // No getData function implemented, use a default behaviour.
        const name = `profile_field_${field.shortname}`;

        return {
            type: ('type' in field ? field.type : field.datatype) || '',
            name: name,
            value: formValues[name],
        };
    }

}
