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
 * Directive to render a text user profile field.
 */
@Component({
    selector: 'core-user-profile-field-text',
    templateUrl: 'text.html'
})
export class AddonUserProfileFieldTextComponent implements OnInit {
    @Input() field: any; // The profile field to be rendered.
    @Input() edit?: boolean = false; // True if editing the field. Defaults to false.
    @Input() model?: any; // Model where to store the data. Required if edit=true or signup=true.

    constructor() {}

    /**
     * Component being initialized.
     */
    ngOnInit() {
        let field = this.field;

        if (field && this.edit && this.model) {
            field.modelName = 'profile_field_' + field.shortname;

            // Check max length.
            if (field.param2) {
                field.maxlength = parseInt(field.param2, 10) || '';
            }

            // Check if it's a password or text.
            field.inputType = field.param3 && field.param3 !== '0' && field.param3 !== 'false' ? 'password' : 'text';

            // Initialize the value using default data.
            if (typeof field.defaultdata != 'undefined' && typeof this.model[field.modelName] == 'undefined') {
                this.model[field.modelName] = field.defaultdata;
            }
        }
    }

}