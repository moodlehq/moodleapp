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

import { AuthEmailSignupProfileField } from '@features/login/services/signup';
import { CoreUserProfileFieldBaseComponent } from '@features/user/classes/base-profilefield-component';
import { CoreUtils } from '@static/utils';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Directive to render a text user profile field.
 */
@Component({
    selector: 'addon-user-profile-field-text',
    templateUrl: 'addon-user-profile-field-text.html',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonUserProfileFieldTextComponent extends CoreUserProfileFieldBaseComponent {

    inputType?: string;
    maxLength?: number;

    /**
     * Init the data when the field is meant to be displayed for editing.
     *
     * @param field Field to render.
     */
    protected initForEdit(field: AuthEmailSignupProfileField): void {
        super.initForEdit(field);

        // Check max length.
        if (field.param2) {
            this.maxLength = parseInt(field.param2, 10) || Number.MAX_VALUE;
        }

        // Check if it's a password or text.
        this.inputType = CoreUtils.isTrueOrOne(field.param3) ? 'password' : 'text';
    }

}
