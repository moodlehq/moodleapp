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

import { Component } from '@angular/core';

import { AuthEmailSignupProfileField } from '@features/login/services/login-helper';
import { CoreUserProfileFieldBaseComponent } from '@features/user/classes/base-profilefield-component';

/**
 * Directive to render a menu user profile field.
 */
@Component({
    selector: 'addon-user-profile-field-menu',
    templateUrl: 'addon-user-profile-field-menu.html',
})
export class AddonUserProfileFieldMenuComponent extends CoreUserProfileFieldBaseComponent {

    options?: string[];

    /**
     * Init the data when the field is meant to be displayed for editing.
     *
     * @param field Field to render.
     */
    protected initForEdit(field: AuthEmailSignupProfileField): void {
        super.initForEdit(field);

        // Parse options.
        if (field.param1) {
            this.options = field.param1.split(/\r\n|\r|\n/g);
        } else {
            this.options = [];
        }
    }

}
