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
 * Paginated items collection source data.
 */
export abstract class CorePaginatedItemsManagerSource<Item = unknown> extends CoreItemsManagerSource<Item> {

    protected hasMoreItems = true;

    /**
     * Check whether there are more pages to be loaded.
     *
     * @returns Whether there are more pages to be loaded.
     */
    isCompleted(): boolean {
        return !this.hasMoreItems;
    }

    /**
     * Check whether the source is empty or not.
     *
     * @returns Whether the source is empty.
     */
    isEmpty(): boolean {
        return !this.isLoaded() || (this.getItems() ?? []).length === 0;
    }

    /**
     * Get the count of pages that have been loaded.
     *
     * @returns Pages loaded.
     */
    getPagesLoaded(): number {
        if (this.items === null) {
            return 0;
        }

        const pageLength = this.getPageLength();
        if (pageLength === null) {
            return 1;
        }

        return Math.ceil(this.items.length / pageLength);
    }

    /**
     * Reset collection data.
     */
    reset(): void {
        this.hasMoreItems = true;

        super.reset();
    }

    /**
     * Reload the collection, this resets the data to the first page.
     */
    async reload(): Promise<void> {
        this.dirty = true;

        await this.load();
    }

    /**
     * Load more items, if any.
     */
    async load(): Promise<void> {
        if (this.dirty) {
            const { items, hasMoreItems } = await this.loadPageItems(0);

            this.dirty = false;
            this.setItems(items, hasMoreItems ?? false);

            return;
        }

        if (!this.hasMoreItems) {
            return;
        }

        const { items, hasMoreItems } = await this.loadPageItems(this.getPagesLoaded());

        this.setItems((this.items ?? []).concat(items), hasMoreItems ?? false);
    }

    /**
     * Load page items.
     *
     * @param page Page number (starting at 0).
     * @returns Page items data.
     */
    protected abstract loadPageItems(page: number): Promise<{ items: Item[]; hasMoreItems?: boolean }>;

    /**
     * Get the length of each page in the collection.
     *
     * @returns Page length; null for collections that don't support pagination.
     */
    protected getPageLength(): number | null {
        return null;
    }

    /**
     * Update the collection items.
     *
     * @param items Items.
     * @param hasMoreItems Whether there are more pages to be loaded.
     */
    protected setItems(items: Item[], hasMoreItems = false): void {
        this.hasMoreItems = hasMoreItems;

        super.setItems(items);
    }

}
