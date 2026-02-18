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

import { CoreLinkOpenMethod } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { Component, input } from '@angular/core';
import { CoreViewer } from '@features/viewer/services/viewer';

/**
 * Component to display a custom menu item.
 */
@Component({
    selector: 'core-custom-menu-item',
    templateUrl: 'custom-menu-item.html',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCustomMenuItemComponent {

    /**
     * Type of the item: app, inappbrowser, browser or embedded.
     */
    readonly type = input.required<CoreLinkOpenMethod>();

    /**
     * Url of the item.
     */
    readonly url = input.required<string>();

    /**
     * Label to display for the item.
     */
    readonly label = input.required<string>();

    /**
     * Name of the icon to display for the item.
     */
    readonly icon = input.required<string>();

    /**
     * Extra data to add additional features.
     */
    readonly extraData = input<Record<string, unknown>>();

    /**
     * Open an embedded custom item.
     */
    openItem(): void {
        CoreViewer.openIframeViewer(this.label(), this.url());
    }

}
