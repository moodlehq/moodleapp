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
import { Component, HostBinding, Input } from '@angular/core';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';

/**
 * Component to show an empty box message. It will show an optional icon or image and a text centered on page.
 *
 * Use class="core-empty-box-clickable" if you want to add some clickable elements to the box.
 *
 * Usage:
 * <core-empty-box *ngIf="empty" icon="far-bell" [message]="'core.emptymessage' | translate"></core-empty-box>
 */
@Component({
    selector: 'core-empty-box',
    templateUrl: 'core-empty-box.html',
    styleUrl: 'empty-box.scss',
    standalone: true,
    imports: [
        CoreBaseModule,
        CoreFaIconDirective,
    ],
})
export class CoreEmptyBoxComponent {

    @Input() message = ''; // Message to display.
    @Input({ transform: toBoolean }) dimmed = false; // Wether the box is dimmed or not.
    @Input() icon?: string; // Name of the icon to use.
    @Input() image?: string; // Image source. If an icon is provided, image won't be used.
    /**
     * @deprecated since 4.4. Not used anymore.
     */
    @Input({ transform: toBoolean }) flipIconRtl = false;

    @HostBinding('class.dimmed')
    get isDimmed(): boolean {
        return this.dimmed;
    }

}
