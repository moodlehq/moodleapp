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

import { CoreSwipeSlidesItemsManagerSource } from './swipe-slides-items-manager-source';

/**
 * Items collection source data for "swipe slides".
 */
export abstract class CoreSwipeSlidesDynamicItemsManagerSource<Item extends CoreSwipeSlidesDynamicItem>
    extends CoreSwipeSlidesItemsManagerSource<Item> {

    // Items being loaded, to prevent loading them twice.
    protected loadingItems: Record<string, boolean> = {};

    /**
     * @inheritdoc
     */
    async load(selectedItem?: Item | null): Promise<void> {
        if (!this.loaded && this.initialItem) {
            // Load the initial item.
            await this.loadItem(this.initialItem);
        } else if (this.loaded && selectedItem) {
            // Reload selected item if needed.
            await this.loadItem(selectedItem);
        }

        this.setLoaded();
    }

    /**
     * @inheritdoc
     */
    protected async loadItems(): Promise<Item[]> {
        // Not used in dynamic slides.
        return [];
    }

    /**
     * Load a certain item and preload next and previous ones.
     *
     * @param item Item to load.
     * @returns Promise resolved when done.
     */
    async loadItem(item: Item): Promise<void> {
        const previousItem = this.getPreviousItem(item);
        const nextItem = this.getNextItem(item);

        await Promise.all([
            this.loadItemInList(item, false),
            previousItem && this.loadItemInList(previousItem, true),
            nextItem && this.loadItemInList(nextItem, true),
        ]);
    }

    /**
     * Load or preload a certain item and add it to the list.
     *
     * @param item Item to load.
     * @param preload Whether to preload.
     * @returns Promise resolved when done.
     */
    async loadItemInList(item: Item, preload = false): Promise<void> {
        const preloadedItem = await this.performLoadItemData(item, preload);
        if (!preloadedItem) {
            return;
        }

        // Add the item at the right position.
        const existingItem = this.getItem(this.getItemId(item));
        if (existingItem) {
            // Already in list, no need to add it.
            return;
        }

        if (!this.items) {
            this.items = [];
        }

        const previousItem = this.getPreviousItem(item);
        const nextItem = this.getNextItem(item);
        const previousItemId = previousItem ? this.getItemId(previousItem) : null;
        const nextItemId = nextItem ? this.getItemId(nextItem) : null;

        const added = this.items.some((item, index) => {
            const itemId = this.getItemId(item);
            let indexToInsert = -1;
            if (itemId === previousItemId) {
                // Previous item found, add the item after it.
                indexToInsert = index + 1;
            }

            if (itemId === nextItemId) {
                // Next item found, add the item before it.
                indexToInsert = index;
            }

            if (indexToInsert > -1) {
                this.items?.splice(indexToInsert, 0, preloadedItem);

                return true;
            }
        });

        if (!added) {
            // Previous and next items not found, this probably means the array is still empty. Add it at the end.
            this.items.push(preloadedItem);
        }

        this.notifyItemsUpdated();
    }

    /**
     * Load or preload a certain item data.
     * This helper function will check some common cases so they don't have to be replicated in all loadItemData implementations.
     *
     * @param item Item to load.
     * @param preload Whether to preload.
     * @returns Promise resolved with item. Resolve with null if already loading or item is not valid (e.g. there are no more items)
     */
    protected async performLoadItemData(item: Item, preload: boolean): Promise<Item | null> {
        const itemId = this.getItemId(item);

        if (this.loadingItems[itemId]) {
            // Already loading, ignore it.
            return null;
        }

        const existingItem = this.getItem(itemId);
        if (existingItem && ((existingItem.loaded && !existingItem.dirty) || preload)) {
            // Already loaded, or preloading an already preloaded item.
            return existingItem;
        }

        // Load the item.
        this.loadingItems[itemId] = true;

        try {
            const itemData = await this.loadItemData(item, preload);

            if (itemData && !preload) {
                itemData.loaded = true;
                itemData.dirty = false;
            }

            if (existingItem && itemData) {
                // Update item that is already in list.
                Object.assign(existingItem, itemData);

                return existingItem;
            }

            return itemData;
        } finally {
            this.loadingItems[itemId] = false;
        }
    }

    /**
     * Mark all items as dirty.
     */
    markAllItemsDirty(): void {
        this.getItems()?.forEach(item => {
            item.dirty = true;
        });
    }

    /**
     * Mark all items as not loaded.
     */
    markAllItemsUnloaded(): void {
        this.getItems()?.forEach(item => {
            item.loaded = false;
        });
    }

    /**
     * Load or preload a certain item data.
     *
     * @param item Basic data about the item to load.
     * @param preload Whether to preload.
     * @returns Promise resolved with item. Resolve with null if item is not valid (e.g. there are no more items).
     */
    abstract loadItemData(item: Item, preload: boolean): Promise<Item | null>;

    /**
     * Return the data to identify the previous item.
     *
     * @param item Data about the item.
     * @returns Previous item data. Null if no previous item.
     */
    abstract getPreviousItem(item: Item): Item | null;

    /**
     * Return the data to identify the next item.
     *
     * @param item Data about the item.
     * @returns Next item data. Null if no next item.
     */
    abstract getNextItem(item: Item): Item | null;

}

export type CoreSwipeSlidesDynamicItem = {
    loaded?: boolean; // Whether the item has been loaded. This value can affect UI (e.g. to display a spinner).
    dirty?: boolean; // Whether the item data needs to be reloaded. This value usually shouldn't affect UI.
};
