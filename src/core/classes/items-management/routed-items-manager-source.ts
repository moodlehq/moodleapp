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

import { Params } from '@angular/router';
import { CoreItemsManagerSource } from './items-manager-source';

/**
 * Routed items collection source data.
 */
export abstract class CoreRoutedItemsManagerSource<Item = unknown> extends CoreItemsManagerSource<Item> {

    protected hasMoreItems = true;

    /**
     * Get a string to identify instances constructed with the given arguments as being reusable.
     *
     * @param args Constructor arguments.
     * @returns Id.
     */
    static getSourceId(...args: unknown[]): string {
        return args.map(argument => String(argument)).join('-');
    }

    /**
     * Check whether there are more pages to be loaded.
     *
     * @returns Whether there are more pages to be loaded.
     */
    isCompleted(): boolean {
        return !this.hasMoreItems;
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

    /**
     * Get the query parameters to use when navigating to an item page.
     *
     * @param item Item.
     * @returns Query parameters to use when navigating to the item page.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getItemQueryParams(item: Item): Params {
        return {};
    }

    /**
     * Get the path to use when navigating to an item page.
     *
     * @param item Item.
     * @returns Path to use when navigating to the item page.
     */
    abstract getItemPath(item: Item): string;

}
