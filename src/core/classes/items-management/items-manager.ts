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

import { ActivatedRoute, ActivatedRouteSnapshot, Params } from '@angular/router';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';

import { CoreItemsManagerSource } from './items-manager-source';
import { CoreItemsManagerSourcesTracker } from './items-manager-sources-tracker';

/**
 * Helper to manage a collection of items in a page.
 */
export abstract class CoreItemsManager<Item = unknown, Source extends CoreItemsManagerSource<Item> = CoreItemsManagerSource<Item>> {

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
            CoreItemsManagerSourcesTracker.removeReference(this.source.instance, this);

            this.source.unsubscribe();
            delete this.source;

            this.onSourceReset();
        }

        if (newSource) {
            CoreItemsManagerSourcesTracker.addReference(newSource, this);

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
     * Get page route.
     *
     * @returns Current page route, if any.
     */
    protected abstract getCurrentPageRoute(): ActivatedRoute | null;

    /**
     * Get the path to use when navigating to an item page.
     *
     * @param item Item.
     * @return Path to use when navigating to the item page.
     */
    protected abstract getItemPath(item: Item): string;

    /**
     * Get the path of the selected item.
     *
     * @param route Page route, if any.
     * @return Path of the selected item.
     */
    protected abstract getSelectedItemPath(route?: ActivatedRouteSnapshot | null): string | null;

    /**
     * Get the query parameters to use when navigating to an item page.
     *
     * @param item Item.
     * @return Query parameters to use when navigating to the item page.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected getItemQueryParams(item: Item): Params {
        return {};
    }

    /**
     * Update the selected item given the current route.
     *
     * @param route Current route.
     */
    protected updateSelectedItem(route: ActivatedRouteSnapshot | null = null): void {
        route = route ?? this.getCurrentPageRoute()?.snapshot ?? null;

        const selectedItemPath = this.getSelectedItemPath(route);

        this.selectedItem = selectedItemPath
            ? this.itemsMap?.[selectedItemPath] ?? null
            : null;
    }

    /**
     * Navigate to an item in the collection.
     *
     * @param item Item.
     * @param options Navigation options.
     */
    protected async navigateToItem(
        item: Item,
        options: Pick<CoreNavigationOptions, 'reset' | 'replace' | 'animationDirection'> = {},
    ): Promise<void> {
        // Get current route in the page.
        const route = this.getCurrentPageRoute();

        if (route === null) {
            return;
        }

        // If this item is already selected, do nothing.
        const itemPath = this.getItemPath(item);
        const selectedItemPath = this.getSelectedItemPath(route.snapshot);

        if (selectedItemPath === itemPath) {
            return;
        }

        // Navigate to item.
        const params = this.getItemQueryParams(item);
        const pathPrefix = selectedItemPath ? selectedItemPath.split('/').fill('../').join('') : '';

        await CoreNavigator.navigate(pathPrefix + itemPath, { params, ...options });
    }

    /**
     * Called when source items have been updated.
     *
     * @param items New items.
     */
    protected onSourceItemsUpdated(items: Item[]): void {
        this.itemsMap = items.reduce((map, item) => {
            map[this.getItemPath(item)] = item;

            return map;
        }, {});

        this.updateSelectedItem();
    }

    /**
     * Called when source has been updated.
     */
    protected onSourceReset(): void {
        this.itemsMap = null;
        this.selectedItem = null;
    }

}
