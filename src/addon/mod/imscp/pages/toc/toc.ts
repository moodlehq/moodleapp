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

import { Component } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';

/**
 * Modal to display the TOC of a imscp.
 */
@IonicPage({ segment: 'addon-mod-imscp-toc-modal' })
@Component({
    selector: 'page-addon-mod-imscp-toc',
    templateUrl: 'toc.html'
})
export class AddonModImscpTocPage {
    items = [];
    selected: string;

    constructor(navParams: NavParams, private viewCtrl: ViewController) {
        this.items = navParams.get('items') || [];
        this.selected = navParams.get('selected');
    }

    /**
     * Function called when an item is clicked.
     *
     * @param id ID of the clicked item.
     */
    loadItem(id: string): void {
        this.viewCtrl.dismiss(id);
    }

    /**
     * Get dummy array for padding.
     *
     * @param n Array length.
     * @return Dummy array with n elements.
     */
    getNumberForPadding(n: number): number[] {
        return new Array(n);
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
