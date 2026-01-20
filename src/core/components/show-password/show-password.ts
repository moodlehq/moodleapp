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

import { Component, ViewEncapsulation, input } from '@angular/core';
import { CoreBaseModule } from '@/core/base.module';

/**
 * This component allows to show/hide a password.
 * It's meant to be used with ion-input as a slot of the input.
 *
 * @deprecated since 4.5. Use <ion-input-password-toggle slot="end" showIcon="fas-eye" hideIcon="fas-eye-slash" /> instead.
 */
@Component({
    selector: 'core-show-password',
    template: '<ng-content /><ion-input-password-toggle slot="end" />',
    styles: 'core-show-password { display: contents; }',
    encapsulation: ViewEncapsulation.None,
    imports: [CoreBaseModule],
})
export class CoreShowPasswordComponent {

    /**
     * @deprecated since 4.5. Not used anymore.
     */
    readonly initialShown = input('');

}
