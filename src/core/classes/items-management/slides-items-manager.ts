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

import { CoreItemsManager } from './items-manager';
import { CoreSwipeSlidesItemsManagerSource } from './slides-items-manager-source';

/**
 * Helper class to manage items for core-swipe-slides.
 */
export class CoreSwipeSlidesItemsManager<
    Item = unknown,
    Source extends CoreSwipeSlidesItemsManagerSource<Item> = CoreSwipeSlidesItemsManagerSource<Item>,
> extends CoreItemsManager<Item, Source> {

    /**
     * @inheritdoc
     */
    protected onSourceItemsUpdated(items: Item[]): void {
        this.itemsMap = items.reduce((map, item) => {
            map[this.getSource().getItemId(item)] = item;

            return map;
        }, {});
    }

    /**
     * Get item by ID.
     *
     * @param id ID
     * @return Item, null if not found.
     */
    getItemById(id: string): Item | null {
        return this.itemsMap?.[id] ?? null;
    }

}
