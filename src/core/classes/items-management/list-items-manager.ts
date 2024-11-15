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

import { ActivatedRoute, ActivatedRouteSnapshot, UrlSegment } from '@angular/router';
import { Subscription } from 'rxjs';

import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CoreUtils } from '@singletons/utils';

import { CoreRoutedItemsManagerSource } from './routed-items-manager-source';
import { CoreRoutedItemsManager } from './routed-items-manager';
import { CoreDom } from '@singletons/dom';
import { CoreTime } from '@singletons/time';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Helper class to manage the state and routing of a list of items in a page.
 */
export class CoreListItemsManager<
    Item = unknown,
    Source extends CoreRoutedItemsManagerSource<Item> = CoreRoutedItemsManagerSource<Item>
> extends CoreRoutedItemsManager<Item, Source> {

    protected pageRouteLocator?: unknown | ActivatedRoute;
    protected splitView?: CoreSplitViewComponent;
    protected splitViewOutletSubscription?: Subscription;
    protected finishSuccessfulFetch: () => void;

    constructor(source: Source, pageRouteLocator: unknown | ActivatedRoute) {
        super(source);

        const debouncedScrollToCurrentElement = CoreUtils.debounce(() => this.scrollToCurrentElement(), 300);

        this.pageRouteLocator = pageRouteLocator;
        this.addListener({ onSelectedItemUpdated: debouncedScrollToCurrentElement });
        this.finishSuccessfulFetch = CoreTime.once(() => CorePromiseUtils.ignoreErrors(this.logActivity()));
    }

    get items(): Item[] {
        return this.getSource().getItems() || [];
    }

    get loaded(): boolean {
        return this.itemsMap !== null;
    }

    get completed(): boolean {
        return this.getSource().isCompleted();
    }

    get empty(): boolean {
        const items = this.getSource().getItems();

        return items === null || items.length === 0;
    }

    /**
     * Process page started operations.
     *
     * @param splitView Split view component.
     */
    async start(splitView?: CoreSplitViewComponent): Promise<void> {
        if (splitView) {
            this.watchSplitViewOutlet(splitView);
        }

        // Calculate current selected item.
        this.updateSelectedItem();
    }

    /**
     * Process page destroyed operations.
     */
    destroy(): void {
        super.destroy();
        this.splitViewOutletSubscription?.unsubscribe();
    }

    /**
     * Watch a split view outlet to keep track of the selected item.
     *
     * @param splitView Split view component.
     */
    watchSplitViewOutlet(splitView: CoreSplitViewComponent): void {
        this.splitView = splitView;
        this.splitViewOutletSubscription = splitView.outletRouteObservable.subscribe(
            route => this.updateSelectedItem(this.getPageRouteFromSplitViewOutlet(route)),
        );

        this.updateSelectedItem(this.getPageRouteFromSplitViewOutlet(splitView.outletRoute) ?? null);
    }

    /**
     * Check whether the given item is selected or not.
     *
     * @param item Item.
     * @returns Whether the given item is selected.
     */
    isSelected(item: Item): boolean {
        return this.selectedItem === item;
    }

    /**
     * Return the current aria value.
     *
     * @param item Item.
     * @returns Will return the current value of the item if selected, false otherwise.
     */
    getItemAriaCurrent(item: Item): string {
        return this.isSelected(item) ? 'page' : 'false';
    }

    /**
     * Select an item.
     *
     * @param item Item.
     */
    async select(item: Item | null): Promise<void> {
        if (!item) {
            await this.navigateToIndex({ reset: this.resetNavigation() });

            return;
        }

        await this.navigateToItem(item, { reset: this.resetNavigation() });
    }

    /**
     * Reset the list of items.
     */
    reset(): void {
        this.getSource().reset();
    }

    /**
     * Reload the list of items.
     */
    async reload(): Promise<void> {
        await this.getSource().reload();

        this.finishSuccessfulFetch();
    }

    /**
     * Load more items, if any.
     */
    async load(): Promise<void> {
        await this.getSource().load();

        this.finishSuccessfulFetch();
    }

    /**
     * Log activity when the page starts.
     */
    protected async logActivity(): Promise<void> {
        // Override to log activity.
    }

    /**
     * Check whether to reset navigation when selecting an item.
     *
     * @returns boolean Whether navigation should be reset.
     */
    protected resetNavigation(): boolean {
        if (!CoreScreen.isTablet) {
            return false;
        }

        return !!this.splitView && !this.splitView?.isNested;
    }

    /**
     * @inheritdoc
     */
    protected updateSelectedItem(route: ActivatedRouteSnapshot | null = null): void {
        super.updateSelectedItem(route);

        const selectDefault = CoreScreen.isTablet && this.selectedItem === null && this.splitView && !this.splitView.isNested;
        this.select(selectDefault ? this.getDefaultItem() : this.selectedItem);
    }

    /**
     * Scroll to current element in split-view list.
     */
    protected async scrollToCurrentElement(): Promise<void> {
        if (CoreScreen.isMobile) {
            return;
        }

        const element = this.splitView?.nativeElement ?? document;
        const currentItem = element.querySelector<HTMLElement>('[aria-current="page"]');

        if (!currentItem) {
            return;
        }

        const isElementInViewport = CoreDom.isElementInViewport(currentItem, 1, this.splitView?.nativeElement);

        if (isElementInViewport) {
            return;
        }

        currentItem.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Get the item that should be selected by default.
     *
     * @returns The default item or null if none.
     */
    protected getDefaultItem(): Item | null {
        return this.items[0] || null;
    }

    /**
     * @inheritdoc
     */
    protected getCurrentPageRoute(): ActivatedRoute | null {
        if (this.pageRouteLocator instanceof ActivatedRoute) {
            return CoreNavigator.isRouteActive(this.pageRouteLocator) ? this.pageRouteLocator : null;
        }

        return CoreNavigator.getCurrentRoute({ pageComponent: this.pageRouteLocator });
    }

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        const segments: UrlSegment[] = [];

        while (route.firstChild) {
            route = route.firstChild;

            segments.push(...CoreNavigator.getRouteUrl(route));
        }

        return segments.map(segment => segment.path).join('/').replace(/\/+/, '/').trim() || null;
    }

    /**
     * Get the page route given a child route on the splitview outlet.
     *
     * @param route Child route.
     * @returns Page route.
     */
    private getPageRouteFromSplitViewOutlet(route: ActivatedRouteSnapshot | null): ActivatedRouteSnapshot | null {
        const isPageRoute = this.buildRouteMatcher();

        while (route && !isPageRoute(route)) {
            route = route.parent;
        }

        return route;
    }

    /**
     * Build a function to check whether the given snapshot belongs to the page.
     *
     * @returns Route matcher.
     */
    private buildRouteMatcher(): (route: ActivatedRouteSnapshot) => boolean {
        if (this.pageRouteLocator instanceof ActivatedRoute) {
            const pageRoutePath = CoreNavigator.getRouteFullPath(this.pageRouteLocator);

            return route => CoreNavigator.getRouteFullPath(route) === pageRoutePath;
        }

        return route => route.component === this.pageRouteLocator;
    }

}
