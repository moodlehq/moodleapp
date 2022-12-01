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
    AddonBlockRecentlyAccessedItemsItem,
} from '../../services/recentlyaccesseditems';
import { CoreTextUtils } from '@services/utils/text';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreUtils } from '@services/utils/utils';

/**
 * Component to render a recently accessed items block.
 */
@Component({
    selector: 'addon-block-recentlyaccesseditems',
    templateUrl: 'addon-block-recentlyaccesseditems.html',
    styleUrls: ['recentlyaccesseditems.scss'],
})
export class AddonBlockRecentlyAccessedItemsComponent extends CoreBlockBaseComponent implements OnInit {

    items: AddonBlockRecentlyAccessedItemsItem[] = [];
    scrollElementId!: string;

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
    async action(e: Event, item: AddonBlockRecentlyAccessedItemsItem): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const url = CoreTextUtils.decodeHTMLEntities(item.viewurl);
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const treated = await CoreContentLinksHelper.handleLink(url);
            if (!treated) {
                return CoreSites.getCurrentSite()?.openInBrowserWithAutoLogin(url);
            }
        } finally {
            modal.dismiss();
        }
    }

}
