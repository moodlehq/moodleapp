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

import { Component, OnInit, Injector, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreBlockBaseComponent } from '@core/block/classes/base-block-component';
import {
    AddonBlockRecentlyAccessedItemsProvider, AddonBlockRecentlyAccessedItemsItem
} from '../../providers/recentlyaccesseditems';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/**
 * Component to render a recently accessed items block.
 */
@Component({
    selector: 'addon-block-recentlyaccesseditems',
    templateUrl: 'addon-block-recentlyaccesseditems.html'
})
export class AddonBlockRecentlyAccessedItemsComponent extends CoreBlockBaseComponent implements OnInit {
    items: AddonBlockRecentlyAccessedItemsItem[] = [];

    protected fetchContentDefaultError = 'Error getting recently accessed items data.';

    constructor(injector: Injector, @Optional() private navCtrl: NavController,
            private sitesProvider: CoreSitesProvider,
            private recentItemsProvider: AddonBlockRecentlyAccessedItemsProvider,
            private contentLinksHelper: CoreContentLinksHelperProvider) {

        super(injector, 'AddonBlockRecentlyAccessedItemsComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return this.recentItemsProvider.invalidateRecentItems();
    }

    /**
     * Fetch the data to render the block.
     *
     * @return Promise resolved when done.
     */
    protected fetchContent(): Promise<any> {
        return this.recentItemsProvider.getRecentItems().then((items) => {
            this.items = items;
        });
    }

    /**
     * Event clicked.
     *
     * @param e Click event.
     * @param item Activity item info.
     */
    action(e: Event, item: any): void {
        e.preventDefault();
        e.stopPropagation();

        const url = this.textUtils.decodeHTMLEntities(item.viewurl);
        const modal = this.domUtils.showModalLoading();
        this.contentLinksHelper.handleLink(url, undefined, this.navCtrl).then((treated) => {
            if (!treated) {
                return this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(url);
            }
        }).finally(() => {
            modal.dismiss();
        });
    }
}
