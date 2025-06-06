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

import { CoreConstants } from '@/core/constants';
import { Component, input } from '@angular/core';
import { PopoverController } from '@singletons';
import { CoreContextMenuItemComponent } from './context-menu-item';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreLinkDirective } from '@directives/link';

/**
 * Component to display a list of items received by param in a popover.
 */
@Component({
    selector: 'core-context-menu-popover',
    templateUrl: 'core-context-menu-popover.html',
    styleUrl: 'context-menu-popover.scss',
    imports: [
        CoreBaseModule,
        CoreFaIconDirective,
        CoreLinkDirective,
    ],
})
export class CoreContextMenuPopoverComponent {

    items = input<CoreContextMenuItemComponent[]>([]);

    /**
     * Close the popover.
     */
    closeMenu(item?: CoreContextMenuItemComponent): void {
        PopoverController.dismiss(item);
    }

    /**
     * Function called when an item is clicked.
     *
     * @param event Click event.
     * @param item Item clicked.
     * @returns Return true if success, false if error.
     */
    itemClicked(event: Event, item: CoreContextMenuItemComponent): boolean {
        if (item.iconAction() === 'toggle' && !event.defaultPrevented) {
            event.preventDefault();
            event.stopPropagation();
            item.toggle.set(!item.toggle);
        }

        if (item.action.observed) {
            event.preventDefault();
            event.stopPropagation();

            if (item.iconAction() === CoreConstants.ICON_LOADING) {
                return false;
            }

            if (item.closeOnClick()) {
                this.closeMenu(item);
            }

            item.action.emit(() => this.closeMenu(item));
        } else if (item.closeOnClick() && (item.effectiveHref() || (!!item.onClosed && item.onClosed.observed))) {
            this.closeMenu(item);
        }

        return true;
    }

}
