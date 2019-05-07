// (C) Copyright 2015 Martin Dougiamas
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

import { Component } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';

/**
 * Page that displays the sort selector.
 */
@IonicPage({ segment: 'addon-mod-forum-sort-order-selector' })
@Component({
    selector: 'page-addon-mod-forum-sort-order-selector',
    templateUrl: 'sort-order-selector.html',
})
export class AddonModForumSortOrderSelectorPage {

    sortOrders = [];
    selected: number;

    constructor(navParams: NavParams, private viewCtrl: ViewController) {
        this.sortOrders = navParams.get('sortOrders');
        this.selected = navParams.get('selected');
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Select a sort order.
     *
     * @param {any} sortOrder Selected sort order.
     */
    selectSortOrder(sortOrder: any): void {
        this.viewCtrl.dismiss(sortOrder);
    }
}
