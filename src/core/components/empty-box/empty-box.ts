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

import { Component, Input } from '@angular/core';

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
    styleUrls: ['empty-box.scss'],
})
export class CoreEmptyBoxComponent {

    @Input() message = ''; // Message to display.
    @Input() icon?: string; // Name of the icon to use.
    @Input() image?: string; // Image source. If an icon is provided, image won't be used.

    /**
     * If this has to be shown inline instead of occupying whole page.
     * If image or icon is not supplied, it's true by default.
     */
    @Input() inline = false;
    @Input() flipIconRtl = false; // Whether to flip the icon in RTL. Defaults to false.

}
