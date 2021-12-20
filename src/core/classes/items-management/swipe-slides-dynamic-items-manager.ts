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

import { CoreSwipeSlidesDynamicItem, CoreSwipeSlidesDynamicItemsManagerSource } from './swipe-slides-dynamic-items-manager-source';
import { CoreSwipeSlidesItemsManager } from './swipe-slides-items-manager';

/**
 * Helper class to manage items for core-swipe-slides.
 */
export class CoreSwipeSlidesDynamicItemsManager<
    Item extends CoreSwipeSlidesDynamicItem,
    Source extends CoreSwipeSlidesDynamicItemsManagerSource<Item> = CoreSwipeSlidesDynamicItemsManagerSource<Item>,
> extends CoreSwipeSlidesItemsManager<Item, Source> {

    /**
     * @inheritdoc
     */
    setSelectedItem(item: Item | null): void {
        super.setSelectedItem(item);

        if (item) {
            // Load the item if not loaded yet.
            this.getSource().loadItem(item);
        }
    }

}
