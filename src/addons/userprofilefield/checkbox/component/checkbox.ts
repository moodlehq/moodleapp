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
import { Validators, FormControl } from '@angular/forms';

import { AuthEmailSignupProfileField } from '@features/login/services/login-helper';
import { CoreUserProfileFieldBaseComponent } from '@features/user/classes/base-profilefield-component';
import { CoreUtils } from '@services/utils/utils';

/**
 * Directive to render a checkbox user profile field.
 */
@Component({
    selector: 'addon-user-profile-field-checkbox',
    templateUrl: 'addon-user-profile-field-checkbox.html',
    styleUrl: './checkbox.scss',
})
export class AddonUserProfileFieldCheckboxComponent extends CoreUserProfileFieldBaseComponent<boolean> {

    /**
     * Create the Form control.
     *
     * @returns Form control.
     */
    protected createFormControl(field: AuthEmailSignupProfileField): FormControl<boolean> {
        const formData = {
            value: CoreUtils.isTrueOrOne(field.defaultdata),
            disabled: this.disabled,
        };

        return new FormControl(formData, {
            validators: this.required && !field.locked ? Validators.requiredTrue : null,
            nonNullable: true,
        });
    }

}
