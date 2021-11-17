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

/**
 * Updates listener.
 */
export interface CoreItemsListSourceListener<Item> {
    onItemsUpdated(items: Item[], hasMoreItems: boolean): void;
    onReset(): void;
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

    private items: Item[] | null = null;
    private hasMoreItems = true;
    private listeners: CoreItemsListSourceListener<Item>[] = [];

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

        this.listeners.forEach(listener => listener.onReset());
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

        this.setItems(items, hasMoreItems);
    }

    /**
     * Load items for the next page, if any.
     */
    async loadNextPage(): Promise<void> {
        if (!this.hasMoreItems) {
            return;
        }

        const { items, hasMoreItems } = await this.loadPageItems(this.getPagesLoaded());

        this.setItems((this.items ?? []).concat(items), hasMoreItems);
    }

    /**
     * Load page items.
     *
     * @param page Page number (starting at 0).
     * @return Page items data.
     */
    protected abstract loadPageItems(page: number): Promise<{ items: Item[]; hasMoreItems: boolean }>;

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

        this.listeners.forEach(listener => listener.onItemsUpdated(items, hasMoreItems));
    }

}
