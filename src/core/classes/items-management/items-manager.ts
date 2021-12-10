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
 * Helper to manage a collection of items in a page.
 */
export abstract class CoreItemsManager<
    Item = unknown,
    Source extends CoreItemsManagerSource<Item> = CoreItemsManagerSource<Item>,
> {

    protected source?: { instance: Source; unsubscribe: () => void };
    protected itemsMap: Record<string, Item> | null = null;
    protected selectedItem: Item | null = null;

    constructor(source: Source) {
        this.setSource(source);
    }

    /**
     * Get source.
     *
     * @returns Source.
     */
    getSource(): Source {
        if (!this.source) {
            throw new Error('Source is missing from items manager');
        }

        return this.source.instance;
    }

    /**
     * Set source.
     *
     * @param newSource New source.
     */
    setSource(newSource: Source | null): void {
        if (this.source) {
            this.source.unsubscribe();
            delete this.source;

            this.onSourceReset();
        }

        if (newSource) {
            this.source = {
                instance: newSource,
                unsubscribe: newSource.addListener({
                    onItemsUpdated: items => this.onSourceItemsUpdated(items),
                    onReset: () => this.onSourceReset(),
                }),
            };

            const items = newSource.getItems();

            if (items) {
                this.onSourceItemsUpdated(items);
            }
        }
    }

    /**
     * Process page destroyed operations.
     */
    destroy(): void {
        this.setSource(null);
    }

    /**
     * Get selected item.
     *
     * @return Selected item, null if none.
     */
    getSelectedItem(): Item | null {
        return this.selectedItem;
    }

    /**
     * Set selected item.
     *
     * @param item Item, null if none.
     */
    setSelectedItem(item: Item | null): void {
        this.selectedItem = item;
    }

    /**
     * Called when source items have been updated.
     *
     * @param items New items.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onSourceItemsUpdated(items: Item[]): void {
        // Nothing to do.
    }

    /**
     * Called when source has been updated.
     */
    protected onSourceReset(): void {
        this.itemsMap = null;
        this.selectedItem = null;
    }

}
