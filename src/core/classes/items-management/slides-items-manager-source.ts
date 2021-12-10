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

    protected initialItem?: Partial<Item>;
    protected initialized = false;
    protected initializePromise: Promise<void>;
    protected resolveInitialize!: () => void;

    constructor(initialItem?: Partial<Item>) {
        super();

        this.initialItem = initialItem;
        this.initializePromise = new Promise(resolve => this.resolveInitialize = resolve);
    }

    /**
     * @inheritdoc
     */
    isLoaded(): boolean {
        return this.initialized && super.isLoaded();
    }

    /**
     * Return a promise that is resolved when the source is initialized.
     *
     * @return Promise.
     */
    waitForInitialized(): Promise<void> {
        return this.initializePromise;
    }

    /**
     * Mark the source as initialized.
     */
    protected setInitialized(): void {
        this.initialized = true;
        this.resolveInitialize();
    }

    /**
     * @inheritdoc
     */
    async load(): Promise<void> {
        const items = await this.loadItems();

        this.setItems(items);
        this.setInitialized();
    }

    /**
     * Load items.
     *
     * @return Items list.
     */
    protected abstract loadItems(): Promise<Item[]>;

    /**
     * Get a certain item.
     *
     * @param item Partial data about the item to search.
     * @return Item, null if not found.
     */
    getItem(item: Partial<Item>): Item | null {
        const index = this.getItemPosition(item);

        return this.items?.[index] ?? null;
    }

    /**
     * Get a certain item position.
     *
     * @param item Item to search.
     * @return Item position, -1 if not found.
     */
    getItemPosition(item: Partial<Item>): number {
        const itemId = this.getItemId(item);
        const index = this.items?.findIndex((listItem) => itemId === this.getItemId(listItem));

        return index ?? -1;
    }

    /**
     * Get initial item position.
     *
     * @return Initial item position.
     */
    getInitialPosition(): number {
        if (!this.initialItem) {
            return 0;
        }

        return this.getItemPosition(this.initialItem);
    }

    /**
     * Get the ID of an item.
     *
     * @param item Data about the item.
     * @return Item ID.
     */
    abstract getItemId(item: Partial<Item>): string | number;

}
