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

import { Component, OnDestroy, ElementRef, input, signal, computed, inject } from '@angular/core';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreUtils } from '@singletons/utils';
import { Translate } from '@singletons';
import { CoreContextMenuItemComponent } from './context-menu-item';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';

/**
 * This component adds a button (usually in the navigation bar) that displays a context menu popover.
 */
@Component({
    selector: 'core-context-menu',
    templateUrl: 'core-context-menu.html',
    imports: [
        CoreBaseModule,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFaIconDirective,
    ],
})
export class CoreContextMenuComponent implements OnDestroy {

    readonly icon = input('ellipsis-vertical'); // Icon to be shown on the navigation bar. Default: Kebab menu icon.
    readonly ariaLabel = input(Translate.instant('core.displayoptions'), { // Aria label to be shown on the top of the popover.
        alias: 'aria-label',
    });

    readonly hideMenu = computed(() => !this.items().some((item) => !item.hidden())); // Hide menu if all items are hidden.
    readonly uniqueId = `core-context-menu-${CoreUtils.getUniqueId('CoreContextMenuComponent')}`;

    protected readonly items = signal<CoreContextMenuItemComponent[]>([]);
    protected itemsMovedToParent: CoreContextMenuItemComponent[] = [];
    protected parentContextMenu?: CoreContextMenuComponent;
    protected expanded = false;

    constructor() {
        const element: HTMLElement = inject(ElementRef).nativeElement;
        CoreDirectivesRegistry.register(element, this);
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

            if (this.itemsMovedToParent.indexOf(item) === -1) {
                this.itemsMovedToParent.push(item);
            }
        } else if (this.items().indexOf(item) == -1) {
            this.items.update(items => items.concat(item).sort((a, b) => (a.priority || 0) <= (b.priority || 0) ? 1 : -1));
        }
    }

    /**
     * Function called when the visibility of one or more items change.
     */
    itemHiddenChanged(): void {
        if (this.parentContextMenu) {
            // All items were moved to the "parent" menu, call the function in there.
            this.parentContextMenu.itemHiddenChanged();
        } else {
            // Notify that items have changed since the visibility has changed.
            this.items.update(items => Array.from(items));
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
        for (let i = 0; i < this.items().length; i++) {
            const item = this.items()[i];
            contextMenu.addItem(item);
            this.itemsMovedToParent.push(item);
        }

        // Remove all items from the current menu.
        this.items.set([]);
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
            this.items.update(items => items.filter(i => i !== item));
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
    async showContextMenu(event: MouseEvent): Promise<void> {
        if (!this.expanded) {
            this.expanded = true;

            const { CoreContextMenuPopoverComponent } = await import('./context-menu-popover');

            const itemClicked = await CorePopovers.open<CoreContextMenuItemComponent>({
                event,
                component: CoreContextMenuPopoverComponent,
                componentProps: {
                    items: this.items(),
                },
                id: this.uniqueId,
            });

            this.expanded = false;

            itemClicked?.onClosed?.emit();
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.removeMergedItems();
    }

}
