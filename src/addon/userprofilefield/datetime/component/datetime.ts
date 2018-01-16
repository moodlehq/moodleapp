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

/**
 * Directive to render a datetime user profile field.
 */
@Component({
    selector: 'core-user-profile-field-datetime',
    templateUrl: 'datetime.html'
})
export class AddonUserProfileFieldDatetimeComponent implements OnInit {
    @Input() field: any; // The profile field to be rendered.
    @Input() edit?: boolean = false; // True if editing the field. Defaults to false.
    @Input() model?: any; // Model where to store the data. Required if edit=true or signup=true.


    constructor() {}

    /**
     * Component being initialized.
     */
    ngOnInit() {
        let field = this.field,
            year;
        if (field && this.edit && this.model) {
            field.modelName = 'profile_field_' + field.shortname;

            // Check if it's only date or it has time too.
            field.hasTime = field.param3 && field.param3 !== '0' && field.param3 !== 'false';
            field.format = field.hasTime ? 'core.dffulldate' : 'core.dfdaymonthyear';

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
        }
    }

}