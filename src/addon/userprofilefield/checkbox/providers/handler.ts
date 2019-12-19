
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
import { CoreUserProfileFieldHandler, CoreUserProfileFieldHandlerData } from '@core/user/providers/user-profile-field-delegate';
import { AddonUserProfileFieldCheckboxComponent } from '../component/checkbox';

/**
 * Checkbox user profile field handlers.
 */
@Injectable()
export class AddonUserProfileFieldCheckboxHandler implements CoreUserProfileFieldHandler {
    name = 'AddonUserProfileFieldCheckbox';
    type = 'checkbox';

    constructor() {
        // Nothing to do.
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Get the data to send for the field based on the input data.
     *
     * @param field User field to get the data for.
     * @param signup True if user is in signup page.
     * @param registerAuth Register auth method. E.g. 'email'.
     * @param formValues Form Values.
     * @return Data to send for the field.
     */
    getData(field: any, signup: boolean, registerAuth: string, formValues: any): CoreUserProfileFieldHandlerData {
        const name = 'profile_field_' + field.shortname;

        if (typeof formValues[name] != 'undefined') {
            return {
                type: 'checkbox',
                name: name,
                value: formValues[name] ? 1 : 0
            };
        }
    }

    /**
     * Return the Component to use to display the user profile field.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any> {
        return AddonUserProfileFieldCheckboxComponent;
    }
}
