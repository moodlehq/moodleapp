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

import { Component, Input, OnInit } from '@angular/core';
import { PopoverController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreContextMenuItemComponent } from './context-menu-item';
import { CoreContextMenuPopoverComponent } from './context-menu-popover';
import { Subject } from 'rxjs';

/**
 * This component adds a button (usually in the navigation bar) that displays a context menu popover.
 */
@Component({
    selector: 'core-context-menu',
    templateUrl: 'context-menu.html'
})
export class CoreContextMenuComponent implements OnInit {
    @Input() icon?: string; // Icon to be shown on the navigation bar. Default: Kebab menu icon.
    @Input() title?: string; // Aria label and text to be shown on the top of the popover.

    hideMenu: boolean;
    ariaLabel: string;
    protected items: CoreContextMenuItemComponent[] = [];
    protected itemsChangedStream: Subject<void>; // Stream to update the hideMenu boolean when items change.

    constructor(private translate: TranslateService, private popoverCtrl: PopoverController) {
        // Create the stream and subscribe to it. We ignore successive changes during 250ms.
        this.itemsChangedStream = new Subject<void>();
        this.itemsChangedStream.auditTime(250).subscribe(() => {
            // Hide the menu if all items are hidden.
            this.hideMenu = !this.items.some((item) => {
                return !item.hidden;
            });
        })
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        this.icon = this.icon || 'more';
        this.ariaLabel = this.title || this.translate.instant('core.info');
    }

    /**
     * Add a context menu item.
     *
     * @param {CoreContextMenuItemComponent} item The item to add.
     */
    addItem(item: CoreContextMenuItemComponent) : void {
        this.items.push(item);
        this.itemsChanged();
    }

    /**
     * Function called when the items change.
     */
    itemsChanged() {
        this.itemsChangedStream.next();
    }

    /**
     * Remove an item from the context menu.
     *
     * @param {CoreContextMenuItemComponent} item The item to remove.
     */
    removeItem(item: CoreContextMenuItemComponent) : void {
        let index = this.items.indexOf(item);
        if (index >= 0) {
            this.items.splice(index, 1);
        }
        this.itemsChanged();
    }

    /**
     * Show the context menu.
     *
     * @param {MouseEvent} event Event.
     */
    showContextMenu(event: MouseEvent) : void {
        let popover = this.popoverCtrl.create(CoreContextMenuPopoverComponent, {title: this.title, items: this.items});
        popover.present({
            ev: event
        });
    }
}
