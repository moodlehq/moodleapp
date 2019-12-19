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

import { Injector } from '@angular/core';
import { CoreUserProfileFieldHandler, CoreUserProfileFieldHandlerData } from '@core/user/providers/user-profile-field-delegate';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CoreSitePluginsUserProfileFieldComponent } from '../../components/user-profile-field/user-profile-field';

/**
 * Handler to display a site plugin in the user profile.
 */
export class CoreSitePluginsUserProfileFieldHandler extends CoreSitePluginsBaseHandler implements CoreUserProfileFieldHandler {

    constructor(name: string, public type: string) {
        super(name);
    }

    /**
     * Return the Component to use to display the user profile field.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any> {
        return CoreSitePluginsUserProfileFieldComponent;
    }

    /**
     * Get the data to send for the field based on the input data.
     * @param field User field to get the data for.
     * @param signup True if user is in signup page.
     * @param registerAuth Register auth method. E.g. 'email'.
     * @param formValues Form Values.
     * @return Data to send for the field.
     */
    getData(field: any, signup: boolean, registerAuth: string, formValues: any):
            Promise<CoreUserProfileFieldHandlerData> | CoreUserProfileFieldHandlerData {
        // No getData function implemented, use a default behaviour.
        const name = 'profile_field_' + field.shortname;

        return {
            type: field.type || field.datatype,
            name: name,
            value: formValues[name]
        };
    }
}
