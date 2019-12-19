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

import { Component, Input, OnInit, OnDestroy, ElementRef, Optional } from '@angular/core';
import { PopoverController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreContextMenuItemComponent } from './context-menu-item';
import { CoreContextMenuPopoverComponent } from './context-menu-popover';
import { CoreTabComponent } from '@components/tabs/tab';
import { Subject } from 'rxjs';

/**
 * This component adds a button (usually in the navigation bar) that displays a context menu popover.
 */
@Component({
    selector: 'core-context-menu',
    templateUrl: 'core-context-menu.html'
})
export class CoreContextMenuComponent implements OnInit, OnDestroy {
    @Input() icon?: string; // Icon to be shown on the navigation bar. Default: Kebab menu icon.
    @Input() title?: string; // Text to be shown on the top of the popover.
    @Input('aria-label') ariaLabel?: string; // Aria label to be shown on the top of the popover.

    hideMenu = true; // It will be unhidden when items are added.
    expanded = false;
    protected items: CoreContextMenuItemComponent[] = [];
    protected itemsMovedToParent: CoreContextMenuItemComponent[] = [];
    protected itemsChangedStream: Subject<void>; // Stream to update the hideMenu boolean when items change.
    protected instanceId: string;
    protected parentContextMenu: CoreContextMenuComponent;
    protected uniqueId: string;

    constructor(private translate: TranslateService, private popoverCtrl: PopoverController, elementRef: ElementRef,
            private domUtils: CoreDomUtilsProvider, @Optional() public coreTab: CoreTabComponent, utils: CoreUtilsProvider) {
        // Create the stream and subscribe to it. We ignore successive changes during 250ms.
        this.itemsChangedStream = new Subject<void>();
        this.itemsChangedStream.auditTime(250).subscribe(() => {
            // Hide the menu if all items are hidden.
            this.hideMenu = !this.items.some((item) => {
                return !item.hidden;
            });

            // Sort the items by priority.
            this.items.sort((a, b) => {
                return a.priority <= b.priority ? 1 : -1;
            });
        });

        // Calculate the unique ID.
        this.uniqueId = 'core-context-menu-' + utils.getUniqueId('CoreContextMenuComponent');

        this.instanceId = this.domUtils.storeInstanceByElement(elementRef.nativeElement, this);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.icon = this.icon || 'more';
        this.ariaLabel = this.ariaLabel || this.title || this.translate.instant('core.info');
    }

    /**
     * Add a context menu item.
     *
     * @param item The item to add.
     */
    addItem(item: CoreContextMenuItemComponent): void {
        if (this.parentContextMenu) {
            // All items were moved to the "parent" menu. Add the item in there.
            this.parentContextMenu.addItem(item);

            if (this.itemsMovedToParent.indexOf(item) == -1) {
                this.itemsMovedToParent.push(item);
            }
        } else if (this.items.indexOf(item) == -1) {
            this.items.push(item);
            this.itemsChanged();
        }
    }

    /**
     * Function called when the items change.
     */
    itemsChanged(): void {
        if (this.parentContextMenu) {
            // All items were moved to the "parent" menu, call the function in there.
            this.parentContextMenu.itemsChanged();
        } else {
            this.itemsChangedStream.next();
        }
    }

    /**
     * Merge the current context menu with the one passed as parameter. All the items in this menu will be moved to the
     * one passed as parameter.
     *
     * @param contextMenu The context menu where to move the items.
     */
    mergeContextMenus(contextMenu: CoreContextMenuComponent): void {
        this.parentContextMenu = contextMenu;

        // Add all the items to the other menu.
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            contextMenu.addItem(item);
            this.itemsMovedToParent.push(item);
        }

        // Remove all items from the current menu.
        this.items = [];
        this.itemsChanged();
    }

    /**
     * Remove an item from the context menu.
     *
     * @param item The item to remove.
     */
    removeItem(item: CoreContextMenuItemComponent): void {
        if (this.parentContextMenu) {
            // All items were moved to the "parent" menu. Remove the item from there.
            this.parentContextMenu.removeItem(item);

            const index = this.itemsMovedToParent.indexOf(item);
            if (index >= 0) {
                this.itemsMovedToParent.splice(index, 1);
            }
        } else {
            const index = this.items.indexOf(item);
            if (index >= 0) {
                this.items.splice(index, 1);
            }
            this.itemsChanged();
        }
    }

    /**
     * Remove the items that were merged to a parent context menu.
     */
    removeMergedItems(): void {
        if (this.parentContextMenu) {
            for (let i = 0; i < this.itemsMovedToParent.length; i++) {
                this.parentContextMenu.removeItem(this.itemsMovedToParent[i]);
            }
        }
    }

    /**
     * Restore the items that were merged to a parent context menu.
     */
    restoreMergedItems(): void {
        if (this.parentContextMenu) {
            for (let i = 0; i < this.itemsMovedToParent.length; i++) {
                this.parentContextMenu.addItem(this.itemsMovedToParent[i]);
            }
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Event.
     */
    showContextMenu(event: MouseEvent): void {
        if (!this.expanded) {
            const popover = this.popoverCtrl.create(CoreContextMenuPopoverComponent,
                { title: this.title, items: this.items, id: this.uniqueId, showBackdrop: true });

            popover.onDidDismiss((item: CoreContextMenuItemComponent) => {
                this.expanded = false;

                if (item) {
                    item.onClosed.emit();
                }
            });
            popover.present({
                ev: event
            });

            this.expanded = true;
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.domUtils.removeInstanceById(this.instanceId);
        this.removeMergedItems();
    }
}
