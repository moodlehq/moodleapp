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

import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { AddonModGlossaryEntriesSource, AddonModGlossaryEntryItem } from './glossary-entries-source';

/**
 * Helper to manage swiping within a collection of glossary entries.
 */
export abstract class AddonModGlossaryEntriesSwipeManager
    extends CoreSwipeNavigationItemsManager<AddonModGlossaryEntryItem, AddonModGlossaryEntriesSource> {

    /**
     * @inheritdoc
     */
    async navigateToNextItem(): Promise<void> {
        let delta = -1;
        const item = await this.getItemBy(-1);

        if (item && this.getSource().isNewEntryForm(item)) {
            delta--;
        }

        await this.navigateToItemBy(delta, 'back');
    }

    /**
     * @inheritdoc
     */
    async navigateToPreviousItem(): Promise<void> {
        let delta = 1;
        const item = await this.getItemBy(1);

        if (item && this.getSource().isNewEntryForm(item)) {
            delta++;
        }

        await this.navigateToItemBy(delta, 'forward');
    }

}
