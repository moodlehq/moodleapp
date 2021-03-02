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

import { Component, Input } from '@angular/core';
import { AddonModForumSortOrder } from '@addons/mod/forum/services/forum';
import { ModalController } from '@singletons';

/**
 * Page that displays the sort selector.
 */
@Component({
    selector: 'page-addon-mod-forum-sort-order-selector',
    templateUrl: 'sort-order-selector.html',
})
export class AddonModForumSortOrderSelectorComponent {

    @Input() sortOrders!: AddonModForumSortOrder[];
    @Input() selected!: number;

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Select a sort order.
     *
     * @param sortOrder Selected sort order.
     */
    selectSortOrder(sortOrder: AddonModForumSortOrder): void {
        ModalController.dismiss(sortOrder);
    }

}
