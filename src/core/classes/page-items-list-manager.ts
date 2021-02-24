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
import { Subscription } from 'rxjs';

import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CoreUtils } from '@services/utils/utils';

/**
 * Helper class to manage the state and routing of a list of items in a page, for example on pages using a split view.
 */
export abstract class CorePageItemsListManager<Item> {

    protected itemsList: Item[] | null = null;
    protected itemsMap: Record<string, Item> | null = null;
    protected hasMoreItems = true;
    protected selectedItem: Item | null = null;
    protected pageComponent: unknown;
    protected splitView?: CoreSplitViewComponent;
    protected splitViewOutletSubscription?: Subscription;

    constructor(pageComponent: unknown) {
        this.pageComponent = pageComponent;
    }

    get items(): Item[] {
        return this.itemsList || [];
    }

    get loaded(): boolean {
        return this.itemsMap !== null;
    }

    get completed(): boolean {
        return !this.hasMoreItems;
    }

    get empty(): boolean {
        return this.itemsList === null || this.itemsList.length === 0;
    }

    /**
     * Process page started operations.
     *
     * @param splitView Split view component.
     */
    async start(splitView: CoreSplitViewComponent): Promise<void> {
        this.watchSplitViewOutlet(splitView);

        // Calculate current selected item.
        const route = CoreNavigator.instance.getCurrentRoute({ pageComponent: this.pageComponent });
        if (route !== null && route.firstChild) {
            this.updateSelectedItem(route.firstChild.snapshot);
        }

        // Select default item if none is selected on a non-mobile layout.
        if (!CoreScreen.instance.isMobile && this.selectedItem === null) {
            const defaultItem = this.getDefaultItem();

            if (defaultItem) {
                this.select(defaultItem);
            }
        }

        // Log activity.
        await CoreUtils.instance.ignoreErrors(this.logActivity());
    }

    /**
     * Process page destroyed operations.
     */
    destroy(): void {
        this.splitViewOutletSubscription?.unsubscribe();
    }

    /**
     * Watch a split view outlet to keep track of the selected item.
     *
     * @param splitView Split view component.
     */
    watchSplitViewOutlet(splitView: CoreSplitViewComponent): void {
        this.splitView = splitView;
        this.splitViewOutletSubscription = splitView.outletRouteObservable.subscribe(route => this.updateSelectedItem(route));

        this.updateSelectedItem(splitView.outletRoute);
    }

    /**
     * Reset items data.
     */
    resetItems(): void {
        this.itemsList = null;
        this.itemsMap = null;
        this.hasMoreItems = true;
        this.selectedItem = null;
    }

    // @todo Implement watchResize.

    /**
     * Check whether the given item is selected or not.
     *
     * @param item Item.
     * @return Whether the given item is selected.
     */
    isSelected(item: Item): boolean {
        return this.selectedItem === item;
    }

    /**
     * Select an item.
     *
     * @param item Item.
     */
    async select(item: Item): Promise<void> {
        // Get current route in the page.
        const route = CoreNavigator.instance.getCurrentRoute({ pageComponent: this.pageComponent });

        if (route === null) {
            return;
        }

        // If this item is already selected, do nothing.
        const itemRoute = this.getItemRoute(route);
        const itemPath = this.getItemPath(item);
        const selectedItemPath = itemRoute ? this.getSelectedItemPath(itemRoute.snapshot) : null;

        if (selectedItemPath === itemPath) {
            return;
        }

        // Navigate to item.
        const params = this.getItemQueryParams(item);
        const pathPrefix = selectedItemPath ? selectedItemPath.split('/').fill('../').join('') : '';

        await CoreNavigator.instance.navigate(pathPrefix + itemPath, { params, reset: true });
    }

    /**
     * Set the list of items.
     *
     * @param items Items.
     * @param hasMoreItems Whether the list has more items that haven't been loaded.
     */
    setItems(items: Item[], hasMoreItems: boolean = false): void {
        this.hasMoreItems = hasMoreItems;
        this.itemsList = items.slice(0);
        this.itemsMap = items.reduce((map, item) => {
            map[this.getItemPath(item)] = item;

            return map;
        }, {});

        this.updateSelectedItem(this.splitView?.outletRoute);
    }

    /**
     * Log activity when the page starts.
     */
    protected async logActivity(): Promise<void> {
        //
    }

    /**
     * Update the selected item given the current route.
     *
     * @param route Current route.
     */
    protected updateSelectedItem(route?: ActivatedRouteSnapshot | null): void {
        const selectedItemPath = route ? this.getSelectedItemPath(route) : null;

        this.selectedItem = selectedItemPath
            ? this.itemsMap?.[selectedItemPath] ?? null
            : null;
    }

    /**
     * Get the item that should be selected by default.
     */
    protected getDefaultItem(): Item | null {
        return this.itemsList?.[0] || null;
    }

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
     * Get the path to use when navigating to an item page.
     *
     * @param item Item.
     * @return Path to use when navigating to the item page.
     */
    protected abstract getItemPath(item: Item): string;

    /**
     * Get the path of the selected item given the current route.
     *
     * @param route Current route.
     * @return Path of the selected item in the given route.
     */
    protected abstract getSelectedItemPath(route: ActivatedRouteSnapshot): string | null;

    /**
     * Get the active item route, if any.
     *
     * @param pageRoute Page route.
     * @return Item route.
     */
    private getItemRoute(pageRoute: ActivatedRoute): ActivatedRoute | null {
        let itemRoute = pageRoute.firstChild;

        while (itemRoute && !itemRoute.component) {
            itemRoute = itemRoute.firstChild;
        }

        return itemRoute;
    }

}
