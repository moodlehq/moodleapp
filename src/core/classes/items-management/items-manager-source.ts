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
export type CoreItemsManagerSourceListener<Item> = {
    onItemsUpdated?(items: Item[]): void;
    onReset?(): void;
};

/**
 * Items collection source data.
 */
export abstract class CoreItemsManagerSource<Item = unknown> {

    protected items: Item[] | null = null;
    protected listeners: CoreItemsManagerSourceListener<Item>[] = [];
    protected dirty = false;
    protected loaded = false;
    protected loadedPromise: Promise<void>;
    protected resolveLoaded!: () => void;

    constructor() {
        this.loadedPromise = new Promise(resolve => this.resolveLoaded = resolve);
    }

    /**
     * Check whether the source is dirty.
     *
     * @returns Whether the source is dirty.
     */
    isDirty(): boolean {
        return this.dirty;
    }

    /**
     * Check whether data is loaded.
     *
     * @returns Whether data is loaded.
     */
    isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Return a promise that is resolved when the data is loaded.
     *
     * @returns Promise.
     */
    waitForLoaded(): Promise<void> {
        return this.loadedPromise;
    }

    /**
     * Mark the source as initialized.
     */
    protected setLoaded(): void {
        this.loaded = true;
        this.resolveLoaded();
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
        this.loaded = false;

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
    addListener(listener: CoreItemsManagerSourceListener<Item>): () => void {
        this.listeners.push(listener);

        return () => this.removeListener(listener);
    }

    /**
     * Remove a listener.
     *
     * @param listener Listener.
     */
    removeListener(listener: CoreItemsManagerSourceListener<Item>): void {
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
        this.setLoaded();

        this.notifyItemsUpdated();
    }

    /**
     * Notify that items have been updated.
     */
    protected notifyItemsUpdated(): void {
        this.listeners.forEach(listener => listener.onItemsUpdated?.call(listener, this.items));
    }

}
