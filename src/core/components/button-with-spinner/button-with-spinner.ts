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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, input } from '@angular/core';
import { CoreAnimations } from '@components/animations';
import { CoreBaseModule } from '@/core/base.module';

/**
 * Component to show a button or a spinner when loading.
 *
 * Usage:
 * <core-button-with-spinner [loading]="loading">
 *     <ion-button>...</ion-button>
 * </core-button-with-spinner>
 */
@Component({
    selector: 'core-button-with-spinner',
    templateUrl: 'core-button-with-spinner.html',
    styleUrl: 'button-with-spinner.scss',
    animations: [CoreAnimations.SHOW_HIDE],
    imports: [CoreBaseModule],
})
export class CoreButtonWithSpinnerComponent {

    loading = input(true, { transform: toBoolean });
    loadingLabel = input('core.loading');

}
