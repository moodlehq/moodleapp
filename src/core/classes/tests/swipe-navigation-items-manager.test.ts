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

import { mock, mockSingleton } from '@/testing/utils';
import { ActivatedRoute, ActivatedRouteSnapshot, UrlSegment } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreNavigator } from '@services/navigator';

interface Item {
    path: string;
}

class StubSource extends CoreRoutedItemsManagerSource<Item> {

    stubItems: Item[];

    constructor(stubItems: Item[] = []) {
        super();

        this.stubItems = stubItems;
    }

    getItemPath(item: Item): string {
        return item.path;
    }

    protected async loadPageItems(): Promise<{ items: Item[] }> {
        return { items: this.stubItems };
    }

}

class StubManager extends CoreSwipeNavigationItemsManager {

    skipItemInSwipe(item: Item): boolean {
        return item.path.includes('skip');
    }

}

describe('CoreSwipeNavigationItemsManager', () => {

    let items: Item[];
    let currentPath: string;
    let source: StubSource;
    let instance: StubManager;

    beforeEach(async () => {
        mockSingleton(CoreNavigator, {
            navigate: jest.fn(),
            getCurrentRoute: () => mock<ActivatedRoute>({
                snapshot: mock<ActivatedRouteSnapshot>({
                    url: [mock<UrlSegment>({ path: currentPath })],
                }),
            }),
        });

        items = [];
        currentPath = '';
        source = new StubSource(items);
        instance = new StubManager(source);
    });

    it('navigates to next item', async () => {
        // Arrange.
        currentPath = 'foo';
        items.push({ path: 'foo' });
        items.push({ path: 'bar' });

        await source.load();

        // Act.
        await instance.navigateToNextItem();

        // Assert.
        expect(CoreNavigator.navigate).toHaveBeenCalledWith('../bar', { animationDirection: 'forward', params: {}, replace: true });
    });

    it('navigates to previous item', async () => {
        // Arrange.
        currentPath = 'bar';
        items.push({ path: 'foo' });
        items.push({ path: 'bar' });

        await source.load();

        // Act.
        await instance.navigateToPreviousItem();

        // Assert.
        expect(CoreNavigator.navigate).toHaveBeenCalledWith('../foo', { animationDirection: 'back', params: {}, replace: true });
    });

    it('skips items', async () => {
        // Arrange.
        currentPath = 'foo';
        items.push({ path: 'foo' });
        items.push({ path: 'skip' });
        items.push({ path: 'bar' });

        await source.load();

        // Act.
        await instance.navigateToNextItem();

        // Assert.
        expect(CoreNavigator.navigate).toHaveBeenCalledWith('../bar', { animationDirection: 'forward', params: {}, replace: true });
    });

    it('checks items', async () => {
        // Arrange.
        currentPath = 'foo';
        items.push({ path: 'foo' });
        items.push({ path: 'bar' });

        await source.load();

        // Assert.
        await expect(instance.hasNextItem()).resolves.toBe(true);
        await expect(instance.hasPreviousItem()).resolves.toBe(false);
    });

});
