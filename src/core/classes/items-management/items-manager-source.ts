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
    onItemsUpdated?(items: Item[]): void;
    onReset?(): void;
}

/**
 * Items collection source data.
 */
export abstract class CoreItemsManagerSource<Item = unknown> {

    protected items: Item[] | null = null;
    protected listeners: CoreItemsListSourceListener<Item>[] = [];
    protected dirty = false;

    /**
     * Check whether any item has been loaded.
     *
     * @returns Whether any item has been loaded.
     */
    isLoaded(): boolean {
        return this.items !== null;
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
     * Reset collection data.
     */
    reset(): void {
        this.items = null;
        this.dirty = false;

        this.listeners.forEach(listener => listener.onReset?.call(listener));
    }

    /**
     * Load items.
     */
    abstract load(): Promise<void>;

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
     * Update the collection items.
     *
     * @param items Items.
     */
    protected setItems(items: Item[]): void {
        this.items = items;

        this.notifyItemsUpdated();
    }

    /**
     * Notify that items have been updated.
     */
    protected notifyItemsUpdated(): void {
        this.listeners.forEach(listener => listener.onItemsUpdated?.call(listener, this.items));
    }

}
