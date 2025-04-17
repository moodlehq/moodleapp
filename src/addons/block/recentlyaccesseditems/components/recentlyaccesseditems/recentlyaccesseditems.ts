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

import { Component, OnInit } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import {
    AddonBlockRecentlyAccessedItems,
    AddonBlockRecentlyAccessedItemsItemCalculatedData,
} from '../../services/recentlyaccesseditems';
import { CoreText } from '@singletons/text';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreUtils } from '@singletons/utils';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render a recently accessed items block.
 */
@Component({
    selector: 'addon-block-recentlyaccesseditems',
    templateUrl: 'addon-block-recentlyaccesseditems.html',
    styleUrl: 'recentlyaccesseditems.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonBlockRecentlyAccessedItemsComponent extends CoreBlockBaseComponent implements OnInit {

    items: AddonBlockRecentlyAccessedItemsItemCalculatedData[] = [];
    scrollElementId!: string;
    colorizeIcons = false;

    protected fetchContentDefaultError = 'Error getting recently accessed items data.';

    constructor() {
        super('AddonBlockRecentlyAccessedItemsComponent');
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Generate unique id for scroll element.
        const scrollId = CoreUtils.getUniqueId('AddonBlockRecentlyAccessedItemsComponent-Scroll');

        this.scrollElementId = `addon-block-recentlyaccesseditems-scroll-${scrollId}`;

        // Only colorize icons on 4.0 to 4.3 sites.
        this.colorizeIcons = !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.4');

        super.ngOnInit();
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    async invalidateContent(): Promise<void> {
        await AddonBlockRecentlyAccessedItems.invalidateRecentItems();
    }

    /**
     * Fetch the data to render the block.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchContent(): Promise<void> {
        this.items = await AddonBlockRecentlyAccessedItems.getRecentItems();
    }

    /**
     * Event clicked.
     *
     * @param e Click event.
     * @param item Activity item info.
     * @returns Promise resolved when done.
     */
    async action(e: Event, item: AddonBlockRecentlyAccessedItemsItemCalculatedData): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const url = CoreText.decodeHTMLEntities(item.viewurl);
        const modal = await CoreLoadings.show();

        try {
            await CoreSites.visitLink(url);
        } finally {
            modal.dismiss();
        }
    }

}
