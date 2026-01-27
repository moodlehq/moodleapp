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

import { CoreNavigator } from '@services/navigator';

import { CoreRoutedItemsManager } from './routed-items-manager';
import { CoreRoutedItemsManagerSource } from './routed-items-manager-source';

/**
 * Helper class to manage the state and routing of a swipeable page.
 */
export class CoreSwipeNavigationItemsManager<
    Item = unknown,
    Source extends CoreRoutedItemsManagerSource<Item> = CoreRoutedItemsManagerSource<Item>,
>
    extends CoreRoutedItemsManager<Item, Source> {

    /**
     * Process page started operations.
     */
    async start(): Promise<void> {
        this.updateSelectedItem();
    }

    /**
     * Navigate to the next item.
     */
    async navigateToNextItem(): Promise<void> {
        await this.navigateToItemBy(1, 'forward');
    }

    /**
     * Navigate to the previous item.
     */
    async navigateToPreviousItem(): Promise<void> {
        await this.navigateToItemBy(-1, 'back');
    }

    /**
     * Has a next item.
     *
     * @returns If has next item.
     */
    async hasNextItem(): Promise<boolean> {
        const item = await this.getItemBy(1);

        return !!item;
    }

    /**
     * Has a previous item.
     *
     * @returns If has previous item.
     */
    async hasPreviousItem(): Promise<boolean> {
        const item = await this.getItemBy(-1);

        return !!item;
    }

    /**
     * @inheritdoc
     */
    protected getCurrentPageRoute(): ActivatedRoute | null {
        return CoreNavigator.getCurrentRoute();
    }

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        const segments: UrlSegment[] = [];

        while (route) {
            segments.push(...CoreNavigator.getRouteUrl(route));

            if (!route.firstChild) {
                break;
            }

            route = route.firstChild;
        }

        return segments.map(segment => segment.path).join('/').replace(/\/+/, '/').trim() || null;
    }

    /**
     * Navigate to an item by an offset.
     *
     * @param delta Index offset.
     * @param animationDirection Animation direction.
     */
    protected async navigateToItemBy(delta: number, animationDirection: 'forward' | 'back'): Promise<void> {
        const item = await this.getItemBy(delta);

        if (!item) {
            return;
        }

        await this.navigateToItem(item, { animationDirection, replace: true });
    }

    /**
     * Get item by an offset.
     *
     * @param delta Index offset.
     * @returns The item or null if none.
     */
    protected async getItemBy(delta: number): Promise<Item | null> {
        const items = this.getSource().getItems();
        const selectedIndex = (this.selectedItem && items?.indexOf(this.selectedItem)) ?? -1;

        if (selectedIndex === -1 || items === null) {
            return null;
        }

        const deltaStep = delta > 0 ? 1 : -1;
        let nextIndex = selectedIndex;
        let deltaMoved = 0;

        while (deltaMoved !== delta) {
            nextIndex += deltaStep;

            if (nextIndex < 0) {
                return null;
            }

            if (nextIndex >= items.length) {
                break;
            }

            if (this.skipItemInSwipe(items[nextIndex])) {
                continue;
            }

            deltaMoved += deltaStep;
        }

        if (deltaMoved === delta) {
            return items[nextIndex];
        }

        if (!this.getSource().isCompleted()) {
            await this.getSource().load();

            return this.getItemBy(delta);
        }

        return null;
    }

    /**
     * Check if an item should be skipped during swipe navigation.
     *
     * @param item Item.
     * @returns Whether to skip this item during swipe navigation.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected skipItemInSwipe(item: Item): boolean {
        return false;
    }

}
