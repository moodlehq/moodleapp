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

import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreItemsManager } from './items-manager';

import { CoreRoutedItemsManagerSource } from './routed-items-manager-source';
import { CoreRoutedItemsManagerSourcesTracker } from './routed-items-manager-sources-tracker';

/**
 * Helper to manage a collection of items in a page.
 */
export abstract class CoreRoutedItemsManager<
    Item = unknown,
    Source extends CoreRoutedItemsManagerSource<Item> = CoreRoutedItemsManagerSource<Item>,
> extends CoreItemsManager<Item, Source> {

    /**
     * @inheritdoc
     */
    setSource(newSource: Source | null): void {
        if (this.source) {
            CoreRoutedItemsManagerSourcesTracker.removeReference(this.source.instance, this);
        }

        if (newSource) {
            CoreRoutedItemsManagerSourcesTracker.addReference(newSource, this);
        }

        super.setSource(newSource);
    }

    /**
     * Get page route.
     *
     * @returns Current page route, if any.
     */
    protected abstract getCurrentPageRoute(): ActivatedRoute | null;

    /**
     * Get the path of the selected item given the current route.
     *
     * @param route Page route.
     * @returns Path of the selected item in the given route.
     */
    protected abstract getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot): string | null;

    /**
     * Get the path of the selected item.
     *
     * @param route Page route, if any.
     * @returns Path of the selected item.
     */
    protected getSelectedItemPath(route?: ActivatedRouteSnapshot | null): string | null {
        if (!route) {
            return null;
        }

        return this.getSelectedItemPathFromRoute(route);
    }

    /**
     * Update the selected item given the current route.
     *
     * @param route Current route.
     */
    protected updateSelectedItem(route: ActivatedRouteSnapshot | null = null): void {
        route = route ?? this.getCurrentPageRoute()?.snapshot ?? null;

        const selectedItemPath = this.getSelectedItemPath(route);

        const selectedItem = selectedItemPath
            ? this.itemsMap?.[selectedItemPath] ?? null
            : null;
        this.setSelectedItem(selectedItem);
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
        const itemPath = this.getSource().getItemPath(item);
        const selectedItemPath = this.getSelectedItemPath(route.snapshot);

        if (selectedItemPath === itemPath) {
            return;
        }

        // Navigate to item.
        const params = this.getSource().getItemQueryParams(item);
        const pathPrefix = selectedItemPath ? selectedItemPath.split('/').fill('../').join('') : '';

        await CoreNavigator.navigate(pathPrefix + itemPath, { params, ...options });
    }

    /**
     * Navigate to the index page.
     *
     * @param options Navigation options.
     */
    protected async navigateToIndex(
        options: Pick<CoreNavigationOptions, 'reset' | 'replace' | 'animationDirection'> = {},
    ): Promise<void> {
        // Get current route in the page.
        const route = this.getCurrentPageRoute();

        if (route === null) {
            return;
        }

        // If the current page is already the index, do nothing.
        const selectedItemPath = this.getSelectedItemPath(route.snapshot);

        if (selectedItemPath === null) {
            return;
        }

        // Navigate to index.
        const indexPath = selectedItemPath ? selectedItemPath.split('/').fill('../').join('') : '';

        await CoreNavigator.navigate(indexPath, options);
    }

    /**
     * @inheritdoc
     */
    protected onSourceItemsUpdated(items: Item[]): void {
        super.onSourceItemsUpdated(items);
        const selectedItem = this.selectedItem;

        if (selectedItem !== null && items.some(item => item === selectedItem)) {
            return;
        }

        this.updateSelectedItem();
    }

    /**
     * @inheritdoc
     */
    getItemId(item: Item): string | number {
        return this.getSource().getItemPath(item);
    }

}
