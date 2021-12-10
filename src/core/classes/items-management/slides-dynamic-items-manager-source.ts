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

import { CoreSwipeSlidesItemsManagerSource } from './slides-items-manager-source';

/**
 * Items collection source data for "swipe slides".
 */
export abstract class CoreSwipeSlidesDynamicItemsManagerSource<Item = unknown> extends CoreSwipeSlidesItemsManagerSource<Item> {

    /**
     * @inheritdoc
     */
    async load(): Promise<void> {
        if (this.initialItem) {
            // Load the initial item.
            await this.loadItem(this.initialItem);
        }

        this.setInitialized();
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
     * @param item Basic data about the item to load.
     * @return Promise resolved when done.
     */
    async loadItem(item: Partial<Item>): Promise<void> {
        const previousItem = this.getPreviousItem(item);
        const nextItem = this.getNextItem(item);

        await Promise.all([
            this.loadItemInList(item, false),
            previousItem ? this.loadItemInList(previousItem, true) : undefined,
            nextItem ? this.loadItemInList(nextItem, true) : undefined,
        ]);
    }

    /**
     * Load or preload a certain item and add it to the list.
     *
     * @param item Basic data about the item to load.
     * @param preload Whether to preload.
     * @return Promise resolved when done.
     */
    async loadItemInList(item: Partial<Item>, preload = false): Promise<void> {
        const preloadedItem = await this.loadItemData(item, preload);
        if (!preloadedItem) {
            return;
        }

        // Add the item at the right position.
        const existingItem = this.getItem(item);
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
            let positionToInsert = -1;
            if (itemId === previousItemId) {
                // Previous item found, add the item after it.
                positionToInsert = index + 1;
            }

            if (itemId === nextItemId) {
                // Next item found, add the item before it.
                positionToInsert = index;
            }

            if (positionToInsert > -1) {
                this.items?.splice(positionToInsert, 0, preloadedItem);

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
     *
     * @param item Basic data about the item to load.
     * @param preload Whether to preload.
     * @return Promise resolved with item. Resolve with null if item is not valid (e.g. there are no more items).
     */
    abstract loadItemData(item: Partial<Item>, preload: boolean): Promise<Item | null>;

    /**
     * Return the data to identify the previous item.
     *
     * @param item Data about the item.
     * @return Previous item data. Null if no previous item.
     */
    abstract getPreviousItem(item: Partial<Item>): Partial<Item> | null;

    /**
     * Return the data to identify the next item.
     *
     * @param item Data about the item.
     * @return Next item data. Null if no next item.
     */
    abstract getNextItem(item: Partial<Item>): Partial<Item> | null;

}
