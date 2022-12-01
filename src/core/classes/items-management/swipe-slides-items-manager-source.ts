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

import { CoreItemsManagerSource } from './items-manager-source';

/**
 * Items collection source data for "swipe slides".
 */
export abstract class CoreSwipeSlidesItemsManagerSource<Item = unknown> extends CoreItemsManagerSource<Item> {

    protected initialItem?: Item;

    constructor(initialItem?: Item) {
        super();

        this.initialItem = initialItem;
    }

    /**
     * @inheritdoc
     */
    async load(): Promise<void> {
        const items = await this.loadItems();

        this.setItems(items);
    }

    /**
     * Load items.
     *
     * @returns Items list.
     */
    protected abstract loadItems(): Promise<Item[]>;

    /**
     * Get a certain item.
     *
     * @param id Item ID.
     * @returns Item, null if not found.
     */
    getItem(id: string | number): Item | null {
        const index = this.getItemIndexById(id);

        return this.items?.[index] ?? null;
    }

    /**
     * Get a certain item index.
     *
     * @param item Item.
     * @returns Item index, -1 if not found.
     */
    getItemIndex(item: Item): number {
        return this.getItemIndexById(this.getItemId(item));
    }

    /**
     * Get a certain item index.
     *
     * @param id Item ID.
     * @returns Item index, -1 if not found.
     */
    getItemIndexById(id: string | number): number {
        const index = this.items?.findIndex((listItem) => id === this.getItemId(listItem));

        return index ?? -1;
    }

    /**
     * Get initial item index.
     *
     * @returns Initial item index.
     */
    getInitialItemIndex(): number {
        if (!this.initialItem) {
            return 0;
        }

        return this.getItemIndex(this.initialItem);
    }

    /**
     * Get the ID of an item.
     *
     * @param item Item.
     * @returns Item ID.
     */
    abstract getItemId(item: Item): string | number;

}
