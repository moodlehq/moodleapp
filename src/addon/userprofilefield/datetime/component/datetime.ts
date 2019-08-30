// (C) Copyright 2015 Martin Dougiamas
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

import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Directive to render a datetime user profile field.
 */
@Component({
    selector: 'addon-user-profile-field-datetime',
    templateUrl: 'addon-user-profile-field-datetime.html'
})
export class AddonUserProfileFieldDatetimeComponent implements OnInit {
    @Input() field: any; // The profile field to be rendered.
    @Input() edit = false; // True if editing the field. Defaults to false.
    @Input() disabled = false; // True if disabled. Defaults to false.
    @Input() form?: FormGroup; // Form where to add the form control.

    constructor(private fb: FormBuilder, private timeUtils: CoreTimeUtilsProvider, protected utils: CoreUtilsProvider,
            private translate: TranslateService) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        const field = this.field;
        let year;

        if (field && this.edit && this.form) {
            field.modelName = 'profile_field_' + field.shortname;

            // Check if it's only date or it has time too.
            const hasTime = this.utils.isTrueOrOne(field.param3);

            // Calculate format to use.
            field.format = this.timeUtils.fixFormatForDatetime(this.timeUtils.convertPHPToMoment(
                    this.translate.instant('core.' + (hasTime ? 'strftimedatetime' : 'strftimedate'))));

            // Check min value.
            if (field.param1) {
                year = parseInt(field.param1, 10);
                if (year) {
                    field.min = year;
                }
            }

            // Check max value.
            if (field.param2) {
                year = parseInt(field.param2, 10);
                if (year) {
                    field.max = year;
                }
            }

            const formData = {
                value: field.defaultdata,
                disabled: this.disabled
            };
            this.form.addControl(field.modelName, this.fb.control(formData,
                field.required && !field.locked ? Validators.required : null));
        }
    }
}
