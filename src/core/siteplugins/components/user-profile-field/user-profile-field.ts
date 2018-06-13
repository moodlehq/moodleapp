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

import { Component, OnInit, Input } from '@angular/core';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreSitePluginsCompileInitComponent } from '../../classes/compile-init-component';

/**
 * Component that displays a user profile field created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-user-profile-field',
    templateUrl: 'core-siteplugins-user-profile-field.html',
})
export class CoreSitePluginsUserProfileFieldComponent extends CoreSitePluginsCompileInitComponent implements OnInit {
    @Input() field: any; // The profile field to be rendered.
    @Input() signup = false; // True if editing the field in signup. Defaults to false.
    @Input() edit = false; // True if editing the field. Defaults to false.
    @Input() form?: any; // Form where to add the form control. Required if edit=true or signup=true.
    @Input() registerAuth?: string; // Register auth method. E.g. 'email'.

    constructor(sitePluginsProvider: CoreSitePluginsProvider) {
        super(sitePluginsProvider);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {

        // Pass the input data to the component.
        this.jsData = {
            field: this.field,
            signup: this.signup,
            edit: this.edit,
            form: this.form,
            registerAuth: this.registerAuth
        };

        if (this.field) {
            this.getHandlerData('profilefield_' + (this.field.type || this.field.datatype));
        }
    }
}
