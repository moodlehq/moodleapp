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

import { FormControl, Validators } from '@angular/forms';
import { Component } from '@angular/core';

import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@singletons/utils';
import { AuthEmailSignupProfileField } from '@features/login/services/login-helper';
import { CoreUserProfileField } from '@features/user/services/user';
import { CoreUserProfileFieldBaseComponent } from '@features/user/classes/base-profilefield-component';

/**
 * Directive to render a datetime user profile field.
 */
@Component({
    selector: 'addon-user-profile-field-datetime',
    templateUrl: 'addon-user-profile-field-datetime.html',
})
export class AddonUserProfileFieldDatetimeComponent extends CoreUserProfileFieldBaseComponent<string | undefined> {

    ionDateTimePresentation = 'date';
    min?: string;
    max?: string;
    valueNumber?: number;
    displayValue?: string;

    /**
     * Init the data when the field is meant to be displayed without editing.
     *
     * @param field Field to render.
     */
    protected initForNonEdit(field: CoreUserProfileField): void {
        if (field.displayvalue) {
            this.displayValue = field.displayvalue;

            return;
        }

        this.valueNumber = Number(field.value);
    }

    /**
     * Init the data when the field is meant to be displayed for editing.
     *
     * @param field Field to render.
     */
    protected initForEdit(field: AuthEmailSignupProfileField): void {
        super.initForEdit(field);

        // Check if it's only date or it has time too.
        const hasTime = CoreUtils.isTrueOrOne(field.param3);

        // Calculate format to use.
        this.ionDateTimePresentation = hasTime ? 'date-time' : 'date';

        // Check min value.
        if (field.param1 && Number(field.param1)) {
            this.min = field.param1;
        }

        // Check max value.
        if (field.param2 && Number(field.param2)) {
            this.max = field.param2;
        }

        this.min = this.min || CoreTimeUtils.getDatetimeDefaultMin();
        this.max = this.max || CoreTimeUtils.getDatetimeDefaultMax();
    }

    /**
     * Create the Form control.
     *
     * @returns Form control.
     */
    protected createFormControl(field: AuthEmailSignupProfileField): FormControl<string | undefined> {
        const formData = {
            value: field.defaultdata && field.defaultdata !== '0' ? field.defaultdata : undefined,
            disabled: this.disabled,
        };

        return new FormControl(formData, {
            validators: this.required && !field.locked ? Validators.required : null,
            nonNullable: true,
        });
    }

}
