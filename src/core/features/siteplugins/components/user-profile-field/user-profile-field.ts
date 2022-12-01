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

import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { AuthEmailSignupProfileField } from '@features/login/services/login-helper';
import { CoreSitePluginsCompileInitComponent } from '@features/siteplugins/classes/compile-init-component';
import { CoreUserProfileField } from '@features/user/services/user';
import { CoreUserProfileFieldDelegate } from '@features/user/services/user-profile-field-delegate';

/**
 * Component that displays a user profile field created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-user-profile-field',
    templateUrl: 'core-siteplugins-user-profile-field.html',
    styles: [':host { display: contents; }'],
})
export class CoreSitePluginsUserProfileFieldComponent extends CoreSitePluginsCompileInitComponent implements OnInit {

    @Input() field?: AuthEmailSignupProfileField | CoreUserProfileField; // The profile field to be rendered.
    @Input() signup = false; // True if editing the field in signup. Defaults to false.
    @Input() edit = false; // True if editing the field. Defaults to false.
    @Input() disabled = false; // True if disabled. Defaults to false.
    @Input() form?: FormGroup; // Form where to add the form control. Required if edit=true or signup=true.
    @Input() registerAuth?: string; // Register auth method. E.g. 'email'.
    @Input() contextLevel?: string; // The context level.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the field belongs to (if any). It can be used to improve performance with filters.

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        // Pass the input data to the component.
        this.jsData.field = this.field;
        this.jsData.signup = this.signup;
        this.jsData.edit = this.edit;
        this.jsData.disabled = this.disabled;
        this.jsData.form = this.form;
        this.jsData.registerAuth = this.registerAuth;

        if (this.field) {
            const type = 'type' in this.field ? this.field.type : this.field.datatype;
            this.getHandlerData(CoreUserProfileFieldDelegate.getHandlerName(type || ''));
        }
    }

}
