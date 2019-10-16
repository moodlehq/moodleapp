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

import { Component, Input, OnInit, Injector } from '@angular/core';
import { CoreUserProfileFieldDelegate } from '../../providers/user-profile-field-delegate';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Directive to render user profile field.
 */
@Component({
    selector: 'core-user-profile-field',
    templateUrl: 'core-user-profile-field.html'
})
export class CoreUserProfileFieldComponent implements OnInit {
    @Input() field: any; // The profile field to be rendered.
    @Input() signup = false; // True if editing the field in signup. Defaults to false.
    @Input() edit = false; // True if editing the field. Defaults to false.
    @Input() form?: any; // Form where to add the form control. Required if edit=true or signup=true.
    @Input() registerAuth?: string; // Register auth method. E.g. 'email'.
    @Input() contextLevel?: string; // The context level.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the field belongs to (if any). It can be used to improve performance with filters.

    componentClass: any; // The class of the component to render.
    data: any = {}; // Data to pass to the component.

    constructor(private ufDelegate: CoreUserProfileFieldDelegate, private utilsProvider: CoreUtilsProvider,
            private injector: Injector) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.ufDelegate.getComponent(this.injector, this.field, this.signup).then((component) => {
            this.componentClass = component;
        });

        this.data.field = this.field;
        this.data.edit = this.utilsProvider.isTrueOrOne(this.edit);
        if (this.edit) {
            this.data.signup = this.utilsProvider.isTrueOrOne(this.signup);
            this.data.disabled = this.utilsProvider.isTrueOrOne(this.field.locked);
            this.data.form = this.form;
            this.data.registerAuth = this.registerAuth;
            this.data.contextLevel = this.contextLevel;
            this.data.contextInstanceId = this.contextInstanceId;
            this.data.courseId = this.courseId;
        }
    }
}
