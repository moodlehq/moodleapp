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

import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
} from '@angular/core';
import { CoreGroupInfo } from '@services/groups';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreAlertCardComponent } from '@components/alert-card/alert-card';

/**
 * Component to display a group selector.
 */
@Component({
    selector: 'core-group-selector',
    templateUrl: 'group-selector.html',
    styleUrl: 'group-selector.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreBaseModule,
        CoreFaIconDirective,
        CoreFormatTextDirective,
        CoreAlertCardComponent,
    ],
})
export class CoreGroupSelectorComponent {

    readonly groupInfo = input<CoreGroupInfo>();
    readonly multipleGroupsMessage = input<string>();
    readonly selected = model.required<number>();
    readonly courseId = input<number>();

}
