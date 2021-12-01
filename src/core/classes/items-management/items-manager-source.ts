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

/**
 * Updates listener.
 */
export interface CoreItemsListSourceListener<Item> {
    onItemsUpdated?(items: Item[], hasMoreItems: boolean): void;
    onReset?(): void;
}

/**
 * Items collection source data.
 */
export abstract class CoreItemsManagerSource<Item = unknown> {

    /**
     * Get a string to identify instances constructed with the given arguments as being reusable.
     *
     * @param args Constructor arguments.
     * @returns Id.
     */
    static getSourceId(...args: unknown[]): string {
        return args.map(argument => String(argument)).join('-');
    }

    protected items: Item[] | null = null;
    protected hasMoreItems = true;
    protected listeners: CoreItemsListSourceListener<Item>[] = [];
    protected dirty = false;

    /**
     * Check whether any page has been loaded.
     *
     * @returns Whether any page has been loaded.
     */
    isLoaded(): boolean {
        return this.items !== null;
    }

    /**
     * Check whether there are more pages to be loaded.
     *
     * @return Whether there are more pages to be loaded.
     */
    isCompleted(): boolean {
        return !this.hasMoreItems;
    }

    /**
     * Set whether the source as dirty.
     *
     * When a source is dirty, the next load request will reload items from the beginning.
     *
     * @param dirty Whether source should be marked as dirty or not.
     */
    setDirty(dirty: boolean): void {
        this.dirty = dirty;
    }

    /**
     * Get collection items.
     *
     * @returns Items.
     */
    getItems(): Item[] | null {
        return this.items;
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
        this.items = null;
        this.hasMoreItems = true;
        this.dirty = false;

        this.listeners.forEach(listener => listener.onReset?.call(listener));
    }

    /**
     * Register a listener.
     *
     * @param listener Listener.
     * @returns Unsubscribe function.
     */
    addListener(listener: CoreItemsListSourceListener<Item>): () => void {
        this.listeners.push(listener);

        return () => this.removeListener(listener);
    }

    /**
     * Remove a listener.
     *
     * @param listener Listener.
     */
    removeListener(listener: CoreItemsListSourceListener<Item>): void {
        const index = this.listeners.indexOf(listener);

        if (index === -1) {
            return;
        }

        this.listeners.splice(index, 1);
    }

    /**
     * Reload the collection, this resets the data to the first page.
     */
    async reload(): Promise<void> {
        const { items, hasMoreItems } = await this.loadPageItems(0);

        this.dirty = false;
        this.setItems(items, hasMoreItems ?? false);
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
     * Get the query parameters to use when navigating to an item page.
     *
     * @param item Item.
     * @return Query parameters to use when navigating to the item page.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getItemQueryParams(item: Item): Params {
        return {};
    }

    /**
     * Get the path to use when navigating to an item page.
     *
     * @param item Item.
     * @return Path to use when navigating to the item page.
     */
    abstract getItemPath(item: Item): string;

    /**
     * Load page items.
     *
     * @param page Page number (starting at 0).
     * @return Page items data.
     */
    protected abstract loadPageItems(page: number): Promise<{ items: Item[]; hasMoreItems?: boolean }>;

    /**
     * Get the length of each page in the collection.
     *
     * @return Page length; null for collections that don't support pagination.
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
    protected setItems(items: Item[], hasMoreItems: boolean): void {
        this.items = items;
        this.hasMoreItems = hasMoreItems;

        this.listeners.forEach(listener => listener.onItemsUpdated?.call(listener, items, hasMoreItems));
    }

}
